import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { handleLogisticsApiError, logLogisticsAudit } from "@/lib/logistics/security"
import {
  getSupplierPortalSnapshot,
  handleSupplierPortalAction,
  requireSupplierPortalScope,
} from "@/lib/logistics/procurement"

export async function GET() {
  try {
    const { scope, supplier } = await requireSupplierPortalScope()
    const snapshot = await getSupplierPortalSnapshot(scope, supplier)
    return NextResponse.json({ success: true, ...snapshot })
  } catch (err) {
    return handleLogisticsApiError(err, "Tedarikçi portal verileri yüklenemedi.")
  }
}

export async function POST(request: Request) {
  try {
    const { payload, scope, supplier } = await requireSupplierPortalScope()
    const contentType = request.headers.get("content-type") || ""

    let action = ""
    let body: Record<string, any> = {}

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      action = String(formData.get("action") || "upload_document")
      const file = formData.get("file") as File | null
      const docType = String(formData.get("docType") || "DIGER")
      const title = String(formData.get("title") || file?.name || "Tedarikçi Belgesi")
      const validFrom = formData.get("validFrom") ? String(formData.get("validFrom")) : undefined
      const expiresAt = formData.get("expiresAt") ? String(formData.get("expiresAt")) : undefined
      const notes = formData.get("notes") ? String(formData.get("notes")) : undefined

      let fileName = String(formData.get("fileName") || file?.name || "belge.pdf")
      let fileUrl = String(formData.get("fileUrl") || "")
      let mimeType = file?.type || "application/pdf"
      let fileSizeBytes = file?.size || null

      if (file) {
        const bytes = Buffer.from(await file.arrayBuffer())
        const safeName = `${supplier.code}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        fileName = file.name
        try {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "supplier-docs")
          await fs.mkdir(uploadDir, { recursive: true })
          await fs.writeFile(path.join(uploadDir, safeName), bytes)
          fileUrl = `/uploads/supplier-docs/${safeName}`
        } catch {
          // Salt okunur serverless FS yedekleme (2MB altı ise inline Data URI, büyükse güvenli referans)
          if (bytes.length <= 2 * 1024 * 1024) {
            fileUrl = `data:${mimeType};base64,${bytes.toString("base64")}`
          } else {
            fileUrl = `/uploads/supplier-docs/${safeName}`
          }
        }
      }

      body = {
        action,
        docType,
        title,
        fileName,
        fileUrl,
        mimeType,
        fileSizeBytes,
        validFrom,
        expiresAt,
        notes,
        supplierId: formData.get("supplierId") ? String(formData.get("supplierId")) : supplier.id,
      }
    } else {
      body = await request.json()
      action = String(body.action || "")
    }

    const actor = payload.username || supplier.name
    const result = await handleSupplierPortalAction(scope, actor, action, body)

    await logLogisticsAudit({
      userId: payload.userId,
      action: `PORTAL_${action.toUpperCase()}`,
      resource: "tedarikci_portali",
      resourceId: result?.id || supplier.id,
      moduleKey: "tedarikci_portali",
      supplierId: supplier.id,
      metadata: { action, supplierCode: supplier.code },
    })

    return NextResponse.json({
      success: true,
      result,
      message: "Tedarikçi portal işlemi kaydedildi.",
    })
  } catch (err) {
    return handleLogisticsApiError(err, "Tedarikçi portal işlemi işlenemedi.")
  }
}

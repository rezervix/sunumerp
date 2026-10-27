import { NextResponse } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload || !payload.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find customers that are not 'Sıcak' or 'VIP' and active
    const customersToSync = await prisma.customer.findMany({
      where: {
        branchId: payload.branchId,
        status: "active",
        scoreTemp: {
          notIn: ["Sıcak", "VIP"]
        }
      }
    })

    if (customersToSync.length === 0) {
      return NextResponse.json({ count: 0, message: "No customers to sync" })
    }

    let syncedCount = 0

    // For each customer, check if a lead with same name exists, if not, create it
    for (const customer of customersToSync) {
      // Find existing lead by name and branch
      const existingLead = await prisma.lead.findFirst({
        where: {
          branchId: payload.branchId,
          name: customer.name || "İsimsiz",
          phone: customer.phone || undefined
        }
      })

      if (!existingLead) {
        await prisma.lead.create({
          data: {
            branchId: payload.branchId,
            name: customer.name || "İsimsiz",
            company: customer.company,
            email: customer.email,
            phone: customer.phone,
            status: customer.scoreTemp === "Soğuk" ? "cold" : (customer.scoreTemp === "Ilık" ? "warm" : "new"),
            source: "Customer Sync",
            notes: "Otomatik olarak Müşteriler (Customers) modülünden senkronize edildi."
          }
        })
        syncedCount++
      }
    }

    return NextResponse.json({ success: true, count: syncedCount })

  } catch (error: any) {
    console.error("Sync leads error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/server-permission"
import { TrashService } from "@/lib/trash/trash-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("trash", "write")
  if (auth instanceof NextResponse) {
    return auth
  }

  const { id } = await params

  try {
    const result = await TrashService.restoreFromTrash(id, auth.payload.userId)
    return NextResponse.json({ success: true, item: result })
  } catch (error: any) {
    console.error(`Error restoring trash item ${id}:`, error)
    return NextResponse.json(
      { error: error.message || "Öge geri yüklenirken bir hata oluştu." },
      { status: 500 }
    )
  }
}

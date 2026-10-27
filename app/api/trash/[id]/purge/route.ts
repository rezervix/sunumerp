import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/server-permission"
import { TrashService } from "@/lib/trash/trash-service"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("trash", "delete")
  if (auth instanceof NextResponse) {
    return auth
  }

  const { id } = await params

  try {
    await TrashService.purgeFromTrash(id, auth.payload.userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Error purging trash item ${id}:`, error)
    return NextResponse.json(
      { error: error.message || "Öge kalıcı olarak silinirken bir hata oluştu." },
      { status: 500 }
    )
  }
}

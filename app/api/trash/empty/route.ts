import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/server-permission"
import { TrashService } from "@/lib/trash/trash-service"

export async function DELETE(req: Request) {
  const auth = await requirePermission("trash", "delete")
  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const clearedCount = await TrashService.emptyTrash(auth.payload.userId)
    return NextResponse.json({ success: true, clearedCount })
  } catch (error: any) {
    console.error("Error emptying trash:", error)
    return NextResponse.json(
      { error: error.message || "Geri dönüşüm kutusu boşaltılamadı." },
      { status: 500 }
    )
  }
}

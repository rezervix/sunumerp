import { NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

// 20MB Max File Size limit
const MAX_FILE_SIZE = 20 * 1024 * 1024 

// Allowed extensions list for security and utility
const ALLOWED_EXTENSIONS = [
    "jpg", "jpeg", "png", "gif", "webp", // Görseller (Before-After için)
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", // Dokümanlar (Brief ve Raporlar için)
    "zip", "rar", "tar.gz", // Sıkıştırılmış arşivler
    "txt", "csv", "json" // Ham veri dosyaları
]

async function getUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) return null

    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch {
        return null
    }
}

export async function POST(req: Request) {
    const user = await getUser()
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const formData = await req.formData()
        const files = formData.getAll("files") as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "Yüklenecek dosya seçilmedi." }, { status: 400 })
        }

        const uploadedUrls: string[] = []
        const uploadDir = join(process.cwd(), "public", "uploads")

        // Ensure upload directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (err) {
            // Directory might already exist
        }

        for (const file of files) {
            // 1. Dosya boyutu kontrolü
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ 
                    error: `Dosya boyutu çok büyük. Maksimum limit 20MB'dır. (${file.name})` 
                }, { status: 400 })
            }

            // 2. Dosya tipi/uzantısı kontrolü
            const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
            if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                return NextResponse.json({ 
                    error: `Desteklenmeyen dosya uzantısı. İzin verilenler: ${ALLOWED_EXTENSIONS.join(", ")}` 
                }, { status: 400 })
            }

            const fileName = `${uuidv4()}.${fileExtension}`
            const path = join(uploadDir, fileName)

            // Görsellerde kalite kaybı olmaması için sıkıştırma/boyutlandırma yapmadan ham buffer verisini yazıyoruz
            const buffer = Buffer.from(await file.arrayBuffer())
            await writeFile(path, buffer)
            
            uploadedUrls.push(`/api/uploads/${fileName}`)
        }

        return NextResponse.json({ urls: uploadedUrls })
    } catch (error) {
        console.error("Error uploading files:", error)
        return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
    }
}

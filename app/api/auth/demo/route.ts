import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function POST(req: Request) {
  try {
    const demoUserId = "user-admin"
    const demoUsername = "admin"

    // Attempt to find user in DB or local-db fallback
    let user: any = null
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: "admin" },
            { username: "demo" },
            { id: "user-admin" },
            { id: "local-debug-user" }
          ]
        },
        include: {
          branches: {
            include: {
              role: true,
              branch: true
            }
          }
        }
      })
    } catch (dbErr) {
      console.warn("[Demo Login] DB query fallback:", dbErr)
    }

    const defaultBranches = [
      {
        id: "local-debug-branch",
        name: "Merkez Şube (İstanbul Levent)",
        code: "HQ",
        address: "Büyükdere Cad. Kanyon Ofis No:193 K:14, Levent / İstanbul",
        phone: "+90 212 350 40 00",
        email: "merkez@sunumerp.com",
        managerFullName: "Demo Yönetici",
        themeColor: "#2563EB",
        isActive: true
      },
      {
        id: "branch-ankara",
        name: "Ankara Çankaya Şubesi",
        code: "ANK-001",
        address: "Turan Güneş Bulvarı No:82/B Çankaya / Ankara",
        phone: "+90 312 440 20 00",
        email: "ankara@sunumerp.com",
        managerFullName: "Volkan Koç",
        themeColor: "#10B981",
        isActive: true
      },
      {
        id: "branch-izmir",
        name: "İzmir Alsancak Şubesi",
        code: "IZM-001",
        address: "Atatürk Cad. No:140/A Alsancak / İzmir",
        phone: "+90 232 460 30 00",
        email: "izmir@sunumerp.com",
        managerFullName: "Ece Tan",
        themeColor: "#8B5CF6",
        isActive: true
      },
      {
        id: "branch-bursa",
        name: "Bursa Nilüfer Şubesi",
        code: "BUR-001",
        address: "FSM Bulvarı No:45 Nilüfer / Bursa",
        phone: "+90 224 240 10 00",
        email: "bursa@sunumerp.com",
        managerFullName: "Serkan Uğur",
        themeColor: "#F59E0B",
        isActive: true
      }
    ]

    const fullPermissions = {
      dashboard: ["read", "create", "update", "delete"],
      branches: ["read", "create", "update", "delete", "manage_all"],
      users: ["read", "create", "update", "delete", "assign_roles"],
      customers: ["read", "create", "update", "delete", "view_all_branches"],
      leads: ["read", "create", "update", "delete", "view_all_branches"],
      financial: ["read", "create", "update", "delete", "view_all_branches"],
      orders: ["read", "create", "update", "delete", "approve", "view_all_branches"],
      files: ["read", "create", "update", "delete", "view_all_branches"],
      reports: ["read", "create", "update", "delete"],
      settings: ["manage_system", "manage_branches"],
      magaza: ["read", "create", "update", "delete"],
      b2b: ["read", "create", "update", "delete"],
      cargo: ["read", "create", "update", "delete"],
      chat: ["read", "create", "update", "delete"],
      announcements: ["read", "create", "update", "delete"],
      takvim: ["read", "create", "update", "delete"],
      yapilacaklar: ["read", "create", "update", "delete"],
      todos: ["read", "create", "update", "delete"],
      notlarim: ["read", "create", "update", "delete"],
      notes: ["read", "create", "update", "delete"],
      hesaplama: ["read", "create", "update", "delete"],
      socialMedia: ["read", "create", "update", "delete"],
      "sosyal-medya": ["read", "create", "update", "delete"],
      ai: ["read", "upload"],
      hr: ["read", "create", "update", "delete"],
      projects: ["read", "create", "update", "delete"],
      tasks: ["read", "create", "update", "delete"],
    }

    const superAdminRole = {
      id: "role-super-admin",
      name: "Super Admin",
      description: "Demo Tam Yetkili Yönetici",
      permissions: fullPermissions
    }

    const mappedBranches = defaultBranches.map(b => ({
      id: `ubr-${b.id}`,
      userId: user?.id || demoUserId,
      branchId: b.id,
      roleId: "role-super-admin",
      branch: b,
      role: superAdminRole
    }))

    const finalUser = {
      id: user?.id || demoUserId,
      username: user?.username || demoUsername,
      fullName: user?.fullName || "Sunum ERP Demo Yöneticisi",
      email: user?.email || "demo@sunumerp.com",
      isActive: true,
      createdAt: user?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Sign JWT Token
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({
      userId: finalUser.id,
      username: finalUser.username,
      isDemo: true
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret)

    // Set HTTP-Only Cookie
    const isElectron = req.headers.get("user-agent")?.toLowerCase().includes("electron") || false
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isElectron,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return NextResponse.json({
      user: finalUser,
      branches: mappedBranches,
      token,
      message: "Sunum ERP Canlı Demo Oturumu Başlatıldı"
    })
  } catch (error: any) {
    console.error("[Demo Login] Error:", error)
    return NextResponse.json({ error: error.message || "Demo girişi başlatılamadı" }, { status: 500 })
  }
}

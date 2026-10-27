const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'storage', 'ajans-kutuphanesi', '.local-db.json')

const DEFAULT_ROLES = {
    "Super Admin": {
        dashboard: ["read", "create", "update", "delete"],
        takvim: ["read", "create", "update", "delete"],
        orders: ["read", "create", "update", "delete", "approve"],
        magaza: ["read", "create", "update", "delete"],
        customers: ["read", "create", "update", "delete"],
        hr: ["read", "create", "update", "delete"],
        projects: ["read", "create", "update", "delete"],
        leads: ["read", "create", "update", "delete"],
        cargo: ["read", "create", "update", "delete"],
        files: ["read", "create", "update", "delete"],
        yapilacaklar: ["read", "create", "update", "delete"],
        notlarim: ["read", "create", "update", "delete"],
        hesaplama: ["read", "create", "update", "delete"],
        financial: ["read", "create", "update", "delete"],
        "sosyal-medya": ["read", "create", "update", "delete"],
        chat: ["read", "create", "update", "delete"],
        duyurular: ["read", "create", "update", "delete"],
        branches: ["read", "create", "update", "delete", "manage_all"],
        users: ["read", "create", "update", "delete", "assign_roles"],
    },
    "Saha Satis": {
        dashboard: ["read"],
        takvim: ["read", "create", "update", "delete"],
        orders: ["read", "create", "update"],
        magaza: ["read"],
        customers: ["read", "create", "update"],
        leads: ["read", "create", "update"],
        cargo: ["read"],
        yapilacaklar: ["read", "create", "update", "delete"],
        notlarim: ["read", "create", "update", "delete"],
        chat: ["read", "create"],
        duyurular: ["read"],
    },
    "Muhasebe": {
        dashboard: ["read"],
        financial: ["read", "create", "update", "delete"],
        orders: ["read"],
        customers: ["read"],
        files: ["read", "create"],
        notlarim: ["read", "create", "update", "delete"],
        chat: ["read", "create"],
        duyurular: ["read"],
    },
    "IK Personeli": {
        dashboard: ["read"],
        hr: ["read", "create", "update", "delete"],
        files: ["read", "create", "update"],
        notlarim: ["read", "create", "update", "delete"],
        chat: ["read", "create"],
        duyurular: ["read"],
    },
    "Depo Lojistik": {
        dashboard: ["read"],
        cargo: ["read", "create", "update", "delete"],
        orders: ["read", "update"],
        magaza: ["read"],
        files: ["read", "create"],
        duyurular: ["read"],
    },
}

const DEFAULT_MODULES = [
    { key: "dashboard", label: "Dashboard", sortOrder: 1 },
    { key: "takvim", label: "Takvim", sortOrder: 2 },
    { key: "orders", label: "Siparişler", sortOrder: 3 },
    { key: "magaza", label: "Mağaza (B2B)", sortOrder: 4 },
    { key: "customers", label: "Müşteriler", sortOrder: 5 },
    { key: "hr", label: "İnsan Kaynakları", sortOrder: 6 },
    { key: "projects", label: "Projeler", sortOrder: 7 },
    { key: "leads", label: "Potansiyeller", sortOrder: 8 },
    { key: "cargo", label: "Kargo", sortOrder: 9 },
    { key: "files", label: "Dosyalar", sortOrder: 10 },
    { key: "yapilacaklar", label: "Yapılacaklar", sortOrder: 11 },
    { key: "notlarim", label: "Notlarım", sortOrder: 12 },
    { key: "hesaplama", label: "Hesaplama Aracı", sortOrder: 13 },
    { key: "financial", label: "Finans", sortOrder: 14 },
    { key: "sosyal-medya", label: "Sosyal Medya", sortOrder: 15 },
    { key: "chat", label: "Chat", sortOrder: 16 },
    { key: "duyurular", label: "Duyurular", sortOrder: 17 },
]

function seed() {
    if (!fs.existsSync(dbPath)) {
        console.error('Local JSON database does not exist. Run next dev once to create it.')
        return
    }

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))

    // Initialize missing arrays
    if (!db.role) db.role = []
    if (!db.module) db.module = []
    if (!db.userSession) db.userSession = []
    if (!db.passwordResetLog) db.passwordResetLog = []

    // Seed roles
    for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
        const existingIdx = db.role.findIndex(r => r.name === name)
        const roleData = {
            id: existingIdx >= 0 ? db.role[existingIdx].id : `role-${name.toLowerCase().replace(' ', '-')}`,
            name,
            description: `${name} role`,
            permissions: JSON.stringify(permissions),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        if (existingIdx >= 0) {
            db.role[existingIdx] = roleData
        } else {
            db.role.push(roleData)
        }
    }

    // Seed modules
    for (const m of DEFAULT_MODULES) {
        const existingIdx = db.module.findIndex(mod => mod.key === m.key)
        const moduleData = {
            id: existingIdx >= 0 ? db.module[existingIdx].id : `module-${m.key}`,
            key: m.key,
            label: m.label,
            sortOrder: m.sortOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        if (existingIdx >= 0) {
            db.module[existingIdx] = moduleData
        } else {
            db.module.push(moduleData)
        }
    }

    // Update debug branch if it exists, otherwise add it
    if (!db.branch || db.branch.length === 0) {
        db.branch = [
            { id: "local-debug-branch", name: "Merkez Şube", code: "HQ", themeColor: "#3B82F6", address: "", phone: "", email: "", isActive: true }
        ]
    }

    // Update user branch role to point to Super Admin role
    const superAdminRole = db.role.find(r => r.name === 'Super Admin')
    if (superAdminRole && db.userBranchRole && db.userBranchRole.length > 0) {
        db.userBranchRole[0].roleId = superAdminRole.id
    }

    // Update user to have missing fields
    if (db.user && db.user.length > 0) {
        db.user[0].username = "cicekana.dev"
        db.user[0].fullName = "Test Geliştirici"
        db.user[0].password = "$2a$10$wOdfpW.x2g/X6B5q3B5q3Oy8mEa1sTq4R3xLp.M4z3v/H2j8lH2j8" // Admin123! hashed with bcryptjs
        db.user[0].isActive = true
    } else {
        db.user = [
            {
                id: "mock-user-id",
                username: "admin",
                fullName: "Sistem Yöneticisi",
                email: "admin@sistem.local",
                password: "$2a$10$wOdfpW.x2g/X6B5q3B5q3Oy8mEa1sTq4R3xLp.M4z3v/H2j8lH2j8", // Admin123!
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ]
        db.userBranchRole = [
            { id: "mock-ubr-1", userId: "mock-user-id", branchId: "local-debug-branch", roleId: superAdminRole.id }
        ]
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
    console.log('🎉 Local simulated JSON DB seeded successfully!')
}

seed()

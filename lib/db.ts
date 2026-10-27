import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma

// Start the Content Cron Service automatically on boot
import("@/lib/services/cronService").catch((err) => {
  console.error("Content Cron Service startup failed:", err)
})

// ═══════════════════════════════════════════════════════════════════════════════
// DEVRESILIENCE: YEREL HAFİF VERİTABANI VE İLİŞKİ SİMÜLATÖRÜ (JSON DB FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════════

const JSON_DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")

interface JsonDbData {
  libraryFile: any[]
  libraryFolder: any[]
  libraryFilePermission: any[]
  libraryConversionJob: any[]
  libraryActivityLog: any[]
  libraryUploadChunk: any[]
  contentStore: any[]
  niche: any[]
  userBranchRole: any[]
  user: any[]
  role: any[]
  userSession: any[]
  passwordResetLog: any[]
  module: any[]
  customer: any[]
  project: any[]
  lead: any[]
  order: any[]
  file: any[]
  reminder: any[]
  product: any[]
  branchPrice: any[]
  stockRequest: any[]
  cargoTracking: any[]
  message: any[]
  announcement: any[]
  auditLog: any[]
  todo: any[]
  note: any[]
  calculationHistory: any[]
  notification: any[]
  finance: any[]
  customerNote: any[]
  customerChat: any[]
  customerDocument: any[]
  customerTask: any[]
  taskStatusHistory: any[]
  contentCalendar: any[]
  customerContact: any[]
  candidate: any[]
  candidateDocument: any[]
  candidateChat: any[]
  appointment: any[]
  branch: any[]
  contentItem: any[]
  productionShoot: any[]
  contentMedia: any[]
  contentStatusHistory: any[]
  contentChatLink: any[]
  revisionRequest: any[]
  internalTask: any[]
  internalTaskStatusLog: any[]
  activeTask: any[]
  eodReport: any[]
  eodReportAuditLog: any[]
  supportTicket: any[]
  supportTicketAttachment: any[]
  faq: any[]
  // ── WhatsApp Chat Models ────────────────────────────
  chatConversation: any[]
  chatParticipant: any[]
  messageReaction: any[]
  messageReadReceipt: any[]
  messageMention: any[]
  pinnedMessage: any[]
  voiceMessage: any[]
  messageForward: any[]
  messageStar: any[]
  chatMuteSettings: any[]
  userPresence: any[]
  userBlock: any[]
  broadcastList: any[]
  broadcastListMember: any[]
  chatWallpaper: any[]
  // ── WhatsApp AI Agent Tables ─────────────────────
  aiKnowledgeChunk: any[]
  aiConversationMemory: any[]
  aiAgentLog: any[]
  trashItem: any[]
}

const initialData: JsonDbData = {
  libraryFile: [],
  libraryFolder: [],
  libraryFilePermission: [],
  libraryConversionJob: [],
  libraryActivityLog: [],
  libraryUploadChunk: [],
  contentStore: [],
  niche: [],
  faq: [],
  customer: [],
  userSession: [],
  passwordResetLog: [],
  module: [],
  project: [],
  lead: [],
  order: [],
  file: [],
  reminder: [],
  product: [],
  branchPrice: [],
  stockRequest: [],
  cargoTracking: [],
  message: [],
  announcement: [],
  auditLog: [],
  todo: [],
  note: [],
  calculationHistory: [],
  notification: [],
  finance: [],
  customerNote: [],
  customerChat: [],
  customerDocument: [],
  customerTask: [],
  taskStatusHistory: [],
  contentCalendar: [],
  customerContact: [],
  candidate: [],
  candidateDocument: [],
  candidateChat: [],
  appointment: [],
  contentItem: [],
  productionShoot: [],
  contentMedia: [],
  contentStatusHistory: [],
  contentChatLink: [],
  revisionRequest: [],
  internalTask: [],
  internalTaskStatusLog: [],
  activeTask: [],
  eodReport: [],
  eodReportAuditLog: [],
  branch: [
    { id: "local-debug-branch", name: "Merkez Şube", code: "HQ", themeColor: "#3B82F6" }
  ],
  userBranchRole: [
    { id: "mock-ubr-1", userId: "local-debug-user", branchId: "local-debug-branch", roleId: "mock-role-id" }
  ],
  user: [
    { id: "local-debug-user", username: "cicekana.dev", fullName: "Test Geliştirici", email: "dev@cicekana.local", avatarUrl: null, isActive: true }
  ],
  role: [],
  // ── WhatsApp Chat Initial Datasets ──────────────────
  chatConversation: [],
  chatParticipant: [],
  messageReaction: [],
  messageReadReceipt: [],
  messageMention: [],
  pinnedMessage: [],
  voiceMessage: [],
  messageForward: [],
  messageStar: [],
  chatMuteSettings: [],
  userPresence: [],
  userBlock: [],
  broadcastList: [],
  broadcastListMember: [],
  chatWallpaper: [],
  supportTicket: [],
  supportTicketAttachment: [],
  trashItem: [],
  // ── WhatsApp AI Agent Initial Datasets ──────────────
  aiKnowledgeChunk: [],
  aiConversationMemory: [],
  aiAgentLog: []
}

// JSON DB Yardımcıları
function readJsonDb(): JsonDbData {
  try {
    if (!fs.existsSync(JSON_DB_PATH)) {
      fs.mkdirSync(path.dirname(JSON_DB_PATH), { recursive: true })
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialData, null, 2), "utf8")
      return initialData
    }
    const content = fs.readFileSync(JSON_DB_PATH, "utf8")
    const parsed = JSON.parse(content)
    let changed = false
    for (const key in initialData) {
      if (!(key in parsed)) {
        parsed[key] = (initialData as any)[key]
        changed = true
      }
    }
    if (changed) {
      writeJsonDb(parsed)
    }
    return parsed
  } catch (err) {
    console.error("[DEVRESILIENCE] JSON DB okuma hatası, varsayılan veri dönüyor:", err)
    return initialData
  }
}

function writeJsonDb(data: JsonDbData) {
  try {
    fs.mkdirSync(path.dirname(JSON_DB_PATH), { recursive: true })
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf8")
  } catch (err) {
    console.error("[DEVRESILIENCE] JSON DB yazma hatası:", err)
  }
}

// Prisma metodlarını simüle eden nesne
class ModelSimulate {
  constructor(private modelName: keyof JsonDbData) {}

  private getCollection(): any[] {
    const db = readJsonDb()
    if (!db[this.modelName]) {
      db[this.modelName] = []
      writeJsonDb(db)
    }
    return db[this.modelName]
  }

  private saveCollection(collection: any[]) {
    const db = readJsonDb()
    db[this.modelName] = collection
    writeJsonDb(db)
  }

  private filterByWhere(items: any[], where: any): any[] {
    if (!where) return items
    return items.filter((item) => {
      for (const [key, value] of Object.entries(where)) {
        if (value === undefined) continue
        
        // nested objects like { in: [...] } veya { contains: "text" }
        if (value && typeof value === "object") {
          const valObj = value as any
          if ("in" in valObj) {
            if (!Array.isArray(valObj.in)) return false
            if (!valObj.in.includes(item[key])) return false
            continue
          }
          if ("contains" in valObj) {
            const query = String(valObj.contains).toLowerCase()
            const itemVal = String(item[key] ?? "").toLowerCase()
            if (!itemVal.includes(query)) return false
            continue
          }
          if ("startsWith" in valObj) {
            const query = String(valObj.startsWith).toLowerCase()
            const itemVal = String(item[key] ?? "").toLowerCase()
            if (!itemVal.startsWith(query)) return false
            continue
          }
        }

        // Normal eşleşme (Prisma'da NULL ile undefined yerel JSON eşleşmesini düzeltmek için)
        let itemVal = item[key]
        if (typeof value === "boolean" && (itemVal === undefined || itemVal === null)) {
          itemVal = false
        } else if (itemVal === undefined) {
          itemVal = null
        }
        
        const queryVal = value === undefined ? null : value
        if (itemVal !== queryVal) return false
      }
      return true
    })
  }

  private enrichItem(item: any, include: any): any {
    const db = readJsonDb()
    const enriched = { ...item }

    // Dinamik _count hesaplamaları
    const fileVersions = db.libraryFile.filter((f) => f.parentFileId === item.id).length
    const derivedFiles = db.libraryFile.filter((f) => f.derivedFromFileId === item.id).length
    const filesCount = db.libraryFile.filter((f) => f.folderId === item.id).length
    const childFoldersCount = db.libraryFolder.filter((f) => f.parentFolderId === item.id).length

    enriched._count = {
      fileVersions,
      derivedFiles,
      files: filesCount,
      childFolders: childFoldersCount,
    }

    // İlişki dahil etme (include) simülasyonu
    if (include) {
      if (include.uploadedBy || include.user) {
        enriched.uploadedBy = db.user[0] ?? { fullName: "Test Geliştirici" }
        enriched.user = db.user[0] ?? { fullName: "Test Geliştirici" }
      }
      if (include.folder) {
        enriched.folder = db.libraryFolder.find((f) => f.id === item.folderId) ?? null
      }
      if (include.file && item.fileId) {
        enriched.file = db.libraryFile.find((f) => f.id === item.fileId)
      }
      if (include.fileVersions) {
        enriched.fileVersions = db.libraryFile.filter((f) => f.parentFileId === item.id)
      }
      if (include.derivedFiles) {
        enriched.derivedFiles = db.libraryFile.filter((f) => f.derivedFromFileId === item.id)
      }
    }

    if (this.modelName === "contentStore" && include) {
      if (include.niche) {
        enriched.niche = db.niche.find((n: any) => n.id === item.nicheId) ?? { id: item.nicheId, name: "Genel" }
      }
      if (include.uploadedBy) {
        enriched.uploadedBy = db.user[0] ?? { fullName: "Test Geliştirici" }
      }
    }

    if (this.modelName === "user" && include) {
      if (include.branches) {
        const ubrs = (db.userBranchRole || []).filter((ubr: any) => ubr.userId === item.id)
        enriched.branches = ubrs.map((ubr: any) => {
          const br = (db.branch || []).find((b: any) => b.id === ubr.branchId)
          const roleName = ubr.roleId === "mock-role-id" ? "Super Admin" : "Personel"
          return {
            ...ubr,
            branch: br ?? { id: ubr.branchId, name: "Şube", themeColor: "#3B82F6" },
            role: { id: ubr.roleId, name: roleName }
          }
        })
      }
    }

    if (this.modelName === "contentItem" && include) {
      if (include.branch) {
        enriched.branch = db.branch.find((b: any) => b.id === item.branchId) ?? { id: item.branchId, name: "Merkez Şube", themeColor: "#3B82F6" }
      }
      if (include.shoot) {
        enriched.shoot = item.shootId ? (db.productionShoot.find((s: any) => s.id === item.shootId) ?? null) : null
      }
      if (include.media) {
        enriched.media = db.contentMedia.filter((m: any) => m.contentItemId === item.id)
      }
      if (include.statusHistory) {
        enriched.statusHistory = db.contentStatusHistory.filter((h: any) => h.entityId === item.id && h.entityType === "content_item")
      }
      if (include.chatLinks) {
        enriched.chatLinks = db.contentChatLink.filter((c: any) => c.contentItemId === item.id)
      }
      if (include.revisions) {
        enriched.revisions = db.revisionRequest.filter((r: any) => r.contentItemId === item.id)
      }
    }

    if (this.modelName === "revisionRequest" && include) {
      if (include.createdBy) {
        enriched.createdBy = db.user.find((u: any) => u.id === item.createdById) ?? db.user[0] ?? { id: item.createdById, fullName: "Test Geliştirici" }
      }
      if (include.completedBy) {
        enriched.completedBy = item.completedById ? (db.user.find((u: any) => u.id === item.completedById) ?? null) : null
      }
    }

    if (this.modelName === "internalTask" && include) {
      if (include.assignee) {
        enriched.assignee = db.user.find((u: any) => u.id === item.assigneeId) ?? db.user[0]
      }
      if (include.assigner) {
        enriched.assigner = db.user.find((u: any) => u.id === item.assignerId) ?? db.user[0]
      }
      if (include.branch) {
        enriched.branch = db.branch.find((b: any) => b.id === item.branchId) ?? null
      }
    }

    if (this.modelName === "eodReport" && include) {
      if (include.user) {
        enriched.user = db.user.find((u: any) => u.id === item.userId) ?? db.user[0]
      }
      if (include.auditLogs) {
        enriched.auditLogs = db.eodReportAuditLog.filter((l: any) => l.reportId === item.id)
      }
    }

    if (this.modelName === "eodReportAuditLog" && include) {
      if (include.report) {
        enriched.report = db.eodReport.find((r: any) => r.id === item.reportId) ?? null
      }
    }

    if (this.modelName === "activeTask" && include) {
      if (include.user) {
        enriched.user = db.user.find((u: any) => u.id === item.userId) ?? db.user[0]
      }
      if (include.task) {
        enriched.task = (db.internalTask || []).find((t: any) => t.id === item.taskId) ?? null
      }
    }

    if (this.modelName === "internalTaskStatusLog" && include) {
      if (include.user) {
        enriched.user = db.user.find((u: any) => u.id === item.userId) ?? db.user[0]
      }
      if (include.task) {
        enriched.task = (db.internalTask || []).find((t: any) => t.id === item.taskId) ?? null
      }
    }

    if (this.modelName === "supportTicket" && include) {
      if (include.reporter) {
        enriched.reporter = db.user.find((u: any) => u.id === item.reporterUserId) ?? db.user[0] ?? { id: item.reporterUserId, fullName: "Test Kullanıcı" }
      }
      if (include.assignedUser) {
        enriched.assignedUser = item.assignedTo ? (db.user.find((u: any) => u.id === item.assignedTo) ?? null) : null
      }
      if (include.attachments) {
        enriched.attachments = db.supportTicketAttachment.filter((a: any) => a.ticketId === item.id)
      }
    }

    if (this.modelName === "supportTicketAttachment" && include) {
      if (include.ticket) {
        enriched.ticket = db.supportTicket.find((t: any) => t.id === item.ticketId) ?? null
      }
    }

    if (this.modelName === "customer" && include) {
      if (include.branch) enriched.branch = db.branch.find((b: any) => b.id === item.branchId) ?? null
      if (include.notes) enriched.notes = (db.customerNote || []).filter((n: any) => n.customerId === item.id)
      if (include.chats) enriched.chats = (db.customerChat || []).filter((c: any) => c.customerId === item.id)
      if (include.documents) enriched.documents = (db.customerDocument || []).filter((d: any) => d.customerId === item.id)
      if (include.tasks) enriched.tasks = (db.customerTask || []).filter((t: any) => t.customerId === item.id)
      if (include.contacts) enriched.contacts = (db.customerContact || []).filter((c: any) => c.customerId === item.id)
      if (include.orders) enriched.orders = (db.order || []).filter((o: any) => o.customerId === item.id)
    }

    if (this.modelName === "order" && include) {
      if (include.customer) enriched.customer = (db.customer || []).find((c: any) => c.id === item.customerId) ?? null
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    if (this.modelName === "lead" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
      if (include.createdBy) enriched.createdBy = (db.user || []).find((u: any) => u.id === item.createdById) ?? db.user[0] ?? null
    }

    if (this.modelName === "project" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    if (this.modelName === "finance" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    if (this.modelName === "cargoTracking" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    if (this.modelName === "product" && include) {
      if (include.prices) {
        enriched.prices = (db.branchPrice || []).filter((bp: any) => bp.productId === item.id).map((bp: any) => ({
          ...bp,
          branch: (db.branch || []).find((b: any) => b.id === bp.branchId) ?? null
        }))
      }
      if (include.stockRequests) enriched.stockRequests = (db.stockRequest || []).filter((sr: any) => sr.productId === item.id)
    }

    if (this.modelName === "branchPrice" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
      if (include.product) enriched.product = (db.product || []).find((p: any) => p.id === item.productId) ?? null
    }

    if (this.modelName === "stockRequest" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
      if (include.product) enriched.product = (db.product || []).find((p: any) => p.id === item.productId) ?? null
    }

    if (this.modelName === "candidate" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
      if (include.documents) enriched.documents = (db.candidateDocument || []).filter((d: any) => d.candidateId === item.id)
      if (include.chats) enriched.chats = (db.candidateChat || []).filter((c: any) => c.candidateId === item.id)
    }

    if (this.modelName === "chatConversation" && include) {
      if (include.participants) {
        enriched.participants = (db.chatParticipant || []).filter((p: any) => p.conversationId === item.id).map((p: any) => ({
          ...p,
          user: (db.user || []).find((u: any) => u.id === p.userId) ?? { fullName: "Kullanıcı" }
        }))
      }
      if (include.messages) {
        const msgs = (db.message || []).filter((m: any) => m.conversationId === item.id && !m.isDeleted)
        enriched.messages = msgs.slice(-1).map((m: any) => ({
          ...m,
          fromUser: (db.user || []).find((u: any) => u.id === m.fromUserId) ?? { fullName: "Kullanıcı" },
          reactions: (db.messageReaction || []).filter((r: any) => r.messageId === m.id).map((r: any) => ({
            ...r,
            user: (db.user || []).find((u: any) => u.id === r.userId) ?? { fullName: "Kullanıcı" }
          })),
          readReceipts: (db.messageReadReceipt || []).filter((rr: any) => rr.messageId === m.id)
        }))
      }
      if (include.pinnedMessages) {
        enriched.pinnedMessages = (db.pinnedMessage || []).filter((pm: any) => pm.conversationId === item.id).map((pm: any) => ({
          ...pm,
          message: (db.message || []).find((m: any) => m.id === pm.messageId) ?? null
        }))
      }
      if (include.muteSettings) {
        enriched.muteSettings = (db.chatMuteSettings || []).filter((ms: any) => ms.conversationId === item.id)
      }
    }

    if (this.modelName === "message" && include) {
      if (include.fromUser) enriched.fromUser = (db.user || []).find((u: any) => u.id === item.fromUserId) ?? db.user[0] ?? { fullName: "Kullanıcı" }
      if (include.reactions) {
        enriched.reactions = (db.messageReaction || []).filter((r: any) => r.messageId === item.id).map((r: any) => ({
          ...r,
          user: (db.user || []).find((u: any) => u.id === r.userId) ?? { fullName: "Kullanıcı" }
        }))
      }
      if (include.readReceipts) enriched.readReceipts = (db.messageReadReceipt || []).filter((rr: any) => rr.messageId === item.id)
      if (include.replyToMessage && item.replyToMessageId) {
        enriched.replyToMessage = (db.message || []).find((m: any) => m.id === item.replyToMessageId) ?? null
      }
    }

    if (this.modelName === "trashItem" && include) {
      if (include.user) enriched.user = (db.user || []).find((u: any) => u.id === item.deletedByUserId) ?? db.user[0] ?? { fullName: item.deletedByFullName }
      if (include.branch) enriched.branch = item.branchId ? ((db.branch || []).find((b: any) => b.id === item.branchId) ?? null) : null
    }

    if (this.modelName === "todo" && include) {
      if (include.user) enriched.user = (db.user || []).find((u: any) => u.id === item.userId) ?? db.user[0]
    }

    if (this.modelName === "note" && include) {
      if (include.user) enriched.user = (db.user || []).find((u: any) => u.id === item.userId) ?? db.user[0]
    }

    if (this.modelName === "announcement" && include) {
      if (include.createdBy) enriched.createdBy = (db.user || []).find((u: any) => u.id === item.createdById) ?? db.user[0]
    }

    if (this.modelName === "appointment" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    if (this.modelName === "reminder" && include) {
      if (include.branch) enriched.branch = (db.branch || []).find((b: any) => b.id === item.branchId) ?? null
    }

    return enriched
  }

  async findMany(args: any = {}) {
    let items = [...this.getCollection()]
    items = this.filterByWhere(items, args.where)

    // Sıralama
    if (args.orderBy) {
      const orderKey = Object.keys(args.orderBy)[0]
      const orderDir = args.orderBy[orderKey]
      items.sort((a, b) => {
        let valA = a[orderKey]
        let valB = b[orderKey]
        if (valA instanceof Date) valA = valA.getTime()
        if (valB instanceof Date) valB = valB.getTime()
        
        if (valA < valB) return orderDir === "asc" ? -1 : 1
        if (valA > valB) return orderDir === "asc" ? 1 : -1
        return 0
      })
    }

    // Skip & Take
    const skip = args.skip ?? 0
    const take = args.take ?? items.length
    items = items.slice(skip, skip + take)

    // İlişki ve sayaç zenginleştirme
    return items.map((item) => this.enrichItem(item, args.include))
  }

  async findUnique(args: any = {}) {
    const items = this.getCollection()
    const match = items.find((item) => {
      if (args.where.id) return item.id === args.where.id
      return false
    })
    return match ? this.enrichItem(match, args.include) : null
  }

  async findFirst(args: any = {}) {
    const items = await this.findMany(args)
    return items.length > 0 ? items[0] : null
  }

  async count(args: any = {}) {
    const items = this.getCollection()
    const filtered = this.filterByWhere(items, args.where)
    return filtered.length
  }

  async aggregate(args: any = {}) {
    const items = this.getCollection()
    const filtered = this.filterByWhere(items, args.where)
    const sumBytes = filtered.reduce((acc, item) => acc + Number(item.sizeBytes ?? 0), 0)
    return {
      _sum: { sizeBytes: sumBytes }
    }
  }

  async groupBy(args: any = {}) {
    const items = this.getCollection()
    const filtered = this.filterByWhere(items, args.where)

    const groups: Record<string, any[]> = {}
    for (const item of filtered) {
      const keyObj: Record<string, any> = {}
      for (const field of args.by || []) {
        keyObj[field] = item[field]
      }
      const keyStr = JSON.stringify(keyObj)
      if (!groups[keyStr]) {
        groups[keyStr] = []
      }
      groups[keyStr].push(item)
    }

    const result = []
    for (const [keyStr, groupItems] of Object.entries(groups)) {
      const groupKey = JSON.parse(keyStr)
      const groupResult: any = { ...groupKey }

      if (args._count) {
        groupResult._count = {}
        for (const [field, shouldCount] of Object.entries(args._count)) {
          if (shouldCount) {
            if (field === "_all") {
              groupResult._count._all = groupItems.length
            } else {
              groupResult._count[field] = groupItems.filter(item => item[field] !== null && item[field] !== undefined).length
            }
          }
        }
      }

      if (args._sum) {
        groupResult._sum = {}
        for (const [field, shouldSum] of Object.entries(args._sum)) {
          if (shouldSum) {
            groupResult._sum[field] = groupItems.reduce((acc, item) => acc + Number(item[field] ?? 0), 0)
          }
        }
      }

      result.push(groupResult)
    }

    return result
  }

  async create(args: any = {}) {
    const collection = this.getCollection()
    const newItem = {
      id: args.data.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...args.data,
    }
    collection.push(newItem)
    this.saveCollection(collection)
    return newItem
  }

  async upsert(args: any = {}) {
    let match = null
    const collection = this.getCollection()
    if (args.where) {
      match = collection.find((item) => {
        for (const [key, value] of Object.entries(args.where)) {
          if (item[key] === value) return true
        }
        return false
      })
    }

    if (match) {
      const idx = collection.findIndex((item) => item.id === match.id)
      collection[idx] = {
        ...collection[idx],
        ...args.update,
        updatedAt: new Date().toISOString()
      }
      this.saveCollection(collection)
      return collection[idx]
    } else {
      const newItem = {
        id: args.create.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...args.create,
      }
      collection.push(newItem)
      this.saveCollection(collection)
      return newItem
    }
  }

  async update(args: any = {}) {
    const collection = this.getCollection()
    const idx = collection.findIndex((item) => item.id === args.where.id)
    if (idx === -1) throw new Error(`Kayıt bulunamadı: ${args.where.id}`)
    
    collection[idx] = {
      ...collection[idx],
      ...args.data,
      updatedAt: new Date().toISOString()
    }
    this.saveCollection(collection)
    return collection[idx]
  }

  async delete(args: any = {}) {
    const collection = this.getCollection()
    const idx = collection.findIndex((item) => item.id === args.where.id)
    if (idx === -1) throw new Error(`Kayıt bulunamadı: ${args.where.id}`)
    const deleted = collection.splice(idx, 1)[0]
    this.saveCollection(collection)
    return deleted
  }

  async updateMany(args: any = {}) {
    const collection = this.getCollection()
    let count = 0
    const updated = collection.map((item) => {
      // Eşleşiyorsa güncelle
      const isMatch = Object.entries(args.where ?? {}).every(([k, v]) => item[k] === v)
      if (isMatch) {
        count++
        return { ...item, ...args.data, updatedAt: new Date().toISOString() }
      }
      return item
    })
    this.saveCollection(updated)
    return { count }
  }

  async createMany(args: any = {}) {
    const collection = this.getCollection()
    const newItems = (args.data || []).map((item: any) => ({
      id: item.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    }))
    collection.push(...newItems)
    this.saveCollection(collection)
    return { count: newItems.length }
  }

  async deleteMany(args: any = {}) {
    const collection = this.getCollection()
    const initialCount = collection.length
    const remaining = this.filterByWhere(collection, args.where)
    const matchingIds = new Set(remaining.map(item => item.id))
    const kept = collection.filter(item => !matchingIds.has(item.id))
    this.saveCollection(kept)
    return { count: initialCount - kept.length }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT PROXY INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

export const prisma = new Proxy(rawPrisma, {
  get(target, prop) {
    const propStr = String(prop)
    const fallbackModels = [
      "supportTicket",
      "supportTicketAttachment",
      "libraryFile",
      "libraryFolder",
      "libraryFilePermission",
      "libraryConversionJob",
      "libraryActivityLog",
      "libraryUploadChunk",
      "userBranchRole",
      "user",
      "role",
      "userSession",
      "passwordResetLog",
      "module",
      "contentStore",
      "niche",
      "customer",
      "project",
      "lead",
      "order",
      "file",
      "reminder",
      "product",
      "branchPrice",
      "stockRequest",
      "cargoTracking",
      "message",
      "announcement",
      "auditLog",
      "todo",
      "note",
      "calculationHistory",
      "notification",
      "finance",
      "customerNote",
      "customerChat",
      "customerDocument",
      "customerTask",
      "taskStatusHistory",
      "contentCalendar",
      "customerContact",
      "candidate",
      "candidateDocument",
      "candidateChat",
      "appointment",
      "branch",
      "contentItem",
      "productionShoot",
      "contentMedia",
      "contentStatusHistory",
      "contentChatLink",
      "revisionRequest",
      "internalTask",
      "internalTaskStatusLog",
      "activeTask",
      "eodReport",
      "eodReportAuditLog",
      "faq",
      "trashItem",
      // ── WhatsApp Chat Models ────────────────────────────
      "chatConversation",
      "chatParticipant",
      "messageReaction",
      "messageReadReceipt",
      "messageMention",
      "pinnedMessage",
      "voiceMessage",
      "messageForward",
      "messageStar",
      "chatMuteSettings",
      "userPresence",
      "userBlock",
      "broadcastList",
      "broadcastListMember",
      "chatWallpaper"
    ]

    // $queryRaw stats simülasyonu (yerel test için veritabanı kapalıyken istatistik grafiklerini çalıştırır)
    if (propStr === "$queryRaw" || propStr === "$queryRawUnsafe") {
      return async function (...args: any[]) {
        try {
          return await (target as any)[prop].apply(target, args)
        } catch (err: any) {
          const isConnectionError = 
            err.message?.includes("P1001") || 
            err.message?.includes("Can't reach database")

          if (isConnectionError) {
            const sql = args[0] ? String(args[0]) : ""
            if (sql.includes("LibraryFile") && sql.includes("mimeType")) {
              const db = readJsonDb()
              const activeFiles = db.libraryFile.filter((f) => !f.isTrashed)
              const breakdown: Record<string, { count: number; total_size: number }> = {}
              for (const f of activeFiles) {
                let cat = "other"
                const mime = f.mimeType ?? ""
                if (mime.startsWith("image/")) cat = "image"
                else if (mime.startsWith("video/")) cat = "video"
                else if (mime.startsWith("audio/")) cat = "audio"
                else if (mime === "application/pdf" || mime.includes("vnd") || mime.includes("ms") || mime.startsWith("text/")) cat = "document"
                else if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) cat = "archive"

                if (!breakdown[cat]) breakdown[cat] = { count: 0, total_size: 0 }
                breakdown[cat].count++
                breakdown[cat].total_size += Number(f.sizeBytes ?? 0)
              }
              return Object.entries(breakdown).map(([cat, val]) => ({
                mime_prefix: cat,
                count: BigInt(val.count),
                total_size: BigInt(val.total_size)
              }))
            }
            return []
          }
          throw err
        }
      }
    }

    if (fallbackModels.includes(propStr)) {
      const dbProp = target[propStr as keyof typeof target]
      
      // Şemada tanımlı değilse doğrudan local simülasyona yönlendir
      if (dbProp === undefined) {
        console.warn(`[DEVRESILIENCE] '${propStr}' şemada bulunamadı, yerel JSON DB kullanılıyor.`)
        return new ModelSimulate(propStr as keyof JsonDbData)
      }

      // Şemada varsa bile, bir metot çağrıldığında DB bağlantısı kopuksa (P1001) otomatik yakalamak için metotları sarmalayalım
      return new Proxy(dbProp as any, {
        get(modelTarget, modelProp) {
          const originalMethod = modelTarget[modelProp]
          if (typeof originalMethod !== "function") return originalMethod

          return async function (...args: any[]) {
            try {
              // 1. Orijinal Prisma çağrısını dene
              return await originalMethod.apply(modelTarget, args)
            } catch (err: any) {
              const isConnectionError = 
                err.message?.includes("P1001") || 
                err.message?.includes("Can't reach database") ||
                err.message?.includes("connection") ||
                err.code === "P1001"

              if (isConnectionError) {
                console.warn(
                  `[DEVRESILIENCE] Veritabanı çevrimdışı (P1001). ` +
                  `'${propStr}.${String(modelProp)}' isteği otomatik olarak yerel JSON DB'ye yönlendirildi.`
                )
                const simulator = new ModelSimulate(propStr as keyof JsonDbData)
                const simMethod = (simulator as any)[modelProp]
                if (typeof simMethod === "function") {
                  return await simMethod.apply(simulator, args)
                }
              }
              throw err // Diğer hataları normal fırlat
            }
          }
        }
      })
    }

    // Diğer tüm Prisma özellikleri/metotları için genel kurtarıcı proxy
    const originalValue = (target as any)[prop]
    if (typeof originalValue === "function") {
      return function (...args: any[]) {
        try {
          const res = originalValue.apply(target, args)
          if (res && typeof res.then === "function") {
            return res.catch((err: any) => {
              if (err.message?.includes("P1001") || err.message?.includes("Can't reach database")) {
                console.warn("[DEVRESILIENCE] Ham Prisma raw sorgusu veritabanı kapalıyken yoksayıldı veya simüle edildi.")
                return []
              }
              throw err
            })
          }
          return res
        } catch (err: any) {
          if (err.message?.includes("P1001") || err.message?.includes("Can't reach database")) {
            return []
          }
          throw err
        }
      }
    }

    return originalValue
  }
})

"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { FilePicker } from "@/components/shared/file-picker"

interface Branch {
  id: string
  name: string
}

interface FileDelivery {
  id: string
  fromBranchId?: string
  fromBranchName?: string
  fromUserId?: string
  fromUserName?: string
  toBranchId?: string
  toBranchName?: string
  toUserId?: string
  toUserName?: string
  trackingNumber: string
  title: string
  description?: string
  fileUrls: string[]
  status: "sent" | "received" | "acknowledged" | "completed"
  priority: "low" | "normal" | "high" | "urgent"
  sentAt: string
  receivedAt?: string
  completedAt?: string
}

interface User {
  id: string
  name: string
}

interface CreateDeliveryInput {
  fromBranchId?: string
  fromUserId?: string
  toBranchId?: string
  toUserId?: string
  title: string
  description: string
  fileUrls: string[]
  priority: string
}

export default function FilesPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch, userBranches } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("dosyalar", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])
  const [deliveries, setDeliveries] = useState<FileDelivery[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<FileDelivery | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetType, setTargetType] = useState<"branch" | "user">("branch")

  const [formData, setFormData] = useState<CreateDeliveryInput>({
    fromBranchId: "",
    toBranchId: "",
    toUserId: "",
    title: "",
    description: "",
    fileUrls: [],
    priority: "normal",
  })

  const [statusUpdate, setStatusUpdate] = useState({
    status: "" as FileDelivery["status"],
    notes: "",
  })

  useEffect(() => {
    if (currentBranch) {
      loadData()
      loadBranches()
      loadUsers()
    }
  }, [currentBranch])

  const loadBranches = async () => {
    try {
      const res = await fetch("/api/branches")
      if (res.ok) {
        const data = await res.json()
        setBranches(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to load branches:", error)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  const loadData = async () => {
    if (!currentBranch) {
      setDeliveries([])
      return
    }

    try {
      const res = await fetch(`/api/files?branchId=${currentBranch.id}`)
      if (res.ok) {
        const data = await res.json()
        setDeliveries(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to load deliveries:", error)
    }

    setFormData((prev) => ({ ...prev, fromBranchId: currentBranch.id }))
  }

  const handleCreate = async () => {
    if (!formData.title || (!formData.toBranchId && !formData.toUserId) || formData.fileUrls.length === 0 || !currentBranch) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        fromBranchId: currentBranch.id,
        toBranchId: targetType === "branch" ? formData.toBranchId : null,
        toUserId: targetType === "user" ? formData.toUserId : null,
      }

      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await loadData()
        setIsCreateDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error creating delivery:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedDelivery || !statusUpdate.status) return

    setLoading(true)
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDelivery.id,
          status: statusUpdate.status,
        }),
      })

      if (res.ok) {
        await loadData()
        setIsStatusDialogOpen(false)
        setSelectedDelivery(null)
        setStatusUpdate({ status: "" as FileDelivery["status"], notes: "" })
      }
    } catch (error) {
      console.error("Error updating delivery:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fromBranchId: currentBranch?.id || "",
      toBranchId: "",
      toUserId: "",
      title: "",
      description: "",
      fileUrls: [],
      priority: "normal",
    })
    setTargetType("branch")
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "sent") {
      return matchesSearch && delivery.fromBranchId === currentBranch?.id
    } else if (activeTab === "received") {
      return matchesSearch && (delivery.toBranchId === currentBranch?.id || delivery.toUserId)
    }

    return matchesSearch
  })

  const stats = {
    sent: deliveries.filter((d) => d.fromBranchId === currentBranch?.id).length,
    received: deliveries.filter((d) => d.toBranchId === currentBranch?.id || d.toUserId).length,
    pending: deliveries.filter((d) => d.status === "sent" && (d.toBranchId === currentBranch?.id || d.toUserId)).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dosya Teslimati</h1>
          <p className="text-sm text-gray-500 mt-1">Hizli ve guvenli dosya paylasimi</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Gonderilen</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.sent}</div>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Alinan</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.received}</div>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bekleyen</h3>
          <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tumu
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'sent' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Gonderilen
              </button>
              <button
                onClick={() => setActiveTab("received")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'received' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Alinan
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Dosya veya takip no ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Yeni Gonderim
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Takip No</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Baslik</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gonderen â†’ Alan</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dosyalar</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Oncelik</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:border-gray-800">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-gray-300">description</span>
                      <p className="text-sm font-medium">Dosya kaydi bulunamadi</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => {
                  const StatusIcon = statusColors[delivery.status].icon
                  return (
                    <tr key={delivery.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 py-1 px-2 rounded-md inline-block">{delivery.trackingNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white leading-tight">{delivery.title}</div>
                        {delivery.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 italic">{delivery.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <span className="material-symbols-outlined text-[14px]">account_circle</span>
                            {delivery.fromUserName || delivery.fromBranchName}
                          </div>
                          <span className="material-symbols-outlined text-[14px] text-gray-400">arrow_forward</span>
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <span className="material-symbols-outlined text-[14px]">account_circle</span>
                            {delivery.toUserName || delivery.toBranchName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-[16px]">attach_file</span>
                          {delivery.fileUrls.length} Dosya
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[delivery.priority]}`}>
                          {delivery.priority === "low" ? "Dusuk" : delivery.priority === "normal" ? "Normal" : delivery.priority === "high" ? "Yuksek" : "Acil"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold ${statusColors[delivery.status].bg} ${statusColors[delivery.status].text}`}>
                          <span className="material-symbols-outlined text-[14px]">{StatusIcon}</span>
                          {delivery.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedDelivery(delivery)
                              setStatusUpdate({ status: delivery.status, notes: "" })
                              setIsStatusDialogOpen(true)
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[18px]">update</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Bu teslimati silmek istediginize emin misiniz?")) {
                                try {
                                  const res = await fetch(`/api/files?id=${delivery.id}`, { method: "DELETE" })
                                  if (res.ok) {
                                    loadData()
                                  }
                                } catch (error) {
                                  console.error("Error deleting delivery:", error)
                                }
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Delivery Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Dosya Gonderimi</h3>
                <p className="text-sm text-gray-500">Guvenli dosya paylasimi baslatin</p>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alici Turu</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetType("branch")}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${targetType === 'branch' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-800 text-gray-500'}`}
                  >
                    <span className="material-symbols-outlined text-[18px] align-middle mr-1.5">storefront</span>
                    Sube
                  </button>
                  <button
                    onClick={() => setTargetType("user")}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${targetType === 'user' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-800 text-gray-500'}`}
                  >
                    <span className="material-symbols-outlined text-[18px] align-middle mr-1.5">person</span>
                    Kisi
                  </button>
                </div>
              </div>

              {targetType === "branch" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hedef Sube *</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">Sube secin</option>
                    {branches
                      .filter((b) => b.id !== currentBranch?.id)
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hedef Kisi *</label>
                  <select
                    value={formData.toUserId}
                    onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">Kisi secin</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslik *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Gonderim amaci..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ek detaylar..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <FilePicker
                  label="Dosyalar *"
                  maxFiles={5}
                  onFilesSelected={(urls) => setFormData(prev => ({ ...prev, fileUrls: urls }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Oncelik</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="low">Dusuk</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yuksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/10 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.title || (!formData.toBranchId && !formData.toUserId) || formData.fileUrls.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
              >
                {loading ? "Hazirlaniyor..." : "Gonderimi Baslat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Durum Guncelle</h3>
                <p className="text-xs text-gray-500 uppercase font-mono mt-1">
                  {selectedDelivery?.trackingNumber}
                </p>
              </div>
              <button onClick={() => setIsStatusDialogOpen(false)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yeni Durum</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value as FileDelivery["status"] })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="sent">Gonderildi</option>
                  <option value="received">Alindi</option>
                  <option value="acknowledged">Onaylandi</option>
                  <option value="completed">Tamamlandi</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Islem Notu</label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Degisiklik sebebi..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/10 flex justify-end gap-3">
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.status}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
              >
                {loading ? "Giris Yapiliyor..." : "Durumu Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const statusColors = {
  sent: { bg: "bg-blue-50 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", icon: "send" },
  received: { bg: "bg-orange-50 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", icon: "inbox" },
  acknowledged: { bg: "bg-purple-50 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", icon: "task_alt" },
  completed: { bg: "bg-green-50 dark:bg-green-500/20", text: "text-green-600 dark:text-green-400", icon: "check_circle" },
}

const priorityColors = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  normal: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

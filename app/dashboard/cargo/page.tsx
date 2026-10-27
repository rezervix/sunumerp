"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

const statusConfig = {
    in_transit: { label: "Kargoda", bg: "bg-blue-500/10", text: "text-blue-500", icon: "local_shipping" },
    delivered: { label: "Teslim Edildi", bg: "bg-green-500/10", text: "text-green-500", icon: "check_circle" },
    returned: { label: "İade", bg: "bg-orange-500/10", text: "text-orange-500", icon: "package" },
    lost: { label: "Kayıp", bg: "bg-red-500/10", text: "text-red-500", icon: "cancel_presentation" },
}

const fileStatusConfig = {
    sent: { label: "Gönderildi", bg: "bg-blue-500/10", text: "text-blue-500", icon: "send" },
    received: { label: "Teslim Alındı", bg: "bg-green-500/10", text: "text-green-500", icon: "inbox" },
    acknowledged: { label: "Onaylandı", bg: "bg-purple-500/10", text: "text-purple-500", icon: "verified" },
    completed: { label: "Tamamlandı", bg: "bg-gray-500/10", text: "text-gray-500", icon: "task_alt" },
}

type CargoStatus = keyof typeof statusConfig
type FileStatus = keyof typeof fileStatusConfig

interface Cargo {
    id: string
    branchId: string
    carrierName: string
    trackingNumber: string
    status: CargoStatus
    notes?: string
    createdAt: string
    updatedAt: string
    branch?: { id: string; name: string }
}

interface FileDelivery {
    id: string
    fromBranchId: string
    toBranchId: string | null
    fromUserId: string | null
    toUserId: string | null
    trackingNumber: string
    title: string
    description: string | null
    fileUrls: string
    status: FileStatus
    priority: string
    createdAt: string
    updatedAt: string
    fromBranch?: { id: string; name: string }
    toBranch?: { id: string; name: string }
}

export default function CargoPage() {
  const { t, tText } = useLanguage()
    const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && !hasPermission("kargo", "read") && !isSuperAdmin) {
            router.replace("/dashboard")
        }
    }, [authLoading, hasPermission, isSuperAdmin, router])

    const [activeTab, setActiveTab] = useState<"cargo" | "files">("cargo")

    // Cargo States
    const [items, setItems] = useState<Cargo[]>([])
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selected, setSelected] = useState<Cargo | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ carrierName: "", trackingNumber: "", status: "in_transit" as CargoStatus, notes: "" })
    const [deleting, setDeleting] = useState<string | null>(null)

    // File Delivery States
    const [files, setFiles] = useState<FileDelivery[]>([])
    const [branches, setBranches] = useState<{id: string, name: string}[]>([])
    const [isFileCreateOpen, setIsFileCreateOpen] = useState(false)
    const [isFileEditOpen, setIsFileEditOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<FileDelivery | null>(null)
    const [fileForm, setFileForm] = useState({ title: "", description: "", trackingNumber: "", toBranchId: "", status: "sent" as FileStatus, priority: "normal" })

    useEffect(() => { 
        loadData()
        if (activeTab === "files") loadFiles()
    }, [currentBranch, activeTab])

    useEffect(() => {
        if (isSuperAdmin || activeTab === "files") {
            fetch("/api/branches").then(res => res.json()).then(data => {
                if (Array.isArray(data)) setBranches(data)
            }).catch(console.error)
        }
    }, [isSuperAdmin, activeTab])

    const loadData = async () => {
        const url = isSuperAdmin ? "/api/cargo" : `/api/cargo?branchId=${currentBranch?.id}`
        try {
            const res = await fetch(url)
            if (res.ok) {
                const json = await res.json()
                setItems(json.data || json)
            }
        } catch { }
    }

    const loadFiles = async () => {
        const url = isSuperAdmin ? "/api/file-delivery" : `/api/file-delivery?branchId=${currentBranch?.id}`
        try {
            const res = await fetch(url)
            if (res.ok) {
                const json = await res.json()
                setFiles(json.data || json)
            }
        } catch { }
    }

    const handleCreate = async () => {
        if (!form.carrierName || !form.trackingNumber || !currentBranch) return
        setLoading(true)
        try {
            const res = await fetch("/api/cargo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, branchId: currentBranch.id }),
            })
            if (res.ok) { await loadData(); setIsCreateOpen(false); resetForm() }
        } finally { setLoading(false) }
    }

    const handleEdit = async () => {
        if (!selected) return
        setLoading(true)
        try {
            const res = await fetch("/api/cargo", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected.id, ...form }),
            })
            if (res.ok) { await loadData(); setIsEditOpen(false); setSelected(null) }
        } finally { setLoading(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kayit silinsin mi?")) return
        setDeleting(id)
        try {
            const res = await fetch(`/api/cargo?id=${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Kargo kaydi silindi")
                await loadData()
            } else {
                toast.error("Silme islemi basarisiz oldu")
            }
        } catch {
            toast.error("Bir hata olustu, lutfen tekrar deneyin.")
        } finally {
            setDeleting(null)
        }
    }

    const handleFileCreate = async () => {
        if (!fileForm.title || !fileForm.trackingNumber || !currentBranch) return
        setLoading(true)
        try {
            const res = await fetch("/api/file-delivery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fileForm, fromBranchId: currentBranch.id }),
            })
            if (res.ok) { await loadFiles(); setIsFileCreateOpen(false); resetFileForm() }
        } finally { setLoading(false) }
    }

    const handleFileEdit = async () => {
        if (!selectedFile) return
        setLoading(true)
        try {
            const res = await fetch("/api/file-delivery", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedFile.id, ...fileForm }),
            })
            if (res.ok) { await loadFiles(); setIsFileEditOpen(false); setSelectedFile(null) }
        } finally { setLoading(false) }
    }

    const handleFileDelete = async (id: string) => {
        if (!confirm("Bu evrak gonderimi kaydi silinsin mi?")) return
        setDeleting(id)
        try {
            const res = await fetch(`/api/file-delivery?id=${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Evrak gonderimi silindi")
                await loadFiles()
            } else {
                toast.error("Silme islemi basarisiz oldu")
            }
        } catch {
            toast.error("Bir hata olustu, lutfen tekrar deneyin.")
        } finally {
            setDeleting(null)
        }
    }

    const resetForm = () => setForm({ carrierName: "", trackingNumber: "", status: "in_transit", notes: "" })
    const resetFileForm = () => setFileForm({ title: "", description: "", trackingNumber: "", toBranchId: "", status: "sent", priority: "normal" })

    const openEdit = (item: Cargo) => {
        setSelected(item)
        setForm({ carrierName: item.carrierName, trackingNumber: item.trackingNumber, status: item.status, notes: item.notes || "" })
        setIsEditOpen(true)
    }

    const openFileEdit = (item: FileDelivery) => {
        setSelectedFile(item)
        setFileForm({ title: item.title, description: item.description || "", trackingNumber: item.trackingNumber, toBranchId: item.toBranchId || "", status: item.status, priority: item.priority })
        setIsFileEditOpen(true)
    }

    const filtered = items.filter(i => {
        const matchSearch = i.carrierName.toLowerCase().includes(search.toLowerCase()) || i.trackingNumber.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === "all" || i.status === statusFilter
        return matchSearch && matchStatus
    })

    const filteredFiles = files.filter(f => {
        const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) || f.trackingNumber.toLowerCase().includes(search.toLowerCase())
        return matchSearch
    })

    const stats = {
        total: items.length,
        inTransit: items.filter(i => i.status === "in_transit").length,
        delivered: items.filter(i => i.status === "delivered").length,
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kargo ve Kurye</h1>
                    <p className="text-sm text-gray-500">Kargo gönderileri ve fiziksel dosya/evrak teslimatları</p>
                </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab("cargo")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "cargo" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                >
                    Genel Kargo Takibi
                </button>
                <button
                    onClick={() => setActiveTab("files")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "files" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                >
                    Dosya / Evrak Teslimi (FileDelivery)
                </button>
            </div>

            {activeTab === "cargo" && (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Toplam Gönderi</h3>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        </div>
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Kargoda</h3>
                            <div className="text-3xl font-bold text-blue-500">{stats.inTransit}</div>
                        </div>
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Teslim Edildi</h3>
                            <div className="text-3xl font-bold text-green-500">{stats.delivered}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kargo Listesi</h2>
                                <p className="text-sm text-gray-500 mt-1">Tüm kargo gönderileriniz</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full sm:w-40 pl-4 pr-10 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    >
                                        <option value="all">Tümü</option>
                                        <option value="in_transit">Kargoda</option>
                                        <option value="delivered">Teslim Edildi</option>
                                        <option value="returned">İade</option>
                                        <option value="lost">Kayıp</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Firma veya takip no..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full sm:w-48 pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Yeni Kargo
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-b border-gray-200 dark:border-gray-800">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kargo Firması</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Takip Numarası</th>
                                        {isSuperAdmin && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Şube</th>}
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notlar</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:border-gray-800">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-gray-300">package</span>
                                                    <p className="text-sm font-medium">Kargo kaydı bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(item => {
                                            const cfg = statusConfig[item.status]
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-gray-900 dark:text-white leading-tight">{item.carrierName}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-sm text-gray-600 dark:text-gray-300">{item.trackingNumber}</div>
                                                    </td>
                                                    {isSuperAdmin && <td className="px-6 py-4"><span className="text-sm text-gray-600 dark:text-gray-400">{item.branch?.name || "-"}</span></td>}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                                            <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{item.notes || "-"}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEdit(item)}
                                                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                                                                title="Düzenle"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={deleting === item.id}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Sil"
                                                            >
                                                                {deleting === item.id
                                                                    ? <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                                                                    : <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                }
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
                </>
            )}

            {activeTab === "files" && (
                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Evrak / Dosya Gönderimleri</h2>
                            <p className="text-sm text-gray-500 mt-1">Şubeler arası veya müşterilere gönderilen evrak takibi</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Başlık veya takip no..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full sm:w-48 pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsFileCreateOpen(true)}
                                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Gönderim
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-b border-gray-200 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Başlık & İçerik</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Takip / Kurye No</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gönderen</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alıcı Şube</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:border-gray-800">
                                {filteredFiles.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-gray-300">description</span>
                                                <p className="text-sm font-medium">Evrak gönderimi bulunamadı</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredFiles.map(item => {
                                        const cfg = fileStatusConfig[item.status]
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 dark:text-white leading-tight">{item.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">{item.description || "Açıklama yok"}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-sm text-gray-600 dark:text-gray-300">{item.trackingNumber}</div>
                                                    <div className="text-xs text-orange-500 mt-1 font-medium">{item.priority === "urgent" ? "Acil" : "Normal"}</div>
                                                </td>
                                                <td className="px-6 py-4"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.fromBranch?.name || "-"}</span></td>
                                                <td className="px-6 py-4"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.toBranch?.name || "Müşteri / Diğer"}</span></td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openFileEdit(item)}
                                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                                                            title="Düzenle"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleFileDelete(item.id)}
                                                            disabled={deleting === item.id}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Sil"
                                                        >
                                                            {deleting === item.id
                                                                ? <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                                                                : <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            }
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
            )}

            {/* Cargo Create Dialog */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Kargo Ekle</h2>
                                <p className="text-sm text-gray-500 mt-1">Kargo takip bilgilerini girin</p>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kargo Firması *</label>
                                <input value={form.carrierName} onChange={e => setForm({ ...form, carrierName: e.target.value })} placeholder="Yurtiçi Kargo" className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Takip Numarası *</label>
                                <input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} placeholder="TR123456789" className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                                <div className="relative">
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CargoStatus })} className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                        <option value="in_transit">Kargoda</option>
                                        <option value="delivered">Teslim Edildi</option>
                                        <option value="returned">İade</option>
                                        <option value="lost">Kayıp</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-gray-500">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notlar</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
                            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleCreate} disabled={loading || !form.carrierName || !form.trackingNumber} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-blue-600 transition-colors shadow-soft disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cargo Edit Dialog */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsEditOpen(false); }}>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kargo Düzenle</h2>
                                <p className="text-sm text-gray-500 mt-1">{selected?.trackingNumber}</p>
                            </div>
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kargo Firması</label>
                                <input value={form.carrierName} onChange={e => setForm({ ...form, carrierName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Takip Numarası</label>
                                <input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                                <div className="relative">
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CargoStatus })} className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                        <option value="in_transit">Kargoda</option>
                                        <option value="delivered">Teslim Edildi</option>
                                        <option value="returned">İade</option>
                                        <option value="lost">Kayıp</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-gray-500">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notlar</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
                            <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleEdit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-blue-600 transition-colors shadow-soft disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Delivery Create Dialog */}
            {isFileCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsFileCreateOpen(false); }}>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Evrak Gönderimi</h2>
                                <p className="text-sm text-gray-500 mt-1">Kurye / kargo ile dosya gönderimi</p>
                            </div>
                            <button
                                onClick={() => setIsFileCreateOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Evrak Başlığı *</label>
                                <input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} placeholder="Örn: Sözleşme Aslı" className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kurye / Takip No *</label>
                                <input value={fileForm.trackingNumber} onChange={e => setFileForm({ ...fileForm, trackingNumber: e.target.value })} placeholder="Gönderim referans numarası" className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alıcı Şube (Opsiyonel)</label>
                                <select value={fileForm.toBranchId} onChange={e => setFileForm({ ...fileForm, toBranchId: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="">Şube Dışı (Müşteri vb.)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Öncelik</label>
                                <select value={fileForm.priority} onChange={e => setFileForm({ ...fileForm, priority: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="normal">Normal</option>
                                    <option value="urgent">Acil</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama</label>
                                <textarea value={fileForm.description} onChange={e => setFileForm({ ...fileForm, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
                            <button onClick={() => setIsFileCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleFileCreate} disabled={loading || !fileForm.title || !fileForm.trackingNumber} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-blue-600 transition-colors shadow-soft disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Delivery Edit Dialog */}
            {isFileEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsFileEditOpen(false); }}>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Evrak Gönderimini Düzenle</h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedFile?.trackingNumber}</p>
                            </div>
                            <button
                                onClick={() => setIsFileEditOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Evrak Başlığı</label>
                                <input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                                <select value={fileForm.status} onChange={e => setFileForm({ ...fileForm, status: e.target.value as FileStatus })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="sent">Gönderildi</option>
                                    <option value="received">Teslim Alındı</option>
                                    <option value="acknowledged">Onaylandı</option>
                                    <option value="completed">Tamamlandı</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kurye / Takip No</label>
                                <input value={fileForm.trackingNumber} onChange={e => setFileForm({ ...fileForm, trackingNumber: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama</label>
                                <textarea value={fileForm.description} onChange={e => setFileForm({ ...fileForm, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
                            <button onClick={() => setIsFileEditOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleFileEdit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-blue-600 transition-colors shadow-soft disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

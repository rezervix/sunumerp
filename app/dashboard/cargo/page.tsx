"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

const statusConfig = {
    in_transit: { label: "Kargoda", bg: "bg-teal-500/15 border border-teal-500/25", text: "text-teal-300", icon: "local_shipping" },
    delivered: { label: "Teslim Edildi", bg: "bg-emerald-500/15 border border-emerald-500/30", text: "text-emerald-300", icon: "check_circle" },
    returned: { label: "İade", bg: "bg-zinc-500/15 border border-white/[0.08]", text: "text-zinc-300", icon: "package" },
    lost: { label: "Kayıp", bg: "bg-rose-500/15 border border-rose-500/30", text: "text-rose-300", icon: "cancel_presentation" },
}

const fileStatusConfig = {
    sent: { label: "Gönderildi", bg: "bg-teal-500/15 border border-teal-500/25", text: "text-teal-300", icon: "send" },
    received: { label: "Teslim Alındı", bg: "bg-emerald-500/15 border border-emerald-500/30", text: "text-emerald-300", icon: "inbox" },
    acknowledged: { label: "Onaylandı", bg: "bg-emerald-500/10 border border-emerald-500/20", text: "text-emerald-300", icon: "verified" },
    completed: { label: "Tamamlandı", bg: "bg-zinc-500/15 border border-white/[0.08]", text: "text-zinc-300", icon: "task_alt" },
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
        <StaggerContainer className="space-y-6">
            <StaggerItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-semibold text-white mb-1 tracking-tight">Kargo ve Kurye</h1>
                    <p className="text-sm text-zinc-400">Kargo gönderileri ve fiziksel dosya/evrak teslimatları</p>
                </div>
            </StaggerItem>

            {/* Borderless KPI Strip */}
            <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-zinc-500">inventory_2</span>
                        <span>TOPLAM GÖNDERİ</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={stats.total} />
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Kayıtlı
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-teal-400">local_shipping</span>
                        <span>KARGODA</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={stats.inTransit} />
                        </span>
                        <span className="bg-teal-500/15 text-teal-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Yolda
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-emerald-400">check_circle</span>
                        <span>TESLİM EDİLDİ</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={stats.delivered} />
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Tamamlandı
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-zinc-500">description</span>
                        <span>EVRAK TESLİMATI</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={files.length} />
                        </span>
                        <span className="bg-white/[0.06] text-zinc-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Kurye
                        </span>
                    </div>
                </div>
            </StaggerItem>

            <StaggerItem>
                <div className="inline-flex flex-wrap gap-1 bg-[#111513] p-1 rounded-full border border-white/[0.06]">
                    <button
                        onClick={() => setActiveTab("cargo")}
                        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "cargo" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        {activeTab === "cargo" && (
                            <motion.span
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/10 rounded-full border border-white/[0.08]"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">Genel Kargo Takibi</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("files")}
                        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "files" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        {activeTab === "files" && (
                            <motion.span
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/10 rounded-full border border-white/[0.08]"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">Dosya / Evrak Teslimi (FileDelivery)</span>
                    </button>
                </div>
            </StaggerItem>

            {activeTab === "cargo" && (
                <StaggerItem className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Kargo Listesi</h2>
                            <p className="text-sm text-zinc-400 mt-1">Tüm kargo gönderileriniz</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="glass-input w-full sm:w-40 pl-4 pr-10 py-2 text-sm appearance-none focus:outline-none transition-all"
                                >
                                    <option value="all" className="bg-[#111513] text-white">Tümü</option>
                                    <option value="in_transit" className="bg-[#111513] text-white">Kargoda</option>
                                    <option value="delivered" className="bg-[#111513] text-white">Teslim Edildi</option>
                                    <option value="returned" className="bg-[#111513] text-white">İade</option>
                                    <option value="lost" className="bg-[#111513] text-white">Kayıp</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-zinc-500">
                                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                </div>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[20px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Firma veya takip no..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="glass-input w-full sm:w-48 pl-10 pr-4 py-2 text-sm focus:outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center justify-center gap-2 bg-[#34D399] hover:bg-[#10B981] text-[#061811] px-5 py-2 rounded-full text-sm font-medium transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Kargo
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Kargo Firması</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Takip Numarası</th>
                                    {isSuperAdmin && <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Şube</th>}
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Notlar</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tarih</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-zinc-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-zinc-600">package</span>
                                                <p className="text-sm font-medium text-zinc-400">Kargo kaydı bulunamadı</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(item => {
                                        const cfg = statusConfig[item.status]
                                        return (
                                            <tr key={item.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.03] transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white leading-tight">{item.carrierName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-sm text-zinc-300">{item.trackingNumber}</div>
                                                </td>
                                                {isSuperAdmin && <td className="px-6 py-4"><span className="text-sm text-zinc-300">{item.branch?.name || "-"}</span></td>}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-400 max-w-[150px] truncate">{item.notes || "-"}</td>
                                                <td className="px-6 py-4 text-sm text-zinc-400">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEdit(item)}
                                                            className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors flex items-center justify-center"
                                                            title="Düzenle"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={deleting === item.id}
                                                            className="p-1.5 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                </StaggerItem>
            )}

            {activeTab === "files" && (
                <StaggerItem className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Evrak / Dosya Gönderimleri</h2>
                            <p className="text-sm text-zinc-400 mt-1">Şubeler arası veya müşterilere gönderilen evrak takibi</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[20px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Başlık veya takip no..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="glass-input w-full sm:w-48 pl-10 pr-4 py-2 text-sm focus:outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsFileCreateOpen(true)}
                                className="inline-flex items-center justify-center gap-2 bg-[#34D399] hover:bg-[#10B981] text-[#061811] px-5 py-2 rounded-full text-sm font-medium transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Gönderim
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Başlık & İçerik</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Takip / Kurye No</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Gönderen</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Alıcı Şube</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tarih</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-zinc-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-zinc-600">description</span>
                                                <p className="text-sm font-medium text-zinc-400">Evrak gönderimi bulunamadı</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredFiles.map(item => {
                                        const cfg = fileStatusConfig[item.status]
                                        return (
                                            <tr key={item.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.03] transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white leading-tight">{item.title}</div>
                                                    <div className="text-xs text-zinc-500 mt-1 max-w-[200px] truncate">{item.description || "Açıklama yok"}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-sm text-zinc-300">{item.trackingNumber}</div>
                                                    <div className={`text-xs mt-1 font-medium ${item.priority === "urgent" ? "text-rose-400" : "text-emerald-400"}`}>{item.priority === "urgent" ? "Acil" : "Normal"}</div>
                                                </td>
                                                <td className="px-6 py-4"><span className="text-sm font-medium text-zinc-300">{item.fromBranch?.name || "-"}</span></td>
                                                <td className="px-6 py-4"><span className="text-sm font-medium text-zinc-300">{item.toBranch?.name || "Müşteri / Diğer"}</span></td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-400">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openFileEdit(item)}
                                                            className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors flex items-center justify-center"
                                                            title="Düzenle"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleFileDelete(item.id)}
                                                            disabled={deleting === item.id}
                                                            className="p-1.5 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                </StaggerItem>
            )}

            {/* Cargo Create Dialog */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}>
                    <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Yeni Kargo Ekle</h2>
                                <p className="text-sm text-zinc-400 mt-1">Kargo takip bilgilerini girin</p>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Kargo Firması *</label>
                                <input value={form.carrierName} onChange={e => setForm({ ...form, carrierName: e.target.value })} placeholder="Yurtiçi Kargo" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Takip Numarası *</label>
                                <input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} placeholder="TR123456789" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Durum</label>
                                <div className="relative">
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CargoStatus })} className="glass-input w-full pl-4 pr-10 py-2.5 text-sm appearance-none focus:outline-none transition-all">
                                        <option value="in_transit" className="bg-[#111513] text-white">Kargoda</option>
                                        <option value="delivered" className="bg-[#111513] text-white">Teslim Edildi</option>
                                        <option value="returned" className="bg-[#111513] text-white">İade</option>
                                        <option value="lost" className="bg-[#111513] text-white">Kayıp</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-zinc-500">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Notlar</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleCreate} disabled={loading || !form.carrierName || !form.trackingNumber} className="px-5 py-2 text-sm font-medium text-[#061811] bg-[#34D399] hover:bg-[#10B981] rounded-full transition-all disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cargo Edit Dialog */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsEditOpen(false); }}>
                    <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Kargo Düzenle</h2>
                                <p className="text-sm text-zinc-400 mt-1">{selected?.trackingNumber}</p>
                            </div>
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Kargo Firması</label>
                                <input value={form.carrierName} onChange={e => setForm({ ...form, carrierName: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Takip Numarası</label>
                                <input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Durum</label>
                                <div className="relative">
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CargoStatus })} className="glass-input w-full pl-4 pr-10 py-2.5 text-sm appearance-none focus:outline-none transition-all">
                                        <option value="in_transit" className="bg-[#111513] text-white">Kargoda</option>
                                        <option value="delivered" className="bg-[#111513] text-white">Teslim Edildi</option>
                                        <option value="returned" className="bg-[#111513] text-white">İade</option>
                                        <option value="lost" className="bg-[#111513] text-white">Kayıp</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-zinc-500">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Notlar</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleEdit} disabled={loading} className="px-5 py-2 text-sm font-medium text-[#061811] bg-[#34D399] hover:bg-[#10B981] rounded-full transition-all disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Delivery Create Dialog */}
            {isFileCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsFileCreateOpen(false); }}>
                    <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Yeni Evrak Gönderimi</h2>
                                <p className="text-sm text-zinc-400 mt-1">Kurye / kargo ile dosya gönderimi</p>
                            </div>
                            <button
                                onClick={() => setIsFileCreateOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Evrak Başlığı *</label>
                                <input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} placeholder="Örn: Sözleşme Aslı" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Kurye / Takip No *</label>
                                <input value={fileForm.trackingNumber} onChange={e => setFileForm({ ...fileForm, trackingNumber: e.target.value })} placeholder="Gönderim referans numarası" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Alıcı Şube (Opsiyonel)</label>
                                <select value={fileForm.toBranchId} onChange={e => setFileForm({ ...fileForm, toBranchId: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="" className="bg-[#111513] text-white">Şube Dışı (Müşteri vb.)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id} className="bg-[#111513] text-white">{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Öncelik</label>
                                <select value={fileForm.priority} onChange={e => setFileForm({ ...fileForm, priority: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="normal" className="bg-[#111513] text-white">Normal</option>
                                    <option value="urgent" className="bg-[#111513] text-white">Acil</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Açıklama</label>
                                <textarea value={fileForm.description} onChange={e => setFileForm({ ...fileForm, description: e.target.value })} rows={2} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsFileCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleFileCreate} disabled={loading || !fileForm.title || !fileForm.trackingNumber} className="px-5 py-2 text-sm font-medium text-[#061811] bg-[#34D399] hover:bg-[#10B981] rounded-full transition-all disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Delivery Edit Dialog */}
            {isFileEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 hover:cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setIsFileEditOpen(false); }}>
                    <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden hover:cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Evrak Gönderimini Düzenle</h2>
                                <p className="text-sm text-zinc-400 mt-1">{selectedFile?.trackingNumber}</p>
                            </div>
                            <button
                                onClick={() => setIsFileEditOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Evrak Başlığı</label>
                                <input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Durum</label>
                                <select value={fileForm.status} onChange={e => setFileForm({ ...fileForm, status: e.target.value as FileStatus })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="sent" className="bg-[#111513] text-white">Gönderildi</option>
                                    <option value="received" className="bg-[#111513] text-white">Teslim Alındı</option>
                                    <option value="acknowledged" className="bg-[#111513] text-white">Onaylandı</option>
                                    <option value="completed" className="bg-[#111513] text-white">Tamamlandı</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Kurye / Takip No</label>
                                <input value={fileForm.trackingNumber} onChange={e => setFileForm({ ...fileForm, trackingNumber: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Açıklama</label>
                                <textarea value={fileForm.description} onChange={e => setFileForm({ ...fileForm, description: e.target.value })} rows={2} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsFileEditOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleFileEdit} disabled={loading} className="px-5 py-2 text-sm font-medium text-[#061811] bg-[#34D399] hover:bg-[#10B981] rounded-full transition-all disabled:opacity-50">
                                {loading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </StaggerContainer>
    )
}

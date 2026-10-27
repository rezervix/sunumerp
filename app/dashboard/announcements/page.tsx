"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"

const targetConfig: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    all: { label: "Herkese", icon: "public", bg: "bg-blue-500/10", text: "text-blue-500" },
    branch: { label: "Subelere", icon: "domain", bg: "bg-green-500/10", text: "text-green-500" },
    staff: { label: "Personele", icon: "group", bg: "bg-purple-500/10", text: "text-purple-500" },
}

interface Announcement {
    id: string
    title: string
    content: string
    targetType: "all" | "branch" | "staff"
    createdAt: string
    createdBy: { id: string; fullName: string; username: string }
}

export default function AnnouncementsPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  // Herkesin erişimine açıldı

    const [items, setItems] = useState<Announcement[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selected, setSelected] = useState<Announcement | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ title: "", content: "", targetType: "all" as Announcement["targetType"] })

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const res = await fetch(`/api/announcements?branchId=${currentBranch?.id || ""}`)
            if (res.ok) setItems(await res.json())
        } catch { }
    }

    const handleCreate = async () => {
        if (!form.title || !form.content) return
        setLoading(true)
        try {
            const res = await fetch(`/api/announcements?branchId=${currentBranch?.id || ""}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (res.ok) { await loadData(); setIsCreateOpen(false); setForm({ title: "", content: "", targetType: "all" }) }
        } finally { setLoading(false) }
    }

    const handleEdit = async () => {
        if (!selected) return
        setLoading(true)
        try {
            const res = await fetch(`/api/announcements?branchId=${currentBranch?.id || ""}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected.id, ...form }),
            })
            if (res.ok) { await loadData(); setIsEditOpen(false) }
        } finally { setLoading(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu duyuru silinsin mi?")) return
        await fetch(`/api/announcements?id=${id}&branchId=${currentBranch?.id || ""}`, { method: "DELETE" })
        loadData()
    }

    const openEdit = (item: Announcement) => {
        setSelected(item)
        setForm({ title: item.title, content: item.content, targetType: item.targetType })
        setIsEditOpen(true)
    }

    const FormContent = () => (
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslik *</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Duyuru basligi"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icerik *</label>
                <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    placeholder="Duyuru metni..."
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hedef Kitle</label>
                <select
                    value={form.targetType}
                    onChange={e => setForm({ ...form, targetType: e.target.value as Announcement["targetType"] })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                    <option value="all">Herkese</option>
                    <option value="branch">Subelere</option>
                    <option value="staff">Personele</option>
                </select>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Duyurular</h1>
                    <p className="text-sm text-gray-500 mt-1">Sistem genelindeki duyurulari yonetin</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Yeni Duyuru
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {items.length === 0 && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center flex flex-col items-center justify-center text-gray-500">
                        <span className="material-symbols-outlined text-4xl mb-4 sm:text-5xl text-gray-300">campaign</span>
                        <p className="text-sm font-medium">Henuz duyuru yok</p>
                    </div>
                )}
                {items.map(item => {
                    const cfg = targetConfig[item.targetType]
                    const Icon = cfg.icon
                    return (
                        <div key={item.id} className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 group">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-3 rounded-2xl ${cfg.bg}`}>
                                        <span className={`material-symbols-outlined ${cfg.text}`}>{Icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{item.title}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-2 text-sm text-gray-500">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                                <span className="material-symbols-outlined text-[14px]">campaign</span>
                                                {cfg.label}
                                            </span>
                                            <span className="text-gray-300">•</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.createdBy.fullName}</span>
                                            <span className="text-gray-300">•</span>
                                            <span>{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                                        </div>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center tooltip-trigger"
                                            title="Duzenle"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center tooltip-trigger"
                                            title="Sil"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="pl-[60px]">
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Duyuru</h3>
                                <p className="text-sm text-gray-500">Tum kullanicilara duyuru yayinlayin</p>
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading || !form.title || !form.content}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Yayinlaniyor..." : "Yayinla"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Duyuruyu Duzenle</h3>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Kaydediliyor..." : "Guncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Encoding fix for Ubuntu

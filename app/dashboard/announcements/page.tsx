"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"

const targetConfig: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    all: { label: "Herkese", icon: "public", bg: "bg-emerald-500/10", text: "text-emerald-400 border border-emerald-500/20" },
    branch: { label: "Şubelere", icon: "domain", bg: "bg-white/[0.06]", text: "text-zinc-300 border border-white/[0.08]" },
    staff: { label: "Personele", icon: "group", bg: "bg-amber-500/10", text: "text-amber-300 border border-amber-500/20" },
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
                <label className="text-xs font-medium text-zinc-300">Başlık *</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Duyuru başlığı"
                    className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/30 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">İçerik *</label>
                <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    placeholder="Duyuru metni..."
                    className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/30 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all resize-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Hedef Kitle</label>
                <select
                    value={form.targetType}
                    onChange={e => setForm({ ...form, targetType: e.target.value as Announcement["targetType"] })}
                    className="w-full px-4 py-2 bg-[#111513] border border-white/[0.08] focus:border-emerald-500/30 rounded-xl text-sm text-white outline-none transition-all"
                >
                    <option value="all" className="bg-[#111513]">Herkese</option>
                    <option value="branch" className="bg-[#111513]">Şubelere</option>
                    <option value="staff" className="bg-[#111513]">Personele</option>
                </select>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-white tracking-tight">Duyurular</h1>
                    <p className="text-xs text-zinc-400 mt-1">Sistem genelindeki duyuruları yönetin ve takip edin</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-[#34D399] hover:bg-emerald-400 text-[#061811] px-4 py-2 rounded-full text-xs font-medium transition-colors shadow-sm cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Yeni Duyuru
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {items.length === 0 && (
                    <div className="bg-[#111513]/90 rounded-[20px] border border-white/[0.06] shadow-xl p-12 text-center flex flex-col items-center justify-center text-zinc-500">
                        <span className="material-symbols-outlined text-4xl mb-4 sm:text-5xl text-zinc-600">campaign</span>
                        <p className="text-sm font-medium text-zinc-300">Henüz duyuru bulunmuyor</p>
                        <p className="text-xs text-zinc-500 mt-1">Yeni bir duyuru oluşturarak tüm ekiple paylaşabilirsiniz.</p>
                    </div>
                )}
                {items.map(item => {
                    const cfg = targetConfig[item.targetType]
                    const Icon = cfg.icon
                    return (
                        <div key={item.id} className="bg-[#111513]/90 rounded-[20px] border border-white/[0.06] shadow-xl p-6 group transition-all">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-3 rounded-2xl ${cfg.bg}`}>
                                        <span className={`material-symbols-outlined ${cfg.text}`}>{Icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-medium text-white leading-tight">{item.title}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-zinc-400">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
                                                <span className="material-symbols-outlined text-[13px]">campaign</span>
                                                {cfg.label}
                                            </span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="font-medium text-zinc-300">{item.createdBy.fullName}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="font-mono text-zinc-500">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                                        </div>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.06] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                                            title="Düzenle"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                                            title="Sil"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="pl-[60px]">
                                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#111513] border border-white/[0.08] text-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-white">Yeni Duyuru</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Tüm kullanıcılara duyuru yayınlayın</p>
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5 mt-auto">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading || !form.title || !form.content}
                                className="px-4 py-2 text-xs font-medium text-[#061811] bg-[#34D399] hover:bg-emerald-400 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? "Yayınlanıyor..." : "Yayınla"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#111513] border border-white/[0.08] text-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-white">Duyuruyu Düzenle</h3>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5 mt-auto">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={loading}
                                className="px-4 py-2 text-xs font-medium text-[#061811] bg-[#34D399] hover:bg-emerald-400 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Encoding fix for Ubuntu

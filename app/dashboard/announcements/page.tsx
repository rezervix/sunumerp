"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"

const targetConfig: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    all: { label: "Herkese", icon: "public", bg: "bg-[--brand-soft]", text: "text-[--brand] border border-[--brand-line]" },
    branch: { label: "Şubelere", icon: "domain", bg: "bg-white/[0.06]", text: "text-[var(--text-2)] border border-[--line]" },
    staff: { label: "Personele", icon: "group", bg: "bg-[var(--warn-soft)]", text: "text-[var(--warn)] border border-[var(--warn-line)]" },
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
                <label className="text-xs font-medium text-[var(--text-2)]">Başlık *</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Duyuru başlığı"
                    className="w-full px-4 py-2 bg-white border border-[--line] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] rounded-xl text-sm text-[--text] placeholder-[--text-muted] outline-none transition-all shadow-xs"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-2)]">İçerik *</label>
                <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    placeholder="Duyuru metni..."
                    className="w-full px-4 py-2 bg-white border border-[--line] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] rounded-xl text-sm text-[--text] placeholder-[--text-muted] outline-none transition-all resize-none shadow-xs"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-2)]">Hedef Kitle</label>
                <select
                    value={form.targetType}
                    onChange={e => setForm({ ...form, targetType: e.target.value as Announcement["targetType"] })}
                    className="w-full px-4 py-2 bg-white border border-[--line] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] rounded-xl text-sm text-[--text] outline-none transition-all shadow-xs"
                >
                    <option value="all" >Herkese</option>
                    <option value="branch" >Şubelere</option>
                    <option value="staff" >Personele</option>
                </select>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-[var(--text)] tracking-tight">Duyurular</h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Sistem genelindeki duyuruları yönetin ve takip edin</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white px-4 py-2 rounded-full text-xs font-medium transition-all shadow-sm cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Yeni Duyuru
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {items.length === 0 && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[20px] border border-[--line] shadow-sm p-12 text-center flex flex-col items-center justify-center text-[--text-muted]">
                        <span className="material-symbols-outlined text-4xl mb-4 sm:text-5xl text-zinc-600">campaign</span>
                        <p className="text-sm font-medium text-[var(--text-2)]">Henüz duyuru bulunmuyor</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Yeni bir duyuru oluşturarak tüm ekiple paylaşabilirsiniz.</p>
                    </div>
                )}
                {items.map(item => {
                    const cfg = targetConfig[item.targetType]
                    const Icon = cfg.icon
                    return (
                        <div key={item.id} className="bg-white/80 backdrop-blur-xl rounded-[20px] border border-[--line] shadow-sm p-6 group transition-all">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-3 rounded-2xl ${cfg.bg}`}>
                                        <span className={`material-symbols-outlined ${cfg.text}`}>{Icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-medium text-[var(--text)] leading-tight">{item.title}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-[var(--text-muted)]">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
                                                <span className="material-symbols-outlined text-[13px]">campaign</span>
                                                {cfg.label}
                                            </span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="font-medium text-[var(--text-2)]">{item.createdBy.fullName}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="font-mono text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                                        </div>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[--brand] hover:bg-white/[0.06] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                                            title="Düzenle"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--bad)] hover:bg-[var(--bad-soft)] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                                            title="Sil"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="pl-[60px]">
                                <p className="text-[var(--text-2)] text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white border border-[--line] text-[var(--text)] rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-[--line] flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-[var(--text)]">Yeni Duyuru</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Tüm kullanıcılara duyuru yayınlayın</p>
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5 mt-auto">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)] rounded-full transition-colors cursor-pointer"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading || !form.title || !form.content}
                                className="px-4 py-2 text-xs font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
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
                    <div className="bg-white border border-[--line] text-[var(--text)] rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-[--line] flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-[var(--text)]">Duyuruyu Düzenle</h3>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="px-6 flex-1 overflow-y-auto">
                            <FormContent />
                        </div>
                        <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5 mt-auto">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)] rounded-full transition-colors cursor-pointer"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={loading}
                                className="px-4 py-2 text-xs font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
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

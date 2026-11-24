"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { FilePicker } from "@/components/shared/file-picker"
import { safeText, safeDate } from "@/lib/utils/safe-display"

interface PaginationData {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

function useRelations(customerId: string, type: string) {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [meta, setMeta] = useState<PaginationData>({ page: 1, pageSize: 10, total: 0, totalPages: 1 })

    const loadData = useCallback(async (page = 1) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/customers/relations?customerId=${customerId}&type=${type}&page=${page}&pageSize=10`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data || [])
                setMeta({
                    page: json.page,
                    pageSize: json.pageSize,
                    total: json.total,
                    totalPages: json.totalPages
                })
            }
        } catch {
            toast.error("Veriler yüklenemedi")
        } finally {
            setLoading(false)
        }
    }, [customerId, type])

    useEffect(() => {
        loadData(1)
    }, [loadData])

    const handleCrud = async (method: string, bodyData: any, id?: string) => {
        setSubmitting(true)
        try {
            const res = await fetch(`/api/customers/relations${id ? `?type=${type}&id=${id}` : ''}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: method !== "DELETE" ? JSON.stringify({ type, customerId, id, ...bodyData }) : undefined
            })
            if (res.ok) {
                toast.success("İşlem başarılı")
                loadData(meta.page)
                return true
            } else {
                toast.error("İşlem başarısız")
                return false
            }
        } catch {
            toast.error("Bir hata oluştu")
            return false
        } finally {
            setSubmitting(false)
        }
    }

    return { data, loading, submitting, meta, loadData, handleCrud }
}

const Pagination = ({ meta, onPageChange }: { meta: PaginationData, onPageChange: (p: number) => void }) => {
    if (meta.totalPages <= 1) return null
    return (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-[--line]">
            <button
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
                className="px-3 py-1.5 bg-white border border-[--line] text-[--text-2] rounded-full disabled:opacity-40 text-xs font-medium hover:bg-[--muted-bg] transition-colors shadow-xs"
            >Önceki</button>
            <span className="text-xs font-medium text-[--text-muted]">
                {meta.page} / {meta.totalPages}
            </span>
            <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange(meta.page + 1)}
                className="px-3 py-1.5 bg-white border border-[--line] text-[--text-2] rounded-full disabled:opacity-40 text-xs font-medium hover:bg-[--muted-bg] transition-colors shadow-xs"
            >Sonraki</button>
        </div>
    )
}

export function NotesTab({ customerId }: { customerId: string }) {
    const { data, loading, submitting, meta, loadData, handleCrud } = useRelations(customerId, "note")

    return (
        <div className="space-y-5">
            <form onSubmit={async (e: any) => {
                e.preventDefault()
                const success = await handleCrud("POST", { content: e.target.content.value, noteType: e.target.type.value })
                if (success) e.target.reset()
            }} className="bg-white/80 backdrop-blur-xl border border-[--line] p-5 rounded-[20px] flex flex-col gap-3 shadow-xs">
                <div className="flex gap-3">
                    <select disabled={submitting} name="type" className="px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none w-40 shrink-0">
                        <option value="Arama">Arama</option>
                        <option value="E-posta">E-posta</option>
                        <option value="Toplantı">Toplantı</option>
                    </select>
                </div>
                <textarea disabled={submitting} name="content" rows={4} placeholder="Aktivite veya not ekle (satır atlayabilirsiniz)..." className="w-full px-4 py-2.5 bg-white border border-[--line] rounded-xl text-sm text-[--text] placeholder:text-[--text-muted] outline-none focus:border-[--brand] resize-y" required></textarea>
                <div className="flex justify-end">
                    <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium transition-all whitespace-nowrap disabled:opacity-50 shadow-sm">
                        {submitting ? "Ekleniyor..." : "Ekle"}
                    </button>
                </div>
            </form>

            {loading ? <div className="p-4 text-center text-[--text-muted]">Yükleniyor...</div> : (
                <div className="relative border-l-2 border-[--line] ml-5 pl-6 space-y-4">
                    {data.map((n) => (
                        <div key={n.id} className="relative group">
                            <span className="absolute -left-[35px] bg-white border-2 border-[--brand] text-[--brand] size-6 rounded-full flex items-center justify-center text-[10px] material-symbols-outlined font-bold shadow-xs">
                                {n.noteType === 'Arama' ? 'call' : n.noteType === 'Toplantı' ? 'groups' : 'mail'}
                            </span>
                            <div className="bg-white border border-[--line] p-4 rounded-[20px] relative shadow-xs">
                                <p className="text-sm text-[--text] whitespace-pre-wrap">{n.content}</p>
                                <span className="text-[11px] text-[--text-muted] mt-2 block font-medium">{safeDate(n.createdAt)} • {n.noteType}</span>
                                <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, n.id)} className="absolute top-4 right-4 text-[--text-muted] hover:text-[--bad] opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[16px] disabled:opacity-30">delete</button>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="text-sm text-[--text-muted] italic py-4">Henüz not eklenmemiş.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

export function TasksTab({ customerId }: { customerId: string }) {
    const { data, loading, submitting, meta, loadData, handleCrud } = useRelations(customerId, "task")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({})

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button disabled={submitting} onClick={() => setIsModalOpen(true)} className="text-sm text-white bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 font-medium px-4 py-2 rounded-full transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden sm:inline">Görev Ekle</span>
                </button>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
                    <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-[--line] bg-[--page] flex items-center justify-between">
                            <h3 className="font-semibold text-[--navy]">Yeni Görev</h3>
                            <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-[--text-muted] hover:text-[--text] disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={async (e: any) => {
                            e.preventDefault()
                            const success = await handleCrud("POST", {
                                title: e.target.title.value,
                                description: e.target.description.value,
                                priority: e.target.priority.value,
                                status: e.target.status.value,
                                dueDate: e.target.dueDate.value ? new Date(e.target.dueDate.value) : new Date()
                            })
                            if (success) setIsModalOpen(false)
                        }} className="p-5 flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[--text-2]">Görev Başlığı</label>
                                <input disabled={submitting} name="title" required type="text" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[--text-2]">Açıklama</label>
                                <textarea disabled={submitting} name="description" rows={3} className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[--text-2]">Öncelik</label>
                                <select disabled={submitting} name="priority" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] disabled:opacity-50">
                                    <option value="low">Düşük</option>
                                    <option value="normal" defaultValue="normal">Normal</option>
                                    <option value="high">Yüksek</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[--text-2]">Durum</label>
                                <select disabled={submitting} name="status" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] disabled:opacity-50">
                                    <option value="Fikir / Brief Aşamasında">Fikir / Brief Aşamasında</option>
                                    <option value="Onay Bekliyor">Onay Bekliyor</option>
                                    <option value="Yapım Aşamasında">Yapım Aşamasında</option>
                                    <option value="Tamamlandı">Tamamlandı</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[--text-2]">Son Tarih (Opsiyonel)</label>
                                <input disabled={submitting} name="dueDate" type="date" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] disabled:opacity-50" />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-sm">
                                    {submitting ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="p-4 text-center text-[--text-muted]">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((t) => (
                        <div key={t.id} className="bg-white border border-[--line] border-l-2 border-l-[--brand] rounded-[20px] p-4 flex items-start gap-3 group shadow-xs">
                            <input disabled={submitting} type="checkbox" checked={t.status === "Tamamlandı"} onChange={(e) => handleCrud("PUT", { status: e.target.checked ? "Tamamlandı" : "Fikir / Brief Aşamasında" }, t.id)} className="w-5 h-5 mt-0.5 accent-[--brand] cursor-pointer shrink-0 disabled:opacity-50" />
                            <div className="flex-1 min-w-0">
                                <h5 className={`text-sm font-semibold text-[--navy] ${t.status === 'Tamamlandı' ? 'line-through opacity-50' : ''}`}>{safeText(t.title, "Görev")}</h5>
                                {t.description && <p className="text-xs text-[--text-muted] mt-2">{t.description}</p>}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select disabled={submitting} value={selectedStatus[t.id] ?? t.status} onChange={(e) => setSelectedStatus(prev => ({ ...prev, [t.id]: e.target.value }))} className="px-2.5 py-1 bg-white border border-[--line] rounded-lg text-xs text-[--text] disabled:opacity-50">
                                        <option value="Fikir / Brief Aşamasında">Fikir / Brief Aşamasında</option>
                                        <option value="Onay Bekliyor">Onay Bekliyor</option>
                                        <option value="Yapım Aşamasında">Yapım Aşamasında</option>
                                        <option value="Tamamlandı">Tamamlandı</option>
                                    </select>
                                    <button disabled={submitting} onClick={() => handleCrud("PUT", { status: selectedStatus[t.id] ?? t.status }, t.id)} className="text-xs font-medium text-[--brand] bg-[--brand-soft] border border-[--brand-line] hover:bg-[--brand-soft]/80 px-3 py-1 rounded-full disabled:opacity-50">Güncelle</button>
                                </div>
                                {t.dueDate && <p className="text-xs text-[--text-muted] mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">calendar_today</span> Son Tarih: {new Date(t.dueDate).toLocaleDateString("tr-TR")}</p>}
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, t.id)} className="text-[--text-muted] hover:text-[--bad] opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] shrink-0 disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-[--text-muted] italic py-4 text-center">Henüz görev eklenmemiş.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

export function ChatsTab({ customerId }: { customerId: string }) {
    const { data, loading, submitting, meta, loadData, handleCrud } = useRelations(customerId, "chat")

    return (
        <div className="space-y-5">
            <form onSubmit={async (e: any) => {
                e.preventDefault()
                const success = await handleCrud("POST", { content: e.target.content.value, type: e.target.channel.value })
                if (success) e.target.reset()
            }} className="bg-white/80 backdrop-blur-xl border border-[--line] p-5 rounded-[20px] flex flex-col gap-3 shadow-xs">
                <div className="flex gap-3">
                    <select disabled={submitting} name="channel" className="px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none w-40 disabled:opacity-50">
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Email">Email</option>
                        <option value="Internal">Dahili</option>
                    </select>
                </div>
                <textarea disabled={submitting} name="content" rows={4} placeholder="Mesaj içeriğini buraya girin (satır atlayabilirsiniz)..." className="w-full px-4 py-2.5 bg-white border border-[--line] rounded-xl text-sm text-[--text] placeholder:text-[--text-muted] outline-none focus:border-[--brand] resize-y disabled:opacity-50" required></textarea>
                <div className="flex justify-end">
                    <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 shadow-sm">
                        {submitting ? "Gönderiliyor..." : "Gönder / Logla"}
                    </button>
                </div>
            </form>

            {loading ? <div className="p-4 text-center text-[--text-muted]">Yükleniyor...</div> : (
                <div className="space-y-3">
                    {data.map((c) => (
                        <div key={c.id} className="bg-white border border-[--line] p-4 rounded-[20px] flex items-start gap-4 group shadow-xs">
                            <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-[--brand-soft] border border-[--brand-line] text-[--brand]">
                                <span className="material-symbols-outlined text-[20px]">{c.type === 'WhatsApp' ? 'chat' : 'mail'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[--navy]">{c.type}</span>
                                    <span className="text-[10px] text-[--text-muted]">{safeDate(c.timestamp)}</span>
                                </div>
                                <p className="text-sm text-[--text] whitespace-pre-wrap">{c.content}</p>
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, c.id)} className="text-[--text-muted] hover:text-[--bad] opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="text-sm text-[--text-muted] italic py-8 text-center">Henüz görüşme kaydı yok.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

export function DocumentsTab({ customerId }: { customerId: string }) {
    const { data, loading, submitting, meta, loadData, handleCrud } = useRelations(customerId, "document")

    return (
        <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] shadow-xs">
                <FilePicker
                    label="Yeni Belge Yükle"
                    maxFiles={50}
                    disabled={submitting}
                    onFilesSelected={async (urls) => {
                        for (const url of urls) {
                            const name = url.split('/').pop() || "Belge"
                            await handleCrud("POST", { name, url, type: "Belge" })
                        }
                        loadData(1)
                    }}
                />
            </div>

            {loading ? <div className="p-4 text-center text-[--text-muted]">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map((d) => (
                        <div key={d.id} className="bg-white border border-[--line] p-4 rounded-[20px] group flex flex-col shadow-xs">
                            <div className="size-12 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-[--brand] text-2xl">description</span>
                            </div>
                            <h5 className="text-sm font-semibold text-[--navy] truncate" title={d.name}>{safeText(d.name, "Belge")}</h5>
                            <p className="text-[10px] text-[--text-muted] mt-1 mb-4">{safeDate(d.createdAt)}</p>
                            <div className="mt-auto flex gap-2">
                                <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 px-3 py-1.5 bg-white border border-[--line] text-[--text] rounded-full text-xs font-medium text-center hover:bg-[--muted-bg] transition-colors shadow-xs">Görüntüle</a>
                                <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, d.id)} className="p-1.5 text-[--text-muted] hover:text-[--bad] transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-[--text-muted] italic py-8 text-center">Henüz belge yüklenmemiş.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

export function ContactsTab({ customerId }: { customerId: string }) {
    const { data, loading, submitting, meta, loadData, handleCrud } = useRelations(customerId, "contact")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [allCustomers, setAllCustomers] = useState<any[]>([])
    const [isManual, setIsManual] = useState(false)

    useEffect(() => {
        if (isModalOpen && !isManual) {
            fetch("/api/customers").then(res => res.json()).then(json => {
                setAllCustomers(json.data || json)
            })
        }
    }, [isModalOpen, isManual])

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button disabled={submitting} onClick={() => { setIsModalOpen(true); setIsManual(false) }} className="px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">person_add</span> Kişi Ekle
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
                    <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-[--line] bg-[--page] flex items-center justify-between">
                            <h3 className="font-semibold text-[--navy]">İlişkili Kişi Ekle</h3>
                            <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-[--text-muted] hover:text-[--text] disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 border-b border-[--line]">
                            <div className="flex gap-1 bg-[--muted-bg] p-1 rounded-full border border-[--line]">
                                <button
                                    disabled={submitting}
                                    onClick={() => setIsManual(false)}
                                    className={`relative flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${!isManual ? 'text-[--navy]' : 'text-[--text-muted] hover:text-[--text]'} disabled:opacity-50`}
                                >
                                    {!isManual && (
                                        <motion.span
                                            layoutId="contactModeTab"
                                            className="absolute inset-0 bg-white rounded-full border border-[--line] shadow-xs"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">Sistemden Seç</span>
                                </button>
                                <button
                                    disabled={submitting}
                                    onClick={() => setIsManual(true)}
                                    className={`relative flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${isManual ? 'text-[--navy]' : 'text-[--text-muted] hover:text-[--text]'} disabled:opacity-50`}
                                >
                                    {isManual && (
                                        <motion.span
                                            layoutId="contactModeTab"
                                            className="absolute inset-0 bg-white rounded-full border border-[--line] shadow-xs"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">Manuel Giriş</span>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={async (e: any) => {
                            e.preventDefault()
                            let body: any = {}
                            if (isManual) {
                                body = { name: e.target.name.value, role: e.target.role.value, phone: e.target.phone.value, email: e.target.email.value }
                            } else {
                                const selectedId = e.target.selectedCustomer.value
                                const cust = allCustomers.find(c => c.id === selectedId)
                                if (!cust) return toast.error("Müşteri seçin")
                                body = { name: cust.name, role: "İlişkili Müşteri", phone: cust.phone, email: cust.email }
                            }
                            const success = await handleCrud("POST", body)
                            if (success) setIsModalOpen(false)
                        }} className="p-5 flex flex-col gap-4">
                            {!isManual ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[--text-2]">Sistemdeki Müşteriler</label>
                                    <select disabled={submitting} name="selectedCustomer" required className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none disabled:opacity-50">
                                        <option value="">-- Müşteri Seç --</option>
                                        {allCustomers.filter(c => c.id !== customerId).map(c => (
                                            <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[--text-2]">İsim Soyisim</label>
                                        <input disabled={submitting} name="name" required type="text" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[--text-2]">Rol / Pozisyon</label>
                                        <input disabled={submitting} name="role" type="text" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[--text-2]">Telefon</label>
                                        <input disabled={submitting} name="phone" type="text" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[--text-2]">E-posta</label>
                                        <input disabled={submitting} name="email" type="email" className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none disabled:opacity-50" />
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-sm">
                                    {submitting ? "Ekleniyor..." : "Ekle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="p-4 text-center text-[--text-muted]">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((c) => (
                        <div key={c.id} className="bg-white border border-[--line] p-4 rounded-[20px] flex items-center gap-4 group relative shadow-xs">
                            <div className="size-10 rounded-full bg-[--brand-soft] border border-[--brand-line] text-[--brand] flex items-center justify-center font-semibold text-xs shrink-0">
                                {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-sm font-semibold text-[--navy] truncate">{safeText(c.name, "Kişi")}</h5>
                                <p className="text-[11px] text-[--text-muted]">{c.role || "İletişim Kişisi"}</p>
                                {c.phone && <p className="text-[11px] text-[--brand] font-medium mt-1">{c.phone}</p>}
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, c.id)} className="absolute top-4 right-4 text-[--text-muted] hover:text-[--bad] opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-[--text-muted] italic py-8 text-center">Henüz ilişkili kişi eklenmemiş.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

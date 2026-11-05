"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { FilePicker } from "@/components/shared/file-picker"

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
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
            <button
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/80 rounded-lg disabled:opacity-40 text-xs font-semibold hover:bg-white/10 transition-colors"
            >Önceki</button>
            <span className="text-xs font-medium text-white/60">
                {meta.page} / {meta.totalPages}
            </span>
            <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange(meta.page + 1)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/80 rounded-lg disabled:opacity-40 text-xs font-semibold hover:bg-white/10 transition-colors"
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
            }} className="glass-card p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex gap-3">
                    <select disabled={submitting} name="type" className="glass-input px-3 py-2 text-sm outline-none w-40 shrink-0">
                        <option value="Arama" className="bg-slate-900 text-white">Arama</option>
                        <option value="E-posta" className="bg-slate-900 text-white">E-posta</option>
                        <option value="Toplantı" className="bg-slate-900 text-white">Toplantı</option>
                    </select>
                </div>
                <textarea disabled={submitting} name="content" rows={4} placeholder="Aktivite veya not ekle (satır atlayabilirsiniz)..." className="glass-input w-full px-4 py-2.5 text-sm outline-none resize-y" required></textarea>
                <div className="flex justify-end">
                    <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 transition-all whitespace-nowrap disabled:opacity-50">
                        {submitting ? "Ekleniyor..." : "Ekle"}
                    </button>
                </div>
            </form>

            {loading ? <div className="p-4 text-center text-white/50">Yükleniyor...</div> : (
                <div className="relative border-l-2 border-white/15 ml-5 pl-6 space-y-4">
                    {data.map((n) => (
                        <div key={n.id} className="relative group">
                            <span className="absolute -left-[35px] bg-slate-900 border-2 border-indigo-400 text-indigo-400 size-6 rounded-full flex items-center justify-center text-[10px] material-symbols-outlined font-bold">
                                {n.noteType === 'Arama' ? 'call' : n.noteType === 'Toplantı' ? 'groups' : 'mail'}
                            </span>
                            <div className="glass-card p-4 rounded-2xl relative">
                                <p className="text-sm text-white whitespace-pre-wrap">{n.content}</p>
                                <span className="text-[11px] text-white/50 mt-2 block font-medium">{new Date(n.createdAt).toLocaleString("tr-TR")} • {n.noteType}</span>
                                <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, n.id)} className="absolute top-4 right-4 text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[16px] disabled:opacity-30">delete</button>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="text-sm text-white/50 italic py-4">Henüz not eklenmemiş.</div>}
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
                <button disabled={submitting} onClick={() => setIsModalOpen(true)} className="text-sm text-sky-300 bg-sky-500/15 border border-sky-500/30 font-semibold hover:bg-sky-500/25 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden sm:inline">Görev Ekle</span>
                </button>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="font-bold text-white">Yeni Görev</h3>
                            <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
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
                                <label className="text-xs font-semibold text-white/80">Görev Başlığı</label>
                                <input disabled={submitting} name="title" required type="text" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/80">Açıklama</label>
                                <textarea disabled={submitting} name="description" rows={3} className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/80">Öncelik</label>
                                <select disabled={submitting} name="priority" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50">
                                    <option value="low" className="bg-slate-900 text-white">Düşük</option>
                                    <option value="normal" defaultValue="normal" className="bg-slate-900 text-white">Normal</option>
                                    <option value="high" className="bg-slate-900 text-white">Yüksek</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/80">Durum</label>
                                <select disabled={submitting} name="status" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50">
                                    <option value="Fikir / Brief Aşamasında" className="bg-slate-900 text-white">Fikir / Brief Aşamasında</option>
                                    <option value="Onay Bekliyor" className="bg-slate-900 text-white">Onay Bekliyor</option>
                                    <option value="Yapım Aşamasında" className="bg-slate-900 text-white">Yapım Aşamasında</option>
                                    <option value="Tamamlandı" className="bg-slate-900 text-white">Tamamlandı</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/80">Son Tarih (Opsiyonel)</label>
                                <input disabled={submitting} name="dueDate" type="date" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 disabled:opacity-50">
                                    {submitting ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="p-4 text-center text-white/50">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((t) => (
                        <div key={t.id} className="glass-card border-l-4 border-l-indigo-400 rounded-2xl p-4 flex items-start gap-3 group">
                            <input disabled={submitting} type="checkbox" checked={t.status === "Tamamlandı"} onChange={(e) => handleCrud("PUT", { status: e.target.checked ? "Tamamlandı" : "Fikir / Brief Aşamasında" }, t.id)} className="w-5 h-5 mt-0.5 accent-indigo-500 cursor-pointer shrink-0 disabled:opacity-50" />
                            <div className="flex-1 min-w-0">
                                <h5 className={`text-sm font-semibold text-white ${t.status === 'Tamamlandı' ? 'line-through opacity-50' : ''}`}>{t.title}</h5>
                                {t.description && <p className="text-xs text-white/60 mt-2">{t.description}</p>}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select disabled={submitting} value={selectedStatus[t.id] ?? t.status} onChange={(e) => setSelectedStatus(prev => ({ ...prev, [t.id]: e.target.value }))} className="glass-input px-2.5 py-1 text-xs disabled:opacity-50">
                                        <option value="Fikir / Brief Aşamasında" className="bg-slate-900 text-white">Fikir / Brief Aşamasında</option>
                                        <option value="Onay Bekliyor" className="bg-slate-900 text-white">Onay Bekliyor</option>
                                        <option value="Yapım Aşamasında" className="bg-slate-900 text-white">Yapım Aşamasında</option>
                                        <option value="Tamamlandı" className="bg-slate-900 text-white">Tamamlandı</option>
                                    </select>
                                    <button disabled={submitting} onClick={() => handleCrud("PUT", { status: selectedStatus[t.id] ?? t.status }, t.id)} className="text-xs font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 px-2.5 py-1 rounded-lg disabled:opacity-50">Güncelle</button>
                                </div>
                                {t.dueDate && <p className="text-xs text-white/50 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">calendar_today</span> Son Tarih: {new Date(t.dueDate).toLocaleDateString("tr-TR")}</p>}
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, t.id)} className="text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] shrink-0 disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-white/50 italic py-4 text-center">Henüz görev eklenmemiş.</div>}
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
            }} className="glass-card p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex gap-3">
                    <select disabled={submitting} name="channel" className="glass-input px-3 py-2 text-sm outline-none w-40 disabled:opacity-50">
                        <option value="WhatsApp" className="bg-slate-900 text-white">WhatsApp</option>
                        <option value="SMS" className="bg-slate-900 text-white">SMS</option>
                        <option value="Email" className="bg-slate-900 text-white">Email</option>
                        <option value="Internal" className="bg-slate-900 text-white">Dahili</option>
                    </select>
                </div>
                <textarea disabled={submitting} name="content" rows={4} placeholder="Mesaj içeriğini buraya girin (satır atlayabilirsiniz)..." className="glass-input w-full px-4 py-2.5 text-sm outline-none resize-y disabled:opacity-50" required></textarea>
                <div className="flex justify-end">
                    <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50">
                        {submitting ? "Gönderiliyor..." : "Gönder / Logla"}
                    </button>
                </div>
            </form>

            {loading ? <div className="p-4 text-center text-white/50">Yükleniyor...</div> : (
                <div className="space-y-3">
                    {data.map((c) => (
                        <div key={c.id} className="glass-card p-4 rounded-2xl flex items-start gap-4 group">
                            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${c.type === 'WhatsApp' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'}`}>
                                <span className="material-symbols-outlined text-[20px]">{c.type === 'WhatsApp' ? 'chat' : 'mail'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/60">{c.type}</span>
                                    <span className="text-[10px] text-white/40">{new Date(c.timestamp).toLocaleString("tr-TR")}</span>
                                </div>
                                <p className="text-sm text-white whitespace-pre-wrap">{c.content}</p>
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, c.id)} className="text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="text-sm text-white/50 italic py-8 text-center">Henüz görüşme kaydı yok.</div>}
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
            <div className="glass-card p-6 rounded-2xl">
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

            {loading ? <div className="p-4 text-center text-white/50">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map((d) => (
                        <div key={d.id} className="glass-card p-4 rounded-2xl group flex flex-col">
                            <div className="size-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-sky-400 text-2xl">description</span>
                            </div>
                            <h5 className="text-sm font-bold text-white truncate" title={d.name}>{d.name}</h5>
                            <p className="text-[10px] text-white/50 mt-1 mb-4">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</p>
                            <div className="mt-auto flex gap-2">
                                <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 px-3 py-1.5 bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold text-center hover:bg-white/15 transition-colors">Görüntüle</a>
                                <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, d.id)} className="p-1.5 text-white/50 hover:text-rose-400 transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-white/50 italic py-8 text-center">Henüz belge yüklenmemiş.</div>}
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
            // Load existing customers to select from
            fetch("/api/customers").then(res => res.json()).then(json => {
                setAllCustomers(json.data || json)
            })
        }
    }, [isModalOpen, isManual])

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button disabled={submitting} onClick={() => { setIsModalOpen(true); setIsManual(false) }} className="px-4 py-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-500/25 transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">person_add</span> Kişi Ekle
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="font-bold text-white">İlişkili Kişi Ekle</h3>
                            <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 border-b border-white/10">
                            <div className="flex gap-1 bg-black/30 backdrop-blur-md p-1 rounded-xl border border-white/10">
                                <button disabled={submitting} onClick={() => setIsManual(false)} className={`flex-1 py-2 text-xs font-semibold transition-all ${!isManual ? 'bg-white/15 text-white shadow-sm rounded-lg' : 'text-white/60 hover:text-white rounded-lg'} disabled:opacity-50`}>Sistemden Seç</button>
                                <button disabled={submitting} onClick={() => setIsManual(true)} className={`flex-1 py-2 text-xs font-semibold transition-all ${isManual ? 'bg-white/15 text-white shadow-sm rounded-lg' : 'text-white/60 hover:text-white rounded-lg'} disabled:opacity-50`}>Manuel Giriş</button>
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
                                    <label className="text-xs font-semibold text-white/80">Sistemdeki Müşteriler</label>
                                    <select disabled={submitting} name="selectedCustomer" required className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50">
                                        <option value="" className="bg-slate-900 text-white">-- Müşteri Seç --</option>
                                        {allCustomers.filter(c => c.id !== customerId).map(c => (
                                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name} {c.company ? `(${c.company})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/80">İsim Soyisim</label>
                                        <input disabled={submitting} name="name" required type="text" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/80">Rol / Pozisyon</label>
                                        <input disabled={submitting} name="role" type="text" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/80">Telefon</label>
                                        <input disabled={submitting} name="phone" type="text" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/80">E-posta</label>
                                        <input disabled={submitting} name="email" type="email" className="glass-input w-full px-3 py-2 text-sm outline-none disabled:opacity-50" />
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 disabled:opacity-50">
                                    {submitting ? "Ekleniyor..." : "Ekle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="p-4 text-center text-white/50">Yükleniyor...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((c) => (
                        <div key={c.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 group relative">
                            <div className="size-10 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-sm font-bold text-white truncate">{c.name}</h5>
                                <p className="text-[11px] text-white/60">{c.role || "İletişim Kişisi"}</p>
                                {c.phone && <p className="text-[11px] text-sky-400 font-medium mt-1">{c.phone}</p>}
                            </div>
                            <button disabled={submitting} onClick={() => confirm("Emin misiniz?") && handleCrud("DELETE", {}, c.id)} className="absolute top-4 right-4 text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity material-symbols-outlined text-[18px] disabled:opacity-30">delete</button>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full text-sm text-white/50 italic py-8 text-center">Henüz ilişkili kişi eklenmemiş.</div>}
                </div>
            )}
            <Pagination meta={meta} onPageChange={loadData} />
        </div>
    )
}

"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { NotesTab, TasksTab, ChatsTab, DocumentsTab, ContactsTab } from "./relation-tabs"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { mockDatabase } from "@/lib/data/mockDatabase"

// Interfaces
interface Customer {
  id: string
  branchId: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  status: string
  scoreTemp: string
  purchaseProb: number
  segment: string
  recallDate: string
  anniversary: string
  createdAt: string
  notes: any[]
  chats: any[]
  documents: any[]
  tasks: any[]
  contacts: any[]
  orders: any[]
}

export default function CustomersPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("customers", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  const [customers, setCustomers] = useState<Customer[]>(() => mockDatabase.getCustomers() as any)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("genel")
  const [formData, setFormData] = useState<Partial<Customer>>({})
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)
  const [syncingLeads, setSyncingLeads] = useState(false)

  useEffect(() => {
    const handleDbChange = () => setCustomers(mockDatabase.getCustomers() as any)
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentBranch) return

    setLoading(true)
    try {
      const text = await file.text()
      const isCsv = file.name.endsWith('.csv')
      const isVcf = file.name.endsWith('.vcf')
      let customersToImport: any[] = []

      if (isCsv) {
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue
          const values = lines[i].split(',').map(v => v.trim())
          const obj: any = { branchId: currentBranch.id }
          headers.forEach((h, idx) => {
            if (h === 'name' || h === 'isim' || h === 'ad') obj.name = values[idx]
            if (h === 'company' || h === 'şirket' || h === 'firma') obj.company = values[idx]
            if (h === 'email' || h === 'eposta') obj.email = values[idx]
            if (h === 'phone' || h === 'telefon') obj.phone = values[idx]
          })
          if (obj.name) customersToImport.push(obj)
        }
      } else if (isVcf) {
        const vcards = text.split('BEGIN:VCARD')
        vcards.forEach(card => {
          if (!card.trim()) return
          const obj: any = { branchId: currentBranch.id }
          const lines = card.split('\n')
          lines.forEach(line => {
            if (line.startsWith('FN:')) obj.name = line.substring(3).trim()
            if (line.startsWith('ORG:')) obj.company = line.substring(4).trim()
            if (line.startsWith('TEL')) obj.phone = line.split(':')[1]?.trim()
            if (line.startsWith('EMAIL')) obj.email = line.split(':')[1]?.trim()
          })
          if (obj.name) customersToImport.push(obj)
        })
      } else {
        toast.error("Lütfen .csv veya .vcf dosyası yükleyin.")
        setLoading(false)
        return
      }

      if (customersToImport.length === 0) {
        toast.error("İçe aktarılacak geçerli kayıt bulunamadı.")
        setLoading(false)
        return
      }

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customersToImport)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.count} müşteri içe aktarıldı!`)
        loadCustomers()
      } else {
        toast.error("İçe aktarma başarısız oldu.")
      }
    } catch (err) {
      toast.error("Dosya okunurken bir hata oluştu.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    if (currentBranch) loadCustomers()
  }, [currentBranch])

  const loadCustomers = async () => {
    try {
      const branchId = currentBranch?.id || "local-debug-branch"
      const res = await fetch(`/api/customers?branchId=${branchId}`)
      if (res.ok) {
        const json = await res.json()
        const list = json.data || json
        if (Array.isArray(list) && list.length > 0) {
          setCustomers(list)
        } else {
          setCustomers(mockDatabase.getCustomers() as any)
        }
      } else {
        setCustomers(mockDatabase.getCustomers() as any)
      }
    } catch {
      setCustomers(mockDatabase.getCustomers() as any)
    }
  }

  const handleSaveCustomer = async () => {
    if (!currentBranch) return
    setLoading(true)
    const method = selectedCustomer ? "PUT" : "POST"
    
    try {
      const res = await fetch("/api/customers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          id: selectedCustomer?.id,
          ...formData
        })
      })

      if (res.ok) {
        toast.success(selectedCustomer ? "Müşteri güncellendi" : "Müşteri eklendi")
        await loadCustomers()
        setIsCreateDialogOpen(false)
        setSelectedCustomer(null)
      } else {
        toast.error("İşlem başarısız")
      }
    } catch {
      toast.error("Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Müşteri silindi")
        loadCustomers()
        setSelectedCustomer(null)
      } else {
        toast.error("Silme işlemi başarısız")
      }
    } catch {
      toast.error("Bir hata oluştu")
    }
  }

  const handleToggleBlacklist = async (customer: Customer) => {
    if (!currentBranch) return
    const newStatus = customer.status === "blacklist" ? "active" : "blacklist"
    if (!confirm(`Müşteriyi ${newStatus === "blacklist" ? "Kara Listeye eklemek" : "Kara Listeden çıkarmak"} istediğinize emin misiniz?`)) return
    
    setLoading(true)
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          branchId: currentBranch.id,
          status: newStatus
        })
      })
      if (res.ok) {
        toast.success(newStatus === "blacklist" ? "Kara listeye eklendi" : "Kara listeden çıkarıldı")
        await loadCustomers()
        setSelectedCustomer(null)
      }
    } catch {
      toast.error("İşlem başarısız")
    } finally {
      setLoading(false)
    }
  }

  const handleSyncLeads = async () => {
    if (!confirm("Sıcak ve VIP hariç tüm aktif müşteriler Adaylar (Leads) ekranına eklenecektir. Emin misiniz?")) return
    setSyncingLeads(true)
    try {
      const res = await fetch("/api/customers/sync-leads", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.count} müşteri başarıyla senkronize edildi.`)
      } else {
        toast.error("Senkronizasyon başarısız oldu.")
      }
    } catch {
      toast.error("Senkronizasyon sırasında hata oluştu.")
    } finally {
      setSyncingLeads(false)
    }
  }

  const handleRelationCrud = async (type: string, method: string, data: any, id?: string) => {
      try {
          const res = await fetch(`/api/customers/relations${id ? `?type=${type}&id=${id}` : ''}`, {
              method,
              headers: { "Content-Type": "application/json" },
              body: method !== "DELETE" ? JSON.stringify({ type, id, customerId: selectedCustomer?.id, ...data }) : undefined
          })
          if(res.ok && selectedCustomer) {
              const updated = await fetch(`/api/customers?id=${selectedCustomer.id}`).then(r => r.json())
              setSelectedCustomer(updated)
              loadCustomers() // Refresh list in background
          }
      } catch(e) {
          toast.error("İşlem başarısız")
      }
  }

  const filteredCustomers = customers.filter(c => 
    c.status !== "blacklist" &&
    ((c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.company || "").toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const blacklistedCustomers = customers.filter(c => c.status === "blacklist")

  const renderTabs = () => {
    const tabs = [
      { id: "genel", label: "Genel Bilgiler", icon: "person" },
      { id: "notlar", label: "Notlar & Aktivite", icon: "edit_note" },
      { id: "sohbet", label: "Sohbet", icon: "forum" },
      { id: "satis", label: "Satış & Siparişler", icon: "shopping_cart" },
      { id: "belgeler", label: "Belgeler", icon: "folder" },
      { id: "gorevler", label: "Görevler", icon: "checklist" },
      { id: "kisiler", label: "İlişkili Kişiler", icon: "diversity_3" },
    ]

    return (
      <div className="px-5 py-3 border-b border-white/10 shrink-0 bg-white/[0.02] overflow-x-auto custom-scrollbar hide-scrollbar">
        <div className="inline-flex items-center gap-1 bg-black/30 backdrop-blur-md p-1 rounded-xl border border-white/10 min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-white/15 text-white shadow-sm rounded-lg" : "text-white/60 hover:text-white rounded-lg"}`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
            Müşteriler
            <ContextualHelp />
          </h1>
          <p className="text-white/60 mt-1.5 text-sm">
            Detaylı müşteri, b2b ve firma yönetimi
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            accept=".csv,.vcf" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span className="hidden lg:inline">{tText("common.import", "İçe Aktar")}</span>
          </button>
          <button
            onClick={handleSyncLeads}
            disabled={syncingLeads}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            title="Sıcak ve VIP hariç müşterileri Leads paneline aktar"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span className="hidden lg:inline">{syncingLeads ? "Senkronize ediliyor..." : "Adaylara Aktar"}</span>
          </button>
          <button
            onClick={() => setIsBlacklistOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span className="hidden lg:inline">Kara Liste</span>
          </button>
          <button
            onClick={() => {
              setSelectedCustomer(null)
              setFormData({ status: "active", scoreTemp: "Ilık" })
              setIsCreateDialogOpen(true)
            }}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 border border-white/15 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Yeni</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-5">
        {/* Left List */}
        <div className={`w-full lg:w-[340px] shrink-0 glass-panel rounded-2xl flex flex-col overflow-hidden ${selectedCustomer ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-white/10 bg-white/[0.02]">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center material-symbols-outlined text-white/40 text-[20px]">search</span>
              <input
                type="text"
                placeholder={tText("common.search", "Ara...")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-11 pr-4 py-2.5 text-sm outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedCustomer(c); setActiveTab("genel") }}
                className={`p-4 cursor-pointer transition-all border-b border-white/5 border-l-4 ${selectedCustomer?.id === c.id ? "bg-white/10 border-l-indigo-400" : "hover:bg-white/[0.04] border-l-transparent"}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{c.name || "İsimsiz"}</h4>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${c.scoreTemp === 'Sıcak' || c.scoreTemp === 'VIP' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'}`}>{c.scoreTemp}</span>
                </div>
                <div className="text-xs text-white/60 flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "Belirtilmemiş"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedCustomer ? (
          <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Detail Header */}
            <div className="p-5 lg:p-6 border-b border-white/10 shrink-0 bg-white/[0.02] flex justify-between items-start gap-4">
               <div className="flex gap-4 items-center min-w-0 flex-1">
                 <button onClick={() => setSelectedCustomer(null)} className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white/70 hover:bg-white/15 transition-colors"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
                 <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 border border-white/15 flex items-center justify-center text-white text-lg font-bold shadow-lg shrink-0">
                    {selectedCustomer.name?.substring(0,2).toUpperCase() || "?"}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight truncate">
                      {selectedCustomer.name || "İsimsiz Müşteri"}
                    </h2>
                    <div className="text-sm text-white/60 flex items-center gap-3 mt-1.5 flex-wrap">
                      {selectedCustomer.company && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0">domain</span><span className="truncate">{selectedCustomer.company}</span></span>}
                      {selectedCustomer.email && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0">mail</span><span className="truncate">{selectedCustomer.email}</span></span>}
                    </div>
                 </div>
               </div>
               <div className="flex gap-2 shrink-0">
                 <button onClick={() => handleToggleBlacklist(selectedCustomer)} className="p-2 border border-white/15 bg-black/40 text-white/80 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-colors" title="Kara Listeye Ekle"><span className="material-symbols-outlined">block</span></button>
                 <button onClick={() => {
                   setFormData(selectedCustomer)
                   setIsCreateDialogOpen(true)
                 }} className="p-2 border border-white/10 bg-white/5 rounded-xl text-white/70 hover:text-sky-300 hover:bg-sky-500/15 transition-colors" title="Düzenle"><span className="material-symbols-outlined">edit</span></button>
                 <button onClick={() => handleDelete(selectedCustomer.id)} className="p-2 border border-rose-500/30 bg-rose-500/15 text-rose-300 rounded-xl hover:bg-rose-500/25 transition-colors" title="Sil"><span className="material-symbols-outlined">delete</span></button>
               </div>
            </div>

            {renderTabs()}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 lg:p-6 custom-scrollbar">
               {activeTab === "genel" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Contact Information */}
                    <div className="col-span-full md:col-span-2 space-y-5">
                      <div className="glass-card p-6 rounded-2xl">
                        <h4 className="font-semibold text-sm text-white mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sky-400 text-[20px]">contact_page</span> İletişim Bilgileri</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                           <div><span className="text-white/50 block mb-1.5 text-xs font-medium uppercase tracking-wide">Telefon</span> <span className="font-medium text-white">{selectedCustomer.phone || "-"}</span></div>
                           <div><span className="text-white/50 block mb-1.5 text-xs font-medium uppercase tracking-wide">E-posta</span> <span className="font-medium text-white">{selectedCustomer.email || "-"}</span></div>
                           <div className="col-span-2"><span className="text-white/50 block mb-1.5 text-xs font-medium uppercase tracking-wide">Adres</span> <span className="font-medium text-white">{selectedCustomer.address || "-"}</span></div>
                        </div>
                      </div>
                    </div>
                    {/* Customer Score */}
                    <div className="space-y-5">
                      <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900/40 to-sky-500/10">
                        <h4 className="font-semibold text-sm text-white mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-400 text-[20px]">analytics</span> Müşteri Skoru</h4>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-white/60">Sıcaklık Skalası</span> <span className="text-amber-300 font-bold">{selectedCustomer.scoreTemp}</span></div>
                           </div>
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-white/60">Alım İhtimali</span> <span className="text-white">%{selectedCustomer.purchaseProb || 0}</span></div>
                             <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style={{width: `${selectedCustomer.purchaseProb || 0}%`}}></div></div>
                           </div>
                           <div className="pt-3 border-t border-white/10">
                             <div className="text-xs font-semibold text-white/60">Segment: <span className="text-white font-bold">{selectedCustomer.segment || "-"}</span></div>
                           </div>
                        </div>
                      </div>
                    </div>
                 </div>
               )}

               {activeTab === "notlar" && <NotesTab customerId={selectedCustomer.id} />}
               {activeTab === "gorevler" && <TasksTab customerId={selectedCustomer.id} />}
               {activeTab === "sohbet" && <ChatsTab customerId={selectedCustomer.id} />}
               {activeTab === "belgeler" && <DocumentsTab customerId={selectedCustomer.id} />}
               {activeTab === "kisiler" && <ContactsTab customerId={selectedCustomer.id} />}

               {activeTab === "satis" && (
                 <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-white">Sipariş Geçmişi</h4>
                      <button onClick={() => router.push(`/dashboard/orders?customerId=${selectedCustomer.id}`)} className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1">
                        Tüm Siparişleri Gör <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </button>
                    </div>
                    <div className="glass-table-container overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.03] border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-white/50">No</th>
                            <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-white/50">Başlık</th>
                            <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-white/50">Tutar</th>
                            <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-white/50">Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.orders?.map((o) => (
                            <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                              <td className="px-4 py-3 font-mono font-medium text-xs text-white/80">{o.orderNumber || "#"+o.id.substring(0,6)}</td>
                              <td className="px-4 py-3 font-semibold text-white">{o.title}</td>
                              <td className="px-4 py-3 font-bold text-emerald-400">{o.totalAmount ? o.totalAmount.toLocaleString('tr-TR')+' ₺' : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-3 py-0.5 rounded-full text-xs font-medium uppercase ${o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'}`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-white/50 italic">Henüz sipariş kaydı yok.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )}

            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center glass-panel rounded-2xl border-dashed">
             <div className="text-center p-8">
                <div className="size-16 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/40 text-4xl">person_search</span>
                </div>
                <p className="text-white/60 font-medium">Detayları görmek için soldan bir müşteri seçin.</p>
             </div>
          </div>
        )}
      </div>

       {/* Create/Edit Dialog */}
       {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white">
                {formData.id ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
              </h3>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {/* No fields are strictly mandatory */}
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Müşteri / Firma Adı *</label>
                    <input type="text" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" placeholder="İsimsiz bırakılabilir" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Şirket Ünvanı</label>
                    <input type="text" value={formData.company || ""} onChange={e => setFormData({...formData, company: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Telefon</label>
                    <input type="text" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">E-posta</label>
                    <input type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
                 </div>
                 <div className="space-y-2 col-span-full">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Adres</label>
                    <input type="text" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Müşteri Sıcaklık Segmenti</label>
                    <select value={formData.scoreTemp || "Ilık"} onChange={e => setFormData({...formData, scoreTemp: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none">
                       <option value="Soğuk" className="bg-slate-900 text-white">Soğuk</option>
                       <option value="Ilık" className="bg-slate-900 text-white">Ilık</option>
                       <option value="Sıcak" className="bg-slate-900 text-white">Sıcak</option>
                       <option value="VIP" className="bg-slate-900 text-white">VIP</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Satış Olasılığı (%)</label>
                    <input type="number" min="0" max="100" value={formData.purchaseProb || ""} onChange={e => setFormData({...formData, purchaseProb: Number(e.target.value)})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
                 </div>
               </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex justify-end gap-3">
               <button onClick={() => setIsCreateDialogOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-white/80 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-colors">{tText("common.cancel", "İptal")}</button>
               <button onClick={handleSaveCustomer} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50">
                 {loading ? "Bekleyin..." : "Kaydet"}
               </button>
            </div>
          </div>
        </div>
      )}

       {/* Blacklist Dialog */}
       {isBlacklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-slate-900/90 text-white rounded-2xl w-full max-w-4xl overflow-hidden border border-white/15 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wider">KARA LİSTE</h3>
                  <p className="text-white/50 text-xs">İşletmeye sorun çıkarmış müşteriler</p>
                </div>
              </div>
              <button onClick={() => setIsBlacklistOpen(false)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {blacklistedCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blacklistedCustomers.map(c => (
                    <div key={c.id} className="glass-card p-5 rounded-2xl flex flex-col relative group">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h4 className="font-bold text-white line-clamp-1">{c.name}</h4>
                        <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0">KARA LİSTE</span>
                      </div>
                      <p className="text-xs text-white/60 flex items-center gap-1.5 mb-2"><span className="material-symbols-outlined text-[14px]">phone</span> {c.phone || "-"}</p>
                      <p className="text-xs text-white/60 flex items-center gap-1.5 mb-4"><span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "-"}</p>
                      
                      <div className="mt-auto pt-3 border-t border-white/10 flex justify-end">
                        <button onClick={() => handleToggleBlacklist(c)} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-lg transition-colors">Listeden Çıkar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-50">gpp_good</span>
                  <p className="text-lg">Kara listede kimse yok.</p>
                </div>
              )}
            </div>
          </div>
        </div>
       )}
    </div>
  )
}

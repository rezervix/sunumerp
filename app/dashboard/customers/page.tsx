"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { NotesTab, TasksTab, ChatsTab, DocumentsTab, ContactsTab } from "./relation-tabs"
import { ContextualHelp } from "@/components/shared/contextual-help"

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

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("genel")
  const [formData, setFormData] = useState<Partial<Customer>>({})
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)
  const [syncingLeads, setSyncingLeads] = useState(false)
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
    if (!currentBranch) return
    try {
      const res = await fetch(`/api/customers?branchId=${currentBranch.id}`)
      if (res.ok) {
        const json = await res.json()
        setCustomers(json.data || json)
      }
    } catch (e) {}
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
      <div className="flex overflow-x-auto border-b border-border shrink-0 custom-scrollbar hide-scrollbar bg-card/50">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 lg:px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"}`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight flex items-center gap-1">
            Müşteriler
            <ContextualHelp />
          </h1>
          <p className="text-muted-foreground mt-2">
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
            className="flex-1 sm:flex-none px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span className="hidden lg:inline">{tText("common.import", "İçe Aktar")}</span>
          </button>
          <button
            onClick={handleSyncLeads}
            disabled={syncingLeads}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            title="Sıcak ve VIP hariç müşterileri Leads paneline aktar"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span className="hidden lg:inline">{syncingLeads ? "Senkronize ediliyor..." : "Adaylara Aktar"}</span>
          </button>
          <button
            onClick={() => setIsBlacklistOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-black text-white border border-white/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all"
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
            className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Yeni</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-5">
        {/* Left List */}
        <div className={`w-full lg:w-[340px] shrink-0 bg-card border border-border rounded-xl shadow-soft flex flex-col overflow-hidden ${selectedCustomer ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-border bg-card/50">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center material-symbols-outlined text-muted-foreground text-[20px]">search</span>
              <input
                type="text"
                placeholder={tText("common.search", "Ara...")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border custom-scrollbar">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedCustomer(c); setActiveTab("genel") }}
                className={`p-4 cursor-pointer transition-all border-l-4 ${selectedCustomer?.id === c.id ? "bg-primary/8 border-l-primary" : "hover:bg-muted/40 border-l-transparent"}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-bold text-foreground text-sm line-clamp-1">{c.name || "İsimsiz"}</h4>
                  <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold shrink-0 ${c.scoreTemp === 'Sıcak' || c.scoreTemp === 'VIP' ? 'bg-orange-100 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300' : 'bg-slate-100 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300'}`}>{c.scoreTemp}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "Belirtilmemiş"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedCustomer ? (
          <div className="flex-1 bg-card border border-border rounded-xl shadow-soft flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Detail Header */}
            <div className="p-5 lg:p-6 border-b border-border shrink-0 bg-card/50 flex justify-between items-start gap-4">
               <div className="flex gap-4 items-center min-w-0 flex-1">
                 <button onClick={() => setSelectedCustomer(null)} className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted rounded-lg text-muted-foreground hover:bg-muted/80 transition-colors"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
                 <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-lg font-bold shadow-md shrink-0">
                    {selectedCustomer.name?.substring(0,2).toUpperCase() || "?"}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate">
                      {selectedCustomer.name || "İsimsiz Müşteri"}
                    </h2>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-2 flex-wrap">
                      {selectedCustomer.company && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0">domain</span><span className="truncate">{selectedCustomer.company}</span></span>}
                      {selectedCustomer.email && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0">mail</span><span className="truncate">{selectedCustomer.email}</span></span>}
                    </div>
                 </div>
               </div>
               <div className="flex gap-2 shrink-0">
                 <button onClick={() => handleToggleBlacklist(selectedCustomer)} className="p-2 border border-black bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors" title="Kara Listeye Ekle"><span className="material-symbols-outlined">block</span></button>
                 <button onClick={() => {
                   setFormData(selectedCustomer)
                   setIsCreateDialogOpen(true)
                 }} className="p-2 border border-border bg-background rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" title="Düzenle"><span className="material-symbols-outlined">edit</span></button>
                 <button onClick={() => handleDelete(selectedCustomer.id)} className="p-2 border border-destructive/30 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-colors" title="Sil"><span className="material-symbols-outlined">delete</span></button>
               </div>
            </div>

            {renderTabs()}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 lg:p-6 bg-background/50 custom-scrollbar">
               {activeTab === "genel" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Contact Information */}
                    <div className="col-span-full md:col-span-2 space-y-5">
                      <div className="bg-card border border-border p-5 rounded-lg shadow-soft">
                        <h4 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">contact_page</span> İletişim Bilgileri</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                           <div><span className="text-muted-foreground block mb-1.5 text-xs font-medium uppercase tracking-wide">Telefon</span> <span className="font-medium text-foreground">{selectedCustomer.phone || "-"}</span></div>
                           <div><span className="text-muted-foreground block mb-1.5 text-xs font-medium uppercase tracking-wide">E-posta</span> <span className="font-medium text-foreground">{selectedCustomer.email || "-"}</span></div>
                           <div className="col-span-2"><span className="text-muted-foreground block mb-1.5 text-xs font-medium uppercase tracking-wide">Adres</span> <span className="font-medium text-foreground">{selectedCustomer.address || "-"}</span></div>
                        </div>
                      </div>
                    </div>
                    {/* Customer Score */}
                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5 rounded-lg">
                        <h4 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">analytics</span> Müşteri Skoru</h4>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-muted-foreground">Sıcaklık Skalası</span> <span className="text-primary font-bold">{selectedCustomer.scoreTemp}</span></div>
                           </div>
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-muted-foreground">Alım İhtimali</span> <span className="text-foreground">%{selectedCustomer.purchaseProb || 0}</span></div>
                             <div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-primary h-2 rounded-full transition-all duration-500" style={{width: `${selectedCustomer.purchaseProb || 0}%`}}></div></div>
                           </div>
                           <div className="pt-3 border-t border-border">
                             <div className="text-xs font-semibold text-muted-foreground">Segment: <span className="text-foreground font-bold">{selectedCustomer.segment || "-"}</span></div>
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
                      <h4 className="text-sm font-bold text-foreground">Sipariş Geçmişi</h4>
                      <button onClick={() => router.push(`/dashboard/orders?customerId=${selectedCustomer.id}`)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        Tüm Siparişleri Gör <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </button>
                    </div>
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-bold text-xs uppercase text-muted-foreground">No</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase text-muted-foreground">Başlık</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase text-muted-foreground">Tutar</th>
                            <th className="px-4 py-3 font-bold text-xs uppercase text-muted-foreground">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedCustomer.orders?.map((o) => (
                            <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-xs">{o.orderNumber || "#"+o.id.substring(0,6)}</td>
                              <td className="px-4 py-3 font-semibold">{o.title}</td>
                              <td className="px-4 py-3 font-bold text-primary">{o.totalAmount ? o.totalAmount.toLocaleString('tr-TR')+' â‚º' : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">Henüz sipariş kaydı yok.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )}

            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 rounded-xl border border-border border-dashed">
             <div className="text-center p-8">
                <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-muted-foreground text-4xl">person_search</span>
                </div>
                <p className="text-muted-foreground font-medium">Detayları görmek için soldan bir müşteri seçin.</p>
             </div>
          </div>
        )}
      </div>

       {/* Create/Edit Dialog */}
       {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden border border-border shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50">
              <h3 className="text-lg font-bold text-foreground">
                {formData.id ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
              </h3>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {/* No fields are strictly mandatory */}
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Müşteri / Firma Adı *</label>
                    <input type="text" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" placeholder="İsimsiz bırakılabilir" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Şirket Ünvanı</label>
                    <input type="text" value={formData.company || ""} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Telefon</label>
                    <input type="text" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">E-posta</label>
                    <input type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" />
                 </div>
                 <div className="space-y-2 col-span-full">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Adres</label>
                    <input type="text" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Müşteri Sıcaklık Segmenti</label>
                    <select value={formData.scoreTemp || "Ilık"} onChange={e => setFormData({...formData, scoreTemp: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-1 focus:ring-ring">
                       <option value="Soğuk">Soğuk</option><option value="Ilık">Ilık</option><option value="Sıcak">Sıcak</option><option value="VIP">VIP</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Satış Olasılığı (%)</label>
                    <input type="number" min="0" max="100" value={formData.purchaseProb || ""} onChange={e => setFormData({...formData, purchaseProb: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring" />
                 </div>
               </div>
            </div>
            <div className="px-6 py-4 bg-muted/30 dark:bg-muted/10 border-t border-border flex justify-end gap-3">
               <button onClick={() => setIsCreateDialogOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors">{tText("common.cancel", "İptal")}</button>
               <button onClick={handleSaveCustomer} disabled={loading} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                 {loading ? "Bekleyin..." : "Kaydet"}
               </button>
            </div>
          </div>
        </div>
      )}

       {/* Blacklist Dialog */}
       {isBlacklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-black text-white rounded-2xl w-full max-w-4xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wider">KARA LİSTE</h3>
                  <p className="text-zinc-400 text-xs">İşletmeye sorun çıkarmış müşteriler</p>
                </div>
              </div>
              <button onClick={() => setIsBlacklistOpen(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950">
              {blacklistedCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blacklistedCustomers.map(c => (
                    <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col relative group">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-white line-clamp-1">{c.name}</h4>
                        <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-md font-bold shrink-0">KARA LİSTE</span>
                      </div>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mb-2"><span className="material-symbols-outlined text-[14px]">phone</span> {c.phone || "-"}</p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mb-4"><span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "-"}</p>
                      
                      <div className="mt-auto pt-3 border-t border-zinc-800 flex justify-end">
                        <button onClick={() => handleToggleBlacklist(c)} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors">Listeden Çıkar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
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

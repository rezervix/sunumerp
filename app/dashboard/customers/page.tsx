"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { NotesTab, TasksTab, ChatsTab, DocumentsTab, ContactsTab } from "./relation-tabs"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import { safeNumber, safeText, safeCurrency } from "@/lib/utils/safe-display"

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
  const { tText } = useLanguage()
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
    } catch {
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
    try {
      const isEdit = Boolean(formData.id)
      const res = await fetch("/api/customers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          branchId: currentBranch.id,
          name: formData.name || "İsimsiz Müşteri"
        })
      })

      if (res.ok) {
        toast.success(isEdit ? "Müşteri güncellendi" : "Müşteri eklendi")
        setIsCreateDialogOpen(false)
        setFormData({})
        loadCustomers()
      } else {
        toast.error("Kaydetme başarısız")
      }
    } catch {
      toast.error("Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Müşteri silindi")
        setSelectedCustomer(null)
        loadCustomers()
      } else {
        toast.error("Silinemedi")
      }
    } catch {
      toast.error("Bir hata oluştu")
    }
  }

  const handleToggleBlacklist = async (customer: Customer) => {
    const newStatus = customer.status === "blacklist" ? "active" : "blacklist"
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          status: newStatus
        })
      })
      if (res.ok) {
        toast.success(newStatus === "blacklist" ? "Kara listeye eklendi" : "Kara listeden çıkarıldı")
        loadCustomers()
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer({ ...selectedCustomer, status: newStatus })
        }
      }
    } catch {
      toast.error("İşlem başarısız")
    }
  }

  const handleSyncLeads = async () => {
    setSyncingLeads(true)
    try {
      const res = await fetch("/api/customers/sync-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: currentBranch?.id })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.count || 0} müşteri aday havuzuna aktarıldı`)
      } else {
        toast.error("Senkronizasyon başarısız")
      }
    } catch {
      toast.error("Senkronizasyon hatası")
    } finally {
      setSyncingLeads(false)
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
      <div className="px-5 py-3 border-b border-[--line] shrink-0 bg-[var(--muted-bg)] overflow-x-auto hide-scrollbar">
        <div className="inline-flex items-center gap-1 bg-[--muted-bg] p-1 rounded-full border border-[--line] min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap rounded-full transition-colors ${activeTab === t.id ? "text-[--navy]" : "text-[--text-muted] hover:text-[--text]"}`}
            >
              {activeTab === t.id && (
                <motion.span
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-full border border-[--line] shadow-xs"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight flex items-center gap-2">
            Müşteriler
            <ContextualHelp />
          </h1>
          <p className="text-[--text-muted] mt-1 text-sm">
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
            className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span className="hidden lg:inline">{tText("common.import", "İçe Aktar")}</span>
          </button>
          <button
            onClick={handleSyncLeads}
            disabled={syncingLeads}
            className="flex-1 sm:flex-none px-4 py-2 bg-[--brand-soft] border border-[--brand-line] text-[--brand] hover:bg-[--brand-soft]/80 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
            title="Sıcak ve VIP hariç müşterileri Leads paneline aktar"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span className="hidden lg:inline">{syncingLeads ? "Senkronize ediliyor..." : "Adaylara Aktar"}</span>
          </button>
          <button
            onClick={() => setIsBlacklistOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-[--bad-soft] text-[--bad] border border-[--bad-soft] hover:bg-[--bad-soft]/80 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
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
            className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Yeni</span>
          </button>
        </div>
      </div>

      {/* Borderless KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-3 border-b border-[--line] shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-1">
            <span className="material-symbols-outlined text-[15px] text-[--brand]">group</span>
            <span>AKTİF MÜŞTERİ</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(filteredCustomers.length, 0)} />
            </span>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Portföy
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-1">
            <span className="material-symbols-outlined text-[15px] text-[--ok]">local_fire_department</span>
            <span>SICAK / VIP</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(customers.filter(c => c.scoreTemp === "Sıcak" || c.scoreTemp === "VIP").length, 0)} />
            </span>
            <span className="bg-[--ok-soft] text-[--ok] border border-[--ok-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Öncelikli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-1">
            <span className="material-symbols-outlined text-[15px] text-[--bad]">block</span>
            <span>KARA LİSTE</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(blacklistedCustomers.length, 0)} />
            </span>
            <span className="bg-[--bad-soft] text-[--bad] border border-[--bad-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Engelli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-1">
            <span className="material-symbols-outlined text-[15px] text-[--text-muted]">database</span>
            <span>TOPLAM KAYIT</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(customers.length, 0)} />
            </span>
            <span className="bg-[--muted-bg] text-[--text-muted] border border-[--line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              CRM
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-5">
        {/* Left List */}
        <div className={`w-full lg:w-[340px] shrink-0 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm flex flex-col overflow-hidden ${selectedCustomer ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-[--line] bg-[var(--muted-bg)]">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center material-symbols-outlined text-[--text-muted] text-[20px]">search</span>
              <input
                type="text"
                placeholder={tText("common.search", "Ara...")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] placeholder:text-[--text-muted] outline-none focus:border-[--brand] transition-all shadow-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedCustomer(c); setActiveTab("genel") }}
                className={`p-4 cursor-pointer transition-all border-b border-[--line] border-l-2 ${selectedCustomer?.id === c.id ? "bg-[--brand-soft]/50 border-l-[--brand]" : "hover:bg-[--brand-soft]/20 border-l-transparent hover:border-l-[--brand-line]"}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-semibold text-[--navy] text-sm line-clamp-1">{safeText(c.name, "İsimsiz")}</h4>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium shrink-0 ${c.scoreTemp === 'Sıcak' || c.scoreTemp === 'VIP' ? 'bg-[--ok-soft] text-[--ok] border border-[--ok-soft]' : 'bg-[--muted-bg] text-[--text-muted] border border-[--line]'}`}>{c.scoreTemp}</span>
                </div>
                <div className="text-xs text-[--text-muted] flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "Belirtilmemiş"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedCustomer ? (
          <div className="flex-1 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Detail Header */}
            <div className="p-5 lg:p-6 border-b border-[--line] shrink-0 bg-[var(--muted-bg)] flex justify-between items-start gap-4">
               <div className="flex gap-4 items-center min-w-0 flex-1">
                 <button onClick={() => setSelectedCustomer(null)} className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[--muted-bg] rounded-lg text-[--text-2] hover:bg-[--line] transition-colors"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
                 <div className="size-14 rounded-2xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand] text-lg font-semibold shadow-xs shrink-0">
                    {selectedCustomer.name?.substring(0,2).toUpperCase() || "?"}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-2xl font-semibold text-[--navy] tracking-tight truncate">
                      {safeText(selectedCustomer.name, "İsimsiz Müşteri")}
                    </h2>
                    <div className="text-sm text-[--text-muted] flex items-center gap-3 mt-1.5 flex-wrap">
                      {selectedCustomer.company && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0 text-[--brand]">domain</span><span className="truncate">{selectedCustomer.company}</span></span>}
                      {selectedCustomer.email && <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] shrink-0 text-[--brand]">mail</span><span className="truncate">{selectedCustomer.email}</span></span>}
                    </div>
                 </div>
               </div>
               <div className="flex gap-2 shrink-0">
                 <button onClick={() => handleToggleBlacklist(selectedCustomer)} className="p-2 border border-[--line] bg-white text-[--text-muted] rounded-xl hover:bg-[--bad-soft] hover:text-[--bad] hover:border-[--bad-soft] transition-colors shadow-xs" title="Kara Listeye Ekle"><span className="material-symbols-outlined">block</span></button>
                 <button onClick={() => {
                   setFormData(selectedCustomer)
                   setIsCreateDialogOpen(true)
                 }} className="p-2 border border-[--line] bg-white rounded-xl text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] transition-colors shadow-xs" title="Düzenle"><span className="material-symbols-outlined">edit</span></button>
                 <button onClick={() => handleDelete(selectedCustomer.id)} className="p-2 border border-[--bad-soft] bg-[--bad-soft] text-[--bad] rounded-xl hover:opacity-80 transition-colors shadow-xs" title="Sil"><span className="material-symbols-outlined">delete</span></button>
               </div>
            </div>

            {renderTabs()}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 lg:p-6">
               {activeTab === "genel" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Contact Information */}
                    <div className="col-span-full md:col-span-2 space-y-5">
                      <div className="bg-white border border-[--line] p-6 rounded-[20px] shadow-xs">
                        <h4 className="font-semibold text-sm text-[--navy] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[--brand] text-[20px]">contact_page</span> İletişim Bilgileri</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                           <div><span className="text-[--text-muted] block mb-1 text-xs font-medium uppercase tracking-wide">Telefon</span> <span className="font-medium text-[--text]">{selectedCustomer.phone || "-"}</span></div>
                           <div><span className="text-[--text-muted] block mb-1 text-xs font-medium uppercase tracking-wide">E-posta</span> <span className="font-medium text-[--text]">{selectedCustomer.email || "-"}</span></div>
                           <div className="col-span-2"><span className="text-[--text-muted] block mb-1 text-xs font-medium uppercase tracking-wide">Adres</span> <span className="font-medium text-[--text]">{selectedCustomer.address || "-"}</span></div>
                        </div>
                      </div>
                    </div>
                    {/* Customer Score */}
                    <div className="space-y-5">
                      <div className="bg-white border border-[--line] p-6 rounded-[20px] shadow-xs">
                        <h4 className="font-semibold text-sm text-[--navy] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[--brand] text-[20px]">analytics</span> Müşteri Skoru</h4>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-[--text-muted]">Sıcaklık Skalası</span> <span className="text-[--brand] font-semibold">{selectedCustomer.scoreTemp}</span></div>
                           </div>
                           <div>
                             <div className="flex justify-between mb-2 text-xs font-semibold"><span className="text-[--text-muted]">Alım İhtimali</span> <span className="text-[--text]">%{selectedCustomer.purchaseProb || 0}</span></div>
                             <div className="w-full bg-[--page] rounded-full h-2 overflow-hidden border border-[--line]"><div className="bg-gradient-to-r from-[--brand] to-[--blue] h-2 rounded-full transition-all duration-500" style={{width: `${selectedCustomer.purchaseProb || 0}%`}}></div></div>
                           </div>
                           <div className="pt-3 border-t border-[--line]">
                             <div className="text-xs font-medium text-[--text-muted]">Segment: <span className="text-[--text] font-semibold">{selectedCustomer.segment || "-"}</span></div>
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
                      <h4 className="text-sm font-semibold text-[--navy]">Sipariş Geçmişi</h4>
                      <button onClick={() => router.push(`/dashboard/orders?customerId=${selectedCustomer.id}`)} className="text-xs font-semibold text-[--brand] hover:underline flex items-center gap-1">
                        Tüm Siparişleri Gör <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </button>
                    </div>
                    <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-xs">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-[--muted-bg] border-b border-[--line]">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[--text-muted]">No</th>
                            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[--text-muted]">Başlık</th>
                            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[--text-muted]">Tutar</th>
                            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[--text-muted]">Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.orders?.map((o) => (
                            <tr key={o.id} className="border-b border-[--line] hover:bg-[--brand-soft]/30 transition-all">
                              <td className="px-4 py-3 font-mono font-medium text-xs text-[--navy]">{o.orderNumber || "#"+o.id.substring(0,6)}</td>
                              <td className="px-4 py-3 font-medium text-[--text]">{o.title}</td>
                              <td className="px-4 py-3 font-semibold text-[--text]">{o.totalAmount ? safeCurrency(o.totalAmount) : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-3 py-0.5 rounded-full text-xs font-medium uppercase ${o.status === 'delivered' ? 'bg-[--ok-soft] text-[--ok] border border-[--ok-soft]' : 'bg-[--muted-bg] text-[--text-muted] border border-[--line]'}`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-[--text-muted] italic">Henüz sipariş kaydı yok.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )}

            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-white/80 backdrop-blur-xl border border-dashed border-[--line] rounded-[20px]">
             <div className="text-center p-8">
                <div className="size-16 rounded-2xl bg-[--muted-bg] border border-[--line] mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[--text-muted] text-4xl">person_search</span>
                </div>
                <p className="text-[--text-muted] font-medium">Detayları görmek için soldan bir müşteri seçin.</p>
             </div>
          </div>
        )}
      </div>

       {/* Create/Edit Dialog */}
       {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[--line] flex items-center justify-between bg-[--page]">
              <h3 className="text-lg font-semibold text-[--navy]">
                {formData.id ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
              </h3>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-2 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Müşteri / Firma Adı *</label>
                    <input type="text" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" placeholder="İsimsiz bırakılabilir" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Şirket Ünvanı</label>
                    <input type="text" value={formData.company || ""} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Telefon</label>
                    <input type="text" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">E-posta</label>
                    <input type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" />
                 </div>
                 <div className="space-y-2 col-span-full">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Adres</label>
                    <input type="text" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Müşteri Sıcaklık Segmenti</label>
                    <select value={formData.scoreTemp || "Ilık"} onChange={e => setFormData({...formData, scoreTemp: e.target.value})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]">
                       <option value="Soğuk">Soğuk</option>
                       <option value="Ilık">Ilık</option>
                       <option value="Sıcak">Sıcak</option>
                       <option value="VIP">VIP</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-medium text-[--text-2] uppercase tracking-wide">Satış Olasılığı (%)</label>
                    <input type="number" min="0" max="100" value={formData.purchaseProb || ""} onChange={e => setFormData({...formData, purchaseProb: Number(e.target.value)})} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand]" />
                 </div>
               </div>
            </div>
            <div className="px-6 py-4 bg-[--page] border-t border-[--line] flex justify-end gap-3">
               <button onClick={() => setIsCreateDialogOpen(false)} className="px-5 py-2 text-sm font-medium text-[--text-2] bg-white border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors shadow-xs">{tText("common.cancel", "İptal")}</button>
               <button onClick={handleSaveCustomer} disabled={loading} className="px-6 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 shadow-sm">
                 {loading ? "Bekleyin..." : "Kaydet"}
               </button>
            </div>
          </div>
        </div>
      )}

       {/* Blacklist Dialog */}
       {isBlacklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
          <div className="bg-white text-[--text] rounded-[20px] w-full max-w-4xl overflow-hidden border border-[--line] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[--line] flex items-center justify-between bg-[--page]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[--bad-soft] border border-[--bad-soft] flex items-center justify-center text-[--bad]">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[--bad] tracking-wider">KARA LİSTE</h3>
                  <p className="text-[--text-muted] text-xs">İşletmeye sorun çıkarmış müşteriler</p>
                </div>
              </div>
              <button onClick={() => setIsBlacklistOpen(false)} className="p-2 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {blacklistedCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blacklistedCustomers.map(c => (
                    <div key={c.id} className="bg-white border border-[--bad-soft] p-5 rounded-[20px] flex flex-col relative shadow-xs">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h4 className="font-semibold text-[--navy] line-clamp-1">{c.name}</h4>
                        <span className="bg-[--bad-soft] text-[--bad] border border-[--bad-soft] text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0">KARA LİSTE</span>
                      </div>
                      <p className="text-xs text-[--text-muted] flex items-center gap-1.5 mb-2"><span className="material-symbols-outlined text-[14px]">phone</span> {c.phone || "-"}</p>
                      <p className="text-xs text-[--text-muted] flex items-center gap-1.5 mb-4"><span className="material-symbols-outlined text-[14px]">domain</span> {c.company || "-"}</p>
                      
                      <div className="mt-auto pt-3 border-t border-[--line] flex justify-end">
                        <button onClick={() => handleToggleBlacklist(c)} className="text-xs px-3 py-1.5 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] rounded-full transition-colors shadow-xs">Listeden Çıkar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[--text-muted]">
                  <span className="material-symbols-outlined text-6xl mb-4 text-[--ok]">gpp_good</span>
                  <p className="text-lg font-medium text-[--text]">Kara listede kimse yok.</p>
                </div>
              )}
            </div>
          </div>
        </div>
       )}
    </div>
  )
}

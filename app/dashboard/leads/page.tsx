"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import * as XLSX from "xlsx"
import { FilePicker } from "@/components/shared/file-picker"
import RichTextEditor from "@/components/shared/rich-text-editor"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

interface Lead {
  id: string
  branchId: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: "new" | "contacted" | "qualified" | "lost" | "hot" | "warm" | "cold"
  notes: string | null
  serviceSelection: string | null
  amount: number | null
  painPoint: string | null
  instagramUrl: string | null
  websiteUrl: string | null
  googleMapsUrl: string | null
  createdAt: string
}

export default function LeadsPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("leads", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMessageApprovalOpen, setIsMessageApprovalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [generatedMessage, setGeneratedMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "new" as Lead["status"],
    notes: "",
    serviceSelection: [] as string[],
    amount: "",
    painPoint: "",
    wantMarketing: false,
    instagramUrl: "",
    websiteUrl: "",
    googleMapsUrl: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentBranch) {
      loadLeads()
    }
  }, [currentBranch])

  const loadLeads = async () => {
    if (!currentBranch) {
      setLeads([])
      return
    }

    try {
      const res = await fetch(`/api/leads?branchId=${currentBranch.id}`)
      if (res.ok) {
        const result = await res.json()
        setLeads(Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []))
      }
    } catch (error) {
      console.error("Failed to load leads:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.phone || !currentBranch) {
      toast.error("Telefon numarası zorunludur.")
      return
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          ...formData,
          name: formData.name || "İsimsiz Lead",
          email: formData.email || null,
          painPoint: formData.painPoint || null,
        }),
      })

      if (res.ok) {
        const newLead = await res.json()
        loadLeads()
        setIsCreateDialogOpen(false)
        
        if (formData.wantMarketing) {
          handleGenerateMessage(newLead)
        } else {
          toast.success("Lead başarıyla eklendi.")
          resetForm()
        }
      }
    } catch (error) {
      console.error("Failed to create lead:", error)
      toast.error("Lead oluşturulurken bir hata oluştu.")
    }
  }

  const handleGenerateMessage = async (lead: Lead) => {
    setSelectedLead(lead)
    setIsMessageApprovalOpen(true)
    setIsGenerating(true)
    setGeneratedMessage("")

    const loadingToast = toast.loading("AI pazarlama mesajı hazırlıyor...", {
      description: "Firmanızın verileri analiz ediliyor..."
    })

    try {
      const res = await fetch("/api/leads/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Mesaj üretilemedi")
      }

      const { message } = await res.json()
      setGeneratedMessage(message)
      toast.dismiss(loadingToast)
    } catch (error: any) {
      console.error("Error in message generation:", error)
      toast.dismiss(loadingToast)
      toast.error(error.message || "Mesaj üretilemedi, lütfen manuel giriniz.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!selectedLead || !generatedMessage) return

    const loadingToast = toast.loading("WhatsApp linki hazırlanıyor...")

    try {
      const sendRes = await fetch("/api/leads/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, message: generatedMessage }),
      })

      if (sendRes.ok) {
        const { whatsappUrl } = await sendRes.json()
        toast.success("WhatsApp'a yönlendiriliyorsunuz!")
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank')
        
        setIsMessageApprovalOpen(false)
        resetForm()
        loadLeads() // Refresh to show updated status
      } else {
        toast.error("WhatsApp linki oluşturulamadı.")
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error)
      toast.error("Bir hata oluştu.")
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  const handleEdit = async () => {
    if (!selectedLead) return

    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLead.id,
          ...formData,
          email: formData.email || null,
        }),
      })

      if (res.ok) {
        loadLeads()
        setIsEditDialogOpen(false)
        setSelectedLead(null)
        resetForm()
        toast.success("Lead güncellendi.")
      }
    } catch (error) {
      console.error("Failed to update lead:", error)
      toast.error("Güncelleme başarısız.")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "new",
      notes: "",
      serviceSelection: [],
      amount: "",
      painPoint: "",
      wantMarketing: false,
      instagramUrl: "",
      websiteUrl: "",
      googleMapsUrl: "",
    })
    setCurrentStep(1)
  }

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead)
    let services: string[] = []
    try {
      if (lead.serviceSelection) {
        services = JSON.parse(lead.serviceSelection)
      }
    } catch (e) {
      console.error("Failed to parse serviceSelection:", e)
    }

    setFormData({
      name: lead.name,
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status,
      notes: lead.notes || "",
      serviceSelection: services,
      amount: lead.amount?.toString() || "",
      painPoint: lead.painPoint || "",
      wantMarketing: false,
      instagramUrl: lead.instagramUrl || "",
      websiteUrl: lead.websiteUrl || "",
      googleMapsUrl: lead.googleMapsUrl || "",
    })
    setIsEditDialogOpen(true)
  }

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (lead.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  const hotLeads = leads.filter((l) => l.status === "hot").length
  const warmLeads = leads.filter((l) => l.status === "warm").length
  const coldLeads = leads.filter((l) => l.status === "cold").length

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <StaggerItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">Potansiyel Müşteriler</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {currentBranch ? `${currentBranch.name} - Yeni fırsatları takip edin` : "Yeni fırsatları takip edin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#34D399] hover:bg-[#10B981] text-[#061811] px-5 py-2.5 rounded-full text-sm font-medium transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni Lead Ekle
          </button>
        </div>
      </StaggerItem>

      {/* Borderless KPI Strip */}
      <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-zinc-500">group_add</span>
            <span>TOPLAM LEAD</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={leads.length} />
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Aday Havuzu
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-emerald-400">local_fire_department</span>
            <span>SICAK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={hotLeads} />
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Yüksek Öncelikli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-zinc-400">device_thermostat</span>
            <span>ILIK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={warmLeads} />
            </span>
            <span className="bg-white/[0.06] text-zinc-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Orta Öncelikli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-zinc-500">ac_unit</span>
            <span>SOĞUK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={coldLeads} />
            </span>
            <span className="bg-white/[0.06] text-zinc-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Düşük Öncelikli
            </span>
          </div>
        </div>
      </StaggerItem>

      {/* Main Table */}
      <StaggerItem className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Tüm Potansiyel Müşteriler</h2>
          <div className="relative sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Lead ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2 text-sm focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">İsim / Şirket</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">İletişim</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.03] transition-all group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{lead.name}</div>
                      <div className="text-xs text-zinc-500">{lead.company || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300">{lead.phone || "-"}</div>
                      <div className="text-xs text-zinc-500">{lead.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === "hot" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                        lead.status === "warm" ? "bg-teal-500/15 text-teal-300 border border-teal-500/25" :
                        lead.status === "contacted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        lead.status === "lost" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" :
                        "bg-white/[0.06] text-zinc-300 border border-white/[0.08]"
                      }`}>
                        {lead.status === "hot" ? "Sıcak" : 
                         lead.status === "warm" ? "Ilık" : 
                         lead.status === "contacted" ? "İletişime Geçildi" : 
                         lead.status === "cold" ? "Soğuk" : 
                         lead.status === "lost" ? "Kaybedildi" : lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleGenerateMessage(lead)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors"
                          title="WhatsApp Mesajı Hazırla"
                        >
                          <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                        <button
                          onClick={() => openEditDialog(lead)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </StaggerItem>

      {/* Create Dialog (Multi-Step with AnimatePresence) */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setIsCreateDialogOpen(false)}>
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">Yeni Lead Ekle</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Adım {currentStep} / 3
                </span>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Adı Soyadı</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Can Arslan"
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Firma Adı</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Firma Ltd. Şti."
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Telefon Numarası *</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+90 5XX XXX XX XX"
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">E-posta</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ornek@mail.com"
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.phone}
                        className="w-full py-2.5 bg-[#34D399] hover:bg-[#10B981] text-[#061811] rounded-full font-medium disabled:opacity-50 transition-all"
                      >
                        Devam Et
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="text-center space-y-6 py-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_28px_rgba(52,211,153,0.22)]"
                    >
                      <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                    </motion.div>
                    <h3 className="text-lg font-semibold text-white">Pazarlama mesajı yollamak ister misiniz?</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setFormData({ ...formData, wantMarketing: true })
                          setCurrentStep(3)
                        }}
                        className="flex-1 py-3 bg-[#34D399] hover:bg-[#10B981] text-[#061811] rounded-full font-medium transition-colors"
                      >
                        Evet
                      </button>
                      <button
                        onClick={() => {
                          setFormData({ ...formData, wantMarketing: false })
                          handleCreate()
                        }}
                        className="flex-1 py-3 bg-white/[0.06] border border-white/[0.08] text-zinc-300 rounded-full font-medium hover:bg-white/[0.1] hover:text-white transition-colors"
                      >
                        Hayır
                      </button>
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="text-sm text-zinc-400 hover:text-white underline">Geri Dön</button>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Instagram Sayfası Linki</label>
                      <input
                        type="text"
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Web Sitesi Linki</label>
                      <input
                        type="text"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        placeholder="https://..."
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Google Maps İşletme Linki</label>
                      <input
                        type="text"
                        value={formData.googleMapsUrl}
                        onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                        placeholder="https://maps.google.com/..."
                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={() => setCurrentStep(2)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.08] rounded-full font-medium transition-colors">Geri</button>
                      <button onClick={handleCreate} className="flex-2 py-2.5 bg-[#34D399] hover:bg-[#10B981] text-[#061811] rounded-full font-medium px-8 transition-all">Lead Ekle ve Mesaj Üret</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Message Approval Dialog (with Pulsing Emerald Orb) */}
      {isMessageApprovalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.25)]"
                >
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-white">AI Mesaj Düzenleme ve Onay</h2>
              </div>
              <button onClick={() => setIsMessageApprovalOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-5">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.3)]"
                  >
                    <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </motion.div>
                  <p className="text-zinc-300 font-medium animate-pulse">Gemini AI mesaj hazırlıyor...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Hazırlanan Pazarlama Mesajı</label>
                    <textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      rows={8}
                      className="glass-input w-full px-4 py-3 text-sm focus:outline-none resize-none leading-relaxed"
                      placeholder="Mesaj buraya gelecek..."
                    />
                    <div className="flex items-center gap-2 mt-2 text-emerald-300 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <p className="text-[11px] font-medium leading-tight">
                        Butona bastığınızda WhatsApp Web açılacaktır. Mesajın gönderilmesi için WhatsApp ekranında &quot;Gönder&quot; butonuna basmanız gerekmektedir.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsMessageApprovalOpen(false)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.08] rounded-full font-medium transition-colors">{tText("common.cancel", "İptal")}</button>
                    <button onClick={handleSendWhatsApp} className="flex-2 py-2.5 bg-[#34D399] hover:bg-[#10B981] text-[#061811] rounded-full font-medium px-8 transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                      WhatsApp&apos;a Aktar ve Gönder
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setIsEditDialogOpen(false)}>
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.06] rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-xl font-semibold text-white">Lead Düzenle</h2>
              <button onClick={() => setIsEditDialogOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">İsim</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Telefon</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Instagram</label>
                <input type="text" value={formData.instagramUrl} onChange={(e) => setFormData({...formData, instagramUrl: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Web Sitesi</label>
                <input type="text" value={formData.websiteUrl} onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Google Maps</label>
                <input type="text" value={formData.googleMapsUrl} onChange={(e) => setFormData({...formData, googleMapsUrl: e.target.value})} className="glass-input w-full px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Acı Noktası</label>
                <RichTextEditor value={formData.painPoint} onChange={(val) => setFormData({...formData, painPoint: val})} />
              </div>
            </div>
            <div className="p-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
              <button onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.08] rounded-full text-sm font-medium transition-colors">Vazgeç</button>
              <button onClick={handleEdit} className="px-5 py-2 bg-[#34D399] hover:bg-[#10B981] text-[#061811] rounded-full text-sm font-medium transition-all">Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </StaggerContainer>
  )
}

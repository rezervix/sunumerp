"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import RichTextEditor from "@/components/shared/rich-text-editor"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"
import { safeNumber, safeText } from "@/lib/utils/safe-display"

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
  const { tText } = useLanguage()
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

  const handleSendWhatsApp = () => {
    if (!selectedLead?.phone || !generatedMessage) return

    let phone = selectedLead.phone.replace(/[^0-9]/g, "")
    if (phone.startsWith("0")) {
      phone = "90" + phone.substring(1)
    } else if (phone.length === 10) {
      phone = "90" + phone
    }

    const encodedMessage = encodeURIComponent(generatedMessage)
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`, "_blank")
    setIsMessageApprovalOpen(false)
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
        }),
      })

      if (res.ok) {
        toast.success("Lead güncellendi.")
        loadLeads()
        setIsEditDialogOpen(false)
      }
    } catch (error) {
      console.error("Failed to update lead:", error)
      toast.error("Güncelleme başarısız oldu.")
    }
  }

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setFormData({
      name: lead.name,
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status,
      notes: lead.notes || "",
      serviceSelection: lead.serviceSelection ? JSON.parse(lead.serviceSelection) : [],
      amount: lead.amount ? String(lead.amount) : "",
      painPoint: lead.painPoint || "",
      wantMarketing: false,
      instagramUrl: lead.instagramUrl || "",
      websiteUrl: lead.websiteUrl || "",
      googleMapsUrl: lead.googleMapsUrl || "",
    })
    setIsEditDialogOpen(true)
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

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.company && l.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.phone && l.phone.includes(searchQuery))
  )

  const hotLeads = leads.filter((l) => l.status === "hot").length
  const warmLeads = leads.filter((l) => l.status === "warm").length
  const coldLeads = leads.filter((l) => l.status === "cold").length

  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <StaggerItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight">Potansiyel Müşteriler</h1>
          <p className="text-sm text-[--text-muted] mt-1">
            {currentBranch ? `${currentBranch.name} - Yeni fırsatları takip edin` : "Yeni fırsatları takip edin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni Lead Ekle
          </button>
        </div>
      </StaggerItem>

      {/* Borderless KPI Strip */}
      <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-[--line]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--brand]">group_add</span>
            <span>TOPLAM LEAD</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(leads.length, 0)} />
            </span>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Aday Havuzu
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--ok]">local_fire_department</span>
            <span>SICAK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(hotLeads, 0)} />
            </span>
            <span className="bg-[--ok-soft] text-[--ok] border border-[--ok-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Yüksek Öncelikli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--warn]">device_thermostat</span>
            <span>ILIK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(warmLeads, 0)} />
            </span>
            <span className="bg-[--warn-soft] text-[--warn] border border-[--warn-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Orta Öncelikli
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--text-muted]">ac_unit</span>
            <span>SOĞUK LEADS</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(coldLeads, 0)} />
            </span>
            <span className="bg-[--muted-bg] text-[--text-muted] border border-[--line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Düşük Öncelikli
            </span>
          </div>
        </div>
      </StaggerItem>

      {/* Main Table */}
      <StaggerItem className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[--line] bg-[var(--muted-bg)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-[--navy]">Tüm Potansiyel Müşteriler</h2>
          <div className="relative sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted] text-[20px]">search</span>
            <input
              type="text"
              placeholder="Lead ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[--muted-bg] border-b border-[--line]">
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider">İsim / Şirket</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider">İletişim</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[--text-muted]">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[--line] hover:bg-[--brand-soft]/30 transition-all group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[--navy]">{safeText(lead.name, "İsimsiz")}</div>
                      <div className="text-xs text-[--text-muted]">{lead.company || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[--text]">{lead.phone || "-"}</div>
                      <div className="text-xs text-[--text-muted]">{lead.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${lead.status === "hot" ? "bg-[--ok-soft] text-[--ok] border border-[--ok-soft]" : lead.status === "warm" ? "bg-[--brand-soft] text-[--brand] border border-[--brand-line]" : lead.status === "contacted" ? "bg-[--brand-soft] text-[--brand] border border-[--brand-line]" : lead.status === "lost" ? "bg-[--bad-soft] text-[--bad] border border-[--bad-soft]" : "bg-[--muted-bg] text-[--text-muted] border border-[--line]" }`}>
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
                          className="p-1.5 text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors"
                          title="WhatsApp Mesajı Hazırla"
                        >
                          <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                        <button
                          onClick={() => openEditDialog(lead)}
                          className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4" onClick={() => setIsCreateDialogOpen(false)}>
          <div className="bg-white border border-[--line] rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page]">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-[--navy]">Yeni Lead Ekle</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
                  Adım {currentStep} / 3
                </span>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
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
                      <label className="text-sm font-medium text-[--text-2]">Adı Soyadı</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Can Arslan"
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[--text-2]">Firma Adı</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Firma Ltd. Şti."
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[--text-2]">Telefon Numarası *</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+90 5XX XXX XX XX"
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[--text-2]">E-posta</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ornek@mail.com"
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.phone}
                        className="w-full py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full font-medium disabled:opacity-50 transition-all shadow-sm"
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
                      className="w-16 h-16 rounded-full bg-[--brand-soft] border border-[--brand-line] text-[--brand] flex items-center justify-center mx-auto shadow-sm"
                    >
                      <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                    </motion.div>
                    <h3 className="text-lg font-semibold text-[--navy]">Pazarlama mesajı yollamak ister misiniz?</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setFormData({ ...formData, wantMarketing: true })
                          setCurrentStep(3)
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full font-medium transition-all shadow-sm"
                      >
                        Evet
                      </button>
                      <button
                        onClick={() => {
                          setFormData({ ...formData, wantMarketing: false })
                          handleCreate()
                        }}
                        className="flex-1 py-3 bg-white border border-[--line] text-[--text-2] rounded-full font-medium hover:bg-[--muted-bg] transition-colors shadow-xs"
                      >
                        Hayır
                      </button>
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="text-sm text-[--brand] hover:underline font-medium">Geri Dön</button>
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
                      <label className="text-sm font-medium text-[--text-2]">Instagram Sayfası Linki</label>
                      <input
                        type="text"
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[--text-2]">Web Sitesi Linki</label>
                      <input
                        type="text"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[--text-2]">Google Maps İşletme Linki</label>
                      <input
                        type="text"
                        value={formData.googleMapsUrl}
                        onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                        placeholder="https://maps.google.com/..."
                        className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none shadow-xs"
                      />
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={() => setCurrentStep(2)} className="flex-1 py-2.5 bg-white border border-[--line] text-[--text-2] hover:bg-[--muted-bg] rounded-full font-medium transition-colors shadow-xs">Geri</button>
                      <button onClick={handleCreate} className="flex-2 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full font-medium px-8 transition-all shadow-sm">Lead Ekle ve Mesaj Üret</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Message Approval Dialog */}
      {isMessageApprovalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[--line] rounded-[20px] shadow-2xl w-full max-w-xl overflow-hidden text-[--text]">
            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page]">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-10 h-10 rounded-full bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand] shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-[--navy]">AI Mesaj Düzenleme ve Onay</h2>
              </div>
              <button onClick={() => setIsMessageApprovalOpen(false)} className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-5">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-16 h-16 rounded-full bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand] shadow-sm"
                  >
                    <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </motion.div>
                  <p className="text-[--text-2] font-medium animate-pulse">Gemini AI mesaj hazırlıyor...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[--text-2]">Hazırlanan Pazarlama Mesajı</label>
                    <textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none resize-none leading-relaxed shadow-xs"
                      placeholder="Mesaj buraya gelecek..."
                    />
                    <div className="flex items-center gap-2 mt-2 text-[--brand] bg-[--brand-soft] p-3 rounded-xl border border-[--brand-line]">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <p className="text-[11px] font-medium leading-tight text-[--text-2]">
                        Butona bastığınızda WhatsApp Web açılacaktır. Mesajın gönderilmesi için WhatsApp ekranında &quot;Gönder&quot; butonuna basmanız gerekmektedir.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsMessageApprovalOpen(false)} className="flex-1 py-2.5 bg-white border border-[--line] text-[--text-2] hover:bg-[--muted-bg] rounded-full font-medium transition-colors shadow-xs">{tText("common.cancel", "İptal")}</button>
                    <button onClick={handleSendWhatsApp} className="flex-2 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full font-medium px-8 transition-colors flex items-center justify-center gap-2 shadow-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4" onClick={() => setIsEditDialogOpen(false)}>
          <div className="bg-white border border-[--line] rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden text-[--text]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page]">
              <h2 className="text-xl font-semibold text-[--navy]">Lead Düzenle</h2>
              <button onClick={() => setIsEditDialogOpen(false)} className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">İsim</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">Telefon</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">Instagram</label>
                <input type="text" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">Web Sitesi</label>
                <input type="text" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">Google Maps</label>
                <input type="text" value={formData.googleMapsUrl} onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })} className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--text-2]">Acı Noktası</label>
                <RichTextEditor value={formData.painPoint} onChange={(val) => setFormData({ ...formData, painPoint: val })} />
              </div>
            </div>
            <div className="p-6 border-t border-[--line] bg-[--page] flex justify-end gap-3">
              <button onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 bg-white border border-[--line] text-[--text-2] hover:bg-[--muted-bg] rounded-full text-sm font-medium transition-colors shadow-xs">Vazgeç</button>
              <button onClick={handleEdit} className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium transition-all shadow-sm">Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </StaggerContainer>
  )
}

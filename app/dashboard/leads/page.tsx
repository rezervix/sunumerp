"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import * as XLSX from "xlsx"
import { FilePicker } from "@/components/shared/file-picker"
import RichTextEditor from "@/components/shared/rich-text-editor"

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Potansiyel Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentBranch ? `${currentBranch.name} - Yeni fırsatları takip edin` : "Yeni fırsatları takip edin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni Lead Ekle
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-red-500">local_fire_department</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Sıcak Leads</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{hotLeads}</p>
          <p className="text-xs text-red-500 font-medium">Yüksek öncelikli</p>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-orange-500">device_thermostat</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Ilık Leads</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{warmLeads}</p>
          <p className="text-xs text-orange-500 font-medium">Orta öncelikli</p>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-blue-500">ac_unit</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined text-[18px]">severe_cold</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Soğuk Leads</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{coldLeads}</p>
          <p className="text-xs text-blue-500 font-medium">Düşük öncelikli</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tüm Potansiyel Müşteriler</h2>
          <div className="relative sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Lead ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">İsim / Şirket</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">İletişim</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{lead.name}</div>
                      <div className="text-xs text-gray-500">{lead.company || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{lead.phone || "-"}</div>
                      <div className="text-xs text-gray-500">{lead.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        lead.status === "hot" ? "bg-red-50 text-red-600" :
                        lead.status === "warm" ? "bg-orange-50 text-orange-600" :
                        lead.status === "contacted" ? "bg-green-50 text-green-600" :
                        "bg-blue-50 text-blue-600"
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
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="WhatsApp Mesajı Hazırla"
                        >
                          <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                        <button
                          onClick={() => openEditDialog(lead)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
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
      </div>

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsCreateDialogOpen(false)}>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Lead Ekle</h2>
              <button onClick={() => setIsCreateDialogOpen(false)} className="text-gray-400 hover:text-gray-500"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 space-y-4">
              {currentStep === 1 && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Adı Soyadı</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Can Arslan"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Firma Adı</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Firma Ltd. Şti."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Telefon Numarası *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+90 5XX XXX XX XX"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">E-posta</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ornek@mail.com"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!formData.phone}
                      className="w-full py-2.5 bg-primary text-white rounded-xl font-medium disabled:opacity-50 transition-all"
                    >
                      Devam Et
                    </button>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="text-center space-y-6">
                  <h3 className="text-lg font-semibold">Pazarlama mesajı yollamak ister misiniz?</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setFormData({ ...formData, wantMarketing: true })
                        setCurrentStep(3)
                      }}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    >
                      Evet
                    </button>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, wantMarketing: false })
                        handleCreate()
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                    >
                      Hayır
                    </button>
                  </div>
                  <button onClick={() => setCurrentStep(1)} className="text-sm text-gray-500 underline">Geri Dön</button>
                </div>
              )}

              {currentStep === 3 && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Instagram Sayfası Linki</label>
                    <input
                      type="text"
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Web Sitesi Linki</label>
                    <input
                      type="text"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Google Maps İşletme Linki</label>
                    <input
                      type="text"
                      value={formData.googleMapsUrl}
                      onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setCurrentStep(2)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium">Geri</button>
                    <button onClick={handleCreate} className="flex-2 py-2.5 bg-primary text-white rounded-xl font-medium px-8">Lead Ekle ve Mesaj Üret</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Approval Dialog */}
      {isMessageApprovalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Düzenleme ve Onay</h2>
              <button onClick={() => setIsMessageApprovalOpen(false)} className="text-gray-400 hover:text-gray-500"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Gemini AI mesaj hazırlıyor...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hazırlanan Pazarlama Mesajı</label>
                    <textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                      placeholder="Mesaj buraya gelecek..."
                    />
                    <div className="flex items-center gap-2 mt-2 text-orange-600 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-lg border border-orange-100 dark:border-orange-500/20">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <p className="text-[11px] font-medium leading-tight">
                        Butona bastığınızda WhatsApp Web açılacaktır. Mesajın gönderilmesi için WhatsApp ekranında "Gönder" butonuna basmanız gerekmektedir.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsMessageApprovalOpen(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium">{tText("common.cancel", "İptal")}</button>
                    <button onClick={handleSendWhatsApp} className="flex-2 py-2.5 bg-green-600 text-white rounded-xl font-bold px-8 hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                      WhatsApp'a Aktar ve Gönder
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog (Legacy for now, updated to match style) */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsEditDialogOpen(false)}>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold">Lead Düzenle</h2>
              <button onClick={() => setIsEditDialogOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">İsim</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefon</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Instagram</label>
                <input type="text" value={formData.instagramUrl} onChange={(e) => setFormData({...formData, instagramUrl: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Web Sitesi</label>
                <input type="text" value={formData.websiteUrl} onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Google Maps</label>
                <input type="text" value={formData.googleMapsUrl} onChange={(e) => setFormData({...formData, googleMapsUrl: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Acı Noktası</label>
                <RichTextEditor value={formData.painPoint} onChange={(val) => setFormData({...formData, painPoint: val})} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Vazgeç</button>
              <button onClick={handleEdit} className="px-4 py-2 bg-primary text-white rounded-xl">Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

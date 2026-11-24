"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  Star,
  Briefcase,
  Building2,
  Plus,
  Trash2,
  X,
  Search,
} from "lucide-react"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

interface Candidate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  status: string
  kanbanStatus: string
  department: string
  rating: number
  skills: string
  experienceYears: number
  education: string
  documents: any[]
  chats: any[]
  applicationDate: string
}

const KANBAN_STAGES = ["Basvurdu", "Mulakat", "Teklif", "Ise Alindi", "Reddedildi"]

const STAGE_LABELS: Record<string, string> = {
  "Basvurdu": "Başvurdu",
  "Mulakat": "Mülakat",
  "Teklif": "Teklif Aşaması",
  "Ise Alindi": "İşe Alındı",
  "Reddedildi": "Reddedildi",
}

export default function HRPage() {
  const { tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("hr", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  const [candidates, setCandidates] = useState<Candidate[]>(() => mockDatabase.getCandidates() as any)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Candidate>>({})
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "analytics">("kanban")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const handleDbChange = () => setCandidates(mockDatabase.getCandidates() as any)
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  useEffect(() => {
    loadCandidates()
  }, [currentBranch])

  const loadCandidates = async () => {
    try {
      const branchId = currentBranch?.id || "local-debug-branch"
      const res = await fetch(`/api/hr?branchId=${branchId}`)
      if (res.ok) {
        const json = await res.json()
        const list = json.data || json
        if (Array.isArray(list) && list.length > 0) {
          setCandidates(list)
        } else {
          setCandidates(mockDatabase.getCandidates() as any)
        }
      } else {
        setCandidates(mockDatabase.getCandidates() as any)
      }
    } catch {
      setCandidates(mockDatabase.getCandidates() as any)
    }
  }

  const handleSave = async () => {
    if (!currentBranch) return
    setLoading(true)
    const method = formData.id ? "PUT" : "POST"
    
    try {
      const res = await fetch("/api/hr", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: currentBranch.id, ...formData })
      })
      if (res.ok) {
        toast.success(formData.id ? "Aday başarıyla güncellendi" : "Yeni aday başarıyla eklendi")
        await loadCandidates()
        setIsDialogOpen(false)
        setSelectedCandidate(null)
      } else {
        toast.error("İşlem başarısız oldu")
      }
    } catch {
      toast.error("Hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Adayı silmek istediğinize emin misiniz?")) return
    try {
      await fetch(`/api/hr?id=${id}`, { method: "DELETE" })
      loadCandidates()
      setSelectedCandidate(null)
      setIsDialogOpen(false)
      toast.success("Aday kaydı silindi.")
    } catch {}
  }

  const updateKanbanStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/hr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kanbanStatus: newStatus })
      })
      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === id ? {...c, kanbanStatus: newStatus} : c))
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate({...selectedCandidate, kanbanStatus: newStatus})
        }
        toast.success(`Aday ${STAGE_LABELS[newStatus] || newStatus} aşamasına taşındı.`)
      }
    } catch {}
  }

  const filteredCandidates = candidates.filter(c => 
    `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.skills || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: candidates.length,
    hired: candidates.filter(c => c.kanbanStatus === "Ise Alindi").length,
    rejected: candidates.filter(c => c.kanbanStatus === "Reddedildi").length,
    interviews: candidates.filter(c => c.kanbanStatus === "Mulakat").length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Üst Başlık ve Navigasyon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[--line]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[--text]">İnsan Kaynakları & Yetenek Havuzu</h1>
          <p className="text-xs text-[--text-muted] mt-1">Personel adayları, işe alım kanban panosu ve yetenek takip sistemi</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Görünüm Sekmeleri */}
          <div className="flex bg-[--muted-bg] p-1 rounded-xl border border-[--line]">
            {[
              { id: "kanban", label: "Kanban" },
              { id: "list", label: "Aday Listesi" },
              { id: "analytics", label: "Analitik" },
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive ? "text-[--brand]" : "text-[--text-muted] hover:text-[--text]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="hrActiveTab"
                      className="absolute inset-0 bg-white border border-[--line] rounded-lg shadow-xs"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => {
              setFormData({ status: "Aday", kanbanStatus: "Basvurdu" })
              setIsDialogOpen(true)
            }}
            className="bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            Yeni Aday Ekle
          </button>
        </div>
      </div>

      {/* ── Kutusuz (Borderless) Üst KPI Şeridi ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-3 border-b border-[--line]">
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <Users className="size-3.5 text-[--brand]" />
            <span>Toplam Başvuru</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={stats.total} />
            </span>
            <span className="text-[11px] font-mono text-[--text-muted] bg-[--muted-bg] px-2 py-0.5 rounded-full border border-[--line]">
              Aday
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <MessageSquare className="size-3.5 text-[--brand]" />
            <span>Mülakat Aşamasında</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={stats.interviews} />
            </span>
            <span className="text-[11px] font-mono text-[--sky] bg-[--brand-soft] px-2 py-0.5 rounded-full border border-[--brand-line]">
              Görüşme
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <UserCheck className="size-3.5 text-[--brand]" />
            <span>İşe Alınanlar</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--ok] tracking-tight tabular-nums">
              <AnimatedNumber value={stats.hired} />
            </span>
            <span className="text-[11px] font-mono text-[--ok] bg-[--ok-soft] px-2 py-0.5 rounded-full border border-[--ok]/20">
              Kabul
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <UserX className="size-3.5 text-[--brand]" />
            <span>Reddedilenler</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--bad] tracking-tight tabular-nums">
              <AnimatedNumber value={stats.rejected} />
            </span>
            <span className="text-[11px] font-mono text-[--bad] bg-[--bad-soft] px-2 py-0.5 rounded-full border border-[--bad]/20">
              Elendi
            </span>
          </div>
        </div>
      </div>

      {/* ── Arama Çubuğu ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[--text-muted]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Aday adı, pozisyon veya yetenek ile filtrele..."
          className="w-full bg-white border border-[--line] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] rounded-xl pl-10 pr-4 py-2 text-xs text-[--text] placeholder-[--text-muted] outline-none transition-all shadow-xs"
        />
      </div>

      {/* ── 1. KANBAN GÖRÜNÜMÜ ── */}
      {activeTab === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_STAGES.map(stage => {
              const stageCandidates = filteredCandidates.filter(c => c.kanbanStatus === stage)
              return (
                <div
                  key={stage}
                  className="w-[300px] flex flex-col bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] overflow-hidden shrink-0 shadow-sm"
                >
                  {/* Sütun Başlığı */}
                  <div className="p-4 border-b border-[--line] bg-[--page] flex items-center justify-between">
                    <h3 className="font-medium text-xs uppercase tracking-wider text-[--navy]">
                      {STAGE_LABELS[stage] || stage}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-white border border-[--line] text-[--text-muted] rounded-full">
                      {stageCandidates.length}
                    </span>
                  </div>

                  {/* Aday Kartları */}
                  <div className="flex-1 p-3 overflow-y-auto max-h-[600px] space-y-3">
                    <StaggerContainer>
                      {stageCandidates.map(c => (
                        <StaggerItem key={c.id}>
                          <motion.div
                            whileHover={{ y: -3 }}
                            onClick={() => { setSelectedCandidate(c); setIsDialogOpen(true); setFormData(c) }}
                            className="bg-white p-4 rounded-2xl border border-[--line] hover:border-[--brand-line] shadow-xs cursor-pointer transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-[--text] group-hover:text-[--brand] transition-colors">
                                {c.firstName} {c.lastName}
                              </h4>
                              {c.rating > 0 && (
                                <span className="flex text-[--warn] text-xs items-center gap-1 font-mono">
                                  <Star className="size-3 fill-amber-400 text-amber-400" />
                                  {c.rating}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-[--text-muted] space-y-1 mb-3">
                              <p className="flex items-center gap-1.5 truncate">
                                <Briefcase className="size-3 text-[--text-muted] shrink-0" />
                                <span>{c.position || "Pozisyon Belirtilmedi"}</span>
                              </p>
                              <p className="flex items-center gap-1.5 truncate">
                                <Building2 className="size-3 text-[--text-muted] shrink-0" />
                                <span>{c.department || `${c.experienceYears || 0} Yıl Deneyim`}</span>
                              </p>
                            </div>

                            <select 
                              value={c.kanbanStatus} 
                              onChange={(e) => {
                                e.stopPropagation()
                                updateKanbanStatus(c.id, e.target.value)
                              }}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-[11px] border border-[--line] bg-[--page] text-[--text-2] rounded-lg p-1.5 focus:outline-none focus:border-[--brand]"
                            >
                              {KANBAN_STAGES.map(s => (
                                <option key={s} value={s}>
                                  {STAGE_LABELS[s] || s}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                    {stageCandidates.length === 0 && (
                      <div className="text-center py-8 text-[11px] text-[--text-muted]">Aday yok</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 2. LİSTE GÖRÜNÜMÜ ── */}
      {activeTab === "list" && (
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[--page] text-[--text-muted] text-[11px] uppercase tracking-wider border-b border-[--line]">
                <tr>
                  <th className="px-5 py-3.5">Aday</th>
                  <th className="px-5 py-3.5">Pozisyon / Departman</th>
                  <th className="px-5 py-3.5">Aşama</th>
                  <th className="px-5 py-3.5">Deneyim</th>
                  <th className="px-5 py-3.5">İletişim</th>
                  <th className="px-5 py-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line-soft]">
                {filteredCandidates.map(c => (
                  <tr key={c.id} className="hover:bg-[--muted-bg]/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[--brand-soft] text-[--brand] border border-[--brand-line] flex items-center justify-center text-xs font-bold">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-[--text] text-xs">{c.firstName} {c.lastName}</p>
                          <p className="text-[10px] text-[--text-muted] font-mono">{c.skills}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[--text-2]">
                      <p>{c.position || "Pozisyon Belirtilmedi"}</p>
                      <p className="text-[10px] text-[--text-muted]">{c.department}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
                        {STAGE_LABELS[c.kanbanStatus] || c.kanbanStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[--text-2]">
                      {c.experienceYears} Yıl
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[--text-2] font-mono">
                      <p>{c.email}</p>
                      <p className="text-[10px] text-[--text-muted]">{c.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => { setSelectedCandidate(c); setIsDialogOpen(true); setFormData(c) }}
                        className="px-3 py-1 text-xs rounded-lg border border-[--line] bg-white text-[--text-2] hover:text-[--text] hover:bg-[--muted-bg] transition-colors cursor-pointer"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. ANALİTİK GÖRÜNÜMÜ ── */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand]">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs text-[--text-muted] uppercase tracking-wider">Toplam Başvuru</p>
              <h3 className="text-2xl font-light text-[--text] mt-1 tabular-nums">
                <AnimatedNumber value={stats.total} />
              </h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[--ok-soft] border border-[--ok]/20 flex items-center justify-center text-[--ok]">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-xs text-[--text-muted] uppercase tracking-wider">İşe Alınanlar</p>
              <h3 className="text-2xl font-light text-[--ok] mt-1 tabular-nums">
                <AnimatedNumber value={stats.hired} />
              </h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[--bad-soft] border border-[--bad]/20 flex items-center justify-center text-[--bad]">
              <UserX size={22} />
            </div>
            <div>
              <p className="text-xs text-[--text-muted] uppercase tracking-wider">Reddedilenler</p>
              <h3 className="text-2xl font-light text-[--bad] mt-1 tabular-nums">
                <AnimatedNumber value={stats.rejected} />
              </h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[--muted-bg] border border-[--line] flex items-center justify-center text-[--text-muted]">
              <MessageSquare size={22} />
            </div>
            <div>
              <p className="text-xs text-[--text-muted] uppercase tracking-wider">Mülakatlar</p>
              <h3 className="text-2xl font-light text-[--text] mt-1 tabular-nums">
                <AnimatedNumber value={stats.interviews} />
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* ── ADAY PROFİL DİYALOĞU ── */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[--line] rounded-[24px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[--line] bg-[--page] flex justify-between items-center">
                <h3 className="text-base font-medium text-[--navy]">
                  {formData.id ? "Aday Profili & Detayları" : "Yeni Aday Kaydı"}
                </h3>
                <div className="flex items-center gap-2">
                  {formData.id && (
                    <button
                      onClick={() => handleDelete(formData.id!)}
                      className="p-1.5 text-[--text-muted] hover:text-[--bad] hover:bg-[--bad-soft] rounded-lg transition-colors cursor-pointer"
                      title="Adayı Sil"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Ad</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.firstName || ''}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Soyad</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.lastName || ''}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Pozisyon</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.position || ''}
                      onChange={e => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Departman</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.department || ''}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">E-posta</label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Telefon</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Değerlendirme (1-5 Puan)</label>
                    <input
                      type="number" min="1" max="5"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] font-mono"
                      value={formData.rating || ''}
                      onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-muted]">Deneyim (Yıl)</label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] font-mono"
                      value={formData.experienceYears || ''}
                      onChange={e => setFormData({...formData, experienceYears: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-[--text-muted]">Yetenekler (Virgülle ayırın)</label>
                    <input
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                      value={formData.skills || ''}
                      onChange={e => setFormData({...formData, skills: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[--page] border-t border-[--line] flex justify-end gap-3">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[--text-2] hover:text-[--text] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white rounded-full text-xs font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Kaydediliyor..." : "Profili Kaydet"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

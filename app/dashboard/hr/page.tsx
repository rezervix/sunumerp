"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"

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

export default function HRPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("hr", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Candidate>>({})
  const [activeTab, setActiveTab] = useState("kanban") // kanban, list, analytics
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (currentBranch) loadCandidates()
  }, [currentBranch])

  const loadCandidates = async () => {
    if (!currentBranch) return
    try {
      const res = await fetch(`/api/hr?branchId=${currentBranch.id}`)
      if (res.ok) {
        const json = await res.json()
        setCandidates(json.data || json)
      }
    } catch (e) {}
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
        toast.success(formData.id ? "Aday guncellendi" : "Aday eklendi")
        await loadCandidates()
        setIsDialogOpen(false)
        setSelectedCandidate(null)
      } else {
        toast.error("Islem basarisiz")
      }
    } catch {
      toast.error("Hata olustu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Adayi silmek istediginize emin misiniz?")) return
    try {
      await fetch(`/api/hr?id=${id}`, { method: "DELETE" })
      loadCandidates()
      setSelectedCandidate(null)
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
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Insan Kaynaklari</h1>
          <p className="text-sm text-gray-500">Personel adaylari, ise alim takibi ve yetenek havuzu</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-gray-100/50 dark:bg-[#1e1e1e] p-1 rounded-xl flex gap-1 border border-gray-200 dark:border-gray-800">
             <button onClick={() => setActiveTab("kanban")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Kanban</button>
             <button onClick={() => setActiveTab("list")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Aday Listesi</button>
             <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Analitik</button>
           </div>
           <button
             onClick={() => {
               setFormData({ status: "Aday", kanbanStatus: "Basvurdu" })
               setIsDialogOpen(true)
             }}
             className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
           >
             <span className="material-symbols-outlined text-[18px]">person_add</span> Yeni Aday
           </button>
        </div>
      </div>

      {activeTab === "kanban" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
            <div className="flex gap-4 h-full min-w-max">
                {KANBAN_STAGES.map(stage => (
                    <div key={stage} className="w-[300px] flex flex-col bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shrink-0">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-transparent">
                            <h3 className="font-bold text-gray-900 dark:text-white flex justify-between items-center">
                                {stage}
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">{candidates.filter(c => c.kanbanStatus === stage).length}</span>
                            </h3>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                            {filteredCandidates.filter(c => c.kanbanStatus === stage).map(c => (
                                <div key={c.id} onClick={() => { setSelectedCandidate(c); setIsDialogOpen(true); setFormData(c) }} className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors">{c.firstName} {c.lastName}</h4>
                                        {c.rating > 0 && <span className="flex text-yellow-500 text-[10px] items-center"><span className="material-symbols-outlined text-[12px] font-solid">star</span> {c.rating}</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                                        <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">work</span> {c.position || "Pozisyon Belirtilmedi"}</p>
                                        <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">business</span> {c.department || c.experienceYears + " Yil Deneyim"}</p>
                                    </div>

                                    <select 
                                        value={c.kanbanStatus} 
                                        onChange={(e) => {
                                            e.stopPropagation()
                                            updateKanbanStatus(c.id, e.target.value)
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        className="w-full mt-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 rounded-lg p-1.5 focus:outline-none"
                                    >
                                        {KANBAN_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === "analytics" && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
             <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-primary rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
                     <div><p className="text-sm text-gray-500">Toplam Basvuru</p><h3 className="text-2xl font-bold">{stats.total}</h3></div>
                 </div>
             </div>
             <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">how_to_reg</span></div>
                     <div><p className="text-sm text-gray-500">Ise Alinanlar</p><h3 className="text-2xl font-bold">{stats.hired}</h3></div>
                 </div>
             </div>
             <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">person_off</span></div>
                     <div><p className="text-sm text-gray-500">Reddedilenler</p><h3 className="text-2xl font-bold">{stats.rejected}</h3></div>
                 </div>
             </div>
             <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">forum</span></div>
                     <div><p className="text-sm text-gray-500">Mulakatlar</p><h3 className="text-2xl font-bold">{stats.interviews}</h3></div>
                 </div>
             </div>
         </div>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aday Profili</h3>
                <div className="flex gap-2">
                    {formData.id && (
                        <button onClick={() => handleDelete(formData.id!)} className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                    )}
                    <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Ad</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Soyad</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Pozisyon</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Departman</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">E-posta</label>
                      <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Telefon</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Degerlendirme (1-5 Yildiz)</label>
                      <input type="number" min="1" max="5" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.rating || ''} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-500">Deneyim (Yil)</label>
                      <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.experienceYears || ''} onChange={e => setFormData({...formData, experienceYears: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-gray-500">Yetenekler (Virgulle ayirin)</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-[#111] dark:border-gray-800 focus:outline-primary" value={formData.skills || ''} onChange={e => setFormData({...formData, skills: e.target.value})} />
                  </div>
                  
                  {formData.id && (
                     <div className="sm:col-span-2 mt-4 space-y-4">
                         <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center text-sm">
                             <div>
                                 <h5 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">description</span> Aday CV Dosyasi</h5>
                                 <p className="text-xs text-gray-500 mt-1">Sistem tarafindan taranmis belgeler yakinda buraya eklenecektir.</p>
                             </div>
                             <button className="px-4 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition">Yukle</button>
                         </div>
                     </div>
                  )}
               </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 dark:bg-[#111111] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
               <button onClick={() => setIsDialogOpen(false)} className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium">Iptal</button>
               <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50">
                 {loading ? "Kaydediliyor..." : "Profili Kaydet"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { Plus, FolderOpen, Clock, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import { FilePicker } from "@/components/shared/file-picker"
import { GlassFolder, type FolderFile } from "@/components/ui/glass-folder-cards"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  progress: number
  startDate: string | null
  endDate: string | null
  customerNotes: string | null
  createdAt: string
  client?: string
  customerName?: string
  budget?: number | string
  deadline?: string
}

export default function ProjectsPage() {
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("projeler", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  const [projects, setProjects] = useState<Project[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    progress: 0,
    startDate: "",
    endDate: "",
    customerNotes: "",
  })

  useEffect(() => {
    if (currentBranch) {
      loadProjects()
    }
  }, [currentBranch])

  const loadProjects = async () => {
    if (!currentBranch) {
      setProjects([])
      return
    }

    try {
      const res = await fetch(`/api/projects?branchId=${currentBranch.id}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !currentBranch) return
    setLoading(true)

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          ...formData,
        }),
      })

      if (res.ok) {
        loadProjects()
        setIsCreateDialogOpen(false)
        setFormData({ name: "", description: "", status: "active", progress: 0, startDate: "", endDate: "", customerNotes: "" })
        toast.success("Proje başarıyla oluşturuldu")
      }
    } catch (error) {
      console.error("Failed to create project:", error)
      toast.error("Proje oluşturulamadı")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedProject || !formData.name) return
    setLoading(true)

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProject.id,
          ...formData,
        }),
      })

      if (res.ok) {
        loadProjects()
        setIsEditDialogOpen(false)
        setSelectedProject(null)
        setFormData({ name: "", description: "", status: "active", progress: 0, startDate: "", endDate: "", customerNotes: "" })
        toast.success("Proje güncellendi")
      }
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Proje güncellenemedi")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (project: Project) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      progress: project.progress || 0,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      customerNotes: project.customerNotes || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (projectId: string) => {
    if (confirm("Bu projeyi silmek istediğinize emin misiniz?")) {
      try {
        const res = await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" })
        if (res.ok) {
          loadProjects()
          toast.success("Proje silindi")
        }
      } catch (error) {
        console.error("Error deleting project:", error)
        toast.error("Proje silinemedi")
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tamamlandı
          </span>
        )
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-3 h-3 text-emerald-400" /> Devam Ediyor
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Beklemede
          </span>
        )
    }
  }

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === "active").length
  const completedProjects = projects.filter(p => p.status === "completed").length
  const avgProgress = totalProjects > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjects)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Üst Başlık & Yeni Proje Aksiyonu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Projeler</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {currentBranch ? `${currentBranch.name} • Proje ve operasyonel teslimat takibi` : "Proje yönetimi ve iş takibi"}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", description: "", status: "active", progress: 0, startDate: "", endDate: "", customerNotes: "" })
            setIsCreateDialogOpen(true)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs sm:text-sm rounded-full shadow-[0_0_20px_rgba(52,211,153,0.25)] transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Proje Ekle
        </button>
      </div>

      {/* Kutusuz (Borderless) Üst KPI Şeridi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            Toplam Proje
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={totalProjects} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Aktif Devam Eden
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={activeProjects} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Tamamlanan
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={completedProjects} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Ortalama İlerleme
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={avgProgress} suffix="%" />
          </div>
        </div>
      </div>

      {/* Proje Kartları Izgarası */}
      {projects.length === 0 ? (
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-12 text-center shadow-xl">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <FolderOpen className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Henüz kayıtlı proje bulunmuyor</h3>
          <p className="text-xs text-zinc-500">Yeni bir proje ekleyerek operasyonel iş takibine başlayabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-14 justify-items-center py-6">
          {projects.map((project, index) => {
            const artTheme = (["verdant", "ember", "aurora", "dusk", "glacier"] as const)[index % 5]
            const statusLabel =
              project.status === "completed"
                ? "Tamamlandı"
                : project.status === "active"
                ? "Devam Ediyor"
                : project.status === "on_hold"
                ? "Beklemede"
                : project.status || "Aktif"

            const folderFiles: FolderFile[] = [
              {
                name: "İlerleme: %" + (project.progress ?? 0),
                meta: String(statusLabel),
                art: "verdant",
              },
              {
                name: String(project.client || project.customerName || "Kurumsal Proje"),
                meta: project.budget
                  ? "₺" + Number(project.budget).toLocaleString("tr-TR")
                  : "Proje Kartı",
                art: "aurora",
              },
              {
                name: "Teslim & Takvim",
                meta: String(
                  project.endDate
                    ? new Date(project.endDate).toLocaleDateString("tr-TR")
                    : project.deadline || (project.createdAt ? new Date(project.createdAt).toLocaleDateString("tr-TR") : "Devam Ediyor")
                ),
                art: "dusk",
              },
              {
                name: String(project.description || "Proje Detaylarını Aç"),
                meta: "Detay & Görevler",
              },
            ]

            return (
              <div key={project.id} className="flex flex-col items-center gap-3">
                <GlassFolder
                  tone="dark"
                  art={artTheme}
                  seed={index * 7 + 3}
                  appearDelay={index * 90}
                  labelPlacement="bottom-left"
                  width={340}
                  label={project.name || "İsimsiz Proje"}
                  meta={`%${project.progress || 0} Tamamlandı · ${statusLabel}`}
                  files={folderFiles}
                  onFileSelect={() => openEditDialog(project)}
                  action="more"
                  menu={[
                    {
                      label: "Projeyi Düzenle",
                      onSelect: () => openEditDialog(project),
                    },
                    {
                      label: project.status === "completed" ? "Aktif Olarak İşaretle" : "Tamamlandı Olarak İşaretle",
                      onSelect: async () => {
                        try {
                          const nextStatus = project.status === "completed" ? "active" : "completed"
                          const nextProgress = nextStatus === "completed" ? 100 : project.progress
                          const res = await fetch("/api/projects", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: project.id,
                              name: project.name,
                              description: project.description,
                              status: nextStatus,
                              progress: nextProgress,
                              startDate: project.startDate,
                              endDate: project.endDate,
                              customerNotes: project.customerNotes,
                            }),
                          })
                          if (res.ok) {
                            loadProjects()
                            toast.success("Proje durumu güncellendi")
                          }
                        } catch (err) {
                          console.error("Durum güncellenemedi:", err)
                          toast.error("Durum güncellenemedi")
                        }
                      },
                    },
                    {
                      label: "Projeyi Sil",
                      danger: true,
                      onSelect: () => handleDelete(project.id),
                    },
                  ]}
                />

                {/* İlerleme Çubuğu ve Durum Rozeti (Klasör Altı Mikro Bilgi) */}
                <div className="h-1.5 w-[300px] rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                    style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
                  />
                </div>
                <div>
                  {getStatusBadge(project.status)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Yeni Proje Ekleme Modalı */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Yeni Proje Ekle</h3>
                <p className="text-xs text-zinc-400">{currentBranch?.name} şubesi için yeni proje kaydı oluşturun</p>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Proje Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Kurumsal ERP Dönüşümü"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Proje hedefleri ve kapsamı..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Müşteri Notları</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  placeholder="Müşteriye özel talepler, revizyon notları..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="active">Devam Ediyor</option>
                    <option value="on_hold">Beklemede</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <FilePicker
                    label="Proje Dosyaları"
                    maxFiles={3}
                    onFilesSelected={(urls) => {
                      if (urls.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          description: prev.description + (prev.description ? "\n\nEkli Dosyalar:\n" : "Ekli Dosyalar:\n") + urls.join("\n")
                        }))
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0d100e] flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.name}
                className="px-5 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-full transition shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Ekleniyor..." : "Proje Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proje Düzenleme Modalı */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Proje Düzenle</h3>
                <p className="text-xs text-zinc-400">Proje detaylarını ve tamamlanma oranını güncelleyin</p>
              </div>
              <button onClick={() => setIsEditDialogOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Proje Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Müşteri Notları</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="active">Devam Ediyor</option>
                    <option value="on_hold">Beklemede</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-400">İlerleme</label>
                    <span className="text-xs font-mono font-medium text-emerald-400">%{formData.progress}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400 mt-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <FilePicker
                  label="Dosya Güncelle/Ekle"
                  maxFiles={3}
                  onFilesSelected={(urls) => {
                    if (urls.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        description: prev.description + (prev.description ? "\n\nEkli Dosyalar:\n" : "Ekli Dosyalar:\n") + urls.join("\n")
                      }))
                    }
                  }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0d100e] flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleEdit}
                disabled={loading || !formData.name}
                className="px-5 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-full transition shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

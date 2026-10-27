"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

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
}

import { FilePicker } from "@/components/shared/file-picker"

export default function ProjectsPage() {
  const { t, tText } = useLanguage()
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
      }
    } catch (error) {
      console.error("Failed to create project:", error)
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
      }
    } catch (error) {
      console.error("Failed to update project:", error)
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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500"
      case "active": return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-500"
      default: return "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Tamamlandi"
      case "active": return "Devam Ediyor"
      default: return "Beklemede"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Projeler</h1>
          <p className="text-sm text-gray-500">
            {currentBranch ? `${currentBranch.name} - Proje yonetimi` : "Proje yonetimi"}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", description: "", status: "active", progress: 0, startDate: "", endDate: "", customerNotes: "" })
            setIsCreateDialogOpen(true)
          }}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yeni Proje
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px] text-gray-400">inventory_2</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Henuz proje bulunmuyor</h3>
            <p className="text-sm text-gray-500">Yeni bir proje ekleyerek baslayabilirsiniz.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1 pr-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1" title={project.name}>{project.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2" title={project.description || ""}>{project.description || "Aciklama yok"}</p>
                    {project.customerNotes && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-0.5">Musteri Notu</p>
                        <p className="text-xs text-amber-800 dark:text-amber-400/90 italic">{project.customerNotes}</p>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyles(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ilerleme</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${project.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <span className="material-symbols-outlined text-[16px]">event_repeat</span>
                      <span className="font-medium">Baslangic:</span>
                      {project.startDate ? new Date(project.startDate).toLocaleDateString("tr-TR") : "-"}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span className="font-medium">Bitis:</span>
                      {project.endDate ? new Date(project.endDate).toLocaleDateString("tr-TR") : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex gap-3 mt-auto rounded-b-2xl">
                <button
                  onClick={() => openEditDialog(project)}
                  className="flex-1 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary text-gray-700 dark:text-gray-300 rounded-xl transition-all shadow-sm"
                >
                  Duzenle
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Bu projeyi silmek istediginize emin misiniz?")) {
                      try {
                        const res = await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" })
                        if (res.ok) {
                          loadProjects()
                        }
                      } catch (error) {
                        console.error("Error deleting project:", error)
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-all shadow-sm"
                >{tText("common.delete", "Sil")}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between font-bold">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Proje Ekle</h3>
                <p className="text-sm text-gray-500 font-normal">{currentBranch?.name} subesi icin yeni proje olusturun</p>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Proje Adi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Web Sitesi Tasarimi"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Proje detaylari..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Musteri Notlari</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  placeholder="Musteriye ozel talepler, ozel notlar..."
                  rows={2}
                  className="w-full px-4 py-2 bg-amber-50/30 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="active">Devam Ediyor</option>
                    <option value="on_hold">Beklemede</option>
                    <option value="completed">Tamamlandi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslangic Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bitis Tarihi</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <FilePicker
                    label="Proje Dosyalari"
                    maxFiles={3}
                    onFilesSelected={(urls) => {
                      // Optionally handle uploaded URLs here or update description
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

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.name}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Ekleniyor..." : "Proje Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Proje Duzenle</h3>
                <p className="text-sm text-gray-500">Proje detaylarini guncelleyin</p>
              </div>
              <button onClick={() => setIsEditDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Proje Adi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Musteri Notlari</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-amber-50/30 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="active">Devam Ediyor</option>
                    <option value="on_hold">Beklemede</option>
                    <option value="completed">Tamamlandi</option>
                  </select>
                </div>
                <div className="space-y-2 text-primary font-bold">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ilerleme: %{formData.progress}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslangic Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bitis Tarihi</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="pt-2">
                <FilePicker
                  label="Dosya Guncelle/Ekle"
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

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleEdit}
                disabled={loading || !formData.name}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Guncelleniyor..." : "Guncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

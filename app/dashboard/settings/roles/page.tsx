"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth/context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Role {
  id: string
  name: string
  description: string | null
  permissions: Record<string, string[]>
}

const AVAILABLE_RESOURCES = [
  { key: "customers", label: "Müşteriler", actions: ["read", "write", "delete"] },
  { key: "leads", label: "Potansiyeller", actions: ["read", "write", "delete", "update"] },
  { key: "hr", label: "İnsan Kaynakları", actions: ["read", "write", "delete", "update"] },
  { key: "cargo", label: "Kargo Takip", actions: ["read", "write", "delete"] },
  { key: "orders", label: "Siparişler", actions: ["read", "write", "delete", "update"] },
  { key: "hesaplama", label: "Hesaplama Aracı", actions: ["read"] },
  { key: "announcements", label: "Duyurular", actions: ["read", "write", "delete"] },
]

export default function RolesPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {} as Record<string, string[]>
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sadece super admin erişebilir
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast.error("Bu sayfaya erişim yetkiniz yok")
      router.replace("/dashboard")
    }
  }, [authLoading, isSuperAdmin, router])

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/roles")
      if (res.ok) {
        const data = await res.json()
        setRoles(Array.isArray(data) ? data : [])
      } else {
        toast.error("Roller yüklenemedi")
      }
    } catch {
      toast.error("Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      loadRoles()
    }
  }, [isSuperAdmin, loadRoles])

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || {}
      })
    } else {
      setEditingRole(null)
      setFormData({ name: "", description: "", permissions: {} })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingRole(null)
  }

  const handleTogglePermission = (resource: string, action: string) => {
    setFormData(prev => {
      const currentResourcePerms = prev.permissions[resource] || []
      const newResourcePerms = currentResourcePerms.includes(action)
        ? currentResourcePerms.filter(a => a !== action)
        : [...currentResourcePerms, action]
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [resource]: newResourcePerms
        }
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error("Rol adı zorunludur")
      return
    }

    setSaving(true)
    try {
      const method = editingRole ? "PUT" : "POST"
      const body = {
        id: editingRole?.id,
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions
      }

      const res = await fetch("/api/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingRole ? "Rol güncellendi" : "Rol eklendi")
        handleCloseModal()
        loadRoles()
      } else {
        toast.error(data.error || "Kayıt başarısız")
      }
    } catch {
      toast.error("Sunucu hatası oluştu")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu rolü silmek istediğinize emin misiniz?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" })
      const data = await res.json()

      if (res.ok) {
        toast.success("Rol silindi")
        loadRoles()
      } else {
        toast.error(data.error || "Silme işlemi başarısız")
      }
    } catch {
      toast.error("Silme işlemi sırasında hata oluştu")
    } finally {
      setDeletingId(null)
    }
  }

  if (authLoading || !isSuperAdmin) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Rol Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Sistemdeki yetki gruplarını ve erişim sınırlarını yönetin.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Yeni Rol Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="material-symbols-outlined animate-spin text-gray-400 text-4xl">progress_activity</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-[#1f2428] rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500">Henüz özel rol oluşturulmamış.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.id} className="bg-white dark:bg-[#1f2428] p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{role.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{role.description || "Açıklama yok"}</p>
                </div>
                <div className="flex gap-1 shrink-0 bg-gray-50 dark:bg-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md"
                    title="Düzenle"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {role.name !== "Super Admin" && (
                    <button
                      onClick={() => handleDelete(role.id)}
                      disabled={deletingId === role.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md disabled:opacity-50"
                      title="Sil"
                    >
                      {deletingId === role.id
                        ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[18px]">delete</span>
                      }
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Erişim İzinleri Özeti</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(role.permissions || {}).slice(0, 4).map(res => (
                    <span key={res} className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[11px] rounded-md font-medium">
                      {AVAILABLE_RESOURCES.find(r => r.key === res)?.label || res}
                    </span>
                  ))}
                  {Object.keys(role.permissions || {}).length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-500 text-[11px] rounded-md font-medium">
                      +{Object.keys(role.permissions || {}).length - 4} daha
                    </span>
                  )}
                  {Object.keys(role.permissions || {}).length === 0 && (
                    <span className="text-xs text-gray-400 italic">Hiçbir yetki yok</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a1e22] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingRole ? "Rolü Düzenle" : "Yeni Rol Ekle"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="roleForm" onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Rol Adı *</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={editingRole?.name === "Super Admin"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none dark:text-white"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                    Modül İzinleri
                  </h3>
                  <div className="space-y-4">
                    {AVAILABLE_RESOURCES.map(resource => (
                      <div key={resource.key} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-3">{resource.label}</div>
                        <div className="flex flex-wrap gap-4">
                          {resource.actions.map(action => (
                            <label key={`${resource.key}-${action}`} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                checked={(formData.permissions[resource.key] || []).includes(action)}
                                onChange={() => handleTogglePermission(resource.key, action)}
                                disabled={editingRole?.name === "Super Admin"}
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {action === "read" ? "Okuma" : action === "write" ? "Yazma" : action === "delete" ? "Silme" : action === "update" ? "Güncelleme" : action}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1e22] flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCloseModal}>İptal</Button>
              <Button type="submit" form="roleForm" disabled={saving || editingRole?.name === "Super Admin"}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

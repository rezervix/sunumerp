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
  { key: "stok", label: "Stok & Envanter", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "wms", label: "Depo Operasyonları (WMS)", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "satinalma", label: "Satın Alma & Tedarik", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "omnichannel", label: "Çok Kanallı Satış & Sevkiyat", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "lojistik_wms", label: "Lojistik: Gelişmiş Depo & WMS", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "lojistik_sevkiyat_rota", label: "Lojistik: Sevkiyat & Rota", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "lojistik_tedarikci", label: "Lojistik: Tedarikçi & RFQ", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "lojistik_filo", label: "Lojistik: Filo & Sürücü", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "lojistik_iade", label: "Lojistik: İade & RMA", actions: ["read", "create", "update", "delete", "approve"] },
  { key: "tedarikci_portali", label: "Dış Tedarikçi Portalı", actions: ["read", "create", "update"] },
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
        <div className="text-center p-12 bg-[#111513]/90 rounded-[20px] border border-white/[0.06]">
          <p className="text-zinc-500 text-sm">Henüz özel rol oluşturulmamış.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.id} className="bg-[#111513]/90 p-5 rounded-[20px] shadow-2xl border border-white/[0.06] flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-white text-base">{role.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{role.description || "Açıklama yok"}</p>
                </div>
                <div className="flex gap-1 shrink-0 bg-white/[0.04] p-1 rounded-full border border-white/[0.06]">
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-300 transition-colors rounded-full cursor-pointer"
                    title="Düzenle"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  {role.name !== "Super Admin" && (
                    <button
                      onClick={() => handleDelete(role.id)}
                      disabled={deletingId === role.id}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors rounded-full disabled:opacity-50 cursor-pointer"
                      title="Sil"
                    >
                      {deletingId === role.id
                        ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[16px]">delete</span>
                      }
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/[0.06]">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-2">Erişim İzinleri Özeti</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(role.permissions || {}).slice(0, 4).map(res => (
                    <span key={res} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] rounded-full font-medium">
                      {AVAILABLE_RESOURCES.find(r => r.key === res)?.label || res}
                    </span>
                  ))}
                  {Object.keys(role.permissions || {}).length > 4 && (
                    <span className="px-2 py-0.5 bg-white/[0.06] text-zinc-400 text-[10px] rounded-full font-medium">
                      +{Object.keys(role.permissions || {}).length - 4} daha
                    </span>
                  )}
                  {Object.keys(role.permissions || {}).length === 0 && (
                    <span className="text-xs text-zinc-500 italic">Hiçbir yetki yok</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111513] border border-white/[0.08] text-white w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-medium text-white">
                {editingRole ? "Rolü Düzenle" : "Yeni Rol Ekle"}
              </h2>
              <button onClick={handleCloseModal} className="text-zinc-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <form id="roleForm" onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Rol Adı *</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/30 rounded-xl text-sm outline-none text-white transition-all"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={editingRole?.name === "Super Admin"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Açıklama</label>
                    <textarea
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/30 rounded-xl text-sm outline-none resize-none text-white transition-all"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400 mb-3 pb-2 border-b border-white/[0.06]">
                    Modül İzinleri
                  </h3>
                  <div className="space-y-3">
                    {AVAILABLE_RESOURCES.map(resource => (
                      <div key={resource.key} className="bg-[#080A09]/60 p-4 rounded-xl border border-white/[0.06]">
                        <div className="font-medium text-xs text-white mb-3">{resource.label}</div>
                        <div className="flex flex-wrap gap-5">
                          {resource.actions.map(action => {
                            const isChecked = (formData.permissions[resource.key] || []).includes(action)
                            return (
                              <div key={`${resource.key}-${action}`} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={editingRole?.name === "Super Admin"}
                                  onClick={() => handleTogglePermission(resource.key, action)}
                                  className={`w-9 h-5 rounded-full transition-all duration-300 p-0.5 flex items-center cursor-pointer disabled:opacity-40 ${
                                    isChecked
                                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)] justify-end"
                                      : "bg-zinc-800 justify-start"
                                  }`}
                                >
                                  <span className="size-4 rounded-full bg-white shadow-xs" />
                                </button>
                                <span className="text-xs text-zinc-300 capitalize">
                                  {action === "read"
                                    ? "Görüntüle"
                                    : action === "write"
                                      ? "Yazma"
                                      : action === "create"
                                        ? "Oluştur"
                                        : action === "delete"
                                          ? "Sil"
                                          : action === "update"
                                            ? "Düzenle"
                                            : action === "approve"
                                              ? "Onayla"
                                              : action}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5">
              <Button type="button" variant="outline" className="rounded-full h-9 text-xs" onClick={handleCloseModal}>İptal</Button>
              <Button
                type="submit"
                form="roleForm"
                className="bg-[#34D399] text-[#061811] hover:bg-emerald-400 font-medium rounded-full h-9 text-xs"
                disabled={saving || editingRole?.name === "Super Admin"}
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

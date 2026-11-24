"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { Shield, Plus, Edit2, Trash2, X, ArrowLeft, Loader2, Info } from "lucide-react"

interface RoleData {
  id: string
  name: string
  description: string | null
  permissions: Record<string, string[]>
}

interface ModuleData {
  id: string
  key: string
  label: string
  sortOrder: number
}

const BASE_ACTIONS = ["read", "create", "update", "delete"]
const PRODUCTION_ACTIONS = ["read", "create", "update", "delete", "approve"]
const ACTION_LABELS: Record<string, string> = {
  read: "read",
  create: "create",
  update: "update",
  delete: "delete",
  approve: "approve (onayla)",
}

export default function RolesPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [roles, setRoles] = useState<RoleData[]>([])
  const [modules, setModules] = useState<ModuleData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null)
  const [roleName, setRoleName] = useState("")
  const [roleDesc, setRoleDesc] = useState("")
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, isSuperAdmin, router])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/modules")
      ])

      if (rolesRes.ok && modulesRes.ok) {
        const rolesJson = await rolesRes.json()
        const modulesJson = await modulesRes.json()
        setRoles(rolesJson)
        setModules(modulesJson)
      } else {
        toast.error("Veriler yüklenirken bir hata oluştu")
      }
    } catch (err) {
      console.error(err)
      toast.error("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setSelectedRole(null)
    setRoleName("")
    setRoleDesc("")
    setPermissions({})
    setModalOpen(true)
  }

  const openEdit = (role: RoleData) => {
    setSelectedRole(role)
    setRoleName(role.name)
    setRoleDesc(role.description || "")
    setPermissions(role.permissions || {})
    setModalOpen(true)
  }

  const togglePermission = (moduleKey: string, action: string) => {
    setPermissions(prev => {
      const current = prev[moduleKey] || []
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action]
      return { ...prev, [moduleKey]: next }
    })
  }

  const handleSave = async () => {
    if (!roleName) {
      toast.error("Rol adı zorunludur")
      return
    }
    setSaving(true)
    try {
      const method = selectedRole ? "PUT" : "POST"
      const payload = {
        id: selectedRole?.id,
        name: roleName,
        description: roleDesc,
        permissions
      }

      const res = await fetch("/api/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(selectedRole ? "Rol güncellendi" : "Yeni rol oluşturuldu")
        loadData()
        setModalOpen(false)
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Rol kaydedilirken hata oluştu")
      }
    } catch (err) {
      console.error(err)
      toast.error("Bağlantı hatası")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: RoleData) => {
    if (!confirm(`"${role.name}" rolünü silmek istediğinize emin misiniz?`)) return

    try {
      const res = await fetch(`/api/roles?id=${role.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Rol başarıyla silindi")
        loadData()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Rol silinemedi")
      }
    } catch (err) {
      console.error(err)
      toast.error("Rol silinirken bir bağlantı hatası oluştu")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--brand]" />
        <span className="ml-2 text-[--text-muted]">Roller yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard/users")}
            className="p-2 border border-[--line] rounded-xl bg-white hover:bg-[--muted-bg] transition-colors"
          >
            <ArrowLeft size={16} className="text-[--text-muted]" />
          </button>
          <div>
            <h1 className="text-3xl font-light text-[--text] tracking-tight flex items-center gap-2">
              <Shield size={22} className="text-[--brand]" /> Rol ve Yetki Yönetimi
            </h1>
            <p className="text-xs text-[--text-muted] mt-1">Sistemdeki yetki kalıplarını ve granular modül erişimlerini düzenleyin</p>
          </div>
        </div>
        <button 
          onClick={openCreate} 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white text-xs font-medium rounded-full transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Plus size={15} /> Yeni Rol
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-[--brand-soft] border border-[--brand-line] rounded-[20px] flex gap-3 text-[--text-2]">
        <Info size={18} className="shrink-0 mt-0.5 text-[--brand]" />
        <p className="text-xs leading-relaxed text-[--text-2]">
          <strong className="text-[--navy]">Nasıl Çalışır?</strong> Tanımladığınız roller şube bazlı olarak kullanıcılara atanır. Bir kullanıcının birden fazla şubede farklı rolleri olabilir. 
          Özel rol matrisleri, sisteme yeni modüller eklendiğinde otomatik olarak genişler.
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => {
          const isSystemRole = role.name === "Super Admin" || role.name === "Branch Admin"
          const totalPermsCount = Object.values(role.permissions || {}).reduce((acc, curr) => acc + curr.length, 0)

          return (
            <div key={role.id} className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm transition-all flex flex-col justify-between group relative overflow-hidden">
              {isSystemRole && (
                <div className="absolute top-0 right-0 bg-[--brand-soft] text-[--brand] text-[10px] font-medium uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-[--brand-line]">
                  Sistem Rolü
                </div>
              )}
              <div>
                <h3 className="font-medium text-base text-[--text] flex items-center gap-2">
                  {role.name}
                </h3>
                <p className="text-xs text-[--text-muted] mt-1.5 h-10 overflow-hidden line-clamp-2">
                  {role.description || "Açıklama belirtilmemiş"}
                </p>
                
                <div className="mt-4 pt-4 border-t border-[--line-soft] space-y-2">
                  <div className="flex justify-between text-xs text-[--text-muted]">
                    <span>Etkin İzin Sayısı</span>
                    <span className="font-mono text-[--brand] font-medium">{totalPermsCount} yetki</span>
                  </div>
                  <div className="flex justify-between text-xs text-[--text-muted]">
                    <span>Modül İzinleri</span>
                    <span className="font-mono text-[--text-2]">{Object.keys(role.permissions || {}).length} modül</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-[--line-soft] pt-4">
                <button 
                  onClick={() => openEdit(role)} 
                  disabled={role.name === "Super Admin"}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[--line] hover:bg-[--muted-bg] text-[--text-2] hover:text-[--text] rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Edit2 size={12} /> Düzenle
                </button>
                <button 
                  onClick={() => handleDelete(role)} 
                  disabled={isSystemRole}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[--bad]/20 bg-[--bad-soft] text-[--bad] hover:bg-[--bad]/10 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 size={12} /> Sil
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Role Management Modal */}
      {modalOpen && (
        <ModalWrapper title={selectedRole ? `Rol Düzenle: ${selectedRole.name}` : "Yeni Rol Tanımla"} onClose={() => setModalOpen(false)}>
          <div className="flex flex-col h-full bg-white overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] border-b border-[--line]">
              <Field label="Rol Adı *">
                <input 
                  className={inp} 
                  value={roleName} 
                  onChange={e => setRoleName(e.target.value)} 
                  placeholder="Satış Temsilcisi, Destek Uzmanı vb."
                  disabled={selectedRole?.name === "Super Admin" || selectedRole?.name === "Branch Admin"}
                />
              </Field>
              <Field label="Açıklama">
                <textarea 
                  className={`${inp} min-h-[70px] resize-none`} 
                  value={roleDesc} 
                  onChange={e => setRoleDesc(e.target.value)} 
                  placeholder="Bu role sahip kullanıcıların sistemdeki işlevini kısaca açıklayın."
                />
              </Field>

              {/* Checkbox Permission Matrix Grid */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-bold text-[--text-muted] uppercase tracking-wider ml-1">İzin Matrisi (Granüler Yetkiler)</label>
                
                {selectedRole?.name === "Super Admin" ? (
                  <div className="p-4 bg-[--muted-bg] border border-[--line] rounded-xl text-center text-sm text-[--text-muted]">
                    Super Admin rolü sistemdeki her modüle tam erişime sahiptir ve kısıtlanamaz.
                  </div>
                ) : (
                  <div className="border border-[--line] rounded-2xl overflow-hidden shadow-xs bg-white overflow-x-auto">
                    <div className="min-w-[500px]">
                      {/* Header */}
                      {(() => {
                        const hasProductionModules = modules.some(m => m.key.startsWith("uretim_"))
                        const activeActions = hasProductionModules ? PRODUCTION_ACTIONS : BASE_ACTIONS
                        const gridColsClass = hasProductionModules ? "grid-cols-6" : "grid-cols-5"
                        return (
                          <>
                            <div className={`bg-[--page] px-4 py-3 grid ${gridColsClass} gap-2 border-b border-[--line]`}>
                              <span className="text-xs font-bold text-[--text-muted] uppercase tracking-wider">Modül</span>
                              {activeActions.map(a => (
                                <span key={a} className="text-xs font-bold text-center text-[--text-muted] uppercase tracking-wider">{ACTION_LABELS[a] || a}</span>
                              ))}
                            </div>
                            {/* Body */}
                            <div className="divide-y divide-[--line-soft] max-h-[300px] overflow-y-auto">
                              {modules.map(m => (
                                <div key={m.key} className={`px-4 py-3 grid ${gridColsClass} gap-2 items-center hover:bg-[--brand-soft]/40 transition-colors`}>
                                  <span className="text-xs font-medium text-[--text] truncate">{m.label}</span>
                                  {activeActions.map(action => {
                                    const has = (permissions[m.key] || []).includes(action)
                                    return (
                                      <div key={action} className="flex justify-center">
                                        <button 
                                          type="button"
                                          onClick={() => togglePermission(m.key, action)}
                                          className={`w-9 h-5 rounded-full transition-all duration-300 p-0.5 flex items-center cursor-pointer ${
                                            has
                                              ? "bg-[--brand] shadow-xs justify-end"
                                              : "bg-[--line] justify-start"
                                          }`}
                                        >
                                          <span className="size-4 rounded-full bg-white shadow-xs" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ModalFooter 
              onCancel={() => setModalOpen(false)} 
              onSave={handleSave} 
              saving={saving} 
              saveLabel={selectedRole ? "Güncelle" : "Oluştur"} 
              disabled={!roleName}
            />
          </div>
        </ModalWrapper>
      )}
    </div>
  )
}

// —— Common styles & helper components
const inp = "w-full px-3.5 py-2 text-sm border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] transition-all shadow-xs"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
      <div className="bg-white border border-[--line] text-[--text] rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--line] bg-[--page] shrink-0">
          <h2 className="text-base font-medium text-[--navy]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[--muted-bg] text-[--text-muted] hover:text-[--text] transition-colors cursor-pointer"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel, disabled }: { onCancel: () => void; onSave: () => void; saving: boolean; saveLabel: string; disabled?: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5 shrink-0">
      <button onClick={onCancel} className="px-4 py-2 text-xs font-medium text-[--text-2] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer">İptal</button>
      <button onClick={onSave} disabled={saving || disabled} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer">
        {saving ? "İşleniyor..." : saveLabel}
      </button>
    </div>
  )
}

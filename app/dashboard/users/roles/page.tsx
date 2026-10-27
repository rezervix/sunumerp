"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { Shield, Plus, Edit2, Trash2, X, Check, ArrowLeft, Loader2, Info } from "lucide-react"

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

const ACTIONS = ["read", "create", "update", "delete"]

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Roller yükleniyor...</span>
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
            className="p-2 border border-border rounded-xl bg-card hover:bg-muted/40 transition-colors"
          >
            <ArrowLeft size={16} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield size={24} className="text-primary" /> Rol ve Yetki Yönetimi
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Sistemdeki yetki kalıplarını ve granular modül erişimlerini düzenleyin</p>
          </div>
        </div>
        <button 
          onClick={openCreate} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md shrink-0"
        >
          <Plus size={16} /> Yeni Rol
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl flex gap-3 text-blue-800 dark:text-blue-200">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          <strong>Nasıl Çalışır?</strong> Tanımladığınız roller şube bazlı olarak kullanıcılara atanır. Bir kullanıcının birden fazla şubede farklı rolleri olabilir. 
          Özel (Custom) rol matrisleri, sisteme yeni modüller eklendiğinde otomatik olarak genişler. İzinlerin aktifleşmesi için kullanıcının sonraki API isteğinde oturum kontrolü otomatik tetiklenir.
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => {
          const isSystemRole = role.name === "Super Admin" || role.name === "Branch Admin"
          const totalPermsCount = Object.values(role.permissions || {}).reduce((acc, curr) => acc + curr.length, 0)

          return (
            <div key={role.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
              {isSystemRole && (
                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-primary/10">
                  Sistem Rolü
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  {role.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 h-10 overflow-hidden line-clamp-2">
                  {role.description || "Açıklama belirtilmemiş"}
                </p>
                
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Etkin İzin Sayısı</span>
                    <span className="font-semibold text-foreground">{totalPermsCount} yetki</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Modül İzinleri</span>
                    <span className="font-semibold text-foreground">{Object.keys(role.permissions || {}).length} modül</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button 
                  onClick={() => openEdit(role)} 
                  disabled={role.name === "Super Admin"}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Edit2 size={12} /> Düzenle
                </button>
                <button 
                  onClick={() => handleDelete(role)} 
                  disabled={isSystemRole}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="flex flex-col h-full bg-card overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] border-b border-border">
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">İzin Matrisi (Granüler Yetkiler)</label>
                
                {selectedRole?.name === "Super Admin" ? (
                  <div className="p-4 bg-muted/40 border border-border rounded-xl text-center text-sm text-muted-foreground">
                    Super Admin rolü sistemdeki her modüle tam erişime sahiptir ve kısıtlanamaz.
                  </div>
                ) : (
                  <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-card overflow-x-auto">
                    <div className="min-w-[500px]">
                      {/* Header */}
                      <div className="bg-muted/40 px-4 py-3 grid grid-cols-5 gap-2 border-b border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modül</span>
                        {ACTIONS.map(a => (
                          <span key={a} className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wider">{a}</span>
                        ))}
                      </div>
                      {/* Body */}
                      <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar">
                        {modules.map(m => (
                          <div key={m.key} className="px-4 py-3 grid grid-cols-5 gap-2 items-center hover:bg-muted/20 transition-colors">
                            <span className="text-sm font-semibold text-foreground truncate">{m.label}</span>
                            {ACTIONS.map(action => {
                              const has = (permissions[m.key] || []).includes(action)
                              return (
                                <button 
                                  key={action} 
                                  onClick={() => togglePermission(m.key, action)}
                                  className={`mx-auto size-6 rounded-md border-2 flex items-center justify-center transition-all ${has ? "bg-primary border-primary" : "border-border hover:border-primary/50 bg-background"}`}
                                >
                                  {has && <Check size={14} className="text-white" />}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
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
const inp = "w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20 shrink-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X size={20} className="text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel, disabled }: { onCancel: () => void; onSave: () => void; saving: boolean; saveLabel: string; disabled?: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
      <button onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-foreground border border-border rounded-xl hover:bg-muted transition-colors shadow-sm bg-card">İptal</button>
      <button onClick={onSave} disabled={saving || disabled} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
        {saving ? "İşleniyor..." : saveLabel}
      </button>
    </div>
  )
}

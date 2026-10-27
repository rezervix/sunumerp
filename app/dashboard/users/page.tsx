"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { Users, Plus, Search, Shield, Eye, Key, Edit2, ToggleLeft, ToggleRight, X, Check, Building2, User, Phone, Mail, Briefcase, Calendar, ShieldCheck, Trash2 } from "lucide-react"

// —— Tüm resource'lar
const ALL_RESOURCES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "takvim", label: "Takvim" },
  { key: "orders", label: "Siparişler" },
  { key: "magaza", label: "Mağaza (B2B)" },
  { key: "customers", label: "Müşteriler" },
  { key: "hr", label: "İnsan Kaynakları" },
  { key: "projects", label: "Projeler" },
  { key: "leads", label: "Potansiyeller" },
  { key: "cargo", label: "Kargo" },
  { key: "files", label: "Dosyalar" },
  { key: "yapilacaklar", label: "Yapılacaklar" },
  { key: "notlarim", label: "Notlarım" },
  { key: "hesaplama", label: "Hesaplama Aracı" },
  { key: "financial", label: "Finans" },
  { key: "sosyal-medya", label: "Sosyal Medya" },
  { key: "chat", label: "Chat" },
  { key: "duyurular", label: "Duyurular" },
  // ── İçerik Mağazası İzinleri ──────────────────────────────────
  { key: "icerik_magazasi_yukle",   label: "İçerik Mağazası: Yükle" },
  { key: "icerik_magazasi_sil",     label: "İçerik Mağazası: Sil" },
  { key: "icerik_magazasi_onayla",  label: "İçerik Mağazası: Onayla/Red" },
  { key: "icerik_magazasi_toplu",   label: "İçerik Mağazası: Toplu İşlem" },
  { key: "icerik_magazasi_analitik",label: "İçerik Mağazası: Analitik" },
]

const ACTIONS = ["read", "create", "update", "delete"]

const ROLE_TEMPLATES: Record<string, Record<string, string[]>> = {
  "Super Admin": Object.fromEntries(ALL_RESOURCES.map(r => [r.key, [...ACTIONS]])),
  "Saha Satis": {
    dashboard: ["read"], takvim: ["read","create","update","delete"],
    orders: ["read","create","update"], magaza: ["read"],
    customers: ["read","create","update"], leads: ["read","create","update"],
    cargo: ["read"], yapilacaklar: ["read","create","update","delete"],
    notlarim: ["read","create","update","delete"], chat: ["read","create"], duyurular: ["read"],
  },
  "Muhasebe": {
    dashboard: ["read"], financial: ["read","create","update","delete"],
    orders: ["read"], customers: ["read"], files: ["read","create"],
    notlarim: ["read","create","update","delete"], chat: ["read","create"], duyurular: ["read"],
  },
  "IK Personeli": {
    dashboard: ["read"], hr: ["read","create","update","delete"],
    files: ["read","create","update"], notlarim: ["read","create","update","delete"],
    chat: ["read","create"], duyurular: ["read"],
  },
  "Depo Lojistik": {
    dashboard: ["read"], cargo: ["read","create","update","delete"],
    orders: ["read","update"], magaza: ["read"], files: ["read","create"], duyurular: ["read"],
  },
}

interface UserRow {
  id: string
  username: string
  fullName: string
  email?: string
  phone?: string
  department?: string
  position?: string
  isActive: boolean
  createdAt: string
  branches: { branchId: string; branchName: string; roleName: string; roleColor: string }[]
}

type ModalMode = "create" | "edit" | "reset-password" | "assign-role" | "view" | null

const emptyForm = {
  username: "", fullName: "", password: "", email: "", phone: "",
  department: "", position: "", branchId: "", roleName: "", customPerms: {} as Record<string, string[]>,
}

export default function UsersPage() {
  const { t, tText } = useLanguage()
  const { isSuperAdmin, loading: authLoading, userBranches } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>([])
  const [dbRoles, setDbRoles] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [showCustomPerms, setShowCustomPerms] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)

  // Tabs for view modal
  const [viewTab, setViewTab] = useState<"info" | "roles">("info")

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) router.replace("/dashboard")
  }, [authLoading, isSuperAdmin, router])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles")
      ])
      if (usersRes.ok) {
        const json = await usersRes.json()
        setUsers(json.data || json)
      }
      if (rolesRes.ok) {
        const json = await rolesRes.json()
        setDbRoles(json)
      }
    } catch (err) {
      console.error("Error loading users/roles:", err)
    }
  }

  const openCreate = () => {
    setForm(emptyForm)
    setSelectedTemplate("")
    setShowCustomPerms(false)
    setModalMode("create")
  }

  const openEdit = (u: UserRow) => {
    setSelectedUser(u)
    setForm({ ...emptyForm, fullName: u.fullName, email: u.email||"", phone: u.phone||"", department: u.department||"", position: u.position||"" })
    setModalMode("edit")
  }

  const openView = (u: UserRow) => {
    setSelectedUser(u)
    setViewTab("info")
    setModalMode("view")
  }

  const openResetPw = (u: UserRow) => { setSelectedUser(u); setNewPassword(""); setModalMode("reset-password") }

  const openAssignRole = (u: UserRow) => {
    setSelectedUser(u)
    setForm({ ...emptyForm, branchId: u.branches[0]?.branchId||"", roleName: "" })
    setSelectedTemplate("")
    setShowCustomPerms(false)
    setModalMode("assign-role")
  }

  const handleTemplateChange = (tplName: string) => {
    setSelectedTemplate(tplName)
    if (tplName === "custom") {
      setShowCustomPerms(true)
      setForm(f => ({ ...f, roleName: "custom", customPerms: {} }))
    } else {
      setShowCustomPerms(false)
      const roleData = dbRoles.find(r => r.name === tplName)
      const perms = roleData ? roleData.permissions : {}
      setForm(f => ({ ...f, roleName: tplName, customPerms: perms }))
    }
  }

  const togglePerm = (resource: string, action: string) => {
    setForm(f => {
      const cur = f.customPerms[resource] || []
      const next = cur.includes(action) ? cur.filter(a => a !== action) : [...cur, action]
      return { ...f, customPerms: { ...f.customPerms, [resource]: next } }
    })
  }

  const handleCreate = async () => {
    if (!form.username || !form.fullName || !form.password) { toast.error("Zorunlu alanları doldurun"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      })
      if (res.ok) { toast.success("Kullanıcı oluşturuldu"); loadData(); setModalMode(null) }
      else { const d = await res.json(); toast.error(d.error || "Hata") }
    } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, fullName: form.fullName, email: form.email, phone: form.phone, department: form.department, position: form.position }),
      })
      if (res.ok) { toast.success("Güncellendi"); loadData(); setModalMode(null) }
      else toast.error("Hata oluştu")
    } finally { setSaving(false) }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) { toast.error("En az 6 karakter girin"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) { toast.success("Şifre sıfırlandı ve aktif oturumları kapatıldı"); setModalMode(null) }
      else toast.error("Hata oluştu")
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (u: UserRow) => {
    const res = await fetch(`/api/users/${u.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    if (res.ok) { toast.success(u.isActive ? "Pasif yapıldı ve aktif oturumları kapatıldı" : "Aktif yapıldı"); loadData() }
    else toast.error("Hata oluştu")
  }

  const handleAssignRole = async () => {
    if (!selectedUser || !form.branchId || !form.roleName) { toast.error("Şube ve rol seçin"); return }
    setSaving(true)
    try {
      let roleNameToAssign = form.roleName
      if (form.roleName === "custom") {
        const createRes = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `Özel-${selectedUser.username}-${Date.now().toString().slice(-4)}`, description: "Özel modüler yetki", permissions: form.customPerms }),
        })
        if (createRes.ok) { const d = await createRes.json(); roleNameToAssign = d.name; loadData() }
        else { toast.error("Rol oluşturulamadı"); setSaving(false); return }
      }
      const res = await fetch(`/api/users/${selectedUser.id}/branch-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: form.branchId, roleName: roleNameToAssign }),
      })
      if (res.ok) { toast.success("Rol atandı"); loadData(); setModalMode(null) }
      else toast.error("Hata oluştu")
    } finally { setSaving(false) }
  }

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.department||"").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} className="text-primary" /> Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} kullanıcı • {users.filter(u=>u.isActive).length} aktif</p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-sm:w-full">
          <div className="relative max-sm:w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tText("common.search", "Ara...")} className="pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-56 max-sm:w-full transition-all" />
          </div>
          <button onClick={() => router.push("/dashboard/users/roles")} className="flex items-center justify-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/40 text-foreground text-sm font-medium rounded-xl transition-colors shadow-sm max-sm:flex-1">
            <Shield size={16} /> Rol Yönetimi
          </button>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md max-sm:flex-1">
            <Plus size={16} /> Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {["Kullanıcı","Kullanıcı Adı","Departman / Pozisyon","Şube & Rol","Durum","İşlemler"].map(h=>(
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Kullanıcı bulunamadı</p>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 border border-primary/20">
                        {u.fullName.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground font-mono text-xs">@{u.username}</td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-foreground">{u.department||"—"}</div>
                    <div className="text-xs text-muted-foreground">{u.position||""}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.branches.length === 0 ? <span className="text-xs text-muted-foreground italic">Atanmamış</span>
                        : u.branches.map((b,i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border"
                            style={{ borderColor:`${b.roleColor}40`, color: b.roleColor, backgroundColor:`${b.roleColor}10` }}>
                            <Shield size={12} />{b.branchName}: {b.roleName}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleToggleActive(u)} title={u.isActive ? "Pasif yap" : "Aktif yap"}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${u.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-800" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"}`}>
                      {u.isActive ? <><ToggleRight size={14}/>Aktif</> : <><ToggleLeft size={14}/>Pasif</>}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                      <button onClick={() => openView(u)} title="Görüntüle" className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Eye size={16}/></button>
                      <button onClick={() => openEdit(u)} title="Düzenle" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 size={16}/></button>
                      <button onClick={() => openAssignRole(u)} title="Rol ata" className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><ShieldCheck size={16}/></button>
                      <button onClick={() => openResetPw(u)} title="Şifre sıfırla" className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"><Key size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* —— View User Modal —— */}
      {modalMode === "view" && selectedUser && (
        <ModalWrapper title="Kullanıcı Detayları" onClose={() => setModalMode(null)}>
          <div className="flex flex-col h-full bg-muted/10">
            {/* Header info */}
            <div className="p-6 bg-card border-b border-border flex items-center gap-5">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-primary/20 shrink-0 shadow-sm">
                {selectedUser.fullName.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{selectedUser.fullName}</h2>
                <p className="text-muted-foreground font-mono text-sm">@{selectedUser.username}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${selectedUser.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                    {selectedUser.isActive ? "Aktif Hesap" : "Pasif Hesap"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="px-6 pt-3 border-b border-border flex gap-6 bg-card">
              <button onClick={() => setViewTab("info")} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${viewTab === "info" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Kişisel Bilgiler</button>
              <button onClick={() => setViewTab("roles")} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${viewTab === "roles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Şube ve Yetkiler</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {viewTab === "info" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Mail size={14}/> <span className="text-xs font-semibold uppercase">E-posta</span></div>
                      <p className="text-sm font-medium">{selectedUser.email || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone size={14}/> <span className="text-xs font-semibold uppercase">Telefon</span></div>
                      <p className="text-sm font-medium">{selectedUser.phone || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Building2 size={14}/> <span className="text-xs font-semibold uppercase">Departman</span></div>
                      <p className="text-sm font-medium">{selectedUser.department || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Briefcase size={14}/> <span className="text-xs font-semibold uppercase">Pozisyon</span></div>
                      <p className="text-sm font-medium">{selectedUser.position || "Belirtilmemiş"}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm flex items-center gap-3">
                    <Calendar size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Kayıt Tarihi</p>
                      <p className="text-sm font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("tr-TR", { year: 'numeric', month: 'long', day: 'numeric' }) : "Bilinmiyor"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedUser.branches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                      <Shield size={32} className="mx-auto mb-2 opacity-50"/>
                      <p className="text-sm">Henüz hiçbir şubede yetkisi yok.</p>
                    </div>
                  ) : (
                    selectedUser.branches.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-[#1e1e1e] border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${b.roleColor}15`, color: b.roleColor }}>
                            <Building2 size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{b.branchName}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Shield size={12} className="text-muted-foreground"/>
                              <p className="text-xs font-medium text-muted-foreground">Rol: {b.roleName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="p-4 bg-card border-t border-border mt-auto flex justify-end">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-medium rounded-xl transition-colors">{tText("common.close", "Kapat")}</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* —— Create Modal —— */}
      {modalMode === "create" && (
        <ModalWrapper title="Yeni Kullanıcı Oluştur" onClose={() => setModalMode(null)}>
          <div className="space-y-4 p-6 overflow-y-auto max-h-[65vh] bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Kullanıcı Adı *"><input className={inp} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="kullanici.adi"/></Field>
              <Field label="Ad Soyad *"><input className={inp} value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} placeholder="Ad Soyad"/></Field>
            </div>
            <Field label="Şifre *"><input type="password" className={inp} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••"/></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="E-posta"><input type="email" className={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="ornek@firma.com"/></Field>
              <Field label="Telefon"><input className={inp} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="05xx xxx xx xx"/></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Departman"><input className={inp} value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} placeholder="Muhasebe"/></Field>
              <Field label="Pozisyon"><input className={inp} value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} placeholder="Uzman"/></Field>
            </div>
            <div className="p-5 bg-muted/30 rounded-xl space-y-4 border border-border">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <ShieldCheck size={16} className="text-primary"/>
                <p className="text-sm font-bold text-foreground">Başlangıç Yetkisi <span className="text-muted-foreground font-normal">(Opsiyonel)</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Şube">
                  <select className={inp} value={form.branchId} onChange={e=>setForm(f=>({...f,branchId:e.target.value}))}>
                    <option value="">Şube Seçin</option>
                    {userBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Rol Kalıbı">
                  <select className={inp} value={selectedTemplate} onChange={e=>handleTemplateChange(e.target.value)}>
                    <option value="">Seçin</option>
                    {dbRoles.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}
                    <option value="custom">Özel (Granüler İzinler)</option>
                  </select>
                </Field>
              </div>
              {showCustomPerms && <CustomPermsGrid perms={form.customPerms} onToggle={togglePerm}/>}
            </div>
          </div>
          <ModalFooter onCancel={() => setModalMode(null)} onSave={handleCreate} saving={saving} saveLabel="Kullanıcı Oluştur" disabled={!form.username||!form.fullName||!form.password}/>
        </ModalWrapper>
      )}

      {/* —— Edit Modal —— */}
      {modalMode === "edit" && selectedUser && (
        <ModalWrapper title={`Düzenle: ${selectedUser.fullName}`} onClose={() => setModalMode(null)}>
          <div className="space-y-4 p-6 bg-card">
            <Field label="Ad Soyad"><input className={inp} value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))}/></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="E-posta"><input type="email" className={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
              <Field label="Telefon"><input className={inp} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Departman"><input className={inp} value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></Field>
              <Field label="Pozisyon"><input className={inp} value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))}/></Field>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalMode(null)} onSave={handleEdit} saving={saving} saveLabel="Güncelle" disabled={!form.fullName}/>
        </ModalWrapper>
      )}

      {/* —— Reset Password Modal —— */}
      {modalMode === "reset-password" && selectedUser && (
        <ModalWrapper title={`Şifre Sıfırla: ${selectedUser.fullName}`} onClose={() => setModalMode(null)}>
          <div className="p-6 space-y-4 bg-card">
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3 text-amber-800 dark:text-amber-200">
              <Key size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">Kullanıcı için yeni şifre belirleyin (en az 6 karakter). Şifre sıfırlandıktan sonra kullanıcının mevcut oturumları kapatılacaktır.</p>
            </div>
            <Field label="Yeni Şifre">
              <input type="password" className={inp} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••"/>
            </Field>
          </div>
          <ModalFooter onCancel={() => setModalMode(null)} onSave={handleResetPassword} saving={saving} saveLabel="Şifreyi Sıfırla" disabled={newPassword.length < 6}/>
        </ModalWrapper>
      )}

      {/* —— Assign Role Modal —— */}
      {modalMode === "assign-role" && selectedUser && (
        <ModalWrapper title={`Rol Yönetimi: ${selectedUser.fullName}`} onClose={() => setModalMode(null)}>
          <div className="space-y-6 p-6 overflow-y-auto max-h-[70vh] bg-card">
            
            {/* Mevcut roller gösterimi eklenebilir, şimdilik sadece atama var */}
            {selectedUser.branches.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Mevcut Roller</label>
                <div className="grid gap-2">
                  {selectedUser.branches.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-muted-foreground"/>
                        <span className="text-sm font-semibold">{b.branchName}</span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-md">{b.roleName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 border border-border rounded-xl bg-muted/20 space-y-4">
              <h3 className="text-sm font-bold border-b border-border pb-2">Yeni Rol Ata</h3>
              <Field label="Şube">
                <select className={inp} value={form.branchId} onChange={e=>setForm(f=>({...f,branchId:e.target.value}))}>
                  <option value="">Şube Seçin</option>
                  {userBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Rol Kalıbı">
                <select className={inp} value={selectedTemplate} onChange={e=>handleTemplateChange(e.target.value)}>
                  <option value="">Seçin</option>
                  {dbRoles.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}
                  <option value="custom">Özel (Granüler İzinler)</option>
                </select>
              </Field>
              {showCustomPerms && <CustomPermsGrid perms={form.customPerms} onToggle={togglePerm}/>}
            </div>
          </div>
          <ModalFooter onCancel={() => setModalMode(null)} onSave={handleAssignRole} saving={saving} saveLabel="Rol Ata" disabled={!form.branchId||!selectedTemplate}/>
        </ModalWrapper>
      )}
    </div>
  )
}

// —— Ortak input stili
const inp = "w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"

// —— Küçük yardımcı bileşenler
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: ()=>void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20 shrink-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X size={20} className="text-muted-foreground"/></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel, disabled }: { onCancel:()=>void; onSave:()=>void; saving:boolean; saveLabel:string; disabled?:boolean }) {
  const { tText } = useLanguage()
  return (
    <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
      <button onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-foreground border border-border rounded-xl hover:bg-muted transition-colors shadow-sm bg-card">{tText("common.cancel", "İptal")}</button>
      <button onClick={onSave} disabled={saving||disabled} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
        {saving ? "İşleniyor..." : saveLabel}
      </button>
    </div>
  )
}

function CustomPermsGrid({ perms, onToggle }: { perms: Record<string,string[]>; onToggle:(r:string,a:string)=>void }) {
  return (
    <div className="mt-4 border border-border rounded-xl overflow-hidden shadow-sm bg-card">
      <div className="bg-muted/40 px-4 py-3 grid grid-cols-5 gap-2 border-b border-border">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modül</span>
        {ACTIONS.map(a=><span key={a} className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wider">{a}</span>)}
      </div>
      <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar">
        {ALL_RESOURCES.map(r => (
          <div key={r.key} className="px-4 py-3 grid grid-cols-5 gap-2 items-center hover:bg-muted/20 transition-colors">
            <span className="text-sm font-semibold text-foreground truncate">{r.label}</span>
            {ACTIONS.map(a => {
              const has = (perms[r.key]||[]).includes(a)
              return (
                <button key={a} onClick={()=>onToggle(r.key,a)}
                  className={`mx-auto size-6 rounded-md border-2 flex items-center justify-center transition-all ${has ? "bg-primary border-primary" : "border-border hover:border-primary/50 bg-background"}`}>
                  {has && <Check size={14} className="text-white"/>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

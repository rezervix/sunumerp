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
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-2">
            <Users size={24} className="text-emerald-400" /> Kullanıcı Yönetimi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">{users.length} kullanıcı • {users.filter(u=>u.isActive).length} aktif hesap</p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-sm:w-full">
          <div className="relative max-sm:w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder={tText("common.search", "Kullanıcı ara...")}
              className="pl-9 pr-4 py-2 text-xs border border-white/[0.06] rounded-full bg-[#111513] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 w-56 max-sm:w-full transition-all"
            />
          </div>
          <button
            onClick={() => router.push("/dashboard/users/roles")}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-white/[0.08] bg-[#111513] hover:bg-white/[0.04] text-zinc-300 hover:text-white text-xs font-medium rounded-full transition-colors cursor-pointer max-sm:flex-1"
          >
            <Shield size={14} /> <span>Rol Yönetimi</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#34D399] hover:bg-emerald-400 text-[#061811] text-xs font-medium rounded-full transition-colors shadow-md shadow-emerald-500/20 cursor-pointer max-sm:flex-1"
          >
            <Plus size={15} /> <span>Yeni Kullanıcı</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                {["Kullanıcı","Kullanıcı Adı","Departman / Pozisyon","Şube & Rol","Durum","İşlemler"].map(h=>(
                  <th key={h} className="px-5 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-zinc-300 text-sm">Kullanıcı bulunamadı</p>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-medium shrink-0 border border-emerald-500/20">
                        {u.fullName.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-400 font-mono text-xs">@{u.username}</td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-medium text-white">{u.department||"—"}</div>
                    <div className="text-[11px] text-zinc-500">{u.position||""}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.branches.length === 0 ? <span className="text-xs text-zinc-500 italic">Atanmamış</span>
                        : u.branches.map((b,i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            <Shield size={11} />{b.branchName}: {b.roleName}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleActive(u)}
                      title={u.isActive ? "Pasif yap" : "Aktif yap"}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        u.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.04] text-zinc-500 border border-white/[0.06]"
                      }`}
                    >
                      {u.isActive ? <><ToggleRight size={13}/>Aktif</> : <><ToggleLeft size={13}/>Pasif</>}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                      <button onClick={() => openView(u)} title="Görüntüle" className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"><Eye size={15}/></button>
                      <button onClick={() => openEdit(u)} title="Düzenle" className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.06] transition-colors cursor-pointer"><Edit2 size={15}/></button>
                      <button onClick={() => openAssignRole(u)} title="Rol ata" className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"><ShieldCheck size={15}/></button>
                      <button onClick={() => openResetPw(u)} title="Şifre sıfırla" className="p-1.5 rounded-full text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"><Key size={15}/></button>
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
          <div className="flex flex-col h-full bg-[#111513]">
            {/* Header info */}
            <div className="p-6 bg-[#080A09]/60 border-b border-white/[0.06] flex items-center gap-5">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg font-medium border border-emerald-500/20 shrink-0 shadow-sm">
                {selectedUser.fullName.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-white">{selectedUser.fullName}</h2>
                <p className="text-zinc-400 font-mono text-xs mt-0.5">@{selectedUser.username}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${selectedUser.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-zinc-500"}`}>
                    {selectedUser.isActive ? "Aktif Hesap" : "Pasif Hesap"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="px-6 pt-3 border-b border-white/[0.06] flex gap-6 bg-[#080A09]/40">
              <button onClick={() => setViewTab("info")} className={`pb-3 text-xs font-medium transition-colors border-b-2 cursor-pointer ${viewTab === "info" ? "border-emerald-400 text-emerald-400" : "border-transparent text-zinc-400 hover:text-white"}`}>Kişisel Bilgiler</button>
              <button onClick={() => setViewTab("roles")} className={`pb-3 text-xs font-medium transition-colors border-b-2 cursor-pointer ${viewTab === "roles" ? "border-emerald-400 text-emerald-400" : "border-transparent text-zinc-400 hover:text-white"}`}>Şube ve Yetkiler</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {viewTab === "info" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px]">
                      <div className="flex items-center gap-2 text-zinc-400 mb-1"><Mail size={13}/> <span className="text-[11px] font-medium uppercase tracking-wider">E-posta</span></div>
                      <p className="text-xs font-medium text-white">{selectedUser.email || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px]">
                      <div className="flex items-center gap-2 text-zinc-400 mb-1"><Phone size={13}/> <span className="text-[11px] font-medium uppercase tracking-wider">Telefon</span></div>
                      <p className="text-xs font-medium text-white">{selectedUser.phone || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px]">
                      <div className="flex items-center gap-2 text-zinc-400 mb-1"><Building2 size={13}/> <span className="text-[11px] font-medium uppercase tracking-wider">Departman</span></div>
                      <p className="text-xs font-medium text-white">{selectedUser.department || "Belirtilmemiş"}</p>
                    </div>
                    <div className="p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px]">
                      <div className="flex items-center gap-2 text-zinc-400 mb-1"><Briefcase size={13}/> <span className="text-[11px] font-medium uppercase tracking-wider">Pozisyon</span></div>
                      <p className="text-xs font-medium text-white">{selectedUser.position || "Belirtilmemiş"}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px] flex items-center gap-3">
                    <Calendar size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Kayıt Tarihi</p>
                      <p className="text-xs font-medium text-white mt-0.5">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("tr-TR", { year: 'numeric', month: 'long', day: 'numeric' }) : "Bilinmiyor"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedUser.branches.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 border border-dashed border-white/[0.08] rounded-[20px]">
                      <Shield size={32} className="mx-auto mb-2 opacity-50"/>
                      <p className="text-xs">Henüz hiçbir şubede yetkisi yok.</p>
                    </div>
                  ) : (
                    selectedUser.branches.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[#080A09]/60 border border-white/[0.06] rounded-[20px]">
                        <div className="flex items-center gap-4">
                          <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">{b.branchName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Shield size={11} className="text-zinc-500"/>
                              <p className="text-[11px] text-zinc-400">Rol: {b.roleName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="p-4 bg-[#080A09]/60 border-t border-white/[0.06] mt-auto flex justify-end">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-xs font-medium rounded-full border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">{tText("common.close", "Kapat")}</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* —— Create Modal —— */}
      {modalMode === "create" && (
        <ModalWrapper title="Yeni Kullanıcı Oluştur" onClose={() => setModalMode(null)}>
          <div className="space-y-4 p-6 overflow-y-auto max-h-[65vh] bg-[#111513]">
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
            <div className="p-4 bg-[#080A09]/60 rounded-[20px] space-y-4 border border-white/[0.06]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <ShieldCheck size={16} className="text-emerald-400"/>
                <p className="text-xs font-medium text-white">Başlangıç Yetkisi <span className="text-zinc-500 font-normal">(Opsiyonel)</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Şube">
                  <select className={inp} value={form.branchId} onChange={e=>setForm(f=>({...f,branchId:e.target.value}))}>
                    <option value="" className="bg-[#111513]">Şube Seçin</option>
                    {userBranches.map(b=><option key={b.id} value={b.id} className="bg-[#111513]">{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Rol Kalıbı">
                  <select className={inp} value={selectedTemplate} onChange={e=>handleTemplateChange(e.target.value)}>
                    <option value="" className="bg-[#111513]">Seçin</option>
                    {dbRoles.map(r=><option key={r.id} value={r.name} className="bg-[#111513]">{r.name}</option>)}
                    <option value="custom" className="bg-[#111513]">Özel (Granüler İzinler)</option>
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
          <div className="space-y-4 p-6 bg-[#111513]">
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
          <div className="p-6 space-y-4 bg-[#111513]">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[20px] flex gap-3 text-amber-300">
              <Key size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <p className="text-xs leading-relaxed">Kullanıcı için yeni şifre belirleyin (en az 6 karakter). Şifre sıfırlandıktan sonra kullanıcının mevcut oturumları kapatılacaktır.</p>
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
          <div className="space-y-6 p-6 overflow-y-auto max-h-[70vh] bg-[#111513]">
            
            {selectedUser.branches.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Mevcut Roller</label>
                <div className="grid gap-2">
                  {selectedUser.branches.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#080A09]/60 border border-white/[0.06] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Building2 size={15} className="text-zinc-500"/>
                        <span className="text-xs font-medium text-white">{b.branchName}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">{b.roleName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border border-white/[0.06] rounded-[20px] bg-[#080A09]/60 space-y-4">
              <h3 className="text-xs font-medium text-white border-b border-white/[0.06] pb-2">Yeni Rol Ata</h3>
              <Field label="Şube">
                <select className={inp} value={form.branchId} onChange={e=>setForm(f=>({...f,branchId:e.target.value}))}>
                  <option value="" className="bg-[#111513]">Şube Seçin</option>
                  {userBranches.map(b=><option key={b.id} value={b.id} className="bg-[#111513]">{b.name}</option>)}
                </select>
              </Field>
              <Field label="Rol Kalıbı">
                <select className={inp} value={selectedTemplate} onChange={e=>handleTemplateChange(e.target.value)}>
                  <option value="" className="bg-[#111513]">Seçin</option>
                  {dbRoles.map(r=><option key={r.id} value={r.name} className="bg-[#111513]">{r.name}</option>)}
                  <option value="custom" className="bg-[#111513]">Özel (Granüler İzinler)</option>
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
const inp = "w-full px-3.5 py-2 text-xs border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all"

// —— Küçük yardımcı bileşenler
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: ()=>void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111513] border border-white/[0.08] text-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#080A09]/60 shrink-0">
          <h2 className="text-base font-medium text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel, disabled }: { onCancel:()=>void; onSave:()=>void; saving:boolean; saveLabel:string; disabled?:boolean }) {
  const { tText } = useLanguage()
  return (
    <div className="px-6 py-4 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5 shrink-0">
      <button onClick={onCancel} className="px-4 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer">{tText("common.cancel", "İptal")}</button>
      <button onClick={onSave} disabled={saving||disabled} className="px-4 py-2 text-xs font-medium text-[#061811] bg-[#34D399] hover:bg-emerald-400 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 cursor-pointer">
        {saving ? "İşleniyor..." : saveLabel}
      </button>
    </div>
  )
}

function CustomPermsGrid({ perms, onToggle }: { perms: Record<string,string[]>; onToggle:(r:string,a:string)=>void }) {
  return (
    <div className="mt-4 border border-white/[0.06] rounded-[20px] overflow-hidden bg-[#080A09]/80">
      <div className="bg-white/[0.02] px-4 py-2.5 grid grid-cols-5 gap-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Modül</span>
        {ACTIONS.map(a=><span key={a} className="text-[11px] font-medium text-center text-zinc-400 uppercase tracking-wider">{a}</span>)}
      </div>
      <div className="divide-y divide-white/[0.06] max-h-[300px] overflow-y-auto custom-scrollbar">
        {ALL_RESOURCES.map(r => (
          <div key={r.key} className="px-4 py-2.5 grid grid-cols-5 gap-2 items-center hover:bg-white/[0.02] transition-colors">
            <span className="text-xs font-medium text-white truncate">{r.label}</span>
            {ACTIONS.map(a => {
              const has = (perms[r.key]||[]).includes(a)
              return (
                <div key={a} className="flex justify-center">
                  <button
                    key={a}
                    type="button"
                    onClick={()=>onToggle(r.key,a)}
                    className={`w-9 h-5 rounded-full transition-all duration-300 p-0.5 flex items-center cursor-pointer ${
                      has
                        ? "bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)] justify-end"
                        : "bg-zinc-800 justify-start"
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
    </div>
  )
}

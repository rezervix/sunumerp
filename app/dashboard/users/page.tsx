"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { Users, Plus, Search, Shield, Eye, Key, Edit2, ToggleLeft, ToggleRight, X, Check, Building2, User, Phone, Mail, Briefcase, Calendar, ShieldCheck, Trash2 } from "lucide-react"
import { safeText } from "@/lib/utils/safe-display"

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
  { key: "icerik_magazasi_yukle",   label: "İçerik Mağazası: Yükle" },
  { key: "icerik_magazasi_sil",     label: "İçerik Mağazası: Sil" },
  { key: "icerik_magazasi_onayla",  label: "İçerik Mağazası: Onayla/Red" },
  { key: "icerik_magazasi_toplu",   label: "İçerik Mağazası: Toplu İşlem" },
  { key: "icerik_magazasi_analitik",label: "İçerik Mağazası: Analitik" },
]

const ACTIONS = ["read", "create", "update", "delete"]

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
  const { tText } = useLanguage()
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
      setForm(f => ({ ...f, roleName: tplName }))
    }
  }

  const togglePerm = (resKey: string, act: string) => {
    setForm(f => {
      const cur = f.customPerms[resKey] || []
      const next = cur.includes(act) ? cur.filter(a => a !== act) : [...cur, act]
      return { ...f, customPerms: { ...f.customPerms, [resKey]: next } }
    })
  }

  const handleCreate = async () => {
    if (!form.username || !form.fullName || !form.password) { toast.error("Zorunlu alanları doldurun"); return }
    setSaving(true)
    try {
      let roleNameToAssign = form.roleName
      if (form.roleName === "custom") {
        const createRes = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `Özel-${form.username}-${Date.now().toString().slice(-4)}`, description: "Özel modüler yetki", permissions: form.customPerms }),
        })
        if (createRes.ok) { const d = await createRes.json(); roleNameToAssign = d.name }
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roleName: roleNameToAssign }),
      })
      if (res.ok) { toast.success("Kullanıcı oluşturuldu"); loadData(); setModalMode(null) }
      else { const d = await res.json(); toast.error(d.error || "Hata oluştu") }
    } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, phone: form.phone, department: form.department, position: form.position }),
      })
      if (res.ok) { toast.success("Kullanıcı güncellendi"); loadData(); setModalMode(null) }
      else toast.error("Hata oluştu")
    } finally { setSaving(false) }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) { toast.error("Şifre en az 6 karakter olmalı"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })
      if (res.ok) { toast.success("Şifre güncellendi"); setModalMode(null) }
      else toast.error("Hata oluştu")
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/users/${u.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      if (res.ok) { toast.success(u.isActive ? "Kullanıcı pasif yapıldı" : "Kullanıcı aktif yapıldı"); loadData() }
      else toast.error("Hata oluştu")
    } catch { toast.error("Bağlantı hatası") }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[--line]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight flex items-center gap-2">
            <Users size={24} className="text-[--brand]" /> Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-[--text-muted] mt-1">{users.length} kullanıcı • {users.filter(u=>u.isActive).length} aktif hesap</p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-sm:w-full">
          <div className="relative max-sm:w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder={tText("common.search", "Kullanıcı ara...")}
              className="pl-9 pr-4 py-2 text-xs border border-[--line] rounded-full bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] w-56 max-sm:w-full transition-all shadow-xs"
            />
          </div>
          <button
            onClick={() => router.push("/dashboard/users/roles")}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] text-xs font-medium rounded-full transition-colors cursor-pointer max-sm:flex-1 shadow-xs"
          >
            <Shield size={14} className="text-[--brand]" /> <span>Rol Yönetimi</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white text-xs font-medium rounded-full transition-all shadow-sm cursor-pointer max-sm:flex-1"
          >
            <Plus size={15} /> <span>Yeni Kullanıcı</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[--muted-bg] border-b border-[--line]">
              <tr>
                {["Kullanıcı","Kullanıcı Adı","Departman / Pozisyon","Şube & Rol","Durum","İşlemler"].map(h=>(
                  <th key={h} className="px-5 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[--text-muted]">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[--text] text-sm">Kullanıcı bulunamadı</p>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-[--brand-soft]/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-[--brand-soft] text-[--brand] flex items-center justify-center text-xs font-semibold shrink-0 border border-[--brand-line]">
                        {u.fullName.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[--navy] text-sm">{safeText(u.fullName, "Kullanıcı")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[--text-muted] font-mono text-xs">@{u.username}</td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-medium text-[--text]">{u.department||"—"}</div>
                    <div className="text-[11px] text-[--text-muted]">{u.position||""}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.branches.length === 0 ? <span className="text-xs text-[--text-muted] italic">Atanmamış</span>
                        : u.branches.map((b,i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-[--brand-line] bg-[--brand-soft] text-[--brand]">
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
                          ? "bg-[--ok-soft] text-[--ok] border border-[--ok-soft]"
                          : "bg-[--muted-bg] text-[--text-muted] border border-[--line]"
                      }`}
                    >
                      {u.isActive ? <><ToggleRight size={13}/>Aktif</> : <><ToggleLeft size={13}/>Pasif</>}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                      <button onClick={() => openView(u)} title="Görüntüle" className="p-1.5 rounded-full text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] transition-colors cursor-pointer"><Eye size={15}/></button>
                      <button onClick={() => openEdit(u)} title="Düzenle" className="p-1.5 rounded-full text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] transition-colors cursor-pointer"><Edit2 size={15}/></button>
                      <button onClick={() => openAssignRole(u)} title="Rol ata" className="p-1.5 rounded-full text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] transition-colors cursor-pointer"><ShieldCheck size={15}/></button>
                      <button onClick={() => openResetPw(u)} title="Şifre sıfırla" className="p-1.5 rounded-full text-[--text-muted] hover:text-[--warn] hover:bg-[--warn-soft] transition-colors cursor-pointer"><Key size={15}/></button>
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
          <div className="flex flex-col h-full bg-white">
            <div className="p-6 bg-[--page] border-b border-[--line] flex items-center gap-5">
              <div className="size-14 rounded-full bg-[--brand-soft] text-[--brand] flex items-center justify-center text-lg font-semibold border border-[--brand-line] shrink-0 shadow-xs">
                {selectedUser.fullName.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[--navy]">{selectedUser.fullName}</h2>
                <p className="text-[--text-muted] font-mono text-xs mt-0.5">@{selectedUser.username}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${selectedUser.isActive ? "bg-[--ok-soft] text-[--ok] border border-[--ok-soft]" : "bg-[--muted-bg] text-[--text-muted]"}`}>
                    {selectedUser.isActive ? "Aktif Hesap" : "Pasif Hesap"}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 pt-3 border-b border-[--line] flex gap-6 bg-white">
              <button onClick={() => setViewTab("info")} className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${viewTab==="info"?"border-[--brand] text-[--brand]":"border-transparent text-[--text-muted] hover:text-[--text]"}`}>Profil Bilgileri</button>
              <button onClick={() => setViewTab("roles")} className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${viewTab==="roles"?"border-[--brand] text-[--brand]":"border-transparent text-[--text-muted] hover:text-[--text]"}`}>Şube ve Yetkiler</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {viewTab === "info" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[--page] border border-[--line] rounded-[20px]">
                    <span className="text-[11px] text-[--text-muted] font-medium uppercase tracking-wider block mb-1">E-Posta</span>
                    <span className="text-sm text-[--text] font-medium flex items-center gap-2"><Mail size={14} className="text-[--brand]"/>{selectedUser.email || "Belirtilmemiş"}</span>
                  </div>
                  <div className="p-4 bg-[--page] border border-[--line] rounded-[20px]">
                    <span className="text-[11px] text-[--text-muted] font-medium uppercase tracking-wider block mb-1">Telefon</span>
                    <span className="text-sm text-[--text] font-medium flex items-center gap-2"><Phone size={14} className="text-[--brand]"/>{selectedUser.phone || "Belirtilmemiş"}</span>
                  </div>
                  <div className="p-4 bg-[--page] border border-[--line] rounded-[20px]">
                    <span className="text-[11px] text-[--text-muted] font-medium uppercase tracking-wider block mb-1">Departman</span>
                    <span className="text-sm text-[--text] font-medium flex items-center gap-2"><Briefcase size={14} className="text-[--brand]"/>{selectedUser.department || "Belirtilmemiş"}</span>
                  </div>
                  <div className="p-4 bg-[--page] border border-[--line] rounded-[20px]">
                    <span className="text-[11px] text-[--text-muted] font-medium uppercase tracking-wider block mb-1">Pozisyon</span>
                    <span className="text-sm text-[--text] font-medium flex items-center gap-2"><User size={14} className="text-[--brand]"/>{selectedUser.position || "Belirtilmemiş"}</span>
                  </div>
                </div>
              )}

              {viewTab === "roles" && (
                <div className="space-y-3">
                  {selectedUser.branches.length === 0 ? <p className="text-xs text-[--text-muted] italic">Kullanıcıya atanmış şube yetkisi bulunmuyor.</p>
                    : selectedUser.branches.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[--page] border border-[--line] rounded-[20px]">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-[--brand-soft] border border-[--brand-line] text-[--brand]">
                            <Building2 size={16}/>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[--navy]">{b.branchName}</h4>
                            <p className="text-[11px] text-[--text-muted] mt-0.5">Rol: <span className="font-semibold text-[--brand]">{b.roleName}</span></p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[--page] border-t border-[--line] mt-auto flex justify-end">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-xs font-medium text-[--text-2] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors shadow-xs">Kapat</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* —— Create Modal —— */}
      {modalMode === "create" && (
        <ModalWrapper title="Yeni Kullanıcı Oluştur" onClose={() => setModalMode(null)}>
          <div className="space-y-4 p-6 overflow-y-auto max-h-[65vh] bg-white">
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
            <div className="p-4 bg-[--page] rounded-[20px] space-y-4 border border-[--line]">
              <div className="flex items-center gap-2 border-b border-[--line] pb-2">
                <ShieldCheck size={16} className="text-[--brand]"/>
                <p className="text-xs font-semibold text-[--navy]">Başlangıç Yetkisi <span className="text-[--text-muted] font-normal">(Opsiyonel)</span></p>
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
          <div className="space-y-4 p-6 bg-white">
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
          <div className="p-6 space-y-4 bg-white">
            <div className="p-4 bg-[--warn-soft] border border-[--warn-soft] rounded-[20px] flex gap-3 text-[--warn]">
              <Key size={18} className="shrink-0 mt-0.5 text-[--warn]" />
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
          <div className="space-y-6 p-6 overflow-y-auto max-h-[70vh] bg-white">
            
            {selectedUser.branches.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-[--text-muted] uppercase tracking-wider">Mevcut Roller</label>
                <div className="grid gap-2">
                  {selectedUser.branches.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[--page] border border-[--line] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Building2 size={15} className="text-[--brand]"/>
                        <span className="text-xs font-semibold text-[--navy]">{b.branchName}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full">{b.roleName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border border-[--line] rounded-[20px] bg-[--page] space-y-4">
              <h3 className="text-xs font-semibold text-[--navy] border-b border-[--line] pb-2">Yeni Rol Ata</h3>
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

const inp = "w-full px-3.5 py-2 text-xs border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all shadow-xs"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[11px] font-medium text-[--text-2] uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: ()=>void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
      <div className="bg-white border border-[--line] text-[--text] rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--line] bg-[--page] shrink-0">
          <h2 className="text-base font-semibold text-[--navy]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[--muted-bg] text-[--text-muted] hover:text-[--text] transition-colors cursor-pointer"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel, disabled }: { onCancel:()=>void; onSave:()=>void; saving:boolean; saveLabel:string; disabled?:boolean }) {
  const { tText } = useLanguage()
  return (
    <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5 shrink-0">
      <button onClick={onCancel} className="px-4 py-2 text-xs font-medium text-[--text-2] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer shadow-xs">{tText("common.cancel", "İptal")}</button>
      <button onClick={onSave} disabled={saving||disabled} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer">
        {saving ? "İşleniyor..." : saveLabel}
      </button>
    </div>
  )
}

function CustomPermsGrid({ perms, onToggle }: { perms: Record<string,string[]>; onToggle:(r:string,a:string)=>void }) {
  return (
    <div className="mt-4 border border-[--line] rounded-[20px] overflow-hidden bg-white shadow-xs">
      <div className="bg-[--muted-bg] px-4 py-2.5 grid grid-cols-5 gap-2 border-b border-[--line]">
        <span className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider">Modül</span>
        {ACTIONS.map(a=><span key={a} className="text-[11px] font-semibold text-center text-[--text-muted] uppercase tracking-wider">{a}</span>)}
      </div>
      <div className="divide-y divide-[--line] max-h-[300px] overflow-y-auto">
        {ALL_RESOURCES.map(r => (
          <div key={r.key} className="px-4 py-2.5 grid grid-cols-5 gap-2 items-center hover:bg-[--brand-soft]/30 transition-colors">
            <span className="text-xs font-medium text-[--text] truncate">{r.label}</span>
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
                        ? "bg-[--brand] justify-end"
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
    </div>
  )
}

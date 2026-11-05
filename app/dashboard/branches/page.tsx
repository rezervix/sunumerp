"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { getAllBranches, createBranch, updateBranch, deleteBranch } from "@/lib/api/branches"
import type { Branch } from "@/lib/auth/types"
import type { CreateBranchInput } from "@/lib/api/branches"
import { FilePicker } from "@/components/shared/file-picker"

export default function BranchesPage() {
  const { t, tText } = useLanguage()
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, isSuperAdmin, router])

  const [branches, setBranches] = useState<Branch[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<CreateBranchInput & { isActive?: boolean }>({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    themeColor: "#34D399",
    logoUrl: "",
    isActive: true,
  })

  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    const token = localStorage.getItem("authToken") || "mock-token"
    const data = await getAllBranches(token)
    setBranches(Array.isArray(data) ? data : [])
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.code) return

    setLoading(true)
    try {
      const token = localStorage.getItem("authToken") || "mock-token"
      await createBranch(formData, token)
      await loadBranches()
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error creating branch:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedBranch || !formData.name || !formData.code) return

    setLoading(true)
    try {
      const token = localStorage.getItem("authToken") || "mock-token"
      await updateBranch({ id: selectedBranch.id, ...formData }, token)
      await loadBranches()
      setIsEditDialogOpen(false)
      setSelectedBranch(null)
      resetForm()
    } catch (error) {
      console.error("Error updating branch:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şubeyi devre dışı bırakmak istediğinizden emin misiniz?")) return

    try {
      const token = localStorage.getItem("authToken") || "mock-token"
      await deleteBranch(id, token)
      await loadBranches()
    } catch (error) {
      console.error("Error deleting branch:", error)
    }
  }

  const openEditDialog = (branch: Branch) => {
    setSelectedBranch(branch)
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      themeColor: branch.themeColor || "#34D399",
      logoUrl: branch.logoUrl || "",
      isActive: branch.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      themeColor: "#34D399",
      logoUrl: "",
      isActive: true,
    })
  }

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Şube Yönetimi</h1>
          <p className="text-xs text-zinc-400 mt-1">Sistemdeki tüm şubeleri görüntüleyin ve yönetin</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Şube ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-[#111513] border border-white/[0.06] rounded-full text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all"
            />
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#34D399] hover:bg-emerald-400 text-[#061811] text-xs font-medium rounded-full transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Yeni Şube Ekle</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#111513]/90 rounded-[20px] border border-white/[0.06] shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">Şube Adı</th>
                <th className="px-6 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">Kod</th>
                <th className="px-6 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">İletişim</th>
                <th className="px-6 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">Adres</th>
                <th className="px-6 py-4 text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">Durum</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-zinc-600">store</span>
                      <p className="text-sm font-medium text-zinc-300">Şube bulunamadı</p>
                      {searchQuery && <p className="text-xs text-zinc-500 mt-1">Arama kriterlerinize uyan şube yok.</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center bg-white/[0.04] shrink-0 overflow-hidden border border-white/[0.08]">
                          {branch.logoUrl ? (
                            <img src={branch.logoUrl} alt={branch.name} className="size-full object-cover" />
                          ) : (
                            <div className="size-4 rounded-full" style={{ backgroundColor: branch.themeColor || '#34D399' }} />
                          )}
                        </div>
                        <div className="font-medium text-white text-sm">{branch.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400 text-xs font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-emerald-400">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {branch.phone && (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <span className="material-symbols-outlined text-[15px] text-zinc-500">phone</span>
                            {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <span className="material-symbols-outlined text-[15px] text-zinc-500">mail</span>
                            {branch.email}
                          </div>
                        )}
                        {!branch.phone && !branch.email && (
                          <span className="text-zinc-500 text-xs italic">Belirtilmedi</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {branch.address ? (
                        <div className="flex items-start gap-1.5 text-xs text-zinc-300 max-w-xs">
                          <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0 text-zinc-500">location_on</span>
                          <span className="line-clamp-2" title={branch.address}>{branch.address}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">Adres girilmedi</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${branch.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'}`}>
                        {branch.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDialog(branch)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.06] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                          title="Devre Dışı Bırak / Sil"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111513] rounded-[24px] shadow-2xl w-full max-w-lg border border-white/[0.08] text-white overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-medium text-white">Yeni Şube Oluştur</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Yeni bir şube eklemek için bilgileri girin</p>
              </div>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-medium text-zinc-300">Şube Adı *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ankara Merkez"
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="code" className="block text-xs font-medium text-zinc-300">Şube Kodu *</label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ANK-001"
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-medium text-zinc-300">Telefon</label>
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+90 312 111 2233"
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-zinc-300">E-posta</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ankara@sunumerp.com"
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-xs font-medium text-zinc-300">Adres</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Tam adres"
                  rows={2}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-all text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="themeColor" className="block text-xs font-medium text-zinc-300">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-10 h-9 p-0.5 border border-white/[0.08] rounded-lg cursor-pointer bg-[#111513]"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    placeholder="#34D399"
                    className="block w-full flex-1 px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <FilePicker
                  label="Şube Logosu"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData({ ...formData, logoUrl: urls[0] || "" })}
                  accept="image/*"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] inline-block">
                    <img src={formData.logoUrl} alt="Logo Önizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-xs font-medium text-[#061811] bg-[#34D399] hover:bg-emerald-400 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111513] rounded-[24px] shadow-2xl w-full max-w-lg border border-white/[0.08] text-white overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-medium text-white">Şubeyi Düzenle</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Şube bilgilerini güncelleyin</p>
              </div>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="block text-xs font-medium text-zinc-300">Şube Adı *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-code" className="block text-xs font-medium text-zinc-300">Şube Kodu *</label>
                <input
                  id="edit-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-phone" className="block text-xs font-medium text-zinc-300">Telefon</label>
                <input
                  id="edit-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-email" className="block text-xs font-medium text-zinc-300">E-posta</label>
                <input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-address" className="block text-xs font-medium text-zinc-300">Adres</label>
                <textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="block w-full px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-themeColor" className="block text-xs font-medium text-zinc-300">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-10 h-9 p-0.5 border border-white/[0.08] rounded-lg cursor-pointer bg-[#111513]"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="block w-full flex-1 px-3.5 py-2 border border-white/[0.08] rounded-xl bg-white/[0.03] text-white focus:outline-none focus:border-emerald-500/30 transition-all text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <FilePicker
                  label="Şube Logosu"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData({ ...formData, logoUrl: urls[0] || "" })}
                  accept="image/*"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] inline-block">
                    <img src={formData.logoUrl} alt="Logo Önizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">
                    Şube Aktif Durumu
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !(formData.isActive ?? true) })}
                    className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 flex items-center cursor-pointer ${
                      formData.isActive
                        ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)] justify-end"
                        : "bg-zinc-800 justify-start"
                    }`}
                  >
                    <span className="size-5 rounded-full bg-white shadow-md transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 border border-white/[0.08] rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleEdit}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-xs font-medium text-[#061811] bg-[#34D399] hover:bg-emerald-400 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

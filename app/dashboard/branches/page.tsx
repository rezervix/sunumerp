"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { getAllBranches, createBranch, updateBranch, deleteBranch } from "@/lib/api/branches"
import type { Branch } from "@/lib/auth/types"
import type { CreateBranchInput } from "@/lib/api/branches"
import { FilePicker } from "@/components/shared/file-picker"
import { safeText } from "@/lib/utils/safe-display"

export default function BranchesPage() {
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
    themeColor: "#1267E6",
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
      themeColor: branch.themeColor || "#1267E6",
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
      themeColor: "#1267E6",
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[--line]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight">Şube Yönetimi</h1>
          <p className="text-sm text-[--text-muted] mt-1">Sistemdeki tüm şubeleri görüntüleyin ve yönetin</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Şube ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-[--line] rounded-full text-xs text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all shadow-xs"
            />
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white text-xs font-medium rounded-full transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Yeni Şube Ekle</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[20px] border border-[--line] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[--muted-bg] border-b border-[--line]">
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">Şube Adı</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">Kod</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">İletişim</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">Adres</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">Durum</th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold text-[--text-muted] uppercase tracking-[0.12em]">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line] text-sm">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[--text-muted]">
                      <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl">store</span>
                      <p className="text-sm font-medium text-[--text]">Şube bulunamadı</p>
                      {searchQuery && <p className="text-xs text-[--text-muted] mt-1">Arama kriterlerinize uyan şube yok.</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-[--brand-soft]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center bg-[--muted-bg] shrink-0 overflow-hidden border border-[--line]">
                          {branch.logoUrl ? (
                            <img src={branch.logoUrl} alt={branch.name} className="size-full object-cover" />
                          ) : (
                            <div className="size-4 rounded-full" style={{ backgroundColor: branch.themeColor || '#1267E6' }} />
                          )}
                        </div>
                        <div className="font-semibold text-[--navy] text-sm">{safeText(branch.name, "İsimsiz Şube")}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[--text-muted] text-xs font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 bg-[--brand-soft] border border-[--brand-line] rounded-md text-[--brand] font-semibold">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {branch.phone && (
                          <div className="flex items-center gap-1.5 text-[--text-2]">
                            <span className="material-symbols-outlined text-[15px] text-[--text-muted]">phone</span>
                            {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1.5 text-[--text-2]">
                            <span className="material-symbols-outlined text-[15px] text-[--text-muted]">mail</span>
                            {branch.email}
                          </div>
                        )}
                        {!branch.phone && !branch.email && (
                          <span className="text-[--text-muted] text-xs italic">Belirtilmedi</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {branch.address ? (
                        <div className="flex items-start gap-1.5 text-xs text-[--text-2] max-w-xs">
                          <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0 text-[--text-muted]">location_on</span>
                          <span className="line-clamp-2" title={branch.address}>{branch.address}</span>
                        </div>
                      ) : (
                        <span className="text-[--text-muted] text-xs italic">Adres girilmedi</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${branch.isActive ? 'bg-[--ok-soft] text-[--ok] border border-[--ok-soft]' : 'bg-[--muted-bg] text-[--text-muted] border border-[--line]'}`}>
                        {branch.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDialog(branch)}
                          className="p-1.5 text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] rounded-full transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="p-1.5 text-[--text-muted] hover:text-[--bad] hover:bg-[--bad-soft] rounded-full transition-colors flex items-center justify-center cursor-pointer shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-[--line] text-[--text] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page]">
              <div>
                <h2 className="text-base font-semibold text-[--navy]">Yeni Şube Oluştur</h2>
                <p className="text-xs text-[--text-muted] mt-0.5">Yeni bir şube eklemek için bilgileri girin</p>
              </div>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-1.5 text-[--text-muted] hover:text-[--text] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-medium text-[--text-2]">Şube Adı *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ankara Merkez"
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="code" className="block text-xs font-medium text-[--text-2]">Şube Kodu *</label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ANK-001"
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-medium text-[--text-2]">Telefon</label>
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+90 312 111 2233"
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-[--text-2]">E-posta</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ankara@sunumerp.com"
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-xs font-medium text-[--text-2]">Adres</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Tam adres"
                  rows={2}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] placeholder:text-[--text-muted] focus:outline-none focus:border-[--brand] transition-all text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="themeColor" className="block text-xs font-medium text-[--text-2]">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-10 h-9 p-0.5 border border-[--line] rounded-lg cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    placeholder="#1267E6"
                    className="block w-full flex-1 px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs font-mono"
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
                  <div className="mt-2 p-2 bg-[--page] rounded-xl border border-[--line] inline-block shadow-xs">
                    <img src={formData.logoUrl} alt="Logo Önizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[--line] bg-[--page] flex justify-end gap-2.5">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[--text-2] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer shadow-xs"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-xs font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 rounded-full transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-[--line] text-[--text] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page]">
              <div>
                <h2 className="text-base font-semibold text-[--navy]">Şubeyi Düzenle</h2>
                <p className="text-xs text-[--text-muted] mt-0.5">Şube bilgilerini güncelleyin</p>
              </div>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="p-1.5 text-[--text-muted] hover:text-[--text] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="block text-xs font-medium text-[--text-2]">Şube Adı *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-code" className="block text-xs font-medium text-[--text-2]">Şube Kodu *</label>
                <input
                  id="edit-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-phone" className="block text-xs font-medium text-[--text-2]">Telefon</label>
                <input
                  id="edit-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-email" className="block text-xs font-medium text-[--text-2]">E-posta</label>
                <input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-address" className="block text-xs font-medium text-[--text-2]">Adres</label>
                <textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="block w-full px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-themeColor" className="block text-xs font-medium text-[--text-2]">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-10 h-9 p-0.5 border border-[--line] rounded-lg cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="block w-full flex-1 px-3.5 py-2 border border-[--line] rounded-xl bg-white text-[--text] focus:outline-none focus:border-[--brand] transition-all text-xs font-mono"
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
                  <div className="mt-2 p-2 bg-[--page] rounded-xl border border-[--line] inline-block shadow-xs">
                    <img src={formData.logoUrl} alt="Logo Önizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-[--line] text-[--brand] focus:ring-[--brand] size-4 accent-[--brand]"
                  />
                  <span className="text-xs font-medium text-[--text-2]">Şube Aktif</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-[--line] bg-[--page] flex justify-end gap-2.5">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[--text-2] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer shadow-xs"
              >
                İptal
              </button>
              <button
                onClick={handleEdit}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-xs font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 rounded-full transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
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

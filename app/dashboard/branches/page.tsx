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
    themeColor: "#3B82F6",
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
    if (!confirm("Bu subeyi devre disi birakmak istediginizden emin misiniz?")) return

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
      themeColor: branch.themeColor,
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
      themeColor: "#3B82F6",
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sube Yonetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Sistemdeki tum subeleri goruntuleyin ve yonetin</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Sube ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-soft"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni Sube Ekle
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sube Adi</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kod</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Iletisim</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Adres</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <span className="material-symbols-outlined text-4xl mb-2 sm:text-5xl text-gray-300">store</span>
                      <p className="text-sm font-medium">Sube bulunamadi</p>
                      {searchQuery && <p className="text-xs text-gray-400 mt-1">Arama kriterlerinize uyan sube yok.</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 shrink-0 overflow-hidden border border-gray-100 dark:border-gray-800">
                          {branch.logoUrl ? (
                            <img src={branch.logoUrl} alt={branch.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: branch.themeColor || '#3B82F6' }} />
                          )}
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">{branch.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400 font-medium">
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 text-sm">
                        {branch.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[16px]">phone</span>
                            {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[16px]">mail</span>
                            {branch.email}
                          </div>
                        )}
                        {!branch.phone && !branch.email && (
                          <span className="text-gray-400 text-xs italic">Belirtilmedi</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {branch.address ? (
                        <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">location_on</span>
                          <span className="line-clamp-2" title={branch.address}>{branch.address}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Adres girilmedi</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${branch.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {branch.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditDialog(branch)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center tooltip-trigger"
                          title="Duzenle"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center tooltip-trigger"
                          title="Devre Disi Birak/Sil"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Sube Olustur</h2>
                <p className="text-sm text-gray-500 mt-1">Yeni bir sube eklemek icin bilgileri girin</p>
              </div>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sube Adi *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ankara Merkez"
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sube Kodu *</label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ANK-001"
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+90 312 111 2233"
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ankara@sunumerp.com"
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adres</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Tam adres"
                  rows={2}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-12 h-10 p-1 border border-gray-200 rounded-lg cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    placeholder="#3B82F6"
                    className="block w-full flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <FilePicker
                  label="Sube Logosu"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData({ ...formData, logoUrl: urls[0] || "" })}
                  accept="image/*"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 inline-block">
                    <img src={formData.logoUrl} alt="Logo Onizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-gray-800 transition-colors shadow-soft disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sube Duzenle</h2>
                <p className="text-sm text-gray-500 mt-1">Sube bilgilerini guncelleyin</p>
              </div>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sube Adi *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sube Kodu *</label>
                <input
                  id="edit-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                <input
                  id="edit-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
                <input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adres</label>
                <textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-themeColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-themeColor"
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="w-12 h-10 p-1 border border-gray-200 rounded-lg cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                    className="block w-full flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <FilePicker
                  label="Sube Logosu"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData({ ...formData, logoUrl: urls[0] || "" })}
                  accept="image/*"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 inline-block">
                    <img src={formData.logoUrl} alt="Logo Onizleme" className="h-12 w-auto object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sube Aktif Durumu
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/10 flex justify-end gap-3">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleEdit}
                disabled={loading || !formData.name || !formData.code}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-gray-800 transition-colors shadow-soft disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  Search,
  RefreshCw,
  Trash2,
  Eye,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  User,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { TrashPreviewModal, TrashItemData } from "./trash-preview-modal"

const ENTITY_LABEL_MAP: Record<string, { label: string; color: string }> = {
  Customer: { label: "Müşteri / CRM", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  Lead: { label: "Potansiyel Müşteri", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  Finance: { label: "Finans Kaydı", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Order: { label: "Sipariş", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  Product: { label: "Ürün", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Project: { label: "Proje", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  InternalTask: { label: "Görev", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  LibraryFile: { label: "Kütüphane Dosyası", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  LibraryFolder: { label: "Kütüphane Klasörü", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  ContentStore: { label: "İçerik Mağazası", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  ContentItem: { label: "İçerik İletisi", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  Candidate: { label: "İK Adayı", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  CargoTracking: { label: "Kargo Takip", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  Announcement: { label: "Duyuru", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  SupportTicket: { label: "Destek Talebi", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  Todo: { label: "Yapılacak", color: "bg-lime-500/10 text-lime-400 border-lime-500/20" },
  Note: { label: "Not", color: "bg-stone-500/10 text-stone-400 border-stone-500/20" },
}

export function TrashTable() {
  const [items, setItems] = useState<TrashItemData[]>([])
  const [total, setTotal] = useState(0)
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewItem, setPreviewItem] = useState<TrashItemData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const fetchTrashItems = useCallback(async () => {
    setLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const params = new URLSearchParams({
        skip: skip.toString(),
        take: pageSize.toString(),
      })
      if (selectedCategory !== "ALL") params.append("entityType", selectedCategory)
      if (search.trim()) params.append("search", search.trim())

      const res = await fetch(`/api/trash?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
        setTotal(json.total || 0)
        setEntityCounts(json.entityCounts || {})
      }
    } catch (err) {
      console.error("Error fetching trash data:", err)
    } finally {
      setLoading(false)
    }
  }, [page, selectedCategory, search])

  useEffect(() => {
    fetchTrashItems()
  }, [fetchTrashItems])

  const showNotify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Geri yükleme işlemi
  const handleRestore = async (id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/trash/${id}/restore`, { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        showNotify("Öge başarıyla orijinal yerine geri yüklendi.")
        setModalOpen(false)
        setSelectedIds((prev) => prev.filter((item) => item !== id))
        fetchTrashItems()
      } else {
        showNotify(json.error || "Geri yükleme başarısız.", "error")
      }
    } catch (err) {
      showNotify("Geri yüklenirken sunucu hatası oluştu.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Kalıcı silme işlemi
  const handlePurge = async (id: string) => {
    if (!confirm("Bu ögeyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`/api/trash/${id}/purge`, { method: "DELETE" })
      if (res.ok) {
        showNotify("Öge veritabanından ve karantinadan kalıcı olarak silindi.")
        setModalOpen(false)
        setSelectedIds((prev) => prev.filter((item) => item !== id))
        fetchTrashItems()
      } else {
        const json = await res.json()
        showNotify(json.error || "Kalıcı silme başarısız.", "error")
      }
    } catch (err) {
      showNotify("Silinirken sunucu hatası oluştu.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Toplu Geri Yükle / Kalıcı Sil
  const handleBulkAction = async (action: "restore_bulk" | "purge_bulk") => {
    if (selectedIds.length === 0) return
    const actionText = action === "restore_bulk" ? "geri yüklemek" : "kalıcı olarak silmek"
    if (!confirm(`Seçilen ${selectedIds.length} ögeyi ${actionText} istediğinizden emin misiniz?`)) {
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      })
      const json = await res.json()
      if (res.ok) {
        showNotify(`Toplu işlem tamamlandı (${json.count} öge).`)
        setSelectedIds([])
        fetchTrashItems()
      } else {
        showNotify(json.error || "Toplu işlem gerçekleştirilemedi.", "error")
      }
    } catch (err) {
      showNotify("Toplu işlem sırasında hata oluştu.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Çöp Kutusu'nu tamamen boşalt
  const handleEmptyTrash = async () => {
    if (!confirm("Geri Dönüşüm Kutusu'ndaki TÜM ögeleri kalıcı olarak silmek üzeresiniz! Devam edilsin mi?")) {
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch("/api/trash/empty", { method: "DELETE" })
      const json = await res.json()
      if (res.ok) {
        showNotify(`Geri Dönüşüm Kutusu boşaltıldı (${json.clearedCount} öge silindi).`)
        setSelectedIds([])
        fetchTrashItems()
      } else {
        showNotify(json.error || "Çöp kutusu boşaltılamadı.", "error")
      }
    } catch (err) {
      showNotify("İşlem sırasında sunucu hatası oluştu.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((i) => i.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between shadow-md transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotification(null)} className="h-7 px-2 text-zinc-400 hover:text-white">
            Tamam
          </Button>
        </div>
      )}

      {/* Üst Kısım: Kategori Sekmeleri (Tabs) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
        <button
          onClick={() => { setSelectedCategory("ALL"); setPage(1) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-emerald-500 text-black font-semibold shadow-[0_0_12px_rgba(52,211,153,0.3)]"
              : "bg-[#111513] border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Tüm Ögeler
          <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === "ALL" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-zinc-300"}`}>
            {entityCounts["ALL"] || 0}
          </span>
        </button>

        {Object.entries(ENTITY_LABEL_MAP).map(([key, config]) => {
          const count = entityCounts[key] || 0
          if (count === 0 && selectedCategory !== key) return null

          return (
            <button
              key={key}
              onClick={() => { setSelectedCategory(key); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === key
                  ? "bg-emerald-500 text-black font-semibold shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                  : "bg-[#111513] border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {config.label}
              {count > 0 && (
                <span className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === key ? "bg-black/20 text-black font-bold" : "bg-white/10 text-zinc-300"}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtre ve Aksiyon Barı */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111513]/90 p-4 rounded-[20px] border border-white/[0.06] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Başlık, silen kullanıcı veya tür ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-10 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("restore_bulk")}
                disabled={actionLoading}
                className="h-9 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Seçilenleri Geri Yükle ({selectedIds.length})
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("purge_bulk")}
                disabled={actionLoading}
                className="h-9 text-xs gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Seçilenleri Sil ({selectedIds.length})
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={fetchTrashItems}
            disabled={loading}
            className="h-9 text-xs gap-1.5 text-zinc-400 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEmptyTrash}
            disabled={actionLoading || total === 0}
            className="h-9 text-xs gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kutuyu Boşalt
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="border border-white/[0.06] rounded-[20px] bg-[#111513]/90 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-white/[0.02] border-b border-white/[0.06] text-xs">
            <TableRow className="border-b border-white/[0.06]">
              <TableHead className="w-10 text-center">
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onCheckedChange={toggleSelectAll}
                  className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                />
              </TableHead>
              <TableHead className="text-zinc-400">Öge Başlığı & ID</TableHead>
              <TableHead className="text-zinc-400">Modül Türü</TableHead>
              <TableHead className="text-zinc-400">Silen Kullanıcı</TableHead>
              <TableHead className="text-zinc-400">Silinme Tarihi</TableHead>
              <TableHead className="text-zinc-400">Kalan Gün</TableHead>
              <TableHead className="text-right text-zinc-400">Aksiyonlar</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow className="border-b border-white/[0.04]">
                <TableCell colSpan={7} className="h-40 text-center text-xs text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Çöp kutusu ögeleri yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="border-b border-white/[0.04]">
                <TableCell colSpan={7} className="h-44 text-center text-xs text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
                    <span className="font-semibold text-white">Geri Dönüşüm Kutusu Boş</span>
                    <span>Bu kategoride silinmiş herhangi bir veri bulunmamaktadır.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const config = ENTITY_LABEL_MAP[item.entityType] || {
                  label: item.entityType,
                  color: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
                }

                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                )

                return (
                  <TableRow key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-xs">
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelectOne(item.id)}
                        className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white truncate max-w-xs">{item.title}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{item.entityId}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${config.color}`}>
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium text-zinc-200">{item.deletedByFullName}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{new Date(item.deletedAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`font-semibold ${daysLeft <= 5 ? "text-red-400" : "text-amber-400"}`}>
                        {daysLeft} Gün
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setPreviewItem(item); setModalOpen(true) }}
                          className="h-8 w-8 text-zinc-400 hover:text-white cursor-pointer"
                          title="Detay İncele"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRestore(item.id)}
                          className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePurge(item.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                          title="Kalıcı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sayfalama (Pagination) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-3 pt-2">
          <span>Toplam {total} ögeden {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} arası gösteriliyor</span>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-2 border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 font-medium text-white">{page} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-2 border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      <TrashPreviewModal
        item={previewItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onRestore={handleRestore}
        onPurge={handlePurge}
        loading={actionLoading}
      />
    </div>
  )
}

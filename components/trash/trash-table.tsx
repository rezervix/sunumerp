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
  Customer: { label: "Müşteri / CRM", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  Lead: { label: "Potansiyel Müşteri", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  Finance: { label: "Finans Kaydı", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  Order: { label: "Sipariş", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  Product: { label: "Ürün", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  Project: { label: "Proje", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  InternalTask: { label: "Görev", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  LibraryFile: { label: "Kütüphane Dosyası", color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  LibraryFolder: { label: "Kütüphane Klasörü", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  ContentStore: { label: "İçerik Mağazası", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  ContentItem: { label: "İçerik İletisi", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  Candidate: { label: "İK Adayı", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  CargoTracking: { label: "Kargo Takip", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  Announcement: { label: "Duyuru", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  SupportTicket: { label: "Destek Talebi", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  Todo: { label: "Yapılacak", color: "bg-lime-500/10 text-lime-600 border-lime-500/20" },
  Note: { label: "Not", color: "bg-stone-500/10 text-stone-600 border-stone-500/20" },
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
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
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
          <Button variant="ghost" size="sm" onClick={() => setNotification(null)} className="h-7 px-2">
            Tamam
          </Button>
        </div>
      )}

      {/* Üst Kısım: Kategori Sekmeleri (Tabs) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
        <button
          onClick={() => { setSelectedCategory("ALL"); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            selectedCategory === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Tüm Ögeler
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
            {entityCounts["ALL"] || 0}
          </Badge>
        </button>

        {Object.entries(ENTITY_LABEL_MAP).map(([key, config]) => {
          const count = entityCounts[key] || 0
          if (count === 0 && selectedCategory !== key) return null

          return (
            <button
              key={key}
              onClick={() => { setSelectedCategory(key); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                selectedCategory === key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {config.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 h-4">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtre ve Aksiyon Barı */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Başlık, silen kullanıcı veya tür ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 text-xs rounded-xl bg-background"
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
                className="h-9 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 border-emerald-500/30 bg-emerald-500/5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Seçilenleri Geri Yükle ({selectedIds.length})
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("purge_bulk")}
                disabled={actionLoading}
                className="h-9 text-xs gap-1.5"
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
            className="h-9 text-xs gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEmptyTrash}
            disabled={actionLoading || total === 0}
            className="h-9 text-xs gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kutuyu Boşalt
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50 text-xs">
            <TableRow>
              <TableHead className="w-10 text-center">
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Öge Başlığı & ID</TableHead>
              <TableHead>Modül Türü</TableHead>
              <TableHead>Silen Kullanıcı</TableHead>
              <TableHead>Silinme Tarihi</TableHead>
              <TableHead>Kalan Gün</TableHead>
              <TableHead className="text-right">Aksiyonlar</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span>Çöp kutusu ögeleri yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                    <span className="font-semibold text-foreground">Geri Dönüşüm Kutusu Boş</span>
                    <span>Bu kategoride silinmiş herhangi bir veri bulunmamaktadır.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const config = ENTITY_LABEL_MAP[item.entityType] || {
                  label: item.entityType,
                  color: "bg-muted text-muted-foreground border-border",
                }

                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                )

                return (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelectOne(item.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground truncate max-w-xs">{item.title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{item.entityId}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${config.color}`}>
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{item.deletedByFullName}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{new Date(item.deletedAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`font-semibold ${daysLeft <= 5 ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
                        {daysLeft} Gün
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setPreviewItem(item); setModalOpen(true) }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Detay İncele"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRestore(item.id)}
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePurge(item.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
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
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-2">
          <span>Toplam {total} ögeden {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} arası gösteriliyor</span>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 font-medium text-foreground">{page} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-2"
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

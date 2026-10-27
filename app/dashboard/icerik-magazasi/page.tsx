"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import {
  Sparkles, SlidersHorizontal, Plus, Search, X, AlertCircle,
  CheckSquare, Square, Trash2, CheckCircle, XCircle, Package, BarChart2,
  Clock, RefreshCw, ArrowLeft, Loader2, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentCard, type ContentItem } from "@/components/content-store/ContentCard"
import { FilterDrawer } from "@/components/content-store/FilterDrawer"
import { ContentUploadModal } from "@/components/content-store/ContentUploadModal"
import { AnalyticsView } from "@/components/content-store/AnalyticsView"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

interface Niche { id: string; name: string }

type ViewTab = "gallery" | "pending" | "mine" | "analytics"

export default function IcerikMagazasiPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, session } = useAuth()

  const canUpload        = isSuperAdmin || hasPermission("icerik_magazasi_yukle", "create")
  const canDelete        = isSuperAdmin || hasPermission("icerik_magazasi_sil", "delete")
  const canApprove       = isSuperAdmin || hasPermission("icerik_magazasi_onayla", "create")
  const canBulkActions   = isSuperAdmin || hasPermission("icerik_magazasi_toplu", "create")
  const canViewAnalytics = isSuperAdmin || hasPermission("icerik_magazasi_analitik", "read")

  const currentUserId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [contents, setContents] = useState<ContentItem[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  // Filtreler
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedNicheIds, setSelectedNicheIds] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [minSize, setMinSize] = useState("")
  const [maxSize, setMaxSize] = useState("")

  // UI
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewTab>("gallery")

  // Toplu İşlem
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState("")

  // Niş değiştirme modali (bulk)
  const [showBulkNicheModal, setShowBulkNicheModal] = useState(false)
  const [bulkTargetNicheId, setBulkTargetNicheId] = useState("")

  const clearFilters = () => {
    setSearch("")
    setSelectedNicheIds([])
    setSelectedTypes([])
    setStartDate("")
    setEndDate("")
    setMinSize("")
    setMaxSize("")
  }

  const activeFilterCount = selectedNicheIds.length + selectedTypes.length + (startDate || endDate ? 1 : 0) + (minSize || maxSize ? 1 : 0)

  const statusFilterForTab: Record<ViewTab, string | undefined> = {
    gallery: undefined,
    pending: "pending",
    mine: "mine",
    analytics: undefined,
  }

  const fetchContents = useCallback(async () => {
    if (activeTab === "analytics") return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (selectedNicheIds.length > 0) params.set("nicheIds", selectedNicheIds.join(","))
      if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","))
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (minSize) params.set("minBytes", String(parseFloat(minSize) * 1024 * 1024))
      if (maxSize) params.set("maxBytes", String(parseFloat(maxSize) * 1024 * 1024))
      
      const tabParam = activeTab === "pending" ? "pending" : activeTab === "mine" ? "mine" : "approved"
      params.set("tab", tabParam)

      const res = await fetch(`/api/content-store?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContents(data.contents || [])
      setNiches(data.niches || [])
      if (data.pendingCount !== undefined) setPendingCount(data.pendingCount)
    } catch (err: any) {
      toast.error("Yükleme hatası: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [search, selectedNicheIds, selectedTypes, startDate, endDate, minSize, maxSize, activeTab])

  useEffect(() => {
    const t = setTimeout(fetchContents, 300)
    return () => clearTimeout(t)
  }, [fetchContents])

  // Seçim işlemleri
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === contents.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(contents.map(c => c.id)))
  }
  const clearSelection = () => { setSelectedIds(new Set()); setBulkMode(false) }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/content-store?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("İçerik silindi")
      fetchContents()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAction = async (id: string, action: string, extra?: any) => {
    if (action === "refresh") { fetchContents(); return }
    try {
      const res = await fetch("/api/content-store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extra })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message || "İşlem tamamlandı")
      fetchContents()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const bulkAction = async (action: string, extra?: any) => {
    if (selectedIds.size === 0) { toast.error("Hiçbir içerik seçilmedi"); return }
    setBulkLoading(true)
    try {
      const res = await fetch("/api/content-store/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selectedIds), ...extra })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.processed || selectedIds.size} içerik işlendi`)
      clearSelection()
      fetchContents()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) { toast.error("Hiçbir içerik seçilmedi"); return }
    setBulkLoading(true)
    toast.info("ZIP hazırlanıyor...")
    try {
      const res = await fetch("/api/content-store/bulk/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `icerik_magazasi_${Date.now()}.zip`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("ZIP indirildi!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkNicheChange = async () => {
    if (!bulkTargetNicheId) { toast.error("Niş seçin"); return }
    await bulkAction("change-niche", { nicheId: bulkTargetNicheId })
    setShowBulkNicheModal(false)
    setBulkTargetNicheId("")
  }

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "gallery", label: "Galeri", icon: <Package size={14} />, show: true },
    { id: "pending", label: "Onay Kuyruğu", icon: <Clock size={14} />, show: canApprove },
    { id: "mine", label: "Yüklediklerim", icon: <Sparkles size={14} />, show: true },
    { id: "analytics", label: "Analitik", icon: <BarChart2 size={14} />, show: canViewAnalytics },
  ]

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center"><Sparkles size={20} className="text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold text-foreground">İçerik Mağazası</h1>
            <p className="text-xs text-muted-foreground">Dijital varlıklar, görseller ve videolar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Arama */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tText("common.search", "Ara...")} className="h-9 pl-9 pr-8 w-52 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
          </div>

          <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)} className="flex items-center gap-1.5 text-xs rounded-xl h-9">
            <SlidersHorizontal size={14} />
            Filtrele
            {activeFilterCount > 0 && <span className="ml-1 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
          </Button>

          {/* Toplu İşlem modu */}
          {canBulkActions && (
            <Button variant={bulkMode ? "default" : "outline"} size="sm" onClick={() => { setBulkMode(!bulkMode); clearSelection() }} className="flex items-center gap-1.5 text-xs rounded-xl h-9">
              {bulkMode ? <><CheckSquare size={14} /> Toplu: Kapalı</> : <><Square size={14} /> Toplu İşlem</>}
            </Button>
          )}

          {canUpload && (
            <Button onClick={() => setUploadOpen(true)} size="sm" className="flex items-center gap-1.5 text-xs rounded-xl h-9">
              <Plus size={14} /> İçerik Yükle
            </Button>
          )}
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto whitespace-nowrap hide-scrollbar">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); clearSelection() }}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors relative -mb-px shrink-0 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "pending" && pendingCount > 0 && (
              <span className="ml-0.5 size-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingCount > 99 ? "99+" : pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Toplu İşlem Çubuğu */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-semibold text-primary">{selectedIds.size} öğe seçildi</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="outline" onClick={toggleSelectAll} className="text-xs h-8 rounded-lg">
              {selectedIds.size === contents.length ? "Seçimi Kaldır" : "Tümünü Seç"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDownload} disabled={bulkLoading} className="text-xs h-8 rounded-lg flex items-center gap-1.5">
              <Download size={13} /> ZIP İndir
            </Button>
            {canApprove && (
              <>
                <Button size="sm" onClick={() => bulkAction("approve")} disabled={bulkLoading} className="text-xs h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5">
                  <CheckCircle size={13} /> Tümünü Onayla
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowBulkRejectModal(true)} disabled={bulkLoading} className="text-xs h-8 rounded-lg flex items-center gap-1.5">
                  <XCircle size={13} /> Tümünü Reddet
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowBulkNicheModal(true)} disabled={bulkLoading} className="text-xs h-8 rounded-lg flex items-center gap-1.5">
              <Package size={13} /> Niş Değiştir
            </Button>
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={() => { if (confirm(`${selectedIds.size} içeriği silmek istediğinize emin misiniz?`)) bulkAction("delete") }} disabled={bulkLoading} className="text-xs h-8 rounded-lg flex items-center gap-1.5">
                {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Tümünü Sil
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearSelection} className="text-xs h-8 rounded-lg"><X size={13} /></Button>
          </div>
        </div>
      )}

      {/* Analitik Sekmesi */}
      {activeTab === "analytics" && canViewAnalytics && (
        <AnalyticsView />
      )}

      {/* Aktif Filtre Chip Yapısı */}
      {activeTab !== "analytics" && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
          <span className="text-xs text-muted-foreground mr-1">Aktif Filtreler:</span>
          {selectedNicheIds.map(nid => {
            const niche = niches.find(n => n.id === nid)
            if (!niche) return null
            return (
              <span key={nid} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground border border-border px-2.5 py-0.5 rounded-full animate-in zoom-in-95 duration-150">
                Niş: {niche.name}
                <button onClick={() => setSelectedNicheIds(selectedNicheIds.filter(x => x !== nid))}><X size={12} /></button>
              </span>
            )
          })}
          {selectedTypes.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground border border-border px-2.5 py-0.5 rounded-full">
              Tip: {t === "IMAGE" ? "Görsel" : t === "VIDEO" ? "Video" : "Diğer"}
              <button onClick={() => setSelectedTypes(selectedTypes.filter(x => x !== t))}><X size={12} /></button>
            </span>
          ))}
          {(startDate || endDate) && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-foreground border border-border px-2.5 py-0.5 rounded-full">
              Tarih: {startDate || "..."} - {endDate || "..."}
              <button onClick={() => { setStartDate(""); setEndDate("") }}><X size={12} /></button>
            </span>
          )}
          {(minSize || maxSize) && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-foreground border border-border px-2.5 py-0.5 rounded-full">
              Boyut: {minSize || "0"} - {maxSize || "∞"} MB
              <button onClick={() => { setMinSize(""); setMaxSize("") }}><X size={12} /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-primary hover:underline font-semibold ml-2">Temizle</button>
        </div>
      )}

      {/* İçerik Listesi */}
      {activeTab !== "analytics" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-video w-full rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <Sparkles size={28} />
              </div>
              <h4 className="text-lg font-bold text-foreground">
                {activeTab === "pending" ? "Onay Bekleyen İçerik Yok" : "İçerik Bulunamadı"}
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {activeTab === "pending" ? "Tüm içerikler onaylandı veya bekleyen bir içerik yok." : "Aradığınız kriterlere uygun içerik bulunamadı."}
              </p>
              {canUpload && activeTab === "gallery" && (
                <Button onClick={() => setUploadOpen(true)} className="mt-4 text-xs h-9 rounded-xl">
                  İçerik Yükle
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
              {contents.map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onAction={handleAction}
                  canDelete={canDelete}
                  canUpload={canUpload}
                  canApprove={canApprove}
                  canBulkActions={bulkMode && canBulkActions}
                  currentUserId={currentUserId}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={bulkMode ? toggleSelect : undefined}
                  onStatusChange={fetchContents}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modaller */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        niches={niches}
        selectedNicheIds={selectedNicheIds}
        setSelectedNicheIds={setSelectedNicheIds}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        minSize={minSize}
        setMinSize={setMinSize}
        maxSize={maxSize}
        setMaxSize={setMaxSize}
        onClear={clearFilters}
        onApply={fetchContents}
      />

      <ContentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchContents}
        niches={niches}
      />

      {/* Toplu Red Modalı */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold mb-1">Toplu Red</h3>
            <p className="text-xs text-muted-foreground mb-3">{selectedIds.size} içerik reddedilecek.</p>
            <textarea value={bulkRejectReason} onChange={e => setBulkRejectReason(e.target.value)} placeholder="Red gerekçesi (zorunlu)" className="w-full min-h-[80px] text-sm border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowBulkRejectModal(false)} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">{tText("common.cancel", "İptal")}</button>
              <button onClick={() => { if (!bulkRejectReason.trim()) { toast.error("Gerekçe zorunludur"); return }; bulkAction("reject", { rejectionReason: bulkRejectReason }); setShowBulkRejectModal(false); setBulkRejectReason("") }} className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600">Reddet ({selectedIds.size})</button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Niş Değiştirme Modalı */}
      {showBulkNicheModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold mb-1">Niş Değiştir</h3>
            <p className="text-xs text-muted-foreground mb-3">{selectedIds.size} içerik için yeni niş seçin.</p>
            <select value={bulkTargetNicheId} onChange={e => setBulkTargetNicheId(e.target.value)} className="w-full h-9 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Niş seçin...</option>
              {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowBulkNicheModal(false)} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">{tText("common.cancel", "İptal")}</button>
              <button onClick={handleBulkNicheChange} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Değiştir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
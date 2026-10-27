"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Camera, Edit3, Send, History, Image as ImageIcon, Video, Trash2,
  ExternalLink, Clock, CheckCircle2, XCircle, Plus, Star, Loader2,
  Users, Building2, AlertCircle, MessageCircle, Upload, FileText,
  ChevronDown, MoreHorizontal, RefreshCw
} from "lucide-react"
import { ContentItem, STATUS_META, PLATFORM_META, CONTENT_TYPE_LABELS } from "../shared-types"
import ContentItemModal from "./ContentItemModal"

interface ContentDetailPanelProps {
  item: ContentItem
  users: { id: string; fullName: string; position?: string; department?: string; branches?: { branchId: string; roleName: string }[] }[]
  open: boolean
  onClose: () => void
  onUpdated: (updated: ContentItem) => void
  onDeleted: () => void
  onEditShoot?: (shoot: any) => void
}

interface MediaFile {
  id: string
  fileUrl: string
  fileType: string
  mimeType?: string
  fileName?: string
  fileSize?: string
  thumbnailUrl?: string
  version: number
  isFinal: boolean
  versionNote?: string
  uploadedAt: string
}

interface StatusHistoryEntry {
  id: string
  oldStatus: string
  newStatus: string
  changedById: string
  changedAt: string
  note?: string
}

export default function ContentDetailPanel({
  item,
  users,
  open,
  onClose,
  onUpdated,
  onDeleted,
  onEditShoot,
}: ContentDetailPanelProps) {
  const { session, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState("genel")
  const [media, setMedia] = useState<MediaFile[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Durum güncelleme
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(item.status)
  const [statusNote, setStatusNote] = useState("")

  // Görev gönderme
  const [sendingTask, setSendingTask] = useState<string | null>(null) // "shooter" | "editor" | "manager" | "designer"
  const [taskNote, setTaskNote] = useState("")
  const [showTaskNote, setShowTaskNote] = useState<string | null>(null)

  // Medya yükleme
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [versionNote, setVersionNote] = useState("")

  // Revizyon yönetimi
  const [revisions, setRevisions] = useState<any[]>([])
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState("")
  const [submittingRevision, setSubmittingRevision] = useState(false)
  const [completingRevision, setCompletingRevision] = useState(false)
  const revFileInputRef = useRef<HTMLInputElement>(null)

  // ── VERİ YÜKLEME ────────────────────────────────────────────────────

  const fetchDetails = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}`)
      if (res.ok) {
        const data = await res.json()
        setStatusHistory(data.statusHistory || [])
        setRevisions(data.revisions || [])
      }
    } catch {} finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setNewStatus(item.status)
    setStatusNote("")
    setActiveTab("genel")
    fetchDetails()
  }, [open, item.id])

  const fetchMedia = async () => {
    setLoadingMedia(true)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}/medya`)
      if (res.ok) {
        const data = await res.json()
        setMedia(Array.isArray(data) ? data : [])
      }
    } catch {} finally {
      setLoadingMedia(false)
    }
  }

  const handleCreateRevision = async () => {
    if (!revisionMessage.trim()) { toast.error("Revizyon mesajı zorunlu"); return }
    setSubmittingRevision(true)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}/revizyon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: revisionMessage.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Talebi açarken hata oluştu")
      }
      toast.success("Revizyon talebi açıldı!")
      setRevisionMessage("")
      setShowRevisionForm(false)
      fetchDetails()
      
      const updatedItemRes = await fetch(`/api/icerik-takvimi/${item.id}`)
      if (updatedItemRes.ok) {
        const updatedItem = await updatedItemRes.json()
        onUpdated(updatedItem)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep oluşturulamadı")
    } finally {
      setSubmittingRevision(false)
    }
  }

  const handleCompleteRevision = async (file: File) => {
    if (!file) return
    setCompletingRevision(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const activeRev = revisions.find(r => r.status === "bekliyor")
      const revNum = activeRev ? activeRev.revisionNumber : 1
      formData.append("versionNote", `${revNum}. Revizyon Dosyası`)
      formData.append("isFinal", "true")

      const uploadRes = await fetch(`/api/icerik-takvimi/${item.id}/medya`, {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || "Dosya yüklenirken hata oluştu")
      }

      const completeRes = await fetch(`/api/icerik-takvimi/${item.id}/revizyon`, {
        method: "PUT",
      })
      if (!completeRes.ok) {
        const err = await completeRes.json()
        throw new Error(err.error || "Revizyon tamamlanırken hata oluştu")
      }

      toast.success("Revizyon dosyası yüklendi ve revizyon tamamlandı!")
      fetchDetails()
      
      const updatedItemRes = await fetch(`/api/icerik-takvimi/${item.id}`)
      if (updatedItemRes.ok) {
        const updatedItem = await updatedItemRes.json()
        onUpdated(updatedItem)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı")
    } finally {
      setCompletingRevision(false)
    }
  }

  useEffect(() => {
    if (activeTab === "medya") fetchMedia()
    if (activeTab === "gecmis") fetchDetails()
  }, [activeTab, item.id])

  // ── DURUM GÜNCELLEME ────────────────────────────────────────────────

  const handleStatusUpdate = async () => {
    if (newStatus === item.status) { toast.info("Durum değişmedi"); return }
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, statusNote: statusNote || undefined }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      toast.success("Durum güncellendi")
      setStatusNote("")
      onUpdated(updated)
    } catch {
      toast.error("Durum güncellenemedi")
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── GÖREV GÖNDER (CHAT) ──────────────────────────────────────────────

  const handleSendTask = async (role: "shooter" | "editor" | "manager" | "designer", targetUserId: string) => {
    if (!targetUserId) { toast.error("Önce kişi atayın"); return }
    setSendingTask(role)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}/gorev-gonder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          role,
          extraNote: taskNote || undefined,
          entityType: "content_item",
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Görev chat üzerinden gönderildi!")
      setTaskNote("")
      setShowTaskNote(null)
    } catch {
      toast.error("Görev gönderilemedi")
    } finally {
      setSendingTask(null)
    }
  }

  // ── MEDYA YÜKLE ─────────────────────────────────────────────────────

  const handleFileUpload = async (file: File, markFinal: boolean) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (versionNote.trim()) formData.append("versionNote", versionNote.trim())
      if (markFinal) formData.append("isFinal", "true")

      const res = await fetch(`/api/icerik-takvimi/${item.id}/medya`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Yükleme hatası")
      }
      toast.success("Medya yüklendi")
      setVersionNote("")
      fetchMedia()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme hatası")
    } finally {
      setUploading(false)
    }
  }

  const handleSetFinal = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}/medya`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Final versiyon işaretlendi")
      fetchMedia()
    } catch {
      toast.error("İşlem başarısız")
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}/medya?mediaId=${mediaId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Medya silindi")
      fetchMedia()
    } catch {
      toast.error("Silinemedi")
    }
  }

  // ── İÇERİK SİL ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/icerik-takvimi/${item.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("İçerik silindi")
      onDeleted()
    } catch {
      toast.error("Silinemedi")
    } finally {
      setDeleting(false)
      setShowDeleteAlert(false)
    }
  }

  // ── YARDIMCI ────────────────────────────────────────────────────────

  const getUserName = (userId?: string | null) => {
    if (!userId) return null
    return users.find((u) => u.id === userId)?.fullName || "Bilinmeyen"
  }

  const statusM = STATUS_META[item.status] || STATUS_META.draft

  // ── RENDER ──────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0" side="right">
          {/* Başlık */}
          <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.branch.themeColor || "#3B82F6" }}
                  />
                  <span className="text-xs text-muted-foreground">{item.branch.name}</span>
                  <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusM.bg} ${statusM.color}`}>
                    {statusM.icon} {statusM.label}
                  </span>
                </div>
                <h2 className="font-semibold text-base leading-tight truncate">{item.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(item.scheduledDate).toLocaleDateString("tr-TR")}
                    {item.scheduledTime && ` · ${item.scheduledTime}`}
                  </span>
                  <span>{CONTENT_TYPE_LABELS[item.contentType] || item.contentType}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit3 size={13} className="mr-1" /> Düzenle
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteAlert(true)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>

            {/* Platformlar */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.platforms.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {PLATFORM_META[p]?.icon} {PLATFORM_META[p]?.label}
                </span>
              ))}
              {item.platforms.length === 0 && (
                <span className="text-[11px] text-muted-foreground">Platform seçilmedi</span>
              )}
            </div>
          </div>

          {/* Sekmeler */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full rounded-none border-b border-border bg-background px-4 justify-start gap-0 h-auto p-0">
              {[
                { value: "genel", label: "Genel" },
                { value: "medya", label: `Medya (${item._count.media})` },
                { value: "ekip", label: "Ekip & Chat" },
                { value: "gecmis", label: "Geçmiş" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={[
                    "px-4 py-3 text-xs font-medium border-b-2 transition-colors",
                    activeTab === tab.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </TabsList>

            {/* GENEL SEKMESİ */}
            <TabsContent value="genel" className="p-4 space-y-4 mt-0">
              {/* Caption */}
              {item.caption && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Caption / Paylaşım Metni</Label>
                  <div className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">
                    {item.caption}
                  </div>
                </div>
              )}

              {/* Dahili notlar */}
              {item.description && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Dahili Notlar</Label>
                  <div className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">
                    {item.description}
                  </div>
                </div>
              )}

              {/* Çekim bilgisi */}
              {item.shoot && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-xs mb-2">
                      <Camera size={12} /> Bağlı Çekim
                    </div>
                    <div className="text-sm font-semibold">{new Date(item.shoot.shootDate).toLocaleDateString("tr-TR")}</div>
                    {item.shoot.location && <div className="text-xs text-muted-foreground mt-0.5">📍 {item.shoot.location}</div>}
                    <Badge variant="outline" className="mt-1.5 text-[10px]">{item.shoot.status}</Badge>
                  </div>
                  {onEditShoot && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-850 h-7 text-xs gap-1 shrink-0"
                      onClick={() => onEditShoot(item.shoot)}
                    >
                      <Edit3 size={11} /> Çekimi Düzenle
                    </Button>
                  )}
                </div>
              )}

              {/* Müşteri onayı */}
              {item.clientApprovalRequired && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={14} className="text-violet-500" />
                  <span>Müşteri onayı gerekli —</span>
                  <Badge variant={
                    item.clientApprovalStatus === "approved" ? "default" :
                    item.clientApprovalStatus === "rejected" ? "destructive" : "outline"
                  } className="text-[10px]">
                    {item.clientApprovalStatus === "approved" ? "Onaylandı" :
                     item.clientApprovalStatus === "rejected" ? "Reddedildi" : "Bekliyor"}
                  </Badge>
                </div>
              )}

              {/* Yayın URL'i */}
              {item.publishedUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Yayın Linki</Label>
                  <a
                    href={item.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink size={13} /> {item.publishedUrl}
                  </a>
                </div>
              )}

              {/* Hızlı durum güncelleme */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Durumu Güncelle</Label>
                  {item.status === "iptal_edildi" && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-medium">
                      İptal Edilmiş Kayıt
                    </span>
                  )}
                </div>
                
                {item.status === "yayinlandi" ? (
                  <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    Bu içerik yayınlandığı için durumu değiştirilemez.
                  </div>
                ) : (
                  <>
                    <Select value={newStatus} onValueChange={setNewStatus} disabled={updatingStatus}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {item.status === "iptal_edildi" ? (
                          item.iptalOncesiDurum ? (
                            <SelectItem value={item.iptalOncesiDurum}>
                              <span className="flex items-center gap-2 text-xs text-primary font-medium">
                                <RefreshCw size={12} className="animate-pulse" /> Yeniden Aktif Et ({STATUS_META[item.iptalOncesiDurum]?.label || item.iptalOncesiDurum})
                              </span>
                            </SelectItem>
                          ) : (
                            <SelectItem value="taslak">
                              <span className="flex items-center gap-2 text-xs text-primary font-medium">
                                <RefreshCw size={12} className="animate-pulse" /> Yeniden Aktif Et (Taslak)
                              </span>
                            </SelectItem>
                          )
                        ) : (
                          Object.entries(STATUS_META).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <span className={`flex items-center gap-2 text-xs ${v.color}`}>
                                {v.icon} {v.label}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder={item.status === "iptal_edildi" ? "Yeniden aktif etme notu..." : "Opsiyonel not (ör: iptal sebebi)..."}
                      rows={2}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus || newStatus === item.status}
                      className="w-full"
                    >
                      {updatingStatus ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                      Durumu Güncelle
                    </Button>
                  </>
                )}
              </div>

              {/* AKTİF REVİZYON TALEBİ KARTI */}
              {revisions.some((r) => r.status === "bekliyor") && (
                (() => {
                  const activeRev = revisions.find((r) => r.status === "bekliyor")
                  const isProducer = 
                    item.shooterId === session?.user?.id || 
                    item.editorId === session?.user?.id || 
                    item.designerId === session?.user?.id ||
                    isSuperAdmin

                  return (
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/15 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <AlertCircle size={14} /> Aktif Revizyon Talebi var (Tur #{activeRev.revisionNumber})
                      </div>
                      <div className="text-xs bg-background/50 p-2.5 rounded-lg border whitespace-pre-wrap">
                        {activeRev.message}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>
                          <strong>Talebi Açan:</strong> {activeRev.createdBy?.fullName || "Bilinmeyen"} · {new Date(activeRev.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>

                      {isProducer && (
                        <div className="pt-1.5">
                          <input
                            ref={revFileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleCompleteRevision(file)
                              e.target.value = ""
                            }}
                          />
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            onClick={() => revFileInputRef.current?.click()}
                            disabled={completingRevision}
                          >
                            {completingRevision ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            Revizyonu Tamamla ve Yeni Medya Yükle
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })()
              )}

              {/* REVİZYON TALEBİ AÇMA BUTONU VE FORMU */}
              <div className="space-y-2">
                {showRevisionForm ? (
                  <div className="space-y-2 border border-orange-200 dark:border-orange-900/50 p-3 rounded-lg bg-orange-50/30 dark:bg-orange-950/10">
                    <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">Revizyon Talebi Mesajı</Label>
                    <Textarea
                      value={revisionMessage}
                      onChange={(e) => setRevisionMessage(e.target.value)}
                      placeholder="Müşteriden gelen geri bildirim veya revizyon detaylarını girin..."
                      rows={3}
                      className="text-xs"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setShowRevisionForm(false); setRevisionMessage(""); }}>İptal</Button>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleCreateRevision} disabled={submittingRevision}>
                        {submittingRevision ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
                        Talep Aç
                      </Button>
                    </div>
                  </div>
                ) : (
                  (item.status === "yuklendi" || item.status === "revize_edildi") &&
                  !revisions.some((r) => r.status === "bekliyor") && (
                    <Button
                      size="sm"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                      onClick={() => setShowRevisionForm(true)}
                    >
                      <RefreshCw size={13} /> Revizyon Talebi Aç
                    </Button>
                  )
                )}
              </div>

              {/* REVİZYON GEÇMİŞİ LİSTESİ */}
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <History size={13} className="text-orange-500" /> Revizyon Geçmişi ({revisions.length})
                  </Label>
                </div>

                {revisions.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic py-2 text-center bg-muted/20 rounded-lg">
                    Henüz revizyon talebi açılmamış.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-lg border border-border bg-card/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-orange-600 dark:text-orange-400">Revizyon #{rev.revisionNumber}</span>
                          <Badge variant={rev.status === "tamamlandi" ? "default" : "outline"} className="text-[9px] px-1.5 h-4">
                            {rev.status === "tamamlandi" ? "Tamamlandı" : "Bekliyor"}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded whitespace-pre-wrap">
                          {rev.message}
                        </div>

                        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                          <div>
                            <strong>Açan:</strong> {rev.createdBy?.fullName || "Bilinmeyen"} ({new Date(rev.createdAt).toLocaleString("tr-TR")})
                          </div>
                          {rev.status === "tamamlandi" && (
                            <div className="text-emerald-600 dark:text-emerald-400 mt-1">
                              <strong>Edildi:</strong> {rev.completedBy?.fullName || "Bilinmeyen"} ({new Date(rev.completedAt).toLocaleString("tr-TR")})
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MEDYA SEKMESİ */}
            <TabsContent value="medya" className="p-4 space-y-4 mt-0">
              {/* Yükleme alanı */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleFileUpload(file, false)
                }}
              >
                <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Dosya sürükleyin veya tıklayın</p>
                <p className="text-xs text-muted-foreground mt-1">Görsel, video, belge — maks. 200MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, false)
                    e.target.value = ""
                  }}
                />
              </div>

              {versionNote && (
                <Input
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="Versiyon notu (ör: 1. revizyon)"
                  className="text-xs"
                />
              )}

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Yükleniyor...
                </div>
              )}

              {/* Medya listesi */}
              {loadingMedia ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : media.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Henüz medya yüklenmedi
                </div>
              ) : (
                <div className="space-y-2">
                  {media.map((m) => (
                    <div
                      key={m.id}
                      className={[
                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                        m.isFinal
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                          : "border-border bg-card",
                      ].join(" ")}
                    >
                      {/* Önizleme */}
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                        {m.fileType === "image" ? (
                          <img src={m.fileUrl} alt="" className="w-full h-full object-cover" />
                        ) : m.fileType === "video" ? (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Video size={20} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <FileText size={20} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">v{m.version}</span>
                          {m.isFinal && (
                            <Badge className="text-[9px] bg-emerald-500 text-white border-0">
                              FINAL
                            </Badge>
                          )}
                          {m.versionNote && (
                            <span className="text-[10px] text-muted-foreground">{m.versionNote}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.fileName || "dosya"}</div>
                        <div className="text-[9px] text-muted-foreground">
                          {new Date(m.uploadedAt).toLocaleDateString("tr-TR")}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        {!m.isFinal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] text-emerald-600"
                            onClick={() => handleSetFinal(m.id)}
                          >
                            <Star size={10} className="mr-0.5" /> Final
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-destructive"
                          onClick={() => handleDeleteMedia(m.id)}
                        >
                          <Trash2 size={10} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* EKİP & CHAT SEKMESİ */}
            <TabsContent value="ekip" className="p-4 space-y-4 mt-0">
              <p className="text-xs text-muted-foreground">
                Atanan kişilere chat üzerinden tek tuşla görev gönderin.
                Kişi durumu chat'ten güncelleyebilir.
              </p>

              {/* Opsiyonel not */}
              <div className="space-y-1.5">
                <Label className="text-xs">Opsiyonel Ek Not</Label>
                <Textarea
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  placeholder="Görevle birlikte gönderilecek ek not..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Videoçekim uzmanı (Kameraman) */}
              {item.contentType === "reels" && (
                <TaskSendCard
                  role="shooter"
                  label="Atanan Kameraman"
                  icon={<Camera size={15} />}
                  color="text-amber-500"
                  bg="bg-amber-50 dark:bg-amber-900/10"
                  border="border-amber-200 dark:border-amber-800/50"
                  assignedUserId={item.shooterId}
                  assignedUserName={getUserName(item.shooterId)}
                  sending={sendingTask === "shooter"}
                  onSend={() => item.shooterId && handleSendTask("shooter", item.shooterId)}
                  chatLinkCount={item._count.chatLinks}
                />
              )}

              {/* Editör */}
              {item.contentType === "reels" && (
                <TaskSendCard
                  role="editor"
                  label="Atanan Video Editörü"
                  icon={<Edit3 size={15} />}
                  color="text-blue-500"
                  bg="bg-blue-50 dark:bg-blue-900/10"
                  border="border-blue-200 dark:border-blue-800/50"
                  assignedUserId={item.editorId}
                  assignedUserName={getUserName(item.editorId)}
                  sending={sendingTask === "editor"}
                  onSend={() => item.editorId && handleSendTask("editor", item.editorId)}
                  chatLinkCount={item._count.chatLinks}
                />
              )}

              {/* Grafik Tasarım Uzmanı */}
              {item.contentType !== "reels" && (
                <TaskSendCard
                  role="designer"
                  label="Atanan Grafik Tasarım Uzmanı"
                  icon={<Edit3 size={15} />}
                  color="text-indigo-500"
                  bg="bg-indigo-50 dark:bg-indigo-900/10"
                  border="border-indigo-200 dark:border-indigo-800/50"
                  assignedUserId={item.designerId}
                  assignedUserName={getUserName(item.designerId)}
                  sending={sendingTask === "designer"}
                  onSend={() => item.designerId && handleSendTask("designer", item.designerId)}
                  chatLinkCount={item._count.chatLinks}
                />
              )}

              {/* Sosyal medya yöneticisi */}
              <TaskSendCard
                role="manager"
                label="Sosyal Medya Yöneticisi"
                icon={<Users size={15} />}
                color="text-violet-500"
                bg="bg-violet-50 dark:bg-violet-900/10"
                border="border-violet-200 dark:border-violet-800/50"
                assignedUserId={item.managerId}
                assignedUserName={getUserName(item.managerId)}
                sending={sendingTask === "manager"}
                onSend={() => item.managerId && handleSendTask("manager", item.managerId)}
                chatLinkCount={item._count.chatLinks}
              />

              {!item.shooterId && !item.editorId && !item.designerId && !item.managerId && (
                <div className="text-center text-sm text-muted-foreground py-4 flex flex-col items-center gap-2">
                  <Users size={32} className="opacity-20" />
                  <span>Henüz kimse atanmadı</span>
                  <Button size="sm" variant="outline" onClick={onClose}>
                    Düzenle
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* GEÇMİŞ SEKMESİ */}
            <TabsContent value="gecmis" className="p-4 mt-0">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : statusHistory.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Durum geçmişi bulunamadı
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4 pl-8">
                    {[...statusHistory].reverse().map((entry) => {
                      const newSM = STATUS_META[entry.newStatus] || STATUS_META.draft
                      return (
                        <div key={entry.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-border bg-background" />
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleString("tr-TR")}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {entry.oldStatus && (
                              <>
                                <span className={`text-xs ${STATUS_META[entry.oldStatus]?.color || "text-muted-foreground"}`}>
                                  {STATUS_META[entry.oldStatus]?.label || entry.oldStatus}
                                </span>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <span className={`text-xs font-medium ${newSM.color}`}>
                              {newSM.label}
                            </span>
                          </div>
                          {entry.note && (
                            <div className="text-xs text-muted-foreground mt-0.5 italic">"{entry.note}"</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Silme onayı */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İçeriği Sil</AlertDialogTitle>
            <AlertDialogDescription>
              "{item.title}" içeriğini silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Düzenleme modalı */}
      {showEditModal && (
        <ContentItemModal
          open={showEditModal}
          editItem={item}
          users={users}
          branches={[item.branch]}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            // Ana listeden güncellenmiş veriyi al
            fetch(`/api/icerik-takvimi/${item.id}`)
              .then((r) => r.json())
              .then((d) => onUpdated({ ...d, platforms: Array.isArray(d.platforms) ? d.platforms : [] }))
              .catch(() => {})
          }}
        />
      )}
    </>
  )
}

// ─── GÖREV GÖNDER KARTI ───────────────────────────────────────────────

function TaskSendCard({
  role, label, icon, color, bg, border,
  assignedUserId, assignedUserName, sending, onSend, chatLinkCount,
}: {
  role: string
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
  assignedUserId?: string | null
  assignedUserName?: string | null
  sending: boolean
  onSend: () => void
  chatLinkCount: number
}) {
  return (
    <div className={`p-3 rounded-xl border ${border} ${bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <div>
            <div className="text-xs font-medium">{label}</div>
            {assignedUserName ? (
              <div className="text-[11px] text-muted-foreground">{assignedUserName}</div>
            ) : (
              <div className="text-[11px] text-muted-foreground italic">Atanmadı</div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={assignedUserId ? "default" : "outline"}
          className="gap-1.5 h-8 text-xs"
          onClick={onSend}
          disabled={!assignedUserId || sending}
        >
          {sending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <MessageCircle size={12} />
          )}
          {sending ? "Gönderiliyor..." : "Chat'te Gönder"}
        </Button>
      </div>
      {chatLinkCount > 0 && (
        <div className="text-[10px] text-muted-foreground mt-1.5">
          {chatLinkCount} mesaj gönderildi
        </div>
      )}
    </div>
  )
}

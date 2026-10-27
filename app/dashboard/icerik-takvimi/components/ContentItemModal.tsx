"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, X } from "lucide-react"
import { ContentItem, STATUS_META, PLATFORM_META, CONTENT_TYPE_LABELS } from "../shared-types"

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x", "other"]
const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS)

interface ContentItemModalProps {
  open: boolean
  initialDate?: Date | null
  initialBranchId?: string
  editItem: ContentItem | null
  users: { id: string; fullName: string; position?: string; department?: string; branches?: { branchId: string; roleName: string }[] }[]
  branches: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}

export default function ContentItemModal({
  open,
  initialDate,
  initialBranchId,
  editItem,
  users,
  branches,
  onClose,
  onSaved,
}: ContentItemModalProps) {
  const [saving, setSaving] = useState(false)

  // Form alanları
  const [branchId, setBranchId] = useState(initialBranchId || "")
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [description, setDescription] = useState("")
  const [platforms, setPlatforms] = useState<string[]>([])
  const [contentType, setContentType] = useState("static_post")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [status, setStatus] = useState("draft")
  const [shooterId, setShooterId] = useState("")
  const [editorId, setEditorId] = useState("")
  const [managerId, setManagerId] = useState("")
  const [designerId, setDesignerId] = useState("")
  const [clientApprovalRequired, setClientApprovalRequired] = useState(false)

  // Düzenleme modu — alanları doldur
  useEffect(() => {
    if (editItem) {
      setBranchId(editItem.branchId)
      setTitle(editItem.title)
      setCaption(editItem.caption || "")
      setDescription(editItem.description || "")
      setPlatforms(editItem.platforms)
      setContentType(editItem.contentType)
      setScheduledDate(editItem.scheduledDate.slice(0, 10))
      setScheduledTime(editItem.scheduledTime || "")
      setStatus(editItem.status)
      setShooterId(editItem.shooterId || "")
      setEditorId(editItem.editorId || "")
      setManagerId(editItem.managerId || "")
      setDesignerId(editItem.designerId || "")
      setClientApprovalRequired(editItem.clientApprovalRequired)
    } else {
      // Yeni kayıt — varsayılanlar
      setBranchId(initialBranchId || "")
      setTitle("")
      setCaption("")
      setDescription("")
      setPlatforms([])
      setContentType("reels") // Reels videosu varsayılan
      setScheduledDate(
        initialDate
          ? initialDate.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      )
      setScheduledTime("")
      setStatus("taslak") // taslak varsayılan
      setShooterId("")
      setEditorId("")
      setManagerId("")
      setDesignerId("")
    }
  }, [editItem, initialDate, initialBranchId])

  const filterUsersByRole = (roleName: string) => {
    const filtered = users.filter((u) =>
      u.branches?.some((b) => b.branchId === branchId && b.roleName === roleName)
    )
    return filtered.length > 0 ? filtered : users
  }

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Başlık zorunlu"); return }
    if (!branchId)     { toast.error("Firma seçin"); return }
    if (!scheduledDate){ toast.error("Tarih zorunlu"); return }
    if (!contentType)  { toast.error("İçerik tipi seçin"); return }

    setSaving(true)
    try {
      const payload = {
        branchId,
        title: title.trim(),
        caption: caption.trim() || null,
        description: description.trim() || null,
        platforms,
        contentType,
        scheduledDate: new Date(scheduledDate).toISOString(),
        scheduledTime: scheduledTime || null,
        status,
        shooterId: shooterId || null,
        editorId: editorId || null,
        managerId: managerId || null,
        designerId: designerId || null,
        clientApprovalRequired,
      }

      const url = editItem
        ? `/api/icerik-takvimi/${editItem.id}`
        : `/api/icerik-takvimi`
      const method = editItem ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Kayıt hatası")
      }

      toast.success(editItem ? "İçerik güncellendi" : "İçerik oluşturuldu")
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "İçeriği Düzenle" : "Yeni İçerik Ekle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Firma */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Firma <span className="text-destructive">*</span></Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* İçerik tipi */}
            <div className="space-y-1.5">
              <Label>İçerik Tipi <span className="text-destructive">*</span></Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Başlık */}
          <div className="space-y-1.5">
            <Label>Başlık <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="İçerik başlığı"
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label>Caption / Açıklama Metni</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Sosyal medyada paylaşılacak metin..."
              rows={3}
            />
          </div>

          {/* Tarih & Saat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Paylaşım Tarihi <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paylaşım Saati</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Platformlar */}
          <div className="space-y-2">
            <Label>Platformlar</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const meta = PLATFORM_META[p]
                const selected = platforms.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {meta?.icon}
                    {meta?.label || p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Durum */}
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <span className={`flex items-center gap-2 ${v.color}`}>
                      {v.icon} {v.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ekip Atama */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs">Ekip Atama</Label>
            
            {contentType === "reels" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Atanan Kameraman (Kameraman)</Label>
                  <Select value={shooterId || "none"} onValueChange={(val) => setShooterId(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Atanmadı</SelectItem>
                      {filterUsersByRole("Kameraman").map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} {!u.branches?.some(b => b.branchId === branchId && b.roleName === "Kameraman") && "(Tüm Çalışanlar)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Atanan Video Editörü (Video Editörü)</Label>
                  <Select value={editorId || "none"} onValueChange={(val) => setEditorId(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Atanmadı</SelectItem>
                      {filterUsersByRole("Video Editörü").map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} {!u.branches?.some(b => b.branchId === branchId && b.roleName === "Video Editörü") && "(Tüm Çalışanlar)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Atanan Grafik Tasarım Uzmanı (Grafik Tasarım Uzmanı)</Label>
                <Select value={designerId || "none"} onValueChange={(val) => setDesignerId(val === "none" ? "" : val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Atanmadı</SelectItem>
                    {filterUsersByRole("Grafik Tasarım Uzmanı").map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName} {!u.branches?.some(b => b.branchId === branchId && b.roleName === "Grafik Tasarım Uzmanı") && "(Tüm Çalışanlar)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Dahili notlar */}
          <div className="space-y-1.5">
            <Label>Dahili Notlar</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ekip için dahili notlar, brief, özel istekler..."
              rows={2}
            />
          </div>

          {/* Müşteri onayı */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="clientApproval"
              checked={clientApprovalRequired}
              onCheckedChange={(v) => setClientApprovalRequired(!!v)}
            />
            <Label htmlFor="clientApproval" className="cursor-pointer">
              Müşteri onayı gerekli
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>İptal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Kaydediliyor...</> : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

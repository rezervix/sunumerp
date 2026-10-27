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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Camera, MapPin, Clock, Users, X, AlertTriangle } from "lucide-react"
import { ContentItem } from "../shared-types"

interface ShootModalProps {
  open: boolean
  initialBranchId?: string
  users: { id: string; fullName: string; position?: string; department?: string }[]
  branches: { id: string; name: string }[]
  contentItems: ContentItem[]
  onClose: () => void
  onSaved: () => void
  editShoot?: any | null
}

const SHOOT_STATUSES = [
  { value: "planned", label: "Planlandı" },
  { value: "shot", label: "Çekildi" },
  { value: "in_editing", label: "Editleniyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal Edildi" },
  { value: "postponed", label: "Ertelendi" },
]

export default function ShootModal({
  open,
  initialBranchId,
  users,
  branches,
  contentItems,
  onClose,
  onSaved,
  editShoot = null,
}: ShootModalProps) {
  const [saving, setSaving] = useState(false)
  const [branchId, setBranchId] = useState("")
  const [shootDate, setShootDate] = useState("")
  const [shootTime, setShootTime] = useState("")
  const [location, setLocation] = useState("")
  const [videographerIds, setVideographerIds] = useState<string[]>([])
  const [equipmentNotes, setEquipmentNotes] = useState("")
  const [selectedContentItemIds, setSelectedContentItemIds] = useState<string[]>([])

  // Edit Mode States
  const [status, setStatus] = useState("planned")
  const [statusNote, setStatusNote] = useState("")
  const [cancelLinkedContents, setCancelLinkedContents] = useState(false)

  useEffect(() => {
    if (editShoot) {
      setBranchId(editShoot.branchId)
      setShootDate(editShoot.shootDate ? editShoot.shootDate.slice(0, 10) : "")
      setShootTime(editShoot.shootTime || "")
      setLocation(editShoot.location || "")
      setVideographerIds(Array.isArray(editShoot.videographerIds) ? editShoot.videographerIds : [])
      setEquipmentNotes(editShoot.equipmentNotes || "")
      setStatus(editShoot.status || "planned")
      setStatusNote("")
      setSelectedContentItemIds(
        Array.isArray(editShoot.contentItems)
          ? editShoot.contentItems.map((ci: any) => ci.id)
          : []
      )
    } else {
      setBranchId(initialBranchId || "")
      setShootDate(new Date().toISOString().slice(0, 10))
      setShootTime("")
      setLocation("")
      setVideographerIds([])
      setEquipmentNotes("")
      setStatus("planned")
      setStatusNote("")
      setSelectedContentItemIds([])
    }
  }, [editShoot, open, initialBranchId])

  // Seçilen firmaya göre içerikleri filtrele
  const filteredItems = contentItems.filter(
    (i) => (!branchId || i.branchId === branchId) &&
      (editShoot ? (i.status === "draft" || i.status === "awaiting_shoot" || i.shootId === editShoot.id) : ["draft", "awaiting_shoot"].includes(i.status))
  )

  const toggleVideographer = (userId: string) => {
    setVideographerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const toggleContentItem = (itemId: string) => {
    setSelectedContentItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const handleSave = async () => {
    if (!branchId)  { toast.error("Firma seçin"); return }
    if (!shootDate) { toast.error("Çekim tarihi zorunlu"); return }

    setSaving(true)
    try {
      const payload: any = {
        branchId,
        shootDate: new Date(shootDate).toISOString(),
        shootTime: shootTime || null,
        location: location.trim() || null,
        videographerIds,
        equipmentNotes: equipmentNotes.trim() || null,
        contentItemIds: selectedContentItemIds,
      }

      if (editShoot) {
        payload.status = status
        payload.statusNote = statusNote || undefined
        payload.cancelLinkedContents = cancelLinkedContents
      }

      const url = editShoot
        ? `/api/icerik-takvimi/cekim/${editShoot.id}`
        : `/api/icerik-takvimi/cekim`
      const method = editShoot ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Kayıt hatası")
      }

      // Bağlı içerikleri iptal etme işlemi (Edit modunda ve iptal işaretliyse)
      if (editShoot && status === "cancelled" && cancelLinkedContents && selectedContentItemIds.length > 0) {
        // Her bağlı içeriğin durumunu API üzerinden cancelled yap
        await Promise.all(
          selectedContentItemIds.map((id) =>
            fetch(`/api/icerik-takvimi/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "cancelled",
                statusNote: `Çekim iptal edildiği için otomatik iptal edildi. Çekim İptal Nedeni: ${statusNote}`,
              }),
            })
          )
        )
      }

      toast.success(editShoot ? "Çekim güncellendi" : "Çekim planlandı")
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} className="text-amber-500" />
            {editShoot ? "Çekim Gününü Düzenle" : "Yeni Çekim Günü Planla"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Durum Değişikliği (Sadece Edit Modunda) */}
          {editShoot && (
            <div className="p-3 bg-muted/40 dark:bg-black/10 border border-border/50 rounded-xl space-y-2">
              <Label className="font-semibold text-xs text-foreground/90">Çekim Durumu</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOOT_STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {status === "cancelled" && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-destructive flex items-center gap-1 font-semibold">
                    <AlertTriangle size={13} /> İptal Nedeni
                  </Label>
                  <Textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Lütfen çekim gününün iptal nedenini yazın..."
                    className="text-xs"
                    rows={2}
                  />

                  {selectedContentItemIds.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">
                      <Checkbox
                        id="cancelLinked"
                        checked={cancelLinkedContents}
                        onCheckedChange={(v) => setCancelLinkedContents(!!v)}
                      />
                      <Label htmlFor="cancelLinked" className="text-[11px] text-destructive font-medium cursor-pointer">
                        Çekime bağlı {selectedContentItemIds.length} içeriği de otomatik İPTAL ET
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Firma */}
          <div className="space-y-1.5">
            <Label>Firma <span className="text-destructive">*</span></Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={!!editShoot}>
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

          {/* Tarih & Saat */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Clock size={12} className="text-muted-foreground" />
                Çekim Tarihi <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Clock size={12} className="text-muted-foreground" />
                Çekim Saati
              </Label>
              <Input
                type="time"
                value={shootTime}
                onChange={(e) => setShootTime(e.target.value)}
              />
            </div>
          </div>

          {/* Konum */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <MapPin size={12} className="text-muted-foreground" />
              Konum / Adres
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Çekim mekanı veya adres..."
            />
          </div>

          {/* Videoçekimciler */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users size={12} className="text-muted-foreground" />
              Videoçekim Uzmanları
            </Label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const selected = videographerIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleVideographer(u.id)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        : "border-border bg-background text-muted-foreground hover:border-amber-300",
                    ].join(" ")}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selected ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"}`}>
                      {u.fullName.charAt(0).toUpperCase()}
                    </span>
                    {u.fullName}
                  </button>
                )
              })}
            </div>
            {videographerIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {videographerIds.length} kişi seçildi — chat üzerinden otomatik bildirim gönderilecek
              </p>
            )}
          </div>

          {/* Bu çekimde üretilecek içerikler */}
          {filteredItems.length > 0 && (
            <div className="space-y-2">
              <Label>Bu Çekimde Üretilecek İçerikler</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                {filteredItems.map((item) => {
                  const selected = selectedContentItemIds.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      className={[
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors",
                        selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
                      ].join(" ")}
                      onClick={() => toggleContentItem(item.id)}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {selected && <X size={8} className="text-white" />}
                      </div>
                      <span className="flex-1 truncate font-medium">{item.title}</span>
                      {item.shootId === editShoot?.id && (
                        <Badge variant="outline" className="ml-auto text-[9px] text-amber-600 border-amber-300">Bu Çekimde</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ekipman notları */}
          <div className="space-y-1.5">
            <Label>Ekipman / Özel Notlar</Label>
            <Textarea
              value={equipmentNotes}
              onChange={(e) => setEquipmentNotes(e.target.value)}
              placeholder="Ekipman listesi, özel istekler, hatırlatmalar..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>İptal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Kaydediliyor...</> : (editShoot ? "Değişiklikleri Kaydet" : "Çekimi Planla")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

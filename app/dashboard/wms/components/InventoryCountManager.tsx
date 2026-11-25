"use client"

import React, { useState } from "react"
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Scale,
  Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { safeCurrency, safeNumber, safeText } from "@/lib/utils/safe-display"

export interface CountSessionRecord {
  id: string
  sessionNumber: string
  warehouseId: string
  zoneId?: string | null
  abcFilter?: string | null
  scheduledDate?: string | null
  tolerancePercent?: number | null
  countType: string
  hideSystemQty: boolean
  status: string
  assignedCounters?: string
  totalBinsCounted: number
  accuracyPercent: number
  totalVarianceValue: number
  reconciledJournalNo?: string
  reconciledAt?: string
  warehouse?: {
    id: string
    name: string
  }
  lines?: Array<{
    id: string
    itemId: string
    sku: string
    itemName: string
    binCode: string
    lotNumber?: string
    systemQty: number
    countedQty?: number | null
    varianceQty: number
    unitCost: number
    varianceAmount: number
    isReconciled: boolean
  }>
}

interface InventoryCountManagerProps {
  sessions: CountSessionRecord[]
  warehouses: Array<{ id: string; name: string }>
  zones?: Array<{ id: string; warehouseId: string; code: string; name: string }>
  selectedWarehouseId?: string
  onSessionUpdated: () => void
}

export function InventoryCountManager({
  sessions,
  warehouses,
  zones = [],
  selectedWarehouseId,
  onSessionUpdated
}: InventoryCountManagerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || "")
  const [isRevealMode, setIsRevealMode] = useState(false)
  const [countInputs, setCountInputs] = useState<Record<string, string>>({})
  const [savingLineId, setSavingLineId] = useState<string | null>(null)
  const [isReconciling, setIsReconciling] = useState(false)

  // Yeni Sayım Modalı
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [newWhId, setNewWhId] = useState(
    selectedWarehouseId && selectedWarehouseId !== "ALL"
      ? selectedWarehouseId
      : warehouses[0]?.id || ""
  )
  const [newZoneId, setNewZoneId] = useState<string>("ALL")
  const [newAbcFilter, setNewAbcFilter] = useState<string>("ALL")
  const [newScheduledDate, setNewScheduledDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [newTolerancePercent, setNewTolerancePercent] = useState<string>("5")
  const [newCountType, setNewCountType] = useState("BLIND_COUNT")
  const [newCounters, setNewCounters] = useState("Saha Sayım Ekibi")
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0]

  // Kör Sayım Gizlilik Kuralı
  const isBlindActive = (activeSession?.countType === "BLIND_COUNT" || activeSession?.hideSystemQty) && !isRevealMode

  // Sayım Satırı Kaydet
  const handleSaveLine = async (lineId: string) => {
    const val = countInputs[lineId]
    if (val === undefined || val.trim() === "") {
      toast.error("Lütfen sayılan miktarı giriniz.")
      return
    }

    const num = Number(val)
    if (isNaN(num) || num < 0) {
      toast.error("Geçersiz miktar!")
      return
    }

    setSavingLineId(lineId)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_count_line",
          sessionId: activeSession.id,
          lineId,
          countedQty: num,
          countedBy: "Saha Sayım Görevlisi"
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Hücre sayımı veritabanına kaydedildi.")
        onSessionUpdated()
      } else {
        toast.error("Hata: " + (data.error || "Kaydedilemedi"))
      }
    } catch (e: any) {
      toast.error("Bağlantı hatası: " + e.message)
    } finally {
      setSavingLineId(null)
    }
  }

  // Mahsuplaşma Yap (Veritabanında Gerçek Stok ve Maliyet Eşitleme)
  const handleReconcile = async (forceApprove = false) => {
    if (!activeSession) return
    setIsReconciling(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: forceApprove ? "approve_count" : "reconcile_count",
          sessionId: activeSession.id,
          reconciledBy: forceApprove ? "Depo Müdürü (Onaylı)" : "Depo Sorumlusu"
        })
      })

      const data = await res.json()
      if (data.success) {
        if (data.status === "PENDING_APPROVAL") {
          toast.warning(data.message || "Tolerans eşiği aşıldığı için yönetici onayına alındı.")
        } else {
          toast.success(data.message || "Mahsuplaşma Başarıyla Tamamlandı!", {
            description: `Muhasebe Fişi: ${data.reconciledJournalNo} • Fark Tutarı: ${data.totalVarianceValue} TL`
          })
        }
        onSessionUpdated()
      } else {
        toast.error("Mahsuplaşma hatası: " + (data.error || "İşlem başarısız"))
      }
    } catch (e: any) {
      toast.error("Bağlantı hatası: " + e.message)
    } finally {
      setIsReconciling(false)
    }
  }

  // Yeni Sayım Oturumu Başlat
  const handleCreateSession = async () => {
    setIsCreatingSession(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_count_session",
          warehouseId: newWhId,
          zoneId: newZoneId === "ALL" ? undefined : newZoneId,
          abcFilter: newAbcFilter === "ALL" ? undefined : newAbcFilter,
          scheduledDate: newScheduledDate || undefined,
          tolerancePercent: Number(newTolerancePercent || 5),
          countType: newCountType,
          assignedCounters: newCounters
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Sayım oturumu başlatıldı.")
        setIsNewSessionModalOpen(false)
        onSessionUpdated()
      } else {
        toast.error("Oturum başlatılamadı: " + (data.error || "Hata"))
      }
    } catch (e: any) {
      toast.error("Hata: " + e.message)
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ÜST FİLTRE VE EYLEM ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/80 backdrop-blur-xl border border-[--line] p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Oturum Seçici */}
          <Select
            value={activeSession?.id || ""}
            onValueChange={setSelectedSessionId}
          >
            <SelectTrigger className="w-64 text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5 font-medium">
              <SelectValue placeholder="Sayım Oturumu Seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[--line] text-[--text] shadow-xl">
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.sessionNumber} ({s.countType === "BLIND_COUNT" ? "Kör Sayım" : "Tam Sayım"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeSession && (
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${activeSession.status === "RECONCILED" ? "bg-[--ok-soft] text-[--ok] border-[--ok-fill]/20" : activeSession.status === "PENDING_APPROVAL" ? "bg-[--warn-soft] text-[--warn] border-[--warn-fill]/30" : "bg-[--page] text-[--text-muted] border-[--line]" }`}
            >
              {activeSession.status === "RECONCILED"
                ? "Mahsuplaştı"
                : activeSession.status === "PENDING_APPROVAL"
                  ? "Tolerans Aşımı (Onay Bekliyor)"
                  : "Devam Ediyor"}
            </span>
          )}
          {activeSession?.tolerancePercent != null && (
            <span className="text-[11px] font-mono text-[--text-muted]">
              Tolerans: %{safeNumber(activeSession.tolerancePercent, 5)}
              {activeSession.abcFilter ? ` • ABC: ${activeSession.abcFilter}` : ""}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* KÖR SAYIM GÖZ BUTONU */}
          {activeSession?.countType === "BLIND_COUNT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRevealMode(prev => !prev)}
              className="text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-full gap-1.5 h-9 px-3.5 cursor-pointer"
              title="Yönetici Gözü: Kör sayımda sistem miktarlarını göster/gizle"
            >
              {isRevealMode ? <EyeOff className="h-3.5 w-3.5 text-[--text-muted]" /> : <Eye className="h-3.5 w-3.5 text-[--brand]" />}
              <span>{isRevealMode ? "Miktarları Gizle" : "Miktarları Göster"}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsNewSessionModalOpen(true)}
            className="h-9 px-4 text-xs bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] font-medium rounded-full gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[--brand]" />
            <span>Yeni Sayım</span>
          </Button>

          {activeSession && activeSession.status === "PENDING_APPROVAL" && (
            <Button
              size="sm"
              disabled={isReconciling}
              onClick={() => handleReconcile(true)}
              className="h-9 px-4 text-xs bg-[--warn-fill] hover:bg-[--warn-fill]/90 text-[var(--text)] font-semibold rounded-full gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Yönetici Onayı ile Mahsuplaştır</span>
            </Button>
          )}

          {activeSession && activeSession.status !== "RECONCILED" && activeSession.status !== "PENDING_APPROVAL" && (
            <Button
              size="sm"
              disabled={isReconciling}
              onClick={() => handleReconcile(false)}
              className="h-9 px-4 text-xs bg-[--brand] hover:bg-[--brand-hover] text-[var(--text)] font-semibold rounded-full gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isReconciling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scale className="h-3.5 w-3.5" />
              )}
              <span>Mahsuplaşmayı Tamamla</span>
            </Button>
          )}
        </div>
      </div>

      {/* KÖR SAYIM BİLGİLENDİRME AFİŞİ */}
      {isBlindActive && (
        <div className="p-4 bg-[--warn-soft] border border-[--warn-fill]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[--warn]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-[--warn] shrink-0" />
            <span>
              <strong>Kör Sayım Modu Aktif:</strong> Personelin manipüle etmemesi için sistemdeki beklenen miktarlar gizlenmiştir.
            </span>
          </div>
          <span className="text-[11px] font-medium font-mono bg-white/70 border border-[--warn-fill]/30 px-2.5 py-0.5 rounded-full">
            Sistem Miktarı: [GİZLİ]
          </span>
        </div>
      )}

      {/* SAYIM SATIRLARI TABLOSU */}
      {!activeSession || !activeSession.lines || activeSession.lines.length === 0 ? (
        <div className="bg-white border border-[--line] rounded-2xl p-10 text-center text-xs text-[--text-muted] shadow-sm">
          Aktif sayım satırı bulunmuyor.
        </div>
      ) : (
        <div className="bg-white border border-[--line] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[--page] border-b border-[--line] text-[11px] text-[--text-muted] uppercase font-semibold">
                  <th className="py-3.5 px-5">Raf Hücresi</th>
                  <th className="py-3.5 px-3">Ürün Bilgisi</th>
                  <th className="py-3.5 px-3 text-right">Sistem Miktarı</th>
                  <th className="py-3.5 px-3 text-center">Sayılan Miktar</th>
                  <th className="py-3.5 px-3 text-right">Fark</th>
                  <th className="py-3.5 px-3 text-right">Fark Tutarı</th>
                  <th className="py-3.5 px-5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {activeSession.lines.map(line => {
                  const isSaving = savingLineId === line.id
                  const isCounted = line.countedQty !== null && line.countedQty !== undefined
                  const variance = isCounted ? Number(line.varianceQty || 0) : 0

                  return (
                    <tr
                      key={line.id}
                      className="border-b border-[--line-soft] hover:bg-[--brand-soft]/40 transition-colors"
                    >
                      {/* Raf Hücresi */}
                      <td className="py-3.5 px-5 font-mono font-semibold text-[--text]">
                        {line.binCode}
                      </td>

                      {/* Ürün */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-[--text]">{line.itemName}</div>
                        <div className="text-[11px] text-[--text-muted] font-mono">SKU: {safeText(line.sku)}</div>
                      </td>

                      {/* Sistem Miktarı */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-[--text-2]">
                        {isBlindActive ? (
                          <span className="text-[--text-muted] italic">***</span>
                        ) : (
                          `${safeNumber(line.systemQty, 0)} Adet`
                        )}
                      </td>

                      {/* Sayılan Miktar Girişi */}
                      <td className="py-3.5 px-3 text-center">
                        {activeSession.status === "RECONCILED" ? (
                          <span className="font-semibold font-mono text-[--text]">
                            {line.countedQty ?? line.systemQty} Adet
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number"
                              min="0"
                              placeholder={isCounted ? String(line.countedQty) : "Girin"}
                              value={countInputs[line.id] !== undefined ? countInputs[line.id] : (isCounted ? String(line.countedQty) : "")}
                              onChange={e => setCountInputs({ ...countInputs, [line.id]: e.target.value })}
                              className="h-8 w-20 text-center font-bold font-mono text-xs bg-[--page] border-[--line] text-[--text] rounded-lg"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => handleSaveLine(line.id)}
                              className="h-8 px-2.5 text-xs border-[--line] bg-white hover:bg-[--brand-soft] hover:text-[--brand] text-[--text-2] rounded-lg cursor-pointer"
                            >
                              {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </td>

                      {/* Fark */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold">
                        {isBlindActive ? (
                          <span className="text-[--text-muted] italic">***</span>
                        ) : isCounted ? (
                          <span className={variance < 0 ? "text-[--bad]" : variance > 0 ? "text-[--ok]" : "text-[--text-muted]"}>
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        ) : (
                          <span className="text-[--text-muted]">-</span>
                        )}
                      </td>

                      {/* Fark Tutarı */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium">
                        {isBlindActive ? (
                          <span className="text-[--text-muted] italic">***</span>
                        ) : isCounted ? (
                          <span className={variance < 0 ? "text-[--bad]" : variance > 0 ? "text-[--ok]" : "text-[--text-muted]"}>
                            {safeCurrency(Number(line.varianceAmount || 0))}
                          </span>
                        ) : (
                          <span className="text-[--text-muted]">-</span>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td className="py-3.5 px-5 text-center">
                        {line.isReconciled ? (
                          <span className="inline-flex items-center bg-[--ok-soft] text-[--ok] border border-[--ok-fill]/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            İşlendi
                          </span>
                        ) : isCounted ? (
                          <span className="inline-flex items-center bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full px-2.5 py-0.5 text-xs font-medium">
                            Sayıldı
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-[--page] text-[--text-muted] border border-[--line] rounded-full px-2.5 py-0.5 text-xs font-medium">
                            Bekliyor
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YENİ SAYIM BAŞLATMA MODALI */}
      <Dialog open={isNewSessionModalOpen} onOpenChange={setIsNewSessionModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[--line] rounded-2xl shadow-2xl text-[--text] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[--text]">
              Yeni Sayım Oturumu Başlat
            </DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Kör sayım veya tam depo sayımı başlatarak gerçek envanteri doğrulayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--text-muted]">Sayılacak Depo</Label>
              <Select value={newWhId} onValueChange={setNewWhId}>
                <SelectTrigger className="text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5">
                  <SelectValue placeholder="Depo Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[--line] text-[--text] shadow-xl">
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[--text-muted]">Sayım Türü</Label>
              <Select value={newCountType} onValueChange={setNewCountType}>
                <SelectTrigger className="text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[--line] text-[--text] shadow-xl">
                  <SelectItem value="BLIND_COUNT" className="text-xs font-medium text-[--brand]">
                    Kör Sayım (Sistem Miktarları Gizli - Tavsiye Edilen)
                  </SelectItem>
                  <SelectItem value="FULL_COUNT" className="text-xs">
                    Tam Sayım (Tüm Depo Miktarları Açık)
                  </SelectItem>
                  <SelectItem value="CYCLE_SMART_COUNT" className="text-xs">
                    Döngüsel Sayım (Kritik & A Sınıfı Ürünler)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-[--text-muted]">Bölge Kapsamı</Label>
                <select
                  value={newZoneId}
                  onChange={e => setNewZoneId(e.target.value)}
                  className="w-full h-9.5 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  <option value="ALL" className="bg-white text-[--text]">Tüm Bölgeler</option>
                  {zones.filter(z => z.warehouseId === newWhId).map(z => (
                    <option key={z.id} value={z.id} className="bg-white text-[--text]">{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[--text-muted]">ABC Hız Filtresi</Label>
                <select
                  value={newAbcFilter}
                  onChange={e => setNewAbcFilter(e.target.value)}
                  className="w-full h-9.5 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  <option value="ALL" className="bg-white text-[--text]">Tüm Sınıflar</option>
                  <option value="A" className="bg-white text-[--text]">Sınıf A (Hızlı)</option>
                  <option value="B" className="bg-white text-[--text]">Sınıf B (Orta)</option>
                  <option value="C" className="bg-white text-[--text]">Sınıf C (Yavaş)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-[--text-muted]">Planlanan Tarih</Label>
                <Input
                  type="date"
                  value={newScheduledDate}
                  onChange={e => setNewScheduledDate(e.target.value)}
                  className="text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[--text-muted]">Tolerans Eşiği (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newTolerancePercent}
                  onChange={e => setNewTolerancePercent(e.target.value)}
                  className="text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[--text-muted]">Görevli Sayım Ekibi</Label>
              <Input
                value={newCounters}
                onChange={e => setNewCounters(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz, Elif Demir"
                className="text-xs bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewSessionModalOpen(false)}
              className="text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-full h-9 px-4 cursor-pointer"
            >
              Vazgeç
            </Button>
            <Button
              size="sm"
              disabled={isCreatingSession}
              onClick={handleCreateSession}
              className="text-xs bg-[--brand] hover:bg-[--brand-hover] text-[var(--text)] font-semibold rounded-full shadow-sm h-9 px-4 cursor-pointer disabled:opacity-50"
            >
              {isCreatingSession ? "Başlatılıyor..." : "Sayımı Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

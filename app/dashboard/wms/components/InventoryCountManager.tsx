"use client"

import React, { useState } from "react"
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Scale,
  Save,
  Check,
  FileSpreadsheet
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

export interface CountSessionRecord {
  id: string
  sessionNumber: string
  warehouseId: string
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
  onSessionUpdated: () => void
}

export function InventoryCountManager({
  sessions,
  warehouses,
  onSessionUpdated
}: InventoryCountManagerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || "")
  const [isRevealMode, setIsRevealMode] = useState(false)
  const [countInputs, setCountInputs] = useState<Record<string, string>>({})
  const [savingLineId, setSavingLineId] = useState<string | null>(null)
  const [isReconciling, setIsReconciling] = useState(false)

  // Yeni Sayım Modalı
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [newWhId, setNewWhId] = useState(warehouses[0]?.id || "")
  const [newCountType, setNewCountType] = useState("BLIND_COUNT")
  const [newCounters, setNewCounters] = useState("Saha Sayım Ekibi")
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0]

  // Kör Sayım Gizlilik Kuralı:
  // Eğer countType === "BLIND_COUNT" veya hideSystemQty === true ise ve yönetici gözü kapalıysa gizle
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
  const handleReconcile = async () => {
    if (!activeSession) return
    setIsReconciling(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile_count",
          sessionId: activeSession.id,
          reconciledBy: "Depo Sorumlusu"
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Mahsuplaşma Başarıyla Tamamlandı!", {
          description: `Muhasebe Fişi: ${data.reconciledJournalNo} • Fark Tutarı: ${data.totalVarianceValue} TL`
        })
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val || 0)
  }

  return (
    <div className="space-y-5">
      {/* ÜST FİLTRE VE EYLEM ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          {/* Oturum Seçici */}
          <Select
            value={activeSession?.id || ""}
            onValueChange={setSelectedSessionId}
          >
            <SelectTrigger className="w-60 text-xs glass-input h-10 font-semibold">
              <SelectValue placeholder="Sayım Oturumu Seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950/95 border-white/15 text-white backdrop-blur-xl">
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.sessionNumber} ({s.countType === "BLIND_COUNT" ? "Kör Sayım" : "Tam Sayım"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeSession && (
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${activeSession.status === "RECONCILED"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                }`}
            >
              {activeSession.status === "RECONCILED" ? "Mahsuplaştı" : "Devam Ediyor"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* KÖR SAYIM GÖZ BUTONU (YÖNETİCİ AÇMA / KAPAMA) */}
          {activeSession?.countType === "BLIND_COUNT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRevealMode(prev => !prev)}
              className="text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-1.5 h-9"
              title="Yönetici Gözü: Kör sayımda sistem miktarlarını göster/gizle"
            >
              {isRevealMode ? <EyeOff className="h-3.5 w-3.5 text-white/60" /> : <Eye className="h-3.5 w-3.5 text-indigo-400" />}
              <span>{isRevealMode ? "Miktarları Gizle" : "Miktarları Göster"}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsNewSessionModalOpen(true)}
            className="h-9 text-xs bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold rounded-xl gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span>Yeni Sayım</span>
          </Button>

          {activeSession && activeSession.status !== "RECONCILED" && (
            <Button
              size="sm"
              disabled={isReconciling}
              onClick={handleReconcile}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-1.5 shadow-lg shadow-emerald-500/20"
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
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">Kör Sayım Modu Aktif:</strong> Personelin manipüle etmemesi için sistemdeki beklenen miktarlar gizlenmiştir.
            </span>
          </div>
          <span className="text-[11px] text-amber-300 font-medium font-mono bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
            Sistem Miktarı: [GİZLİ]
          </span>
        </div>
      )}

      {/* SAYIM SATIRLARI TABLOSU */}
      {!activeSession || !activeSession.lines || activeSession.lines.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-xs text-white/50">
          Aktif sayım satırı bulunmuyor.
        </div>
      ) : (
        <div className="glass-table-container overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] text-white/50 uppercase font-semibold">
                  <th className="py-3.5 px-4">Raf Hücresi</th>
                  <th className="py-3.5 px-3">Ürün Bilgisi</th>
                  <th className="py-3.5 px-3 text-right">Sistem Miktarı</th>
                  <th className="py-3.5 px-3 text-center">Sayılan Miktar</th>
                  <th className="py-3.5 px-3 text-right">Fark</th>
                  <th className="py-3.5 px-3 text-right">Fark Tutarı</th>
                  <th className="py-3.5 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {activeSession.lines.map(line => {
                  const isSaving = savingLineId === line.id
                  const isCounted = line.countedQty !== null && line.countedQty !== undefined
                  const variance = isCounted ? Number(line.varianceQty || 0) : 0

                  return (
                    <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                      {/* Raf Hücresi */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {line.binCode}
                      </td>

                      {/* Ürün */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{line.itemName}</div>
                        <div className="text-[11px] text-white/45 font-mono">SKU: {line.sku}</div>
                      </td>

                      {/* Sistem Miktarı */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-white/85">
                        {isBlindActive ? (
                          <span className="text-white/35 italic">***</span>
                        ) : (
                          `${line.systemQty} Adet`
                        )}
                      </td>

                      {/* Sayılan Miktar Girişi */}
                      <td className="py-3.5 px-3 text-center">
                        {activeSession.status === "RECONCILED" ? (
                          <span className="font-bold font-mono text-white">
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
                              className="h-8 w-20 text-center font-bold font-mono text-xs glass-input"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => handleSaveLine(line.id)}
                              className="h-8 px-2.5 text-xs border-white/15 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 text-white rounded-xl"
                            >
                              {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </td>

                      {/* Fark */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        {isBlindActive ? (
                          <span className="text-white/35 italic">***</span>
                        ) : isCounted ? (
                          <span className={variance < 0 ? "text-rose-400" : variance > 0 ? "text-emerald-400" : "text-white/60"}>
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        ) : (
                          <span className="text-white/35">-</span>
                        )}
                      </td>

                      {/* Fark Tutarı */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold">
                        {isBlindActive ? (
                          <span className="text-white/35 italic">***</span>
                        ) : isCounted ? (
                          <span className={variance < 0 ? "text-rose-400" : variance > 0 ? "text-emerald-400" : "text-white/60"}>
                            {formatCurrency(Number(line.varianceAmount || 0))}
                          </span>
                        ) : (
                          <span className="text-white/35">-</span>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td className="py-3.5 px-4 text-center">
                        {line.isReconciled ? (
                          <span className="inline-flex items-center bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-0.5 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            İşlendi
                          </span>
                        ) : isCounted ? (
                          <span className="inline-flex items-center bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-full px-3 py-0.5 text-xs font-medium">
                            Sayıldı
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-white/10 text-white/60 border border-white/15 rounded-full px-3 py-0.5 text-xs font-medium">
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
        <DialogContent className="sm:max-w-md backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Yeni Sayım Oturumu Başlat
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Kör sayım veya tam depo sayımı başlatarak gerçek envanteri doğrulayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/75">Sayılacak Depo</Label>
              <Select value={newWhId} onValueChange={setNewWhId}>
                <SelectTrigger className="text-xs glass-input h-10">
                  <SelectValue placeholder="Depo Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950/95 border-white/15 text-white backdrop-blur-xl">
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/75">Sayım Türü</Label>
              <Select value={newCountType} onValueChange={setNewCountType}>
                <SelectTrigger className="text-xs glass-input h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950/95 border-white/15 text-white backdrop-blur-xl">
                  <SelectItem value="BLIND_COUNT" className="text-xs font-semibold text-indigo-300">
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

            <div className="space-y-1.5">
              <Label className="text-xs text-white/75">Görevli Sayım Ekibi</Label>
              <Input
                value={newCounters}
                onChange={e => setNewCounters(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz, Elif Demir"
                className="text-xs glass-input h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewSessionModalOpen(false)}
              className="text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
            >
              Vazgeç
            </Button>
            <Button
              size="sm"
              disabled={isCreatingSession}
              onClick={handleCreateSession}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
            >
              {isCreatingSession ? "Başlatılıyor..." : "Sayımı Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

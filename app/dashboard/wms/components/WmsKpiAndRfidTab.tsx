"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Activity,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Warehouse,
  RefreshCw,
  Send,
} from "lucide-react"
import type { WmsWarehouseKpiSnapshot } from "@/lib/logistics/wms/constantsAndHelpers"
import { safeNumber, safeText } from "@/lib/utils/safe-display"

interface WmsKpiAndRfidTabProps {
  selectedWarehouseId: string
}

export function WmsKpiAndRfidTab({ selectedWarehouseId }: WmsKpiAndRfidTabProps) {
  const [kpi, setKpi] = useState<WmsWarehouseKpiSnapshot | null>(null)
  const [rfidEvents, setRfidEvents] = useState<any[]>([])
  const [apiDoc, setApiDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Canlı RFID okuyucu simülasyon payload'ı
  const [readerId, setReaderId] = useState("PORTAL-MRK-KAPI-01")
  const [epcCode, setEpcCode] = useState("E280117000000201GUL0001")
  const [sendingRfid, setSendingRfid] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const whParam =
        selectedWarehouseId !== "ALL" ? `&warehouseId=${encodeURIComponent(selectedWarehouseId)}` : ""
      const [kpiRes, rfidRes] = await Promise.all([
        fetch(`/api/wms?section=kpi${whParam}`).then((r) => r.json()),
        fetch(`/api/wms/rfid${selectedWarehouseId !== "ALL" ? `?warehouseId=${encodeURIComponent(selectedWarehouseId)}` : ""}`).then((r) => r.json()),
      ])
      if (kpiRes.success && kpiRes.kpi) setKpi(kpiRes.kpi)
      if (rfidRes.success) {
        setRfidEvents(rfidRes.events || [])
        setApiDoc(rfidRes.apiDocumentation || null)
      }
    } catch {
      toast.error("Depo KPI ve RFID verileri yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTestRfidIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!epcCode.trim()) return
    setSendingRfid(true)
    try {
      const res = await fetch("/api/wms/rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readerId,
          antennaPort: 1,
          warehouseId: selectedWarehouseId !== "ALL" ? selectedWarehouseId : "wh-merkez-01",
          reads: [
            {
              epcCode: epcCode.trim(),
              rssi: -46.2,
              scannedAt: new Date().toISOString(),
              idempotencyKey: `TEST-${readerId}-${epcCode.trim()}-${Date.now()}`,
            },
          ],
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        await loadData()
      } else {
        toast.error(data.error || "RFID okuması gönderilemedi.")
      }
    } finally {
      setSendingRfid(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. VERİTABANINDAN CANLI HESAPLANAN DEPO KPI PANELİ */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-[--brand]" />
            <div>
              <h3 className="text-sm font-semibold text-[--text]">
                Depo Performans Göstergeleri (Canlı DB KPI)
              </h3>
              <p className="text-[11px] text-[--text-muted]">
                Sayım oturumları, görev tamamlama süreleri ve aktif raf kapasitesinden doğrudan hesaplanır.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/lojistik-raporlar?module=wms"
              className="text-xs text-[--brand] hover:underline font-semibold px-3 py-1.5 rounded-full bg-[--brand-soft] border border-[--brand-line]"
            >
              Raporlar&apos;a Git →
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-8.5 px-3 text-xs border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Hesapla</span>
            </Button>
          </div>
        </div>

        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
                <span>Stok Doğruluğu</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-[--ok]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[--ok]">
                %{safeNumber(kpi.stockAccuracyPercent, 100)}
              </div>
              <div className="text-[10px] text-[--text-muted]">
                {safeNumber(kpi.reconciledCountSessions, 0)} mahsuplaşmış sayım
              </div>
            </div>

            <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
                <span>Ort. Toplama Süresi</span>
                <Clock className="h-3.5 w-3.5 text-[--text-muted]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[--text]">
                {safeNumber(kpi.avgPickDurationMinutes, 0)} dk
              </div>
              <div className="text-[10px] text-[--text-muted]">
                {safeNumber(kpi.completedPickTasks, 0)} tamamlanan wave/pick
              </div>
            </div>

            <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
                <span>Ort. Mal Kabul Süresi</span>
                <Clock className="h-3.5 w-3.5 text-[--text-muted]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[--text]">
                {safeNumber(kpi.avgReceivingDurationMinutes, 0)} dk
              </div>
              <div className="text-[10px] text-[--text-muted]">
                {safeNumber(kpi.completedReceivingTasks, 0)} kabul &amp; put-away
              </div>
            </div>

            <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
                <span>Dolu Lokasyon Oranı</span>
                <Warehouse className="h-3.5 w-3.5 text-[--brand]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[--text]">
                %{safeNumber(kpi.binOccupancyRatePercent, 0)}
              </div>
              <div className="text-[10px] text-[--text-muted]">
                {safeNumber(kpi.occupiedBins, 0)}/{safeNumber(kpi.totalActiveBins, 0)} göz dolu · {safeNumber(kpi.blockedBins, 0)} bloklu
              </div>
            </div>

            <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
                <span>Geciken Görevler</span>
                <AlertTriangle className={`h-3.5 w-3.5 ${kpi.overdueTasksCount > 0 ? "text-[--bad]" : "text-[--ok]"}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${kpi.overdueTasksCount > 0 ? "text-[--bad]" : "text-[--ok]"}`}>
                {safeNumber(kpi.overdueTasksCount, 0)}
              </div>
              <div className="text-[10px] text-[--text-muted]">
                Cross-Dock: {safeNumber(kpi.crossDockThroughputQty, 0)} · RFID: {safeNumber(kpi.rfidReadsLast24h, 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. RFID OKUYUCU ENTEGRASYONU & TEST PANELİ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-[--brand]" />
            <div>
              <h3 className="text-sm font-semibold text-[--text]">
                RFID EPC Okuma Akışı &amp; Otomatik Eşleştirme
              </h3>
              <p className="text-[11px] text-[--text-muted]">
                UHF kapı anteni ve el okuyucularından gelen EPC kodlarını SKU, Palet/LPN veya Raf kapısıyla eşler.
              </p>
            </div>
          </div>

          <form onSubmit={handleTestRfidIngest} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end bg-[--page] p-3.5 rounded-xl border border-[--line]">
            <div className="space-y-1">
              <Label className="text-[11px] text-[--text-muted]">Okuyucu ID</Label>
              <Input value={readerId} onChange={(e) => setReaderId(e.target.value)} className="h-9 text-xs font-mono bg-white border-[--line] text-[--text]" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] text-[--text-muted]">EPC Tag Kodu</Label>
              <Input value={epcCode} onChange={(e) => setEpcCode(e.target.value)} className="h-9 text-xs font-mono bg-white border-[--line] text-[--text]" />
            </div>
            <Button
              type="submit"
              disabled={sendingRfid}
              className="h-9 text-xs bg-[--brand] hover:bg-[--brand-hover] text-white font-semibold rounded-xl gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Okuma Gönder</span>
            </Button>
          </form>

          <div className="overflow-x-auto border border-[--line] rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[--page] border-b border-[--line] text-[11px] text-[--text-muted] uppercase font-semibold">
                  <th className="py-2.5 px-3">Zaman</th>
                  <th className="py-2.5 px-3">Okuyucu</th>
                  <th className="py-2.5 px-3">EPC Kodu</th>
                  <th className="py-2.5 px-3">Eşleşme</th>
                  <th className="py-2.5 px-3 text-right">RSSI</th>
                </tr>
              </thead>
              <tbody>
                {rfidEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[--text-muted]">
                      Henüz RFID okuması kaydedilmedi.
                    </td>
                  </tr>
                ) : (
                  rfidEvents.slice(0, 10).map((ev) => (
                    <tr key={ev.id} className="border-b border-[--line-soft] text-[--text-2]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[--text-muted]">
                        {new Date(ev.scannedAt).toLocaleTimeString("tr-TR")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[--text-2]">{ev.readerId}</td>
                      <td className="py-2.5 px-3 font-mono text-[--text] font-medium">{ev.epcCode}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            ev.matchedType !== "UNMATCHED"
                              ? "bg-[--ok-soft] text-[--ok] border-[--ok-fill]/20"
                              : "bg-[--page] text-[--text-muted] border-[--line]"
                          }`}
                        >
                          {ev.matchedType}: {ev.matchedLabel || "Eşleşmedi"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[--text-muted]">
                        {ev.rssi ?? "-"} dBm
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ Kart: Donanım Entegrasyon API Dokümantasyonu */}
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="text-xs font-semibold text-[--text]">
            Donanım Okuyucu REST API Sözleşmesi
          </div>
          <p className="text-[11px] text-[--text-muted]">
            Sabit portal veya el RFID okuyucuları doğrudan aşağıdaki endpoint üzerinden JSON gönderebilir.
          </p>
          <pre className="bg-[--navy] border border-[--line] rounded-xl p-3 text-[10px] font-mono text-cyan-200 overflow-x-auto leading-relaxed shadow-inner">
            {JSON.stringify(
              apiDoc || {
                endpoint: "/api/wms/rfid",
                method: "POST",
                headers: { "x-wms-rfid-key": "<API_KEY>" },
                reads: [{ epcCode: "E280117000000201GUL0001", rssi: -46.5 }],
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useCallback, useEffect, useState } from "react"
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
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-[#34D399]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Depo Performans Göstergeleri (Canlı DB KPI)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Sayım oturumları, görev tamamlama süreleri ve aktif raf kapasitesinden doğrudan hesaplanır.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-8.5 px-3 text-xs border-white/[0.08] bg-white/[0.04] rounded-full gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Hesapla</span>
          </Button>
        </div>

        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Stok Doğruluğu</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#34D399]">
                %{kpi.stockAccuracyPercent}
              </div>
              <div className="text-[10px] text-zinc-500">
                {kpi.reconciledCountSessions} mahsuplaşmış sayım
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Ort. Toplama Süresi</span>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {kpi.avgPickDurationMinutes} dk
              </div>
              <div className="text-[10px] text-zinc-500">
                {kpi.completedPickTasks} tamamlanan wave/pick
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Ort. Mal Kabul Süresi</span>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {kpi.avgReceivingDurationMinutes} dk
              </div>
              <div className="text-[10px] text-zinc-500">
                {kpi.completedReceivingTasks} kabul &amp; put-away
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Dolu Lokasyon Oranı</span>
                <Warehouse className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                %{kpi.binOccupancyRatePercent}
              </div>
              <div className="text-[10px] text-zinc-500">
                {kpi.occupiedBins}/{kpi.totalActiveBins} göz dolu · {kpi.blockedBins} bloklu
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Geciken Görevler</span>
                <AlertTriangle className={`h-3.5 w-3.5 ${kpi.overdueTasksCount > 0 ? "text-rose-400" : "text-[#34D399]"}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${kpi.overdueTasksCount > 0 ? "text-rose-400" : "text-[#34D399]"}`}>
                {kpi.overdueTasksCount}
              </div>
              <div className="text-[10px] text-zinc-500">
                Cross-Dock: {kpi.crossDockThroughputQty} · RFID: {kpi.rfidReadsLast24h}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. RFID OKUYUCU ENTEGRASYONU & TEST PANELİ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-[#34D399]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                RFID EPC Okuma Akışı &amp; Otomatik Eşleştirme
              </h3>
              <p className="text-[11px] text-zinc-400">
                UHF kapı anteni ve el okuyucularından gelen EPC kodlarını SKU, Palet/LPN veya Raf kapısıyla eşler.
              </p>
            </div>
          </div>

          <form onSubmit={handleTestRfidIngest} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end bg-black/30 p-3.5 rounded-xl border border-white/[0.06]">
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-400">Okuyucu ID</Label>
              <Input value={readerId} onChange={(e) => setReaderId(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] text-zinc-400">EPC Tag Kodu</Label>
              <Input value={epcCode} onChange={(e) => setEpcCode(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
            </div>
            <Button
              type="submit"
              disabled={sendingRfid}
              className="h-9 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Okuma Gönder</span>
            </Button>
          </form>

          <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase font-medium">
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
                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                      Henüz RFID okuması kaydedilmedi.
                    </td>
                  </tr>
                ) : (
                  rfidEvents.slice(0, 10).map((ev) => (
                    <tr key={ev.id} className="border-b border-white/[0.04]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                        {new Date(ev.scannedAt).toLocaleTimeString("tr-TR")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300">{ev.readerId}</td>
                      <td className="py-2.5 px-3 font-mono text-white">{ev.epcCode}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            ev.matchedType !== "UNMATCHED"
                              ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/20"
                              : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                          }`}
                        >
                          {ev.matchedType}: {ev.matchedLabel || "Eşleşmedi"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
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
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-3">
          <div className="text-xs font-semibold text-white">
            Donanım Okuyucu REST API Sözleşmesi
          </div>
          <p className="text-[11px] text-zinc-400">
            Sabit portal veya el RFID okuyucuları doğrudan aşağıdaki endpoint üzerinden JSON gönderebilir.
          </p>
          <pre className="bg-black/50 border border-white/[0.08] rounded-xl p-3 text-[10px] font-mono text-emerald-200 overflow-x-auto leading-relaxed">
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

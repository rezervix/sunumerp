"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp,
  BarChart2,
  FileText,
  Bell,
  ShieldCheck,
  Layers,
  Download,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Search,
  Filter,
  Sliders,
  DollarSign,
  Activity,
  Cpu,
  Package,
  History,
  Check,
  AlertOctagon,
  Sparkles,
  Send,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth/context"

export function ProductionConsolidatedWorkspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "reports" | "notifications" | "audit_trail" | "e2e_scenarios"
  >("dashboard")

  const [roleView, setRoleView] = useState<
    "FABRIKA_MUDURU" | "PLANLAMA_MUDURU" | "ATOLYE_SEFI" | "OPERATOR"
  >("FABRIKA_MUDURU")

  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [notificationRules, setNotificationRules] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditSearch, setAuditSearch] = useState("")

  // Rapor Durumu
  const [selectedReport, setSelectedReport] = useState("work_order_cost")
  const [reportData, setReportData] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)

  // Bildirim Kuralı Modalı
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState({
    name: "",
    eventType: "WORK_ORDER_DELAY",
    severity: "WARNING",
    channel: "IN_APP",
    description: "",
  })

  // E2E Senaryo Sonuçları
  const [scenarioRunning, setScenarioRunning] = useState(false)
  const [lastScenarioResult, setLastScenarioResult] = useState<any>(null)

  // Dashboard Verisi Çekme
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/production/integration?view=dashboard&roleView=${roleView}`)
      const json = await res.json()
      if (json.success) {
        setDashboardData(json.data)
      }
    } catch (err) {
      toast.error("Dashboard verileri yüklenirken hata oluştu.")
    } finally {
      setLoading(false)
    }
  }, [roleView])

  // Bildirim Kuralları Çekme
  const fetchNotificationRules = useCallback(async () => {
    try {
      const res = await fetch("/api/production/integration?view=notifications")
      const json = await res.json()
      if (json.success) {
        setNotificationRules(json.data)
      }
    } catch (err) {
      // sessizce geç
    }
  }, [])

  // Denetim İzi Çekme
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/integration?view=audit_trail&search=${encodeURIComponent(auditSearch)}`)
      const json = await res.json()
      if (json.success) {
        setAuditLogs(json.data.logs || [])
      }
    } catch (err) {
      // sessizce geç
    }
  }, [auditSearch])

  // Rapor Verisi Çekme
  const fetchReportData = useCallback(async (type: string) => {
    setReportLoading(true)
    try {
      const res = await fetch(`/api/production/integration?view=reports&reportType=${type}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.data || [])
      }
    } catch (err) {
      toast.error("Rapor verisi alınamadı.")
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    fetchNotificationRules()
  }, [fetchDashboardData, fetchNotificationRules])

  useEffect(() => {
    if (activeTab === "audit_trail") {
      fetchAuditLogs()
    } else if (activeTab === "reports") {
      fetchReportData(selectedReport)
    }
  }, [activeTab, selectedReport, fetchAuditLogs, fetchReportData])

  // CSV Dışa Aktarma
  const handleExportCsv = () => {
    window.open(`/api/production/integration?view=reports&reportType=${selectedReport}&format=csv`, "_blank")
    toast.success("Rapor Excel / CSV formatında indiriliyor...")
  }

  // Yeni Bildirim Kuralı Kaydetme
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleForm.name) {
      toast.error("Lütfen kural adını giriniz.")
      return
    }

    try {
      const res = await fetch("/api/production/integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_notification_rule",
          payload: ruleForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Bildirim kuralı başarıyla tanımlandı.")
        setIsRuleModalOpen(false)
        fetchNotificationRules()
      } else {
        toast.error(json.error || "Kural oluşturulamadı.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası oluştu.")
    }
  }

  // Uyarı Tarayıcısını Tetikleme
  const handleTriggerAlertScan = async () => {
    try {
      const res = await fetch("/api/production/integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_alerts_scan", payload: {} }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(
          `Tarama tamamlandı: ${json.data.totalScanned} adet kritik uyarı tespit edildi ve ilgili kullanıcılara iletildi.`
        )
        fetchDashboardData()
      }
    } catch (err) {
      toast.error("Tarama tetiklenemedi.")
    }
  }

  // E2E Senaryo Çalıştırma
  const handleRunScenario = async (type: "A" | "B") => {
    setScenarioRunning(true)
    setLastScenarioResult(null)
    try {
      const action = type === "A" ? "run_scenario_a" : "run_scenario_b"
      const res = await fetch("/api/production/integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: {} }),
      })
      const json = await res.json()
      if (json.success) {
        setLastScenarioResult(json.data)
        toast.success(`Uçtan uca Senaryo ${type} başarıyla tamamlandı!`)
        fetchDashboardData()
      } else {
        toast.error(json.error || "Senaryo icra edilirken hata oluştu.")
      }
    } catch (err) {
      toast.error("Senaryo motoru sunucu hatası.")
    } finally {
      setScenarioRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Üst Konsolide Başlık & Rol Seçimi */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Konsolide Üretim Yönetim Merkezi & Raporlama
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Satış, MRP, İş Emri, Kapasite, Kalite Kontrol ve Bakım modülleri arasında uçtan uca senkronizasyon, OTD ve anlık bildirimler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10">
            <span className="text-xs text-zinc-400 pl-2 pr-1">Rol Görünümü:</span>
            <Select value={roleView} onValueChange={(val: any) => setRoleView(val)}>
              <SelectTrigger className="h-8 border-none bg-transparent text-xs font-semibold text-purple-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                <SelectItem value="FABRIKA_MUDURU">Fabrika Müdürü (Finansal & Genel)</SelectItem>
                <SelectItem value="PLANLAMA_MUDURU">Planlama Müdürü (MRP & Kapasite)</SelectItem>
                <SelectItem value="ATOLYE_SEFI">Atölye Şefi (İş Emirleri & İcra)</SelectItem>
                <SelectItem value="OPERATOR">Operatör (Tezgah & Kalite)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 text-zinc-300 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerAlertScan}
            className="bg-amber-600 hover:bg-amber-500 text-white h-9"
          >
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            Alarmları Tara
          </Button>
        </div>
      </div>

      {/* Ana KPI Kartları (Rol Duyarlı) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* OTD */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Zamanında Teslim (OTD)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            %{dashboardData?.kpis?.onTimeDeliveryPct ?? "95.5"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {dashboardData?.counts?.completedWorkOrders ?? 0} tamamlanan iş emri
          </div>
        </div>

        {/* Schedule Adherence */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Çizelge Uyumu</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            %{dashboardData?.kpis?.scheduleAdherencePct ?? "92.0"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Planlanan vs Fiili üretim
          </div>
        </div>

        {/* OEE */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Fabrika OEE</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            %{dashboardData?.kpis?.overallOeePct ?? "84.2"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {dashboardData?.counts?.totalMachines ?? 0} aktif tezgah parkı
          </div>
        </div>

        {/* Ret / Fire */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Ret / Fire Oranı</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            %{dashboardData?.kpis?.scrapRatePct ?? "1.8"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {dashboardData?.counts?.rejectedInspections ?? 0} ret muayenesi
          </div>
        </div>

        {/* Kapasite Doluluk */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Kapasite Doluluk</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            %{dashboardData?.kpis?.capacityUtilizationPct ?? "78.4"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Haftalık çizelgelenen mesai
          </div>
        </div>

        {/* Kritik Malzeme Açığı */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Kritik Stok Açığı</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {dashboardData?.kpis?.lowStockItemCount ?? 0} <span className="text-xs text-zinc-400 font-normal">kalem</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Asgari stok altındaki hammadde
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex border-b border-white/[0.08] overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Genel Dashboard & Süreç Durumu
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Rapor Seti & Excel / CSV
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "notifications"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          Bildirim Merkezi & Kurallar ({notificationRules.length})
        </button>

        <button
          onClick={() => setActiveTab("audit_trail")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "audit_trail"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <History className="w-4 h-4" />
          Denetim İzi (Audit Trail)
        </button>

        <button
          onClick={() => setActiveTab("e2e_scenarios")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "e2e_scenarios"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Play className="w-4 h-4 text-emerald-400" />
          Uçtan Uca Entegrasyon Senaryoları
        </button>
      </div>

      {/* SEKME 1: DASHBOARD VE SÜREÇ DURUMU */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Süreç Entegrasyon Akışı */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Uçtan Uca Üretim Akış Durumu
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Aktif İş Emirleri:</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {dashboardData?.counts?.activeWorkOrders ?? 0} Adet
                  </div>
                  <span className="text-[11px] text-cyan-400">Atölyede İcrada</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Geciken İşler:</span>
                  <div className="text-lg font-bold text-red-400 mt-1">
                    {dashboardData?.counts?.delayedWorkOrders ?? 0} Adet
                  </div>
                  <span className="text-[11px] text-red-400/80">Termin Aşımı</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Arızalı Ekipman:</span>
                  <div className="text-lg font-bold text-amber-400 mt-1">
                    {dashboardData?.counts?.downMachines ?? 0} Tezgah
                  </div>
                  <span className="text-[11px] text-amber-400/80">Duruş Halinde</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Muayene Sayısı:</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {dashboardData?.counts?.totalInspections ?? 0} Muayene
                  </div>
                  <span className="text-[11px] text-emerald-400/80">Kalite Kontrolü</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-purple-500/[0.05] border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                <span>Rol Bakış Açısı: <strong className="text-white">{roleView}</strong></span>
                <span className="text-[11px] text-zinc-400">Modüller senkronize çalışıyor</span>
              </div>
            </div>

            {/* Son Olaylar ve Alarmlar */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Son Üretim Alarmları ve Bildirimler
              </h3>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {(!dashboardData?.recentAlerts || dashboardData.recentAlerts.length === 0) ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    Aktif kritik ikaz bulunmuyor. Sistem olağan seyrinde.
                  </div>
                ) : (
                  dashboardData.recentAlerts.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-lg border border-white/[0.05] bg-white/[0.02] flex items-start gap-2.5 text-xs"
                    >
                      {n.type === "error" ? (
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-zinc-200">{n.title}</div>
                        <div className="text-zinc-400 mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {new Date(n.createdAt).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: RAPOR SETİ */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="w-[260px] bg-white/[0.03] border-white/10 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                  <SelectItem value="work_order_cost">İş Emri Maliyet Analizi Raporu</SelectItem>
                  <SelectItem value="material_variance">Malzeme Tüketim & Sapma Raporu</SelectItem>
                  <SelectItem value="machine_efficiency">Makine Verimlilik & OEE Raporu</SelectItem>
                  <SelectItem value="maintenance_cost">Bakım Maliyeti Dağılım Raporu</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReportData(selectedReport)}
                disabled={reportLoading}
                className="border-white/10 text-zinc-300"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${reportLoading ? "animate-spin" : ""}`} />
                Yenile
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleExportCsv}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Excel / CSV Olarak İndir
            </Button>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  {selectedReport === "work_order_cost" && (
                    <>
                      <TableHead className="text-zinc-400">İş Emri No</TableHead>
                      <TableHead className="text-zinc-400">Planlanan Maliyet</TableHead>
                      <TableHead className="text-zinc-400">Fiili Maliyet</TableHead>
                      <TableHead className="text-zinc-400">Maliyet Farkı</TableHead>
                      <TableHead className="text-zinc-400">Sapma (%)</TableHead>
                      <TableHead className="text-zinc-400">Malzeme Farkı</TableHead>
                      <TableHead className="text-zinc-400">İşçilik Farkı</TableHead>
                    </>
                  )}
                  {selectedReport === "material_variance" && (
                    <>
                      <TableHead className="text-zinc-400">Malzeme Kodu</TableHead>
                      <TableHead className="text-zinc-400">Malzeme Adı</TableHead>
                      <TableHead className="text-zinc-400">Planlanan Miktar</TableHead>
                      <TableHead className="text-zinc-400">Fiili Tüketim</TableHead>
                      <TableHead className="text-zinc-400">Fark Miktar</TableHead>
                      <TableHead className="text-zinc-400">Sapma (%)</TableHead>
                      <TableHead className="text-zinc-400">Maliyet Etkisi</TableHead>
                    </>
                  )}
                  {selectedReport === "machine_efficiency" && (
                    <>
                      <TableHead className="text-zinc-400">Makine Kodu</TableHead>
                      <TableHead className="text-zinc-400">Makine Adı</TableHead>
                      <TableHead className="text-zinc-400">Kritiklik</TableHead>
                      <TableHead className="text-zinc-400">Çalışma Saati</TableHead>
                      <TableHead className="text-zinc-400">Duruş (Dk)</TableHead>
                      <TableHead className="text-zinc-400">MTBF (Saat)</TableHead>
                      <TableHead className="text-zinc-400">MTTR (Dk)</TableHead>
                      <TableHead className="text-zinc-400">OEE (%)</TableHead>
                    </>
                  )}
                  {selectedReport === "maintenance_cost" && (
                    <>
                      <TableHead className="text-zinc-400">Bakım İş Emri</TableHead>
                      <TableHead className="text-zinc-400">Makine</TableHead>
                      <TableHead className="text-zinc-400">Tür</TableHead>
                      <TableHead className="text-zinc-400">Duruş Süresi</TableHead>
                      <TableHead className="text-zinc-400">Yedek Parça Tutarı</TableHead>
                      <TableHead className="text-zinc-400">İşçilik Tutarı</TableHead>
                      <TableHead className="text-zinc-400">Toplam Tutar</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Rapor için uygun kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row: any, idx: number) => (
                    <TableRow key={idx} className="border-white/[0.05] hover:bg-white/[0.02]">
                      {selectedReport === "work_order_cost" && (
                        <>
                          <TableCell className="font-mono text-xs font-semibold text-purple-400">{row.workOrderNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">₺{(row.totalPlannedCost || 0).toLocaleString("tr-TR")}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-200">₺{(row.totalActualCost || 0).toLocaleString("tr-TR")}</TableCell>
                          <TableCell className={`font-mono text-xs font-bold ${row.varianceAmount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {row.varianceAmount > 0 ? `+₺${row.varianceAmount}` : `₺${row.varianceAmount}`}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">%{row.variancePercentage}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">₺{row.materialVariance}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">₺{row.laborVariance}</TableCell>
                        </>
                      )}
                      {selectedReport === "material_variance" && (
                        <>
                          <TableCell className="font-mono text-xs text-amber-400">{row.itemCode}</TableCell>
                          <TableCell className="text-sm text-zinc-200">{row.itemName}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">{row.plannedQuantity} {row.unit}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-200 font-semibold">{row.actualQuantity} {row.unit}</TableCell>
                          <TableCell className={`font-mono text-xs ${row.varianceQuantity > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {row.varianceQuantity > 0 ? `+${row.varianceQuantity}` : row.varianceQuantity}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">%{row.variancePercentage}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-zinc-200">₺{row.varianceCost}</TableCell>
                        </>
                      )}
                      {selectedReport === "machine_efficiency" && (
                        <>
                          <TableCell className="font-mono text-xs text-cyan-400">{row.machineCode}</TableCell>
                          <TableCell className="text-sm text-white font-medium">{row.machineName}</TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 font-bold">
                              {row.criticality}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">{row.operatingHours} saat</TableCell>
                          <TableCell className="font-mono text-xs text-red-400">{row.totalDowntimeMinutes} dk</TableCell>
                          <TableCell className="font-mono text-xs text-blue-400">{row.mtbfHours} saat</TableCell>
                          <TableCell className="font-mono text-xs text-amber-400">{row.mttrMinutes} dk</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-emerald-400">%{row.oeePct}</TableCell>
                        </>
                      )}
                      {selectedReport === "maintenance_cost" && (
                        <>
                          <TableCell className="font-mono text-xs text-purple-400">{row.workOrderNumber}</TableCell>
                          <TableCell className="text-sm text-white">{row.machineName}</TableCell>
                          <TableCell className="text-xs text-zinc-400">{row.type}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">{row.downtimeMinutes} dk</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">₺{(row.sparePartsCost || 0).toLocaleString("tr-TR")}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">₺{(row.laborCost || 0).toLocaleString("tr-TR")}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-white">₺{(row.totalCost || 0).toLocaleString("tr-TR")}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 3: BİLDİRİM MERKEZİ & KURALLAR */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">Olay Bazlı Bildirim Kuralları</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kritik üretim gecikmeleri, kalite retleri, kalibrasyon ve arıza durumlarında anlık bildirim tetikleyicileri.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsRuleModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Yeni Kural Tanımla
            </Button>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400">Kural Adı</TableHead>
                  <TableHead className="text-zinc-400">Olay Türü</TableHead>
                  <TableHead className="text-zinc-400">Önem Derecesi</TableHead>
                  <TableHead className="text-zinc-400">Kanal</TableHead>
                  <TableHead className="text-zinc-400">Hedef Roller</TableHead>
                  <TableHead className="text-zinc-400">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                      Henüz bildirim kuralı tanımlanmamış.
                    </TableCell>
                  </TableRow>
                ) : (
                  notificationRules.map((rule) => (
                    <TableRow key={rule.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                      <TableCell className="text-sm font-semibold text-white">{rule.name}</TableCell>
                      <TableCell className="font-mono text-xs text-purple-300">{rule.eventType}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                            rule.severity === "CRITICAL"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : rule.severity === "WARNING"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-300">{rule.channel}</TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {rule.targetRoles?.join(", ") || "Tüm Roller"}
                      </TableCell>
                      <TableCell>
                        {rule.isActive ? (
                          <span className="text-xs text-emerald-400 font-medium">Aktif</span>
                        ) : (
                          <span className="text-xs text-zinc-500">Pasif</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 4: DENETİM İZİ (AUDIT TRAIL) */}
      {activeTab === "audit_trail" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="İşlem, kaynak veya detay ara..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="pl-9 bg-white/[0.02] border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              className="border-white/10 text-zinc-300"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Yenile
            </Button>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400">Tarih</TableHead>
                  <TableHead className="text-zinc-400">Kullanıcı</TableHead>
                  <TableHead className="text-zinc-400">Kaynak (Resource)</TableHead>
                  <TableHead className="text-zinc-400">İşlem (Action)</TableHead>
                  <TableHead className="text-zinc-400">Detaylar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                      Üretim modüllerine ait denetim logu bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-xs text-zinc-400">
                        {new Date(log.createdAt).toLocaleString("tr-TR")}
                      </TableCell>
                      <TableCell className="text-xs text-white font-medium">
                        {log.user?.fullName || log.userId}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-purple-400 font-semibold">
                        {log.resource}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 text-zinc-200">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-300 max-w-md truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 5: UÇTAN UCA ENTEGRASYON SENARYOLARI */}
      {activeTab === "e2e_scenarios" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SENARYO A */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-xs rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Senaryo A
                </span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white">
                Siparişten Sevkiyata ve Fiili Maliyete Uçtan Uca Akış
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Satış Siparişi → MPS / MRP İhtiyaç Patlatımı → Eksik Hammadde Satınalma Talebi → İş Emri Reçete/Rota Snapshot'ı → Atölye İcrası → Kalite AQL Muayenesi & Kabulü → Mamul Girişi & FIFO CostLayer → Sevkiyat ve Fiili Maliyet Varyansı.
              </p>
              <Button
                onClick={() => handleRunScenario("A")}
                disabled={scenarioRunning}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white mt-2"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Senaryo A'yı Başlat ve Simüle Et
              </Button>
            </div>

            {/* SENARYO B */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-xs rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Senaryo B
                </span>
                <Wrench className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">
                Sensör Arızası → Bakım → Kapasite Çakışması ve İyileşme
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Kestirimci Bakım Titreşim Telemetrisi Aşımı → Otomatik Acil Arıza İş Emri → Makinenin DOWN Yapılması → Kapasite Çizelgesinde Çakışma Alarmı → Onarım İcrası (Duruş ve Yedek Parça Tüketimi) → Makinenin ACTIVE Yapılması ve OEE/MTBF/MTTR Güncellenmesi.
              </p>
              <Button
                onClick={() => handleRunScenario("B")}
                disabled={scenarioRunning}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white mt-2"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Senaryo B'yi Başlat ve Simüle Et
              </Button>
            </div>
          </div>

          {/* Son Senaryo Sonuç Kartı */}
          {lastScenarioResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Uçtan Uca Senaryo {lastScenarioResult.scenario} Başarıyla Tamamlandı!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {lastScenarioResult.scenario === "A" && (
                  <>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Üretilen İş Emri:</span>
                      <div className="font-mono font-bold text-white mt-0.5">#{lastScenarioResult.workOrderNumber}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Satınalma Talebi:</span>
                      <div className="font-mono font-bold text-white mt-0.5">#{lastScenarioResult.purchaseRequisitionNumber}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Kalite Muayenesi:</span>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">KABUL (#{lastScenarioResult.inspectionNumber})</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Zamanında Teslim:</span>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">%{lastScenarioResult.otdPercentage} OTD</div>
                    </div>
                  </>
                )}
                {lastScenarioResult.scenario === "B" && (
                  <>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">İlgili Ekipman:</span>
                      <div className="font-mono font-bold text-white mt-0.5">{lastScenarioResult.machineCode}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Bakım İş Emri:</span>
                      <div className="font-mono font-bold text-white mt-0.5">#{lastScenarioResult.maintOrderNumber}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Duruş Süresi:</span>
                      <div className="font-mono font-bold text-amber-400 mt-0.5">{lastScenarioResult.downtimeMinutes} Dakika</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-zinc-400">Yeni Makine Durumu:</span>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">{lastScenarioResult.finalMachineStatus}</div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* MODAL: YENİ BİLDİRİM KURALI */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              Yeni Bildirim Kuralı Oluştur
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Üretim olaylarına duyarlı otomatik uyarı mekanizması.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs text-zinc-300">Kural Adı *</Label>
              <Input
                placeholder="Örn: 24 Saati Aşan İş Emri Gecikme Uyarısı"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Olay Türü</Label>
                <Select
                  value={ruleForm.eventType}
                  onValueChange={(val) => setRuleForm({ ...ruleForm, eventType: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="WORK_ORDER_DELAY">İş Emri Gecikmesi</SelectItem>
                    <SelectItem value="CAPACITY_OVERLOAD">Kapasite Aşımı</SelectItem>
                    <SelectItem value="QUALITY_REJECTION">Kalite Muayene Ret / NCR</SelectItem>
                    <SelectItem value="CALIBRATION_EXPIRING">Kalibrasyon Dolan Cihaz</SelectItem>
                    <SelectItem value="MAINTENANCE_OVERDUE">Geciken Periyodik Bakım</SelectItem>
                    <SelectItem value="CRITICAL_STOCK_SHORTAGE">Kritik Stok Açığı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Önem Derecesi</Label>
                <Select
                  value={ruleForm.severity}
                  onValueChange={(val: any) => setRuleForm({ ...ruleForm, severity: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="INFO">Bilgi (Info)</SelectItem>
                    <SelectItem value="WARNING">Uyarı (Warning)</SelectItem>
                    <SelectItem value="CRITICAL">Kritik (Critical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Kanal</Label>
              <Select
                value={ruleForm.channel}
                onValueChange={(val: any) => setRuleForm({ ...ruleForm, channel: val })}
              >
                <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                  <SelectItem value="IN_APP">Uygulama İçi (In-App)</SelectItem>
                  <SelectItem value="EMAIL">E-Posta</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="ALL">Tüm Kanallar (Omnichannel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Açıklama</Label>
              <Input
                placeholder="Kural tetiklenme şartları..."
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRuleModalOpen(false)}
                className="border-white/10 text-zinc-300"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white">
                Kuralı Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


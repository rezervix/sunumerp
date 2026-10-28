"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  Play, Pause, CheckCircle2, Clock, Users, ShieldAlert, FileSpreadsheet, FileText, 
  Search, RefreshCw, AlertTriangle, UserMinus, UserCheck, ArrowRightLeft, TrendingUp,
  ClipboardCheck, MessageCircle
} from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend } from "recharts"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"

export default function PersonelDenetimPage() {
  const { t, tText } = useLanguage()
  const { session, isSuperAdmin } = useAuth()
  const currentUserId = session?.user?.id
  const router = useRouter()

  // Tab yönetimi
  const [activeTab, setActiveTab] = useState("my-task")

  // Rol durumları (Yönetici / İK kontrolü)
  const [isManager, setIsManager] = useState(false)
  const [isHr, setIsHr] = useState(false)

  // 1. Benim Aktif Görevim Tabı State'leri
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [activeTask, setActiveTask] = useState<any | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [completionNote, setCompletionNote] = useState("")
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 2. Canlı Ekip Panosu Tabı State'leri
  const [teamList, setTeamList] = useState<any[]>([])
  const [dailySummary, setDailySummary] = useState({ completed: 0, started: 0, overdue: 0 })
  const [selectedLeaderDept, setSelectedLeaderDept] = useState("")
  const [reassignTaskId, setReassignTaskId] = useState("")
  const [reassignTargetUserId, setReassignTargetUserId] = useState("")
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])

  // 3. Yönetim Dashboard'u Tabı State'leri
  const [mgmtSummary, setMgmtSummary] = useState({ completedCount: 0, avgDurationHours: 0, overdueCount: 0, completionRate: 0 })
  const [warnings, setWarnings] = useState<any[]>([])
  const [deptMetrics, setDeptMetrics] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState<any | null>(null)

  // 4. İK / Performans Tabı State'leri
  const [hrReports, setHrReports] = useState<any[]>([])
  const [peerAverages, setPeerAverages] = useState<any[]>([])
  const [rawLogs, setRawLogs] = useState<any[]>([])
  const [hrPeriod, setHrPeriod] = useState("month")

  // Genel yükleniyor durumu
  const [loading, setLoading] = useState(true)

  // ────────────────────────────────────────────────────────
  // DATA FETCHING METODLARI
  // ────────────────────────────────────────────────────────

  // 1. Kullanıcı kendi aktif durumunu çeker
  const fetchMyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/personel-denetim/status")
      if (res.ok) {
        const data = await res.json()
        setActiveTask(data.activeTask)
        setMyTasks(data.myTasks)
        if (data.activeTask?.startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(data.activeTask.startedAt).getTime()) / 1000)
          setTimerSeconds(elapsed > 0 ? elapsed : 0)
        } else {
          setTimerSeconds(0)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // 2. Canlı Ekip Panosu verilerini çeker
  const fetchTeamStatus = useCallback(async () => {
    try {
      const query = selectedLeaderDept ? `?role=leader&department=${encodeURIComponent(selectedLeaderDept)}` : "?role=leader"
      const res = await fetch(`/api/personel-denetim/dashboard${query}`)
      if (res.ok) {
        const data = await res.json()
        setTeamList(data.teamList || [])
        setDailySummary(data.dailySummary || { completed: 0, started: 0, overdue: 0 })
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedLeaderDept])

  // 3. Yönetim Dashboard verilerini çeker
  const fetchMgmtDashboard = useCallback(async () => {
    try {
      const query = searchQuery ? `?role=management&searchUser=${encodeURIComponent(searchQuery)}` : "?role=management"
      const res = await fetch(`/api/personel-denetim/dashboard${query}`)
      if (res.ok) {
        const data = await res.json()
        setMgmtSummary(data.summary || { completedCount: 0, avgDurationHours: 0, overdueCount: 0, completionRate: 0 })
        setWarnings(data.warnings || [])
        setDeptMetrics(data.departmentMetrics || [])
        setTrendData(data.trendData || [])
        if (searchQuery && data.searchResult) {
          setSearchResult(data.searchResult)
        } else if (!searchQuery) {
          setSearchResult(null)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [searchQuery])

  // 4. İK Performans raporlarını çeker
  const fetchHrDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/personel-denetim/dashboard?role=hr&period=${hrPeriod}`)
      if (res.ok) {
        const data = await res.json()
        setHrReports(data.hrReports || [])
        setPeerAverages(data.peerAverages || [])
        setRawLogs(data.rawLogs || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [hrPeriod])

  // İlk yükleme ve rol yetkilendirmesi
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      // Rol tespiti yap (İş Takip api'sinden veya auth session'dan alabiliriz)
      try {
        const tasksRes = await fetch("/api/tasks")
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          setIsManager(tasksData.isManager || isSuperAdmin)
        }
        
        // Departman İK ise İK sekmesini aç
        const userPosition = (session?.user as any)?.position || ""
        const userDept = (session?.user as any)?.department || ""
        if (userDept.toLowerCase().includes("ik") || userDept.toLowerCase().includes("insan") || isSuperAdmin) {
          setIsHr(true)
        }

        // Fetch users for reassignment dropdown
        const usersRes = await fetch("/api/users")
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setAllUsers(usersData.data || usersData || [])
        }
      } catch (e) {
        console.error("Yetki doğrulanırken hata:", e)
      }

      await fetchMyStatus()
      setLoading(false)
    }
    if (session) {
      init()
    }
  }, [session, isSuperAdmin, fetchMyStatus])

  // Aktif sekme değiştikçe ilgili verileri yükle
  useEffect(() => {
    if (activeTab === "my-task") {
      fetchMyStatus()
    } else if (activeTab === "team-live" && isManager) {
      fetchTeamStatus()
    } else if (activeTab === "mgmt" && isManager) {
      fetchMgmtDashboard()
    } else if (activeTab === "hr" && isHr) {
      fetchHrDashboard()
    }
  }, [activeTab, isManager, isHr, fetchMyStatus, fetchTeamStatus, fetchMgmtDashboard, fetchHrDashboard])

  // Timer tik tak mantığı
  useEffect(() => {
    if (activeTask) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerSeconds(0)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeTask])

  // Zaman formatlayıcı (SS:DD:SN)
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // ────────────────────────────────────────────────────────
  // MUTATION METODLARI (STATE MACHINE ACTIONS)
  // ────────────────────────────────────────────────────────

  // Göreve Başla / Devam Et
  const handleStartTask = async (taskId: string, isResume = false) => {
    try {
      const res = await fetch("/api/personel-denetim/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          action: isResume ? "RESUME" : "START"
        })
      })
      if (res.ok) {
        toast.success(isResume ? "Görev çalışması devam ettirildi." : "Göreve başlandı.")
        setSelectedTaskId("")
        fetchMyStatus()
      } else {
        const err = await res.json()
        toast.error(err.error || "İşlem başarısız oldu.")
      }
    } catch (e) {
      toast.error("Bir hata oluştu.")
    }
  }

  // Görevi Duraklat
  const handlePauseTask = async () => {
    if (!activeTask) return
    try {
      const res = await fetch("/api/personel-denetim/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTask.id,
          action: "PAUSE",
          note: "Kullanıcı isteğiyle duraklatıldı."
        })
      })
      if (res.ok) {
        toast.success("Görev duraklatıldı.")
        fetchMyStatus()
      } else {
        toast.error("Duraklatma başarısız.")
      }
    } catch (e) {
      toast.error("Bir hata oluştu.")
    }
  }

  // Görevi Tamamla
  const handleCompleteTask = async () => {
    const taskId = activeTask ? activeTask.id : selectedTaskId
    if (!taskId) return

    try {
      const res = await fetch("/api/personel-denetim/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          action: "COMPLETE",
          note: completionNote
        })
      })
      if (res.ok) {
        toast.success("Görev başarıyla tamamlandı.")
        setCompletionNote("")
        setIsCompleteDialogOpen(false)
        setSelectedTaskId("")
        fetchMyStatus()
      } else {
        toast.error("Görev tamamlanamadı.")
      }
    } catch (e) {
      toast.error("Bir hata oluştu.")
    }
  }

  // Görevi Yeniden Ata (Devret)
  const handleReassignTask = async () => {
    if (!reassignTaskId || !reassignTargetUserId) return
    try {
      const res = await fetch("/api/personel-denetim/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: reassignTaskId,
          newAssigneeId: reassignTargetUserId
        })
      })
      if (res.ok) {
        toast.success("Görev başarıyla devredildi.")
        setReassignTaskId("")
        setReassignTargetUserId("")
        setIsReassignDialogOpen(false)
        fetchTeamStatus()
      } else {
        const err = await res.json()
        toast.error(err.error || "Devir işlemi başarısız.")
      }
    } catch (e) {
      toast.error("Bir hata oluştu.")
    }
  }

  // ────────────────────────────────────────────────────────
  // EXPORT METODLARI
  // ────────────────────────────────────────────────────────

  // Excel Raporu Aktarımı (SheetJS)
  const exportToExcel = () => {
    if (hrReports.length === 0) {
      toast.error("Aktarılacak veri bulunamadı.")
      return
    }

    // Çalışan Performans Tablosu Sayfası
    const worksheetPerf = XLSX.utils.json_to_sheet(hrReports.map(rep => ({
      "Personel Adı Soyadı": rep.fullName,
      "Departman": rep.department || "Genel",
      "Pozisyon": rep.position || "Belirtilmemiş",
      "Tamamlanan Görev Sayısı": rep.completedCount,
      "Ortalama Görev Süresi (Saat)": rep.avgHours,
      "Zamanında Teslim Oranı (%)": rep.onTimeRate,
      "Genel Görev Başarı Oranı (%)": rep.completionRate
    })))

    // Departman Akran Ortalamaları Sayfası
    const worksheetAverages = XLSX.utils.json_to_sheet(peerAverages.map(avg => ({
      "Departman Adı": avg.department,
      "Ortalama Başarı Oranı (%)": avg.avgCompletionRate,
      "Ortalama Bitirme Süresi (Saat)": avg.avgHours
    })))

    // Ham Log Kayıtları Sayfası
    const worksheetLogs = XLSX.utils.json_to_sheet(rawLogs.map(log => ({
      "Zaman Damgası": new Date(log.startedAt).toLocaleString("tr-TR"),
      "Personel": log.userFullName,
      "Departman": log.department,
      "Görev Başlığı": log.taskTitle,
      "Aksiyon": log.status === "START" ? "Başlatıldı" : log.status === "PAUSE" ? "Durduruldu" : log.status === "RESUME" ? "Devam Ettirildi" : "Tamamlandı",
      "Bitiş Zamanı": log.endedAt ? new Date(log.endedAt).toLocaleString("tr-TR") : "-",
      "İşlem Notu": log.note || "-"
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheetPerf, "Personel Performansları")
    XLSX.utils.book_append_sheet(workbook, worksheetAverages, "Ekip Akran Ortalamaları")
    XLSX.utils.book_append_sheet(workbook, worksheetLogs, "Denetim Kayıtları (Logs)")

    XLSX.writeFile(workbook, `ERP_Personel_Performans_Raporu_${hrPeriod}.xlsx`)
    toast.success("Excel başarıyla dışa aktarıldı.")
  }

  // PDF Raporu Aktarımı (jsPDF)
  const exportToPdf = () => {
    if (hrReports.length === 0) {
      toast.error("Aktarılacak veri bulunamadı.")
      return
    }

    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Personel Denetim ve Görev Performans Değerlendirme Raporu", 10, 15)
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Rapor Periyodu: ${hrPeriod === "week" ? "Haftalık" : hrPeriod === "quarter" ? "3 Aylık" : "Aylık"}`, 10, 23)
    doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, 10, 28)
    
    // Çizgi
    doc.line(10, 32, 200, 32)
    
    // Tablo Başlıkları
    doc.setFont("helvetica", "bold")
    doc.text("Personel", 10, 40)
    doc.text("Departman", 55, 40)
    doc.text("Bitirilen", 95, 40)
    doc.text("Ort. Süre", 120, 40)
    doc.text("Zamanında %", 145, 40)
    doc.text("Başarı %", 175, 40)
    
    doc.line(10, 43, 200, 43)
    
    doc.setFont("helvetica", "normal")
    let y = 50
    
    hrReports.forEach(rep => {
      if (y > 280) {
        doc.addPage()
        y = 20
        // Başlıkları tekrar yaz
        doc.setFont("helvetica", "bold")
        doc.text("Personel", 10, y)
        doc.text("Departman", 55, y)
        doc.text("Bitirilen", 95, y)
        doc.text("Ort. Süre", 120, y)
        doc.text("Zamanında %", 145, y)
        doc.text("Başarı %", 175, y)
        doc.line(10, y + 3, 200, y + 3)
        doc.setFont("helvetica", "normal")
        y += 10
      }
      
      doc.text(rep.fullName.substring(0, 20), 10, y)
      doc.text((rep.department || "Genel").substring(0, 15), 55, y)
      doc.text(String(rep.completedCount), 102, y)
      doc.text(`${rep.avgHours} Saat`, 122, y)
      doc.text(`%${rep.onTimeRate}`, 150, y)
      doc.text(`%${rep.completionRate}`, 180, y)
      
      y += 8
    })

    // Akran Ortalamaları Bölümü
    y += 10
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("Departman Akran Ortalamaları", 10, y)
    y += 8
    doc.setFontSize(11)
    doc.text("Departman", 10, y)
    doc.text("Ort. Başarı Oranı", 70, y)
    doc.text("Ort. Görev Süresi", 130, y)
    doc.line(10, y + 2, 200, y + 2)
    doc.setFont("helvetica", "normal")
    y += 10

    peerAverages.forEach(avg => {
      doc.text(avg.department, 10, y)
      doc.text(`%${avg.avgCompletionRate}`, 75, y)
      doc.text(`${avg.avgHours} Saat`, 135, y)
      y += 8
    })

    // Add vendor watermark/footer badge on all pages
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text("Generated via Sunum ERP System", 10, 287)
    }
    
    doc.save(`ERP_Personel_Performans_Raporu_${hrPeriod}.pdf`)
    toast.success("PDF başarıyla dışa aktarıldı.")
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Ekip Yük Durumu ve Denetim
          </h1>
          <p className="text-muted-foreground mt-1">
            Şeffaflık, dengeli iş yükü yönetimi ve dönemsel personel performans takibi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/dashboard/personel-denetim/gun-sonu")}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            size="sm"
          >
            <ClipboardCheck className="h-4 w-4" />
            Gün Sonu Raporu
          </Button>
          {isManager && (
            <Button
              onClick={() => router.push("/dashboard/personel-denetim/musteri-talepleri")}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              size="sm"
            >
              <MessageCircle className="h-4 w-4" />
              Müşteri Talepleri
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              fetchMyStatus()
              if (isManager) fetchTeamStatus()
              if (isManager) fetchMgmtDashboard()
              if (isHr) fetchHrDashboard()
              toast.success("Veriler güncellendi.")
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-20">
          <Clock className="h-10 w-10 text-primary animate-spin" />
          <p className="text-slate-500 font-medium">Veriler yükleniyor...</p>
        </div>
      ) : (
        <Tabs defaultValue="my-task" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-2xl bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="my-task" className="rounded-lg font-medium transition-all">Aktif Görevim</TabsTrigger>
            {isManager && (
              <TabsTrigger value="team-live" className="rounded-lg font-medium transition-all">Canlı Ekip Panosu</TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="mgmt" className="rounded-lg font-medium transition-all">Yönetim Paneli</TabsTrigger>
            )}
            {isHr && (
              <TabsTrigger value="hr" className="rounded-lg font-medium transition-all">İK / Performans</TabsTrigger>
            )}
          </TabsList>

          {/* ────────────────────────────────────────────────────────
              TAB 1: BENİM AKTİF GÖREVİM
             ──────────────────────────────────────────────────────── */}
          <TabsContent value="my-task" className="space-y-6 focus-visible:outline-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sol Taraf: Aktif Görev Paneli */}
              <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-slate-100/50 to-blue-50/20 dark:from-slate-800/20 dark:to-slate-800/10 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                    Şu An Çalıştığım Görev
                  </CardTitle>
                  <CardDescription>
                    Gerçek zamanlı iş bildirim ve zaman takip aracı.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {activeTask ? (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            activeTask.priority === "URGENT" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                            activeTask.priority === "HIGH" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                            activeTask.priority === "MEDIUM" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                            "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                          }`}>
                            {activeTask.priority === "URGENT" ? "Acil" : 
                             activeTask.priority === "HIGH" ? "Yüksek" : 
                             activeTask.priority === "MEDIUM" ? "Orta" : "Düşük"} Öncelik
                          </span>
                          <h3 className="text-2xl font-bold mt-2 text-slate-900 dark:text-white leading-tight">
                            {activeTask.title}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-xl">
                            {activeTask.description || "Açıklama girilmemiş."}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span>Atayan: <strong className="text-slate-700 dark:text-slate-300">{activeTask.assigner?.fullName}</strong></span>
                            {activeTask.dueDate && (
                              <span>Bitiş Tarihi: <strong className="text-red-500">{new Date(activeTask.dueDate).toLocaleDateString("tr-TR")}</strong></span>
                            )}
                          </div>
                        </div>
                        
                        {/* Timer Göstergesi */}
                        <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 border p-4 rounded-2xl min-w-[140px] shadow-inner">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktif Süre</span>
                          <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {formatTime(timerSeconds)}
                          </span>
                        </div>
                      </div>

                      {/* Kontroller */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                        <Button 
                          variant="outline"
                          onClick={handlePauseTask}
                          className="gap-2 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                        >
                          <Pause className="h-4 w-4" />
                          Çalışmayı Duraklat
                        </Button>
                        <Button 
                          onClick={() => setIsCompleteDialogOpen(true)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Görevi Tamamla
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <AlertTriangle className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Şu An Boştasınız</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">
                          Aktif olarak çalıştığınız herhangi bir görev bulunmuyor. Lütfen yan taraftaki listeden bir göreve başlayın.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sağ Taraf: Görev Listesi ve Başlatıcı */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Atanmış Görevlerim</CardTitle>
                  <CardDescription>Üzerinizde bulunan bekleyen görevler.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myTasks.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {myTasks.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => setSelectedTaskId(t.id)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            selectedTaskId === t.id 
                              ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20" 
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">{t.priority}</span>
                            <span className="text-xs text-slate-400">
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString("tr-TR") : "Süre Yok"}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-slate-950 dark:text-slate-50 mt-1 truncate">{t.title}</h4>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">Atanmış bekleyen göreviniz bulunmuyor.</p>
                  )}

                  <div className="pt-4 border-t">
                    <Button 
                      disabled={!selectedTaskId}
                      onClick={() => handleStartTask(selectedTaskId)}
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Play className="h-4 w-4" />
                      Seçilen Göreve Başla
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Görevi Bitirme Not Giriş Dialogu */}
            {isCompleteDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
                  <CardHeader>
                    <CardTitle className="text-xl">Görevi Tamamla</CardTitle>
                    <CardDescription>Yapılan çalışmaya dair kısa bir not girebilirsiniz.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      placeholder="Tamamlanma açıklaması veya notu yazın..."
                      value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      className="w-full min-h-[100px] border p-2 rounded-lg text-sm bg-background"
                    />
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => setIsCompleteDialogOpen(false)}>Vazgeç</Button>
                      <Button size="sm" onClick={handleCompleteTask} className="bg-emerald-600 hover:bg-emerald-700 text-white">Gönder & Tamamla</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ────────────────────────────────────────────────────────
              TAB 2: CANLI EKİP PANOSU (KANDAN BENZERİ GÖRÜNÜM)
             ──────────────────────────────────────────────────────── */}
          {isManager && (
            <TabsContent value="team-live" className="space-y-6 focus-visible:outline-hidden">
              
              {/* Daily mini statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Play className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Bugün Başlanan Çalışmalar</span>
                      <strong className="text-2xl font-bold">{dailySummary.started}</strong>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Bugün Tamamlanan Görevler</span>
                      <strong className="text-2xl font-bold">{dailySummary.completed}</strong>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Ekipte Geciken Görev Sayısı</span>
                      <strong className="text-2xl font-bold">{dailySummary.overdue}</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department select bar */}
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 border p-4 rounded-xl">
                <span className="text-sm font-semibold text-slate-600">Departman Seçin:</span>
                <Select value={selectedLeaderDept} onValueChange={(val) => { setSelectedLeaderDept(val === "all" ? "" : val) }}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Tüm Departmanlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Departmanlar</SelectItem>
                    <SelectItem value="Yazılım">Yazılım</SelectItem>
                    <SelectItem value="Sosyal Medya">Sosyal Medya</SelectItem>
                    <SelectItem value="Tasarım">Tasarım</SelectItem>
                    <SelectItem value="Finans">Finans</SelectItem>
                    <SelectItem value="İnsan Kaynakları">İnsan Kaynakları</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamList.map(member => (
                  <Card key={member.id} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3 border-b">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                          {member.fullName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="leading-tight">
                        <CardTitle className="text-sm font-bold text-slate-950 dark:text-slate-50">{member.fullName}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{member.position || "Ekip Üyesi"}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      
                      {/* Active task info */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Şu An Çalıştığı Görev</span>
                        {member.activeTask ? (
                          <div className="mt-1 flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug">{member.activeTask.title}</h4>
                              <span className="text-[10px] text-blue-600 font-mono mt-1 inline-block">
                                Aktif: {formatTime(Math.floor((Date.now() - new Date(member.activeTask.startedAt).getTime()) / 1000))}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setReassignTaskId(member.activeTask.id)
                                setIsReassignDialogOpen(true)
                              }}
                              className="text-[10px] h-6 px-2 gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Devret
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1 italic">Boşta / Atanmamış</p>
                        )}
                      </div>

                      {/* Workload */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">İş Yükü Durumu</span>
                        <div className="grid grid-cols-4 gap-1 mt-1 text-center text-xs">
                          <div className="bg-slate-100/50 dark:bg-slate-800 p-1.5 rounded-md">
                            <span className="text-slate-500 font-bold block">{member.workload.todo}</span>
                            <span className="text-[9px] text-slate-400">Todo</span>
                          </div>
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-1.5 rounded-md">
                            <span className="text-blue-600 font-bold block">{member.workload.inProgress}</span>
                            <span className="text-[9px] text-blue-400">Prog</span>
                          </div>
                          <div className="bg-amber-50/50 dark:bg-amber-900/10 p-1.5 rounded-md">
                            <span className="text-amber-600 font-bold block">{member.workload.review}</span>
                            <span className="text-[9px] text-amber-400 font-semibold">Review</span>
                          </div>
                          <div className="bg-slate-100/30 p-1.5 rounded-md">
                            <span className="text-slate-400 block">{member.workload.done}</span>
                            <span className="text-[9px] text-slate-400">Done</span>
                          </div>
                        </div>
                        {member.workload.totalOpen >= 5 && (
                          <p className="text-[10px] text-red-500 font-semibold mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Aşırı Yüklenme Tespit Edildi ({member.workload.totalOpen} açık görev).
                          </p>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Devir Modalı */}
              {isReassignDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
                    <CardHeader>
                      <CardTitle className="text-xl">Görevi Başka Personele Devret</CardTitle>
                      <CardDescription>Görevin yeni sahibini seçtiğinizde, eski sahipli çalışma duraklatılacak ve görev yeni personele TODO durumunda atanacaktır.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Yeni Görevli Personel:</label>
                        <Select value={reassignTargetUserId} onValueChange={setReassignTargetUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Personel Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.filter(u => u.id !== currentUserId).map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.department || "Genel"})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setIsReassignDialogOpen(false)}>Vazgeç</Button>
                        <Button size="sm" onClick={handleReassignTask} disabled={!reassignTargetUserId} className="bg-blue-600 hover:bg-blue-700 text-white">Devret & Kaydet</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </TabsContent>
          )}

          {/* ────────────────────────────────────────────────────────
              TAB 3: ÜST YÖNETİM DASHBOARD'U
             ──────────────────────────────────────────────────────── */}
          {isManager && (
            <TabsContent value="mgmt" className="space-y-6 focus-visible:outline-hidden">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-100 bg-white dark:bg-slate-950 shadow-xs hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-500 font-bold block">Bitirilen Toplam Görev (Son 30 Gün)</span>
                    <strong className="text-3xl font-extrabold text-blue-600 mt-1 block">{mgmtSummary.completedCount}</strong>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 bg-white dark:bg-slate-950 shadow-xs hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-500 font-bold block">Görev Başarı/Tamamlama Oranı</span>
                    <strong className="text-3xl font-extrabold text-emerald-600 mt-1 block">%{mgmtSummary.completionRate}</strong>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 bg-white dark:bg-slate-950 shadow-xs hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-500 font-bold block">Ortalama Görev Bitirme Süresi</span>
                    <strong className="text-3xl font-extrabold text-indigo-600 mt-1 block">{mgmtSummary.avgDurationHours} Saat</strong>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 bg-white dark:bg-slate-950 shadow-xs hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-500 font-bold block">Gecikmiş Aktif Görevler</span>
                    <strong className="text-3xl font-extrabold text-red-600 mt-1 block">{mgmtSummary.overdueCount}</strong>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Search Widget */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Anlık Personel Sorgu Widget'ı</CardTitle>
                  <CardDescription>İstediğiniz personelin ismini aratarak şu an ne yaptığını ve bugünkü tamamlama özetini tek bakışta görün.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Personel adı girin... (Örn: Test Geliştirici)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={fetchMgmtDashboard} className="bg-blue-600 hover:bg-blue-700 text-white">Sorgula</Button>
                  </div>

                  {searchResult ? (
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 dark:bg-slate-800/40 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-3">
                        {searchResult.user.avatarUrl ? (
                          <img src={searchResult.user.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full border object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {searchResult.user.fullName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{searchResult.user.fullName}</h4>
                          <span className="text-xs text-slate-400">{searchResult.user.position || "Ekip Üyesi"} | {searchResult.user.department || "Genel"}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t">
                        <div>
                          <span className="text-slate-400 block">Şu Anki Görevi:</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {searchResult.activeTask ? searchResult.activeTask.title : "Boşta / Çalışmıyor"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Göreve Başlama Zamanı:</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {searchResult.activeTask ? new Date(searchResult.activeTask.startedAt).toLocaleTimeString("tr-TR") : "-"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Açık Görev Sayısı / Son Tamamlanan:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{searchResult.totalOpenTasks} açık / {searchResult.weeklyCompletions} biten</strong>
                        </div>
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <p className="text-xs text-slate-400 italic">Aranan isimde personel bulunamadı.</p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Trend Chart and Department Averages */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Trend Chart (LineChart) */}
                <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Departman Bazlı Tamamlanan Görev Trendleri
                    </CardTitle>
                    <CardDescription>Zaman içerisindeki günlük tamamlanan görev dağılımı.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip />
                        <Legend />
                        {trendData.length > 0 && Object.keys(trendData[0]).filter(k => k !== "date").map((dept, idx) => (
                          <Line 
                            key={dept}
                            type="monotone" 
                            dataKey={dept} 
                            stroke={["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#06b6d4"][idx % 5]} 
                            activeDot={{ r: 8 }} 
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Department Averages (Threshold Alerts) */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg">Departman Performans Eşikleri</CardTitle>
                    <CardDescription>Eşik değerlerine göre genel performans alarmları.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deptMetrics.map(dm => (
                      <div key={dm.name} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:bg-slate-850 dark:border-slate-800">
                        <div>
                          <strong className="text-sm block">{dm.name}</strong>
                          <span className="text-[10px] text-slate-400">Toplam: {dm.totalTasks} | Geciken: {dm.overdueCount}</span>
                        </div>
                        <div className="text-right">
                          <strong className={`text-sm block ${dm.completionRate < 60 ? "text-red-500" : "text-emerald-600"}`}>
                            %{dm.completionRate} Başarı
                          </strong>
                          {dm.completionRate < 60 && (
                            <span className="text-[9px] text-red-500 font-semibold uppercase flex items-center gap-1 mt-0.5 justify-end">
                              <ShieldAlert className="h-2 w-2" /> Eşik Altı
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Warning List */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Kritik Uyarılar ve Takip Alarmları</CardTitle>
                  <CardDescription>Zaman aşımı, gecikme ve boşta durma bildirimleri listesi.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {warnings.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b text-slate-400">
                          <th className="py-2">Tipi</th>
                          <th className="py-2">Mesaj</th>
                          <th className="py-2">Sorumlu</th>
                          <th className="py-2">Departman</th>
                          <th className="py-2">Detay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warnings.map((w, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-3">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                w.type === "overdue" ? "bg-red-100 text-red-800 dark:bg-red-900/30" :
                                w.type === "long_active" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30" :
                                "bg-slate-100 text-slate-800 dark:bg-slate-900/30"
                              }`}>
                                {w.type === "overdue" ? "Gecikme" : w.type === "long_active" ? "Zaman Aşımı" : "Boşta"}
                              </span>
                            </td>
                            <td className="py-3 text-slate-900 dark:text-slate-100">{w.message}</td>
                            <td className="py-3 font-semibold">{w.assignee}</td>
                            <td className="py-3 text-slate-400">{w.department}</td>
                            <td className="py-3 text-slate-500 font-mono">
                              {w.type === "overdue" && w.date ? `Son Tarih: ${new Date(w.date).toLocaleDateString("tr-TR")}` :
                               w.type === "long_active" ? `${w.duration} saattir` : "Aktif görev yok"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center py-6 text-slate-400">Herhangi bir kritik uyarı bulunmuyor.</p>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          )}

          {/* ────────────────────────────────────────────────────────
              TAB 4: İK / PERFORMANS DEĞERLENDİRME
             ──────────────────────────────────────────────────────── */}
          {isHr && (
            <TabsContent value="hr" className="space-y-6 focus-visible:outline-hidden">
              
              {/* Header and Export / Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600">Rapor Periyodu:</span>
                  <Select value={hrPeriod} onValueChange={setHrPeriod}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Seçim yapın" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Haftalık</SelectItem>
                      <SelectItem value="month">Aylık (30 Gün)</SelectItem>
                      <SelectItem value="quarter">3 Aylık (90 Gün)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={exportToExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel Aktar
                  </Button>
                  <Button onClick={exportToPdf} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                    <FileText className="h-4 w-4" />
                    PDF Aktar
                  </Button>
                </div>
              </div>

              {/* Performance List */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Personel Dönemsel Performans Değerlendirmeleri</CardTitle>
                  <CardDescription>Bireysel performans metrikleri (Sıralama / Lig Tablosu barındırmayan, hedef bazlı sunum).</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400">
                        <th className="py-2">Personel</th>
                        <th className="py-2">Departman</th>
                        <th className="py-2">Pozisyon</th>
                        <th className="py-2 text-center">Bitirilen Görev</th>
                        <th className="py-2 text-center">Ort. Bitirme Süresi</th>
                        <th className="py-2 text-center">Zamanında Teslim %</th>
                        <th className="py-2 text-center">Görev Tamamlama %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hrReports.map(rep => (
                        <tr key={rep.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">{rep.fullName}</td>
                          <td className="py-3 text-slate-500">{rep.department || "Genel"}</td>
                          <td className="py-3 text-slate-500">{rep.position || "Belirtilmemiş"}</td>
                          <td className="py-3 text-center text-blue-600 font-bold">{rep.completedCount}</td>
                          <td className="py-3 text-center">{rep.avgHours} Saat</td>
                          <td className="py-3 text-center font-semibold text-emerald-600">% {rep.onTimeRate}</td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span>% {rep.completionRate}</span>
                              <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${rep.completionRate}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Department Peer Averages */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Departman Akran Karşılaştırmalı Analizi</CardTitle>
                  <CardDescription>Departman genel ortalamaları üzerinden personellerin durumlarını değerlendirebileceğiniz isim ifşa etmeyen akran verileri.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400">
                        <th className="py-2">Departman</th>
                        <th className="py-2 text-center">Ort. Tamamlama Oranı</th>
                        <th className="py-2 text-center">Ort. Görev Süresi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peerAverages.map((avg, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-3 font-bold">{avg.department}</td>
                          <td className="py-3 text-center text-blue-600 font-bold">% {avg.avgCompletionRate}</td>
                          <td className="py-3 text-center">{avg.avgHours} Saat</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Ham veri denetimi logları (Audit Trail) */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Personel Görev ve Durum Denetim Logu (Audit Log)</CardTitle>
                  <CardDescription>Belirli bir döneme ait tüm görev başlatma, duraklatma ve tamamlama ham logları.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400">
                        <th className="py-2">Tarih</th>
                        <th className="py-2">Personel</th>
                        <th className="py-2">Departman</th>
                        <th className="py-2">Görev</th>
                        <th className="py-2">Aksiyon</th>
                        <th className="py-2">Not</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawLogs.map(log => (
                        <tr key={log.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 text-slate-500 font-mono">{new Date(log.startedAt).toLocaleString("tr-TR")}</td>
                          <td className="py-3 font-semibold">{log.userFullName}</td>
                          <td className="py-3 text-slate-400">{log.department}</td>
                          <td className="py-3 text-slate-900 dark:text-slate-100">{log.taskTitle}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                              log.status === "COMPLETE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30" :
                              log.status === "PAUSE" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30" :
                              "bg-blue-100 text-blue-800 dark:bg-blue-900/30"
                            }`}>
                              {log.status === "START" ? "Başlatıldı" : 
                               log.status === "RESUME" ? "Devam Ettirildi" : 
                               log.status === "PAUSE" ? "Duraklatıldı" : "Tamamlandı"}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 italic max-w-xs truncate">{log.note || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

            </TabsContent>
          )}

        </Tabs>
      )}

    </div>
  )
}

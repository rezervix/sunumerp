"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  ClipboardCheck, Send, CheckCircle2, AlertTriangle, ArrowLeft, Plus, 
  Trash2, Edit, Check, X, RefreshCw, Clock, History 
} from "lucide-react"

interface ReportItem {
  branchId: string | null
  branchName: string
  items: string[]
}

interface EodReportData {
  id?: string
  status: "draft" | "submitted"
  autoContent: ReportItem[]
  manualContent: string
  submittedAt?: string
  isExisting?: boolean
  auditLogs?: Array<{
    id: string
    action: string
    createdAt: string
    details?: string
  }>
}

export default function GunSonuRaporuPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [report, setReport] = useState<EodReportData | null>(null)
  
  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<{ branchIdx: number; itemIdx: number } | null>(null)
  const [editingText, setEditingText] = useState("")
  
  // Custom new item state per branch
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({})

  const fetchReport = async (regenerate = false) => {
    try {
      if (regenerate) setRegenerating(true)
      else setLoading(true)
      
      const res = await fetch(`/api/eod/draft${regenerate ? "?regenerate=true" : ""}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        toast.error("Rapor taslağı alınamadı.")
      }
    } catch (error) {
      console.error("Error loading EOD report:", error)
      toast.error("Bir ağ hatası oluştu.")
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const handleUpdateBullet = (branchIdx: number, itemIdx: number, text: string) => {
    if (!report) return
    const updated = { ...report }
    updated.autoContent[branchIdx].items[itemIdx] = text
    setReport(updated)
  }

  const handleDeleteBullet = (branchIdx: number, itemIdx: number) => {
    if (!report) return
    const updated = { ...report }
    updated.autoContent[branchIdx].items.splice(itemIdx, 1)
    setReport(updated)
    toast.info("Madde silindi.")
  }

  const handleAddBullet = (branchIdx: number) => {
    if (!report) return
    const text = newItemTexts[branchIdx]?.trim()
    if (!text) return

    const updated = { ...report }
    updated.autoContent[branchIdx].items.push(text)
    setReport(updated)

    setNewItemTexts(prev => ({ ...prev, [branchIdx]: "" }))
    toast.success("Yeni madde eklendi.")
  }

  const handleSubmit = async () => {
    if (!report || !report.id) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          autoContent: report.autoContent,
          manualContent: report.manualContent,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        toast.success("Gün Sonu Raporunuz başarıyla gönderildi!")
        setReport(result.data)
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Rapor gönderilemedi.")
      }
    } catch (error) {
      console.error("Error submitting EOD report:", error)
      toast.error("Sunucu ile iletişim kurulamadı.")
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (branchIdx: number, itemIdx: number, currentText: string) => {
    setEditingIndex({ branchIdx, itemIdx })
    setEditingText(currentText)
  }

  const saveEditing = (branchIdx: number, itemIdx: number) => {
    if (editingText.trim()) {
      handleUpdateBullet(branchIdx, itemIdx, editingText.trim())
    }
    setEditingIndex(null)
    setEditingText("")
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditingText("")
  }

  const todayStr = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
        <p className="text-zinc-400 font-medium animate-pulse text-xs">Gün Sonu Raporunuz hazırlanıyor...</p>
        <span className="text-[11px] text-zinc-500 max-w-xs text-center">
          Bugünkü görevleriniz, içerik takvimi değişiklikleriniz ve chat aktiviteleriniz taranıyor.
        </span>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold text-white">Rapor Yüklenemedi</h2>
        <Button onClick={() => fetchReport()} className="rounded-full bg-emerald-400 text-black font-semibold">Tekrar Dene</Button>
      </div>
    )
  }

  const isSubmitted = report.status === "submitted"

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-white">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/dashboard/personel-denetim")}
              className="h-8 w-8 text-zinc-400 hover:text-white rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 text-white">
              <ClipboardCheck className="h-5 w-5 text-emerald-400" />
              Gün Sonu Raporu
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isSubmitted 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isSubmitted ? "bg-emerald-400" : "bg-amber-400"}`} />
              {isSubmitted ? "Gönderildi" : "Taslak"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium pl-10 font-mono">
            {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 md:pl-0">
          {!isSubmitted && (
            <Button
              variant="outline"
              onClick={() => fetchReport(true)}
              disabled={regenerating || submitting}
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-full text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
              Yeniden Derle
            </Button>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={submitting || isSubmitted}
            className="gap-2 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold rounded-full text-xs h-9 shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50"
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Yönetime İletildi
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {submitting ? "Gönderiliyor..." : "Onayla ve Gönder"}
              </>
            )}
          </Button>
        </div>
      </div>

      {isSubmitted && (
        <Card className="bg-emerald-500/10 border border-emerald-500/20 rounded-[20px]">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-200">
              <span className="font-semibold text-emerald-400">Harika iş!</span> Bugünün raporu kaydedildi ve ilgili yöneticilere bildirim gönderildi. Raporunuz artık salt okunur moddadır.
              {report.submittedAt && (
                <span className="block text-[11px] text-zinc-400 mt-1 font-mono">
                  Gönderilme saati: {new Date(report.submittedAt).toLocaleTimeString("tr-TR")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Auto generated items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Bugün Yapılan İşler (Otomatik)</h2>
            <span className="text-xs text-zinc-500">ERP sistemindeki hareketlerinizden derlenmiştir.</span>
          </div>

          {report.autoContent.length === 0 ? (
            <Card className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px]">
              <CardContent className="py-8 text-center text-zinc-500 text-xs">
                Bugün için herhangi bir otomatik aktivite bulunamadı. Lütfen sağ taraftaki ERP dışı notlar alanını kullanın veya yeniden derlemeyi deneyin.
              </CardContent>
            </Card>
          ) : (
            report.autoContent.map((branch, bIdx) => (
              <Card key={bIdx} className="overflow-hidden border border-white/[0.06] bg-[#111513]/90 rounded-[20px] shadow-xl">
                <CardHeader className="bg-[#0d100e] py-3 px-4 flex flex-row items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <CardTitle className="text-sm font-semibold text-white">
                      {branch.branchName}
                    </CardTitle>
                  </div>
                  <span className="text-[10px] bg-white/5 text-zinc-400 border border-white/10 py-0.5 px-2.5 rounded-full font-mono font-medium">
                    {branch.items.length} Madde
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <ul className="space-y-2">
                    {branch.items.map((item, iIdx) => {
                      const isEditing = editingIndex?.branchIdx === bIdx && editingIndex?.itemIdx === iIdx
                      
                      return (
                        <li 
                          key={iIdx} 
                          className={`group flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                            isEditing ? "bg-white/5 border border-emerald-500/30" : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <span className="text-emerald-400 font-bold text-xs mt-0.5 shrink-0">•</span>
                          
                          {isEditing ? (
                            <div className="flex-1 flex gap-2">
                              <Input 
                                value={editingText} 
                                onChange={(e) => setEditingText(e.target.value)}
                                className="h-8 py-1 text-xs bg-black/40 border-white/10 text-white rounded-lg"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(bIdx, iIdx)
                                  if (e.key === "Escape") cancelEditing()
                                }}
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10 shrink-0 rounded-lg"
                                onClick={() => saveEditing(bIdx, iIdx)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 shrink-0 rounded-lg"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-xs text-zinc-300 leading-relaxed">
                                {item}
                              </span>
                              {!isSubmitted && (
                                <div className="opacity-0 group-hover:opacity-100 max-lg:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-zinc-500 hover:text-white rounded-lg"
                                    onClick={() => startEditing(bIdx, iIdx, item)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-zinc-500 hover:text-rose-400 rounded-lg"
                                    onClick={() => handleDeleteBullet(bIdx, iIdx)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {/* Add manual achievement bullet inside this branch card */}
                  {!isSubmitted && (
                    <div className="pt-3 border-t border-white/[0.06] flex gap-2">
                      <Input
                        placeholder={`${branch.branchName} için ek madde ekleyin...`}
                        value={newItemTexts[bIdx] || ""}
                        onChange={(e) => setNewItemTexts(prev => ({ ...prev, [bIdx]: e.target.value }))}
                        className="h-8 text-xs bg-white/[0.03] border-white/10 rounded-xl text-white placeholder-zinc-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddBullet(bIdx)
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddBullet(bIdx)}
                        className="h-8 gap-1.5 px-3 shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ekle
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right 1 Column: Manual Non-ERP notes */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">ERP Dışı Gelişmeler</h2>
            <p className="text-xs text-zinc-500">Sistem dışı bağımlılıkları ve IT taleplerini kaydedin.</p>
          </div>

          <Card className="border border-white/[0.06] bg-[#111513]/90 rounded-[20px] shadow-xl">
            <CardHeader className="bg-[#0d100e] border-b border-white/[0.06] py-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Dış Bağımlılık & Özel Notlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                <strong className="text-white">Dikkat:</strong> Buraya sadece ERP sisteminde karşılığı olmayan (VPS sunucu sorunları, WhatsApp müşteri onay beklemeleri, IT ekibinden beklenen yetkiler gibi) konuları not edin.
              </p>
              
              <Textarea
                placeholder="Örn: IT ekibinden VPS sunucusu için SSH anahtar erişimi bekleniyor. Tasarım için müşteriden görsel onayı bekleniyor."
                value={report.manualContent}
                onChange={(e) => {
                  if (report) {
                    setReport({ ...report, manualContent: e.target.value })
                  }
                }}
                disabled={isSubmitted}
                className="min-h-[220px] text-xs leading-relaxed bg-white/[0.03] border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </CardContent>
          </Card>

          {/* Audit History / logs */}
          {report.auditLogs && report.auditLogs.length > 0 && (
            <Card className="border border-white/[0.06] bg-[#111513]/90 rounded-[20px] shadow-xl">
              <CardHeader className="py-3 px-4 border-b border-white/[0.06] flex flex-row items-center gap-2">
                <History className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Değişiklik Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {report.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-medium text-zinc-300">
                          {log.action === "create_draft" ? "Taslak Oluşturuldu" : 
                           log.action === "update_draft" ? "Taslak Güncellendi" : 
                           log.action === "submit" ? "Rapor Gönderildi" : log.action}
                        </span>
                        <span className="block text-[10px] text-zinc-500 font-mono">
                          {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

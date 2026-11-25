"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  MessageSquareText, Plus, ArrowLeft, RefreshCw, CheckCircle2, User, Clock, AlertCircle
} from "lucide-react"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"

interface CustomerRequest {
  sender: string
  time: string
  summary: string
}

interface BranchRequests {
  branchId: string | null
  branchName: string
  requests: CustomerRequest[]
}

export default function MusteriTalepleriPage() {
  const { isSuperAdmin } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<BranchRequests[]>([])
  
  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [prefill, setPrefill] = useState({
    title: "",
    description: "",
    branchId: "",
  })

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/eod/customer-requests")
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
      } else {
        toast.error("Müşteri talepleri yüklenemedi.")
      }
    } catch (error) {
      console.error("Error loading customer requests:", error)
      toast.error("Bir ağ hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleConvertToTask = (branch: BranchRequests, req: CustomerRequest) => {
    setPrefill({
      title: `${branch.branchName} - Revizyon / Talep`,
      description: `Müşteri temsilcisi ${req.sender} tarafından iletilen talep:\n"${req.summary}"\n\n[WhatsApp Kaynağından Otomatik Aktarıldı - Saat: ${req.time}]`,
      branchId: branch.branchId || "",
    })
    setIsCreateOpen(true)
  }

  const handleTaskCreatedSuccess = () => {
    toast.success("Talep başarıyla iş takip görevine dönüştürüldü!")
    setIsCreateOpen(false)
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
        <RefreshCw className="h-8 w-8 text-[--brand] animate-spin" />
        <p className="text-[--text-muted] font-medium animate-pulse text-xs">Bugünün Müşteri Talepleri taranıyor...</p>
        <span className="text-[11px] text-[--text-muted] max-w-xs text-center">
          Müşteri WhatsApp gruplarındaki mesajlar analiz edilerek istek ve revizyonlar ayrıştırılıyor.
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-[--text]">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[--line] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/dashboard/personel-denetim")}
              className="h-8 w-8 text-[--text-muted] hover:text-[--text] rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 text-[--text]">
              <MessageSquareText className="h-5 w-5 text-[--brand]" />
              Müşteri Talepleri Özeti
            </h1>
          </div>
          <p className="text-xs text-[--text-muted] font-medium pl-10">
            {todayStr} • Günlük WhatsApp İstek & Revizyon Analizi
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 md:pl-0">
          <Button
            variant="outline"
            onClick={fetchRequests}
            className="gap-2 border-[--line] bg-[var(--muted-bg)] hover:bg-[var(--muted-bg)] text-[var(--text-2)] rounded-full text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tazele
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8 mt-12 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-xl text-[--text]">
          <CardContent className="space-y-4 pt-6">
            <div className="mx-auto w-12 h-12 bg-[var(--muted-bg)] rounded-2xl flex items-center justify-center border border-[--line]">
              <CheckCircle2 className="h-6 w-6 text-[--brand]" />
            </div>
            <h2 className="text-base font-semibold text-[--text]">Harika! Bugünlük Talep Yok</h2>
            <p className="text-xs text-[--text-muted] leading-relaxed">
              Bugün müşteri WhatsApp gruplarında taranan mesajlarda herhangi bir yeni istek veya revizyon talebi tespit edilmedi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((branch, idx) => (
              <Card key={idx} className="flex flex-col h-full border border-[--line] bg-white/80 backdrop-blur-xl rounded-[20px] shadow-xl overflow-hidden">
                <CardHeader className="bg-[var(--bg)] py-3 px-4 border-b border-[--line]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[--text] truncate">
                      {branch.branchName}
                    </span>
                    <span className="text-[10px] bg-[--brand-soft] text-[--brand] border border-[--brand-line] py-0.5 px-2.5 rounded-full font-mono font-medium shrink-0 ml-2">
                      {branch.requests.length} Talep
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {branch.requests.map((req, reqIdx) => (
                      <div key={reqIdx} className="space-y-2 border-b border-[var(--line-soft)] last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between text-xs text-[--text-muted]">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-[--text-muted]" />
                            <strong className="text-[var(--text-2)] font-medium">{req.sender}</strong>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-[--text-muted]" />
                            {req.time}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-[var(--line-soft)]">
                          {req.summary}
                        </p>
                        
                        <div className="pt-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 rounded-full bg-[--brand-soft] hover:bg-[--brand-soft]/80 text-[--brand] border-[--brand-line] font-medium"
                            onClick={() => handleConvertToTask(branch, req)}
                          >
                            <Plus className="h-3 w-3 text-[--brand]" />
                            Göreve Dönüştür
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <CreateTaskDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={handleTaskCreatedSuccess}
        prefillTitle={prefill.title}
        prefillDescription={prefill.description}
        prefillBranchId={prefill.branchId}
      />
    </div>
  )
}

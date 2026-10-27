"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  MessageSquare, Plus, ArrowLeft, RefreshCw, CheckCircle2, User, Clock, AlertCircle
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
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Bugünün Müşteri Talepleri taranıyor...</p>
        <span className="text-xs text-slate-400 max-w-xs text-center">
          Müşteri WhatsApp gruplarındaki mesajlar analiz edilerek istek ve revizyonlar ayrıştırılıyor.
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/dashboard/personel-denetim")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Müşteri Talepleri Özeti
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium pl-10">
            {todayStr} - Günlük WhatsApp İstek/Revizyon Analizi
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 md:pl-0">
          <Button
            variant="outline"
            onClick={fetchRequests}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tazele
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8 mt-12 border-dashed">
          <CardContent className="space-y-4 pt-6">
            <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold">Harika! Bugünlük Talep Yok</h2>
            <p className="text-sm text-slate-500">
              Bugün müşteri WhatsApp gruplarında taranan mesajlarda herhangi bir yeni istek veya revizyon talebi tespit edilmedi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((branch, idx) => (
              <Card key={idx} className="flex flex-col h-full border border-slate-200/80 shadow-xs">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {branch.branchName}
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-full font-medium shrink-0 ml-2">
                      {branch.requests.length} Talep
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4 mb-4">
                    {branch.requests.map((req, reqIdx) => (
                      <div key={reqIdx} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {req.sender}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {req.time}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {req.summary}
                        </p>
                        
                        <div className="pt-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleConvertToTask(branch, req)}
                          >
                            <Plus className="h-3 w-3" />
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

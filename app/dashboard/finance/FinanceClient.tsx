"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { FilePicker } from "@/components/shared/file-picker"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  Clock,
  Plus,
  Receipt,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
  FileText,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

interface FinanceRecord {
  id: string
  branchId: string
  type: "INCOME" | "EXPENSE" | "DEBT" | "EXPECTED_PAYMENT"
  amount: number
  category: string
  description: string
  receiptUrl?: string
  date: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: string | null
}

const EXPENSE_CATEGORIES = [
  "Kira", "Faturalar (Elektrik, Su, vs.)", "Personel & Maaş", 
  "Ofis İhtiyaçları", "Mutfak & İkram", "Pazarlama & Reklam", 
  "Vergi & Harç", "Bakım Onarım", "Lojistik & Kargo", 
  "Abonelikler", "Eğlence & Etkinlik", "Sağlık", "Lüks", 
  "Seyahat & Konaklama", "Araç & Yakıt", "Sigorta", 
  "Danışmanlık", "Donanım & Yazılım", "Diğer"
]
const INCOME_CATEGORIES = ["Hizmet Satışı", "Proje Geliri", "Danışmanlık", "Diğer"]
const OTHER_CATEGORIES = ["Genel Borç", "Kredi", "Beklenen Tahsilat", "Beklenen Gider", "Diğer"]

const CHART_PALETTE = ["#1267E6", "#1579F9", "#2A93F3", "#07254A", "#33445E", "#5B6B82", "#16A34A", "#F5A524", "#E5484D", "#94A3B8"]

export default function FinanceClient() {
  const [records, setRecords] = useState<FinanceRecord[]>(() => mockDatabase.getFinances() as any)

  useEffect(() => {
    const handleDbChange = () => setRecords(mockDatabase.getFinances() as any)
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState<"THIS_MONTH" | "LAST_6_MONTHS" | "FULL_YEAR">("THIS_MONTH")

  const [formData, setFormData] = useState({
    type: "INCOME" as FinanceRecord["type"],
    amount: 0,
    category: INCOME_CATEGORIES[0],
    description: "",
    receiptUrl: "",
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (formData.type === "INCOME") setFormData(prev => ({ ...prev, category: INCOME_CATEGORIES[0] }))
    else if (formData.type === "EXPENSE") setFormData(prev => ({ ...prev, category: EXPENSE_CATEGORIES[0] }))
    else setFormData(prev => ({ ...prev, category: OTHER_CATEGORIES[0] }))
  }, [formData.type])

  const { currentBranch, isSuperAdmin } = useAuth()

  useEffect(() => {
    if (currentBranch) loadRecords()
  }, [currentBranch, dateFilter])

  const loadRecords = async () => {
    if (!currentBranch) return
    let startDate = ""
    const today = new Date()
    
    if (dateFilter === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      startDate = firstDay.toISOString().split('T')[0]
    } else if (dateFilter === "LAST_6_MONTHS") {
      const past = new Date(today.getFullYear(), today.getMonth() - 6, 1)
      startDate = past.toISOString().split('T')[0]
    } else if (dateFilter === "FULL_YEAR") {
      const firstDay = new Date(today.getFullYear(), 0, 1)
      startDate = firstDay.toISOString().split('T')[0]
    }

    try {
      const branchId = currentBranch?.id || "local-debug-branch"
      let url = `/api/finance?branchId=${branchId}`
      if (startDate) url += `&startDate=${startDate}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecords(Array.isArray(data) && data.length > 0 ? data : (mockDatabase.getFinances() as any))
      } else {
        setRecords(mockDatabase.getFinances() as any)
      }
    } catch {
      setRecords(mockDatabase.getFinances() as any)
    }
  }

  const handleCreate = async () => {
    if (!formData.description || formData.amount <= 0 || !currentBranch) return
    setLoading(true)

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          ...formData,
        }),
      })

      if (res.ok) {
        loadRecords()
        setIsDialogOpen(false)
        setFormData({
          type: "INCOME",
          amount: 0,
          category: INCOME_CATEGORIES[0],
          description: "",
          receiptUrl: "",
          date: new Date().toISOString().split('T')[0]
        })
        toast.success("Finansal kayıt başarıyla eklendi.")
      } else {
        const eData = await res.json()
        toast.error(eData.error || "Kayıt eklenirken hata oluştu.")
      }
    } catch {
      toast.error("Ağ hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/finance?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        loadRecords()
        toast.success("Kayıt silindi.")
      } else {
        toast.error("Kayıt silinemedi.")
      }
    } catch {
      toast.error("Ağ hatası oluştu.")
    }
  }

  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    setLoading(true)
    try {
      const res = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })

      if (res.ok) {
        loadRecords()
        toast.success(`Kayıt ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.`)
      } else {
        const eData = await res.json()
        toast.error(eData.error || "İşlem başarısız.")
      }
    } catch {
      toast.error("Ağ hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  // Derived metrics
  const totalIncome = records.filter(r => r.type === "INCOME").reduce((sum, r) => sum + r.amount, 0)
  const totalExpense = records.filter(r => r.type === "EXPENSE").reduce((sum, r) => sum + r.amount, 0)
  const totalDebt = records.filter(r => r.type === "DEBT").reduce((sum, r) => sum + r.amount, 0)
  const totalExpected = records.filter(r => r.type === "EXPECTED_PAYMENT").reduce((sum, r) => sum + r.amount, 0)
  const netBalance = totalIncome - totalExpense

  const expenseCounts = records.filter(r => r.type === "EXPENSE").reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostFrequentCategory = Object.keys(expenseCounts).length > 0 
    ? Object.keys(expenseCounts).reduce((a, b) => expenseCounts[a] > expenseCounts[b] ? a : b) 
    : "-"

  // Chart Data: Expense Distribution (Pie Chart)
  const expenseDataMap = records
    .filter(r => r.type === "EXPENSE")
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount
      return acc
    }, {} as Record<string, number>)

  const expenseChartData = Object.entries(expenseDataMap).map(([name, value]) => ({ name, value }))

  // Chart Data: Monthly Trends
  const monthlyDataMap = records.reduce((acc, curr) => {
    const d = new Date(curr.date)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleString('tr-TR', { month: 'short', year: 'numeric' })
    
    if (!acc[monthKey]) acc[monthKey] = { name: monthName, Income: 0, Expense: 0, dateObj: d }
    if (curr.type === "INCOME") acc[monthKey].Income += curr.amount
    if (curr.type === "EXPENSE") acc[monthKey].Expense += curr.amount
    return acc
  }, {} as Record<string, any>)

  const monthlyChartData = Object.values(monthlyDataMap)
    .sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime())

  const getTypeLabel = (type: string) => {
    switch(type) {
      case "INCOME": return "Gelir"
      case "EXPENSE": return "Gider"
      case "DEBT": return "Borç"
      case "EXPECTED_PAYMENT": return "Beklenen"
      default: return type
    }
  }

  const getTypeStyles = (type: string) => {
    switch(type) {
      case "INCOME": return "bg-[--ok-soft] text-[--ok] border border-[--ok]/20"
      case "EXPENSE": return "bg-[--bad-soft] text-[--bad] border border-[--bad]/20"
      case "DEBT": return "bg-[--muted-bg] text-[--text-muted] border border-[--line]"
      case "EXPECTED_PAYMENT": return "bg-[--brand-soft] text-[--brand] border border-[--brand-line]"
      default: return "bg-[--muted-bg] text-[--text-muted] border border-[--line]"
    }
  }

  return (
    <div className="space-y-6">
      {/* ── ÜST BAŞLIK VE AKSİYONLAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[--line]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[--text]">Kurumsal Finans</h1>
          <p className="text-xs text-[--text-muted] mt-1">
            {currentBranch ? `${currentBranch.name} · Bilanço, Gelir-Gider Akışı ve Kasa Yönetimi` : "Finansal Yönetim Paneli"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] transition-all shadow-xs"
          >
            <option value="THIS_MONTH">Bu Ay</option>
            <option value="LAST_6_MONTHS">Son 6 Ay</option>
            <option value="FULL_YEAR">Tüm Yıl</option>
          </select>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            Yeni İşlem Ekle
          </button>
        </div>
      </div>

      {/* ── KUTUSUZ (BORDERLESS) ÜST KPI ŞERİDİ ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-3 border-b border-[--line]">
        {/* Toplam Gelir */}
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <TrendingUp className="size-3.5 text-[--text-muted]" />
            <span>Toplam Gelir</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={totalIncome} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-[--ok] bg-[--ok-soft] px-2 py-0.5 rounded-full border border-[--ok]/20">
              Giriş
            </span>
          </div>
        </div>

        {/* Toplam Gider */}
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <TrendingDown className="size-3.5 text-[--text-muted]" />
            <span>Toplam Gider</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={totalExpense} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-[--bad] bg-[--bad-soft] px-2 py-0.5 rounded-full border border-[--bad]/20">
              Çıkış
            </span>
          </div>
        </div>

        {/* Net Bakiye */}
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <Scale className="size-3.5 text-[--text-muted]" />
            <span>Net Durum</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-light tracking-tight tabular-nums ${netBalance >= 0 ? "text-[--ok]" : "text-[--bad]"}`}>
              <AnimatedNumber value={netBalance} prefix={netBalance >= 0 ? "+₺" : "-₺"} />
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              netBalance >= 0 
                ? "bg-[--ok-soft] text-[--ok] border-[--ok]/20" 
                : "bg-[--bad-soft] text-[--bad] border-[--bad]/20"
            }`}>
              Kasa
            </span>
          </div>
        </div>

        {/* Toplam Borç */}
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <CreditCard className="size-3.5 text-[--text-muted]" />
            <span>Toplam Borç</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={totalDebt} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-[--text-muted] bg-[--muted-bg] px-2 py-0.5 rounded-full border border-[--line]">
              Yükümlülük
            </span>
          </div>
        </div>

        {/* Beklenen Tahsilat */}
        <div>
          <div className="flex items-center gap-1.5 text-[--text-muted] text-[11px] uppercase tracking-wider font-medium">
            <Clock className="size-3.5 text-[--text-muted]" />
            <span>Beklenen Tahsilat</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={totalExpected} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-[--brand] bg-[--brand-soft] px-2 py-0.5 rounded-full border border-[--brand-line]">
              Vadeli
            </span>
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER BENTO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylık Akış: Area Spline */}
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-medium text-[--text]">Nakit Akışı & Aylık Trendler</h3>
              <p className="text-xs text-[--text-muted] mt-0.5">Gelir ve gider eğrisinin yumuşak spline analizi</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[--brand]">
                <span className="size-2 rounded-full bg-[--brand]" />
                Gelir
              </span>
              <span className="flex items-center gap-1.5 text-[--bad]">
                <span className="size-2 rounded-full bg-[--bad]" />
                Gider
              </span>
            </div>
          </div>
          <div className="h-[280px]">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="finIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1267E6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1267E6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="finExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5484D" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#E5484D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F6" vertical={false} />
                  <XAxis dataKey="name" stroke="#5B6B82" tick={{ fill: "#5B6B82", fontSize: 11 }} />
                  <YAxis stroke="#5B6B82" tick={{ fill: "#5B6B82", fontSize: 11 }} tickFormatter={(v) => `₺${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderColor: "#E3E8F0",
                      borderRadius: "12px",
                      color: "#0B1B33",
                      boxShadow: "0 10px 25px -5px rgba(11, 27, 51, 0.1)",
                    }}
                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    name="Gelir"
                    stroke="#1267E6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#finIncomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expense"
                    name="Gider"
                    stroke="#E5484D"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#finExpenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[--text-muted] text-xs">Trend verisi bulunamadı.</div>
            )}
          </div>
        </div>

        {/* Harcama Dağılımı: İnce Halka (Donut) Grafiği */}
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm font-medium text-[--text]">Kategori Bazlı Harcama Dağılımı</h3>
              <p className="text-xs text-[--text-muted] mt-0.5">Maliyet ağırlık merkezleri</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-[--text-muted] block">En Sık Gider</span>
              <span className="text-xs font-medium text-[--brand] px-2.5 py-0.5 bg-[--brand-soft] border border-[--brand-line] rounded-full mt-1 inline-block">
                {mostFrequentCategory}
              </span>
            </div>
          </div>
          <div className="h-[280px]">
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {expenseChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderColor: "#E3E8F0",
                      borderRadius: "12px",
                      color: "#0B1B33",
                      boxShadow: "0 10px 25px -5px rgba(11, 27, 51, 0.1)",
                    }}
                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Tutar"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#5B6B82" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[--text-muted] text-xs">Harcama verisi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── İŞLEM TABLOSU ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[--line] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[--brand]" />
            <h3 className="font-medium text-[--text] text-sm">Finansal İşlem Geçmişi</h3>
          </div>
          <span className="text-xs text-[--text-muted] font-mono">{records.length} işlem kaydı</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[--page] text-[--text-muted] font-medium border-b border-[--line] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Tarih</th>
                <th className="px-6 py-3.5">Açıklama</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5">Tür</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line-soft]">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-[--muted-bg]/50 transition-colors group">
                  <td className="px-6 py-3.5 font-mono text-xs text-[--text-muted]">
                    {new Date(record.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-3.5 text-[--text]">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-xs">{record.description}</span>
                      {record.receiptUrl && (
                        <a
                          href={record.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors"
                          title="Faturayı Görüntüle"
                        >
                          <Receipt className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-[--muted-bg] border border-[--line] text-xs text-[--text-2] font-mono">
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeStyles(record.type)}`}>
                      {getTypeLabel(record.type)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {record.status === "pending" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--warn-soft] text-[--warn] border border-[--warn]/20">
                        Bekliyor
                      </span>
                    )}
                    {record.status === "approved" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/20">
                        Onaylandı
                      </span>
                    )}
                    {record.status === "rejected" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--bad-soft] text-[--bad] border border-[--bad]/20">
                        Reddedildi
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-semibold tabular-nums ${
                        record.type === "INCOME" ? "text-[--ok]" : 
                        record.type === "EXPENSE" ? "text-[--bad]" :
                        record.type === "DEBT" ? "text-[--text-2]" : "text-[--brand]"
                      }`}>
                        {record.type === "INCOME" || record.type === "EXPECTED_PAYMENT" ? "+" : "-"}₺{record.amount.toLocaleString("tr-TR")}
                      </span>

                      {/* Onayla / Reddet (Super Admin bekleyen işlem aksiyonları) */}
                      {isSuperAdmin && record.status === "pending" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(record.id, "approved")}
                            disabled={loading}
                            className="p-1 rounded-lg text-[--ok] hover:bg-[--ok-soft] transition-colors"
                            title="Onayla"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.id, "rejected")}
                            disabled={loading}
                            className="p-1 rounded-lg text-[--bad] hover:bg-[--bad-soft] transition-colors"
                            title="Reddet"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1 rounded-lg text-[--text-muted] hover:text-[--bad] hover:bg-[--bad-soft] transition-colors opacity-0 group-hover:opacity-100 max-lg:opacity-100"
                        title="Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[--text-muted] text-xs">
                    Kayıtlı finansal işlem bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── YENİ İŞLEM MODALI ── */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[--line] rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[--line] bg-[--page] flex items-center justify-between">
                <h3 className="text-base font-medium text-[--navy]">Yeni Finansal İşlem Ekle</h3>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="p-1.5 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider">Tarih *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider">İşlem Türü *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  >
                    <option value="INCOME">Gelir</option>
                    <option value="EXPENSE">Gider</option>
                    <option value="DEBT">Borç</option>
                    <option value="EXPECTED_PAYMENT">Beklenen Ödeme</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  >
                    {formData.type === "INCOME" && INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    {formData.type === "EXPENSE" && EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    {(formData.type === "DEBT" || formData.type === "EXPECTED_PAYMENT") && OTHER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider">Açıklama *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Örn: Ofis internet altyapı faturası"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[--text-muted] uppercase tracking-wider">Tutar (₺) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[--line] text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <FilePicker
                    label="Fiş / Makbuz Yükle"
                    maxFiles={1}
                    onFilesSelected={(urls) => setFormData(prev => ({ ...prev, receiptUrl: urls[0] || "" }))}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-3 mt-auto">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[--text-2] hover:text-[--text] border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !formData.description || formData.amount <= 0}
                  className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] rounded-full shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

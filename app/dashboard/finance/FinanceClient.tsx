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
  Filter,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

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

const GLOW_COLORS = ["#34D399", "#38BDF8", "#FBBF24", "#F43F5E", "#A78BFA", "#2DD4BF", "#FB923C", "#818CF8", "#4ADE80", "#E879F9"]

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
      case "INCOME": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
      case "EXPENSE": return "bg-rose-500/10 text-rose-400 border border-rose-500/25"
      case "DEBT": return "bg-zinc-500/10 text-zinc-300 border border-zinc-500/25"
      case "EXPECTED_PAYMENT": return "bg-sky-500/10 text-sky-400 border border-sky-500/25"
      default: return "bg-white/5 text-zinc-400 border border-white/10"
    }
  }

  return (
    <div className="space-y-6">
      {/* ── ÜST BAŞLIK VE AKSİYONLAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white">Kurumsal Finans</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {currentBranch ? `${currentBranch.name} · Bilanço, Gelir-Gider Akışı ve Kasa Yönetimi` : "Finansal Yönetim Paneli"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          >
            <option value="THIS_MONTH" className="bg-[#111513] text-white">Bu Ay</option>
            <option value="LAST_6_MONTHS" className="bg-[#111513] text-white">Son 6 Ay</option>
            <option value="FULL_YEAR" className="bg-[#111513] text-white">Tüm Yıl</option>
          </select>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            Yeni İşlem Ekle
          </button>
        </div>
      </div>

      {/* ── KUTUSUZ (BORDERLESS) ÜST KPI ŞERİDİ ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-3 border-b border-white/[0.06]">
        {/* Toplam Gelir */}
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
            <TrendingUp className="size-3.5 text-zinc-400" />
            <span>Toplam Gelir</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white tracking-tight">
              <AnimatedNumber value={totalIncome} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Giriş
            </span>
          </div>
        </div>

        {/* Toplam Gider */}
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
            <TrendingDown className="size-3.5 text-zinc-400" />
            <span>Toplam Gider</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white tracking-tight">
              <AnimatedNumber value={totalExpense} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Çıkış
            </span>
          </div>
        </div>

        {/* Net Bakiye */}
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
            <Scale className="size-3.5 text-zinc-400" />
            <span>Net Durum</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-light tracking-tight ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              <AnimatedNumber value={netBalance} prefix={netBalance >= 0 ? "+₺" : "-₺"} />
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              netBalance >= 0 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              Kasa
            </span>
          </div>
        </div>

        {/* Toplam Borç */}
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
            <CreditCard className="size-3.5 text-zinc-400" />
            <span>Toplam Borç</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white tracking-tight">
              <AnimatedNumber value={totalDebt} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08]">
              Yükümlülük
            </span>
          </div>
        </div>

        {/* Beklenen Tahsilat */}
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
            <Clock className="size-3.5 text-zinc-400" />
            <span>Beklenen Tahsilat</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white tracking-tight">
              <AnimatedNumber value={totalExpected} prefix="₺" />
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Vadeli
            </span>
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER BENTO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylık Akış: Parlayan Spline Eğrileri */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-medium text-white">Nakit Akışı & Aylık Trendler</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Gelir ve gider eğrisinin yumuşak spline analizi</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                Gelir
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="size-2 rounded-full bg-rose-400 shadow-[0_0_8px_#FB7185]" />
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
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="finExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FB7185" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#FB7185" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 11 }} />
                  <YAxis stroke="#71717A" tick={{ fill: "#71717A", fontSize: 11 }} tickFormatter={(v) => `₺${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111513",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    name="Gelir"
                    stroke="#34D399"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#finIncomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expense"
                    name="Gider"
                    stroke="#FB7185"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#finExpenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Trend verisi bulunamadı.</div>
            )}
          </div>
        </div>

        {/* Harcama Dağılımı: İnce Halka (Donut) Grafiği */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm font-medium text-white">Kategori Bazlı Harcama Dağılımı</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Maliyet ağırlık merkezleri</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">En Sık Gider</span>
              <span className="text-xs font-medium text-emerald-400 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mt-1 inline-block">
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
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={2}
                  >
                    {expenseChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={GLOW_COLORS[index % GLOW_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111513",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Tutar"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Harcama verisi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── İŞLEM TABLOSU ── */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-emerald-400" />
            <h3 className="font-medium text-white text-sm">Finansal İşlem Geçmişi</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{records.length} işlem kaydı</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.02] text-zinc-400 font-medium border-b border-white/[0.06] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Tarih</th>
                <th className="px-6 py-3.5">Açıklama</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5">Tür</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3.5 font-mono text-xs text-zinc-300">
                    {new Date(record.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-3.5 text-zinc-200">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-xs">{record.description}</span>
                      {record.receiptUrl && (
                        <a
                          href={record.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="Faturayı Görüntüle"
                        >
                          <Receipt className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300 font-mono">
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
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Bekliyor
                      </span>
                    )}
                    {record.status === "approved" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Onaylandı
                      </span>
                    )}
                    {record.status === "rejected" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Reddedildi
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-semibold ${
                        record.type === "INCOME" ? "text-emerald-400" : 
                        record.type === "EXPENSE" ? "text-rose-400" :
                        record.type === "DEBT" ? "text-zinc-300" : "text-sky-400"
                      }`}>
                        {record.type === "INCOME" || record.type === "EXPECTED_PAYMENT" ? "+" : "-"}₺{record.amount.toLocaleString("tr-TR")}
                      </span>

                      {/* Onayla / Reddet (Super Admin bekleyen işlem aksiyonları) */}
                      {isSuperAdmin && record.status === "pending" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(record.id, "approved")}
                            disabled={loading}
                            className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Onayla"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.id, "rejected")}
                            disabled={loading}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Reddet"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 max-lg:opacity-100"
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
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 text-xs">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111513] border border-white/[0.08] rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-base font-medium text-white">Yeni Finansal İşlem Ekle</h3>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Tarih *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">İşlem Türü *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#111513] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="INCOME">Gelir</option>
                    <option value="EXPENSE">Gider</option>
                    <option value="DEBT">Borç</option>
                    <option value="EXPECTED_PAYMENT">Beklenen Ödeme</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#111513] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {formData.type === "INCOME" && INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    {formData.type === "EXPENSE" && EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    {(formData.type === "DEBT" || formData.type === "EXPECTED_PAYMENT") && OTHER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Açıklama *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Örn: Ofis internet altyapı faturası"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Tutar (₺) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
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

              <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3 mt-auto">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !formData.description || formData.amount <= 0}
                  className="px-5 py-2 text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

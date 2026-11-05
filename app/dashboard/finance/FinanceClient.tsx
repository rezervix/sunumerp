"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { FilePicker } from "@/components/shared/file-picker"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"

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

const COLORS = ["#34d399", "#38bdf8", "#fbbf24", "#fb7185", "#a78bfa", "#2dd4bf", "#f472b6", "#818cf8", "#60a5fa", "#4ade80"]

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
    } catch (error) {
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
        toast.success("Kayıt başarıyla eklendi.")
      } else {
        const eData = await res.json()
        toast.error(eData.error || "Kayıt eklenirken hata oluştu.")
      }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    const d = new Date(curr.date);
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
      case "INCOME": return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
      case "EXPENSE": return "bg-rose-500/15 text-rose-300 border border-rose-500/30"
      case "DEBT": return "bg-purple-500/15 text-purple-300 border border-purple-500/30"
      case "EXPECTED_PAYMENT": return "bg-sky-500/15 text-sky-300 border border-sky-500/30"
      default: return "bg-slate-500/15 text-slate-300 border border-slate-500/30"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">Kurumsal Finans</h1>
          <p className="text-sm text-white/60">
            {currentBranch ? `${currentBranch.name} Şubesi - Finansal Yönetim Paneli` : "Finansal Yönetim Paneli"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="glass-input px-4 py-2.5 text-sm focus:outline-none transition-all"
          >
            <option value="THIS_MONTH" className="bg-slate-900 text-white">Bu Ay</option>
            <option value="LAST_6_MONTHS" className="bg-slate-900 text-white">Son 6 Ay</option>
            <option value="FULL_YEAR" className="bg-slate-900 text-white">Tüm Yıl</option>
          </select>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 border border-white/15 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Yeni İşlem
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/60">Toplam Gelir</h3>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">₺{totalIncome.toLocaleString("tr-TR")}</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/60">Toplam Gider</h3>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-[18px]">trending_down</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">₺{totalExpense.toLocaleString("tr-TR")}</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/60">Net Durum</h3>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
          </div>
          <div className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ₺{netBalance.toLocaleString("tr-TR")}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/60">Toplam Borç</h3>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-1">₺{totalDebt.toLocaleString("tr-TR")}</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/60">Beklenen Tahsilat</h3>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">₺{totalExpected.toLocaleString("tr-TR")}</div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Aylık Trendler</h3>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
              Gelir & Gider Akışı
            </span>
          </div>
          <div className="h-[300px]">
             {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.6)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.6)', fontSize: 12}} dx={-10} tickFormatter={(v) => `₺${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => `₺${Number(value).toLocaleString("tr-TR")}`}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Income" name="Gelir" stroke="#34d399" strokeWidth={3} dot={{r: 4, fill: '#34d399'}} activeDot={{r: 6, fill: '#34d399'}} />
                  <Line type="monotone" dataKey="Expense" name="Gider" stroke="#fb7185" strokeWidth={3} dot={{r: 4, fill: '#fb7185'}} activeDot={{r: 6, fill: '#fb7185'}} />
                </LineChart>
              </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-white/40">Trend verisi bulunamadı.</div>
             )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-bold text-white">Harcama Dağılımı</h3>
            <div className="text-right">
              <span className="text-xs text-white/50 block">En Sık Harcama</span>
              <span className="text-xs font-semibold text-amber-300 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full mt-1 inline-block">{mostFrequentCategory}</span>
            </div>
          </div>
          <div className="h-[300px]">
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="rgba(15, 23, 42, 0.6)"
                    strokeWidth={2}
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     formatter={(value) => `₺${Number(value).toLocaleString("tr-TR")}`}
                     contentStyle={{
                       backgroundColor: 'rgba(15, 23, 42, 0.92)',
                       borderRadius: '12px',
                       border: '1px solid rgba(255,255,255,0.15)',
                       color: '#fff',
                       boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                     }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/40">Harcama verisi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-table-container overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
          <h3 className="text-lg font-bold text-white">Tüm İşlemler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.03] text-white/50 font-semibold border-b border-white/10 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Açıklama</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Tür</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">
                    {new Date(record.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-white/80">
                    <div className="flex items-center gap-2">
                      {record.description}
                      {record.receiptUrl && (
                        <a href={record.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-sky-400 hover:bg-sky-500/15 rounded-lg transition-colors" title="Makbuzu Gör">
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium ${getTypeStyles(record.type)}`}>
                      {getTypeLabel(record.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.status === "pending" && (
                      <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">Bekliyor</span>
                    )}
                    {record.status === "approved" && (
                      <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Onaylandı</span>
                    )}
                    {record.status === "rejected" && (
                      <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">Reddedildi</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-bold ${
                        record.type === "INCOME" ? "text-emerald-400" : 
                        record.type === "EXPENSE" ? "text-rose-400" :
                        record.type === "DEBT" ? "text-purple-400" : "text-sky-400"
                      }`}>
                        {record.type === "INCOME" || record.type === "EXPECTED_PAYMENT" ? "+" : "-"}₺{record.amount.toLocaleString("tr-TR")}
                      </span>

                      {/* Onaylama/Reddetme Butonları (Sadece Super Admin ve Bekliyor durumunda) */}
                      {isSuperAdmin && record.status === "pending" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(record.id, "approved")}
                            disabled={loading}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                            title="Onayla"
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.id, "rejected")}
                            disabled={loading}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                            title="Reddet"
                          >
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(record.id)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/15 transition-colors opacity-0 group-hover:opacity-100 max-lg:opacity-100"
                        title="Sil"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">İşlem bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Yeni Girdi / İşlem</h3>
              <button onClick={() => setIsDialogOpen(false)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Tarih *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">İşlem Türü *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                >
                  <option value="INCOME" className="bg-slate-900 text-white">Gelir</option>
                  <option value="EXPENSE" className="bg-slate-900 text-white">Gider</option>
                  <option value="DEBT" className="bg-slate-900 text-white">Borç</option>
                  <option value="EXPECTED_PAYMENT" className="bg-slate-900 text-white">Beklenen Ödeme</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Kategori *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                >
                  {formData.type === "INCOME" && INCOME_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                  {formData.type === "EXPENSE" && EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                  {(formData.type === "DEBT" || formData.type === "EXPECTED_PAYMENT") && OTHER_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Açıklama *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kısa açıklama"
                  className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Tutar (₺) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <FilePicker
                  label="Fiş / Makbuz Yükle"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData(prev => ({ ...prev, receiptUrl: urls[0] || "" }))}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.description || formData.amount <= 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

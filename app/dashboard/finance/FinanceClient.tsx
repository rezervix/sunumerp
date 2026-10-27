"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { FilePicker } from "@/components/shared/file-picker"
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#f87171", "#fbbf24", "#34d399", "#60a5fa"]

export default function FinanceClient() {
  const [records, setRecords] = useState<FinanceRecord[]>([])
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
      let url = `/api/finance?branchId=${currentBranch.id}`
      if (startDate) url += `&startDate=${startDate}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecords(Array.isArray(data) ? data : [])
      } else {
        toast.error("Finansal veriler yuklenemedi.")
      }
    } catch (error) {
      toast.error("Ağ hatası oluştu.")
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
      case "INCOME": return "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500"
      case "EXPENSE": return "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-500"
      case "DEBT": return "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-500"
      case "EXPECTED_PAYMENT": return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-500"
      default: return "bg-gray-50 text-gray-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kurumsal Finans</h1>
          <p className="text-sm text-gray-500">
            {currentBranch ? `${currentBranch.name} Şubesi - Finansal Yönetim Paneli` : "Finansal Yönetim Paneli"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          >
            <option value="THIS_MONTH">Bu Ay</option>
            <option value="LAST_6_MONTHS">Son 6 Ay</option>
            <option value="FULL_YEAR">Tüm Yıl</option>
          </select>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Yeni İşlem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Toplam Gelir</h3>
            <span className="material-symbols-outlined text-green-500">trending_up</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">â‚º{totalIncome.toLocaleString("tr-TR")}</div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Toplam Gider</h3>
            <span className="material-symbols-outlined text-red-500">trending_down</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">â‚º{totalExpense.toLocaleString("tr-TR")}</div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Net Durum</h3>
            <span className="material-symbols-outlined text-blue-500">account_balance</span>
          </div>
          <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            â‚º{netBalance.toLocaleString("tr-TR")}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Toplam Borç</h3>
            <span className="material-symbols-outlined text-purple-500">payments</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">â‚º{totalDebt.toLocaleString("tr-TR")}</div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Beklenen Tahsilat</h3>
            <span className="material-symbols-outlined text-amber-500">schedule</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">â‚º{totalExpected.toLocaleString("tr-TR")}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aylık Trendler</h3>
          </div>
          <div className="h-[300px]">
             {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} tickFormatter={(v) => `â‚º${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => `â‚º${Number(value).toLocaleString("tr-TR")}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Income" name="Gelir" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="Expense" name="Gider" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Trend verisi bulunamadı.</div>
             )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Harcama Dağılımı</h3>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">En Sık Harcama</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-md mt-1 inline-block">{mostFrequentCategory}</span>
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
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     formatter={(value) => `â‚º${Number(value).toLocaleString("tr-TR")}`}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">Harcama verisi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tüm İşlemler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Açıklama</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Tür</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {new Date(record.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      {record.description}
                      {record.receiptUrl && (
                        <a href={record.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="Makbuzu Gör">
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs text-gray-600 dark:text-gray-400">
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyles(record.type)}`}>
                      {getTypeLabel(record.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.status === "pending" && (
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">Bekliyor</span>
                    )}
                    {record.status === "approved" && (
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500">Onaylandı</span>
                    )}
                    {record.status === "rejected" && (
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500">Reddedildi</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-bold ${
                        record.type === "INCOME" ? "text-green-600 dark:text-green-500" : 
                        record.type === "EXPENSE" ? "text-red-600 dark:text-red-500" :
                        record.type === "DEBT" ? "text-purple-600 dark:text-purple-500" : "text-blue-600 dark:text-blue-500"
                      }`}>
                        {record.type === "INCOME" || record.type === "EXPECTED_PAYMENT" ? "+" : "-"}â‚º{record.amount.toLocaleString("tr-TR")}
                      </span>

                      {/* Onaylama/Reddetme Butonları (Sadece Super Admin ve Bekliyor durumunda) */}
                      {isSuperAdmin && record.status === "pending" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(record.id, "approved")}
                            disabled={loading}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                            title="Onayla"
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.id, "rejected")}
                            disabled={loading}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Reddet"
                          >
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(record.id)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 max-lg:opacity-100"
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">İşlem bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Girdi / İşlem</h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tarih *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">İşlem Türü *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="INCOME">Gelir</option>
                  <option value="EXPENSE">Gider</option>
                  <option value="DEBT">Borç</option>
                  <option value="EXPECTED_PAYMENT">Beklenen Ödeme</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kategori *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  {formData.type === "INCOME" && INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {formData.type === "EXPENSE" && EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {(formData.type === "DEBT" || formData.type === "EXPECTED_PAYMENT") && OTHER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kısa açıklama"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tutar (â‚º) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.description || formData.amount <= 0}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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

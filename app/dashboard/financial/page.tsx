"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"

interface Transaction {
  id: string
  branchId: string
  date: string
  description: string
  client: string
  type: "income" | "expense"
  amount: number
  attachmentUrl?: string
  expenseCategory?: string
}

import { FilePicker } from "@/components/shared/file-picker"

export default function FinancialPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    client: "",
    type: "income" as Transaction["type"],
    amount: 0,
    attachmentUrl: "",
    expenseCategory: "general",
  })

  const { currentBranch } = useAuth()

  useEffect(() => {
    if (currentBranch) {
      loadTransactions()
    }
  }, [currentBranch])

  const loadTransactions = async () => {
    if (!currentBranch) {
      setTransactions([])
      return
    }

    try {
      const res = await fetch(`/api/financial?branchId=${currentBranch.id}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(Array.isArray(data) ? data : [])
      } else {
        toast.error("Finansal veriler yuklenemedi.")
      }
    } catch (error) {
      console.error("Failed to load transactions:", error)
      toast.error("Ag hatasi olustu.")
    }
  }

  const handleCreate = async () => {
    if (!formData.description || formData.amount <= 0 || !currentBranch) return
    setLoading(true)

    try {
      const res = await fetch("/api/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: currentBranch.id,
          ...formData,
        }),
      })

      if (res.ok) {
        loadTransactions()
        setIsCreateDialogOpen(false)
        setFormData({
          description: "",
          client: "",
          type: "income",
          amount: 0,
          attachmentUrl: "",
          expenseCategory: "general"
        })
        toast.success("Islem basariyla eklendi.")
      } else {
        toast.error("Islem eklenirken hata olustu.")
      }
    } catch (error) {
      console.error("Failed to create transaction:", error)
      toast.error("Ag hatasi olustu.")
    } finally {
      setLoading(false)
    }
  }

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const getMonthlyTotal = (type: "income" | "expense", month: number, year: number) => {
    return transactions
      .filter((t) => {
        const d = new Date(t.date)
        return t.type === type && d.getMonth() === month && d.getFullYear() === year
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const currentMonthIncome = getMonthlyTotal("income", currentMonth, currentYear)
  const lastMonthIncome = getMonthlyTotal("income", lastMonth, lastMonthYear)
  const incomeChange = lastMonthIncome === 0 ? 0 : ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100

  const currentMonthExpense = getMonthlyTotal("expense", currentMonth, currentYear)
  const lastMonthExpense = getMonthlyTotal("expense", lastMonth, lastMonthYear)
  const expenseChange = lastMonthExpense === 0 ? 0 : ((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100

  const currentMonthProfit = currentMonthIncome - currentMonthExpense
  const lastMonthProfit = lastMonthIncome - lastMonthExpense
  const profitChange = lastMonthProfit === 0 ? 0 : ((currentMonthProfit - lastMonthProfit) / lastMonthProfit) * 100

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const netProfit = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Finans</h1>
          <p className="text-sm text-gray-500">
            {currentBranch ? `${currentBranch.name} - Mali durum ve islemler` : "Mali durum ve islemler"}
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              description: "",
              client: "",
              type: "income",
              amount: 0,
              attachmentUrl: "",
              expenseCategory: "general"
            })
            setIsCreateDialogOpen(true)
          }}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yeni Islem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Gelir</h3>
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500 text-[20px]">trending_up</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">â‚º{totalIncome.toLocaleString("tr-TR")}</div>
            <p className={`text-sm mt-2 flex items-center gap-1 font-medium ${incomeChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              <span className="material-symbols-outlined text-[16px]">{incomeChange >= 0 ? "arrow_upward" : "arrow_downward"}</span>
              {Math.abs(incomeChange).toFixed(1)}% gecen aydan bu yana
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Gider</h3>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[20px]">trending_down</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">â‚º{totalExpense.toLocaleString("tr-TR")}</div>
            <p className={`text-sm mt-2 flex items-center gap-1 font-medium ${expenseChange <= 0 ? "text-green-500" : "text-red-500"}`}>
              <span className="material-symbols-outlined text-[16px]">{expenseChange <= 0 ? "arrow_downward" : "arrow_upward"}</span>
              {Math.abs(expenseChange).toFixed(1)}% gecen aydan bu yana
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Kar</h3>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-500 text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">â‚º{netProfit.toLocaleString("tr-TR")}</div>
            <p className={`text-sm mt-2 flex items-center gap-1 font-medium ${profitChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              <span className="material-symbols-outlined text-[16px]">{profitChange >= 0 ? "arrow_upward" : "arrow_downward"}</span>
              {Math.abs(profitChange).toFixed(1)}% gecen aydan bu yana
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Son Islemler</h3>
          <p className="text-sm text-gray-500">Bu ayki mali hareketler</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Aciklama</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Musteri</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Tip</th>
                <th className="px-6 py-4 font-medium text-right uppercase tracking-wider">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {new Date(transaction.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      {transaction.description}
                      {transaction.attachmentUrl && (
                        <a href={transaction.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="Dosyayi Gor">
                          <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {transaction.expenseCategory === "marketing" ? "Pazarlama" :
                        transaction.expenseCategory === "salary" ? "Maas" :
                          transaction.expenseCategory === "rent" ? "Kira" :
                            transaction.expenseCategory === "office" ? "Ofis" : "Genel"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {transaction.client || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${transaction.type === "income"
                      ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500"
                      : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-500"
                      }`}>
                      {transaction.type === "income" ? "Gelir" : "Gider"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-bold ${transaction.type === "income" ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                        {transaction.type === "income" ? "+" : "-"}â‚º{transaction.amount.toLocaleString("tr-TR")}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm("Bu islemi silmek istediginize emin misiniz?")) {
                            try {
                              const res = await fetch(`/api/financial?id=${transaction.id}`, { method: "DELETE" })
                              if (res.ok) {
                                loadTransactions()
                                toast.success("Islem silindi.")
                              } else {
                                toast.error("Kayit silinemedi.")
                              }
                            } catch (error) {
                              console.error("Error deleting transaction:", error)
                              toast.error("Ag hatasi olustu.")
                            }
                          }
                        }}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 max-lg:opacity-100"
                        title="Sil"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Mali islem bulunamadi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Mali Islem</h3>
                <p className="text-sm text-gray-500">{currentBranch?.name} subesi icin yeni bir gelir veya gider kaydi olusturun</p>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Islem Tipi *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Transaction["type"] })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="income">Gelir</option>
                  <option value="expense">Gider</option>
                </select>
              </div>

              {formData.type === "expense" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Harcama Kategorisi</label>
                  <select
                    value={formData.expenseCategory}
                    onChange={(e) => setFormData({ ...formData, expenseCategory: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="general">Genel</option>
                    <option value="marketing">Pazarlama</option>
                    <option value="salary">Maas</option>
                    <option value="rent">Kira</option>
                    <option value="office">Ofis Gideri</option>
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Islem aciklamasi"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Musteri/Tedarikci</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="Firma adi (opsiyonel)"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <FilePicker
                  label="Fis / Belge (Opsiyonel)"
                  maxFiles={1}
                  onFilesSelected={(urls) => setFormData(prev => ({ ...prev, attachmentUrl: urls[0] || "" }))}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.description || formData.amount <= 0}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Ekleniyor..." : "Islem Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

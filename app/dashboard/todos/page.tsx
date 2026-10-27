"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

interface Todo {
    id: string
    title: string
    description: string | null
    priority: string
    status: string
    dueDate: string | null
    startDate?: string | null
    createdAt: string
    updatedAt: string
}

export default function TodosPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("yapilacaklar", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

    const [todos, setTodos] = useState<Todo[]>([])
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        dueDate: "",
        startDate: "",
    })

    // Basic Filter States
    const [statusFilter, setStatusFilter] = useState("all") // all, pending, completed

    useEffect(() => {
        if (session) {
            loadTodos()
        }
    }, [session])

    const loadTodos = async () => {
        try {
            const res = await fetch(`/api/todos`)
            if (res.ok) {
                const data = await res.json()
                setTodos(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Failed to load todos:", error)
        }
    }

    const handleCreate = async () => {
        if (!formData.title) return
        setLoading(true)

        try {
            const res = await fetch("/api/todos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                }),
            })

            if (res.ok) {
                loadTodos()
                setIsCreateDialogOpen(false)
                resetForm()
            }
        } catch (error) {
            console.error("Failed to create todo:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = async () => {
        if (!selectedTodo || !formData.title) return
        setLoading(true)

        try {
            const res = await fetch(`/api/todos/${selectedTodo.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                }),
            })

            if (res.ok) {
                loadTodos()
                setIsEditDialogOpen(false)
                setSelectedTodo(null)
                resetForm()
            }
        } catch (error) {
            console.error("Failed to update todo:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu gorevi silmek istediginize emin misiniz?")) return

        try {
            const res = await fetch(`/api/todos/${id}`, { method: "DELETE" })
            if (res.ok) {
                loadTodos()
            }
        } catch (error) {
            console.error("Error deleting todo:", error)
        }
    }

    const openEditDialog = (todo: Todo) => {
        setSelectedTodo(todo)
        setFormData({
            title: todo.title,
            description: todo.description || "",
            priority: todo.priority,
            status: todo.status,
            dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : "",
            startDate: todo.startDate ? new Date(todo.startDate).toISOString().split('T')[0] : "",
        })
        setIsEditDialogOpen(true)
    }

    const handleToggleComplete = async (todo: Todo, checked: boolean) => {
        try {
            const newStatus = checked ? "completed" : "pending"
            const res = await fetch(`/api/todos/${todo.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: todo.title,
                    description: todo.description,
                    priority: todo.priority,
                    dueDate: todo.dueDate,
                    status: newStatus,
                }),
            })

            if (res.ok) {
                loadTodos()
            }
        } catch (error) {
            console.error("Failed to toggle todo status:", error)
        }
    }

    const resetForm = () => {
        setFormData({ title: "", description: "", priority: "medium", status: "pending", dueDate: "", startDate: "" })
    }

    const filteredTodos = todos.filter(t => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false
        return true
    })

    const pendingTodosCount = todos.filter((t) => t.status === "pending").length
    const completedTodosCount = todos.filter((t) => t.status === "completed").length

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Yapilacaklar Isler</h1>
                    <p className="text-sm text-gray-500">
                        Kendi islerinizi ve gunluk gorevlerinizi yonetin.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setIsCreateDialogOpen(true)
                    }}
                    className="bg-primary hover:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Yeni Gorev
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-row items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bekleyen Gorevler</h3>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-500 text-[20px]">pending_actions</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{pendingTodosCount}</div>
                        <p className="text-sm text-gray-500 mt-1">Tamamlanmayi bekliyor</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-row items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tamamlananlar</h3>
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-500 text-[20px]">task_alt</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTodosCount}</div>
                        <p className="text-sm text-green-500 mt-1">Harika is cikardiniz</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gorev Listesi</h3>
                        <p className="text-sm text-gray-500">Kisisel gorevleriniz</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-gray-700 dark:text-gray-300"
                        >
                            <option value="all">Tumu</option>
                            <option value="pending">Bekleyenler</option>
                            <option value="completed">Tamamlananlar</option>
                        </select>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {filteredTodos.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-[32px] text-gray-400">task</span>
                                </div>
                                <p className="text-gray-500">Henuz bir gorev bulunmuyor.</p>
                            </div>
                        ) : (
                            filteredTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${todo.status === "completed" ? "bg-gray-50/50 dark:bg-white/10 border-gray-100 dark:border-gray-800 opacity-60" : "bg-white dark:bg-[#1f2428] border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-primary/30"}`}
                                >
                                    <div className="flex items-center h-6 mt-1">
                                        <input
                                            type="checkbox"
                                            checked={todo.status === "completed"}
                                            onChange={(e) => handleToggleComplete(todo, e.target.checked)}
                                            className="w-5 h-5 text-primary border-gray-300 rounded cursor-pointer focus:ring-primary focus:ring-2 focus:ring-offset-2"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                                            <div className="space-y-1 pr-4">
                                                <h3 className={`text-base font-bold ${todo.status === "completed" ? "text-gray-500 line-through" : "text-gray-900 dark:text-white"}`}>
                                                    {todo.title}
                                                </h3>
                                                {todo.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{todo.description}</p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${todo.priority === "high" ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-500" :
                                                todo.priority === "low" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500" :
                                                    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-500"
                                                }`}>
                                                {todo.priority === "high" ? "Yuksek" : todo.priority === "low" ? "Dusuk" : "Normal"}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            {todo.startDate && (
                                                <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
                                                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                                    {new Date(todo.startDate).toLocaleDateString("tr-TR")}
                                                </div>
                                            )}

                                            {todo.dueDate && (
                                                <div className={`flex items-center gap-2 text-sm font-medium ${new Date(todo.dueDate) < new Date() && todo.status !== "completed" ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                    {new Date(todo.dueDate).toLocaleDateString("tr-TR")}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1 sm:ml-auto">
                                                <button
                                                    onClick={() => openEditDialog(todo)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                >
                                                    Duzenle
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(todo.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Dialog */}
            {isCreateDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f2428] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Gorev Ekle</h3>
                                <p className="text-sm text-gray-500">Yapilacaklar listenize yeni bir kayit olusturun</p>
                            </div>
                            <button onClick={() => setIsCreateDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslik *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Gorev adi..."
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detaylar..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslangic Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bitis Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/10 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsCreateDialogOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading || !formData.title}
                                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {loading ? "Ekleniyor..." : "Gorev Ekle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Dialog */}
            {isEditDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f2428] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gorev Duzenle</h3>
                                <p className="text-sm text-gray-500">Gorev detaylarini guncelleyin</p>
                            </div>
                            <button onClick={() => setIsEditDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslik *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aciklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Baslangic Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bitis Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Durum</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                                >
                                    <option value="pending">Bekliyor</option>
                                    <option value="completed">Tamamlandi</option>
                                </select>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/10 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsEditDialogOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={loading || !formData.title}
                                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {loading ? "Guncelleniyor..." : "Guncelle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

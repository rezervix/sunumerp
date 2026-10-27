"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

interface Note {
    id: string
    title: string
    content: string
    isDeleted: boolean
    createdAt: string
    updatedAt: string
}

export default function NotesPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("notlarim", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

    const [notes, setNotes] = useState<Note[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        content: "",
    })

    useEffect(() => {
        if (session) {
            loadNotes()
        }
    }, [session])

    const loadNotes = async () => {
        try {
            const res = await fetch(`/api/notes`)
            if (res.ok) {
                const data = await res.json()
                setNotes(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Failed to load notes:", error)
        }
    }

    const handleSave = async () => {
        if (!formData.title || !formData.content) return
        setLoading(true)

        try {
            const method = selectedNote ? "PUT" : "POST"
            const url = selectedNote ? `/api/notes/${selectedNote.id}` : "/api/notes"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                loadNotes()
                setIsDialogOpen(false)
                resetForm()
            }
        } catch (error) {
            console.error("Failed to save note:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (noteId: string) => {
        if (!confirm("Bu notu silmek istediginize emin misiniz? (Geri donusum kutusuna tasinir)")) return

        try {
            // Soft delete
            const res = await fetch(`/api/notes/${noteId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDeleted: true }),
            })
            if (res.ok) {
                loadNotes()
            }
        } catch (error) {
            console.error("Error deleting note:", error)
        }
    }

    const openDialog = (note?: Note) => {
        if (note) {
            setSelectedNote(note)
            setFormData({
                title: note.title,
                content: note.content,
            })
        } else {
            setSelectedNote(null)
            resetForm()
        }
        setIsDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({ title: "", content: "" })
        setSelectedNote(null)
    }

    // Filter notes that are NOT deleted and match search
    const filteredNotes = notes.filter(n => {
        if (n.isDeleted) return false
        if (!searchQuery) return true

        const lowerQuery = searchQuery.toLowerCase()
        return n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery)
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Notlarim</h1>
                    <p className="text-sm text-gray-500">
                        Kisisel ve hizli notlarinizi yonetin.
                    </p>
                </div>
                <button
                    onClick={() => openDialog()}
                    className="bg-primary hover:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Yeni Not
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Notlarda ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                    />
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    Toplam: {filteredNotes.length} Not
                </div>
            </div>

            {filteredNotes.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-[32px] text-gray-400">description</span>
                    </div>
                    <p className="text-gray-500 mb-2">Henuz bir not bulunmuyor.</p>
                    <p className="text-sm text-gray-400">"Yeni Not" butonu ile ilk notunuzu ekleyin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredNotes.map(note => (
                        <div
                            key={note.id}
                            className="group bg-white dark:bg-[#1f2428] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-64"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 truncate mr-2" title={note.title}>
                                    {note.title}
                                </h3>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openDialog(note)}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Duzenle"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 overflow-hidden whitespace-pre-wrap line-clamp-[6]">
                                {note.content}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 mt-auto">
                                <span>Olusturuldu: {new Date(note.createdAt).toLocaleDateString("tr-TR")}</span>
                                <span>Son Guncelleme: {new Date(note.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f2428] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedNote ? "Notu Duzenle" : "Yeni Not Ekle"}</h3>
                            </div>
                            <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-500">
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
                                    placeholder="Not basligi..."
                                    autoFocus
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white font-medium"
                                />
                            </div>
                            <div className="space-y-2 h-full min-h-[300px] flex flex-col">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icerik *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Not detaylarinizi buraya yazin..."
                                    className="w-full h-full flex-1 px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/10 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading || !formData.title || !formData.content}
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

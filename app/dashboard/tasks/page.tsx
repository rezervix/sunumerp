"use client"

import { useState, useEffect } from "react"
import { Plus, CheckSquare } from "lucide-react"
import { TaskBoard } from "@/components/tasks/task-board"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { useLanguage } from "@/lib/context/LanguageContext"

export default function TasksPage() {
  const { t, tText } = useLanguage()
  const [tasks, setTasks] = useState([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tasks")
      if (res.ok) {
        const data = await res.json()
        setTasks(data.data || [])
        setIsManager(data.isManager || false)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[--text] flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-[--brand]" />
            {tText("tasks.title", t.nav?.tasks || "Görevler")}
          </h1>
          <p className="text-xs sm:text-sm text-[--text-muted] mt-1">
            {tText("tasks.subtitle", "Ekibinizin görevlerini atayın, takip edin ve tamamlayın.")}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white font-medium text-xs sm:text-sm rounded-full shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {tText("tasks.addTask", "Yeni Görev")}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px]">
            <p className="text-[--text-muted] text-xs animate-pulse">{tText("common.loading", "Görevler yükleniyor...")}</p>
          </div>
        ) : (
          <TaskBoard tasks={tasks} onTaskUpdated={fetchTasks} isManager={isManager} />
        )}
      </div>

      <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={fetchTasks} />
    </div>
  )
}

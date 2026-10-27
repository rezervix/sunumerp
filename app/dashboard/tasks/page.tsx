"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            {tText("tasks.title", t.nav.tasks)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {tText("tasks.subtitle", "Ekibinizin görevlerini atayın, takip edin ve tamamlayın.")}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {tText("tasks.addTask", "Yeni Görev")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground animate-pulse">{tText("common.loading", "Görevler yükleniyor...")}</p>
          </div>
        ) : (
          <TaskBoard tasks={tasks} onTaskUpdated={fetchTasks} isManager={isManager} />
        )}
      </div>

      <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={fetchTasks} />
    </div>
  )
}

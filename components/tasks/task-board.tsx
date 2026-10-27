"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { format, isPast, startOfDay } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar, Paperclip } from "lucide-react"
import { TaskDetailDialog } from "./task-detail-dialog"

export type Task = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string | null
  attachments: string | null
  assignee: { id: string, fullName: string, avatarUrl: string | null }
  assigner: { id: string, fullName: string, avatarUrl: string | null }
  createdAt: string
}

interface TaskBoardProps {
  tasks: Task[]
  onTaskUpdated: () => void
  isManager: boolean
}

const COLUMNS = [
  { id: "TODO", title: "Bekleyen İşler", color: "bg-slate-100 border-slate-200" },
  { id: "IN_PROGRESS", title: "Devam Ediyor", color: "bg-blue-50 border-blue-200" },
  { id: "REVIEW", title: "İncelemede", color: "bg-amber-50 border-amber-200" },
  { id: "DONE", title: "Tamamlandı", color: "bg-emerald-50 border-emerald-200" },
]

const PRIORITY_MAP: Record<string, { label: string, color: string, weight: number }> = {
  LOW: { label: "Düşük", color: "bg-slate-100 text-slate-700", weight: 1 },
  MEDIUM: { label: "Orta", color: "bg-blue-100 text-blue-700", weight: 2 },
  HIGH: { label: "Yüksek", color: "bg-orange-100 text-orange-700", weight: 3 },
  URGENT: { label: "Acil", color: "bg-red-500 text-white animate-pulse", weight: 4 },
}

export function TaskBoard({ tasks, onTaskUpdated, isManager }: TaskBoardProps) {
  const { toast } = useToast()
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (!draggedTaskId) return

    const task = tasks.find(t => t.id === draggedTaskId)
    if (task && task.status !== newStatus) {
      await updateTaskStatus(draggedTaskId, newStatus)
    }
    setDraggedTaskId(null)
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error("Guncelleme hatasi")
      
      onTaskUpdated()
    } catch (error) {
      toast({ title: "Hata", description: "Görev durumu güncellenemedi.", variant: "destructive" })
    }
  }

  const sortTasks = (tasksList: Task[]) => {
    return tasksList.sort((a, b) => {
      // 1. Overdue kontrolü (Tamamlananlar haric)
      const isOverdueA = a.dueDate && a.status !== "DONE" && isPast(startOfDay(new Date(a.dueDate)))
      const isOverdueB = b.dueDate && b.status !== "DONE" && isPast(startOfDay(new Date(b.dueDate)))
      
      if (isOverdueA && !isOverdueB) return -1
      if (!isOverdueA && isOverdueB) return 1

      // 2. Aciliyet (Priority) kontrolü
      const pA = PRIORITY_MAP[a.priority]?.weight || 0
      const pB = PRIORITY_MAP[b.priority]?.weight || 0
      if (pA !== pB) return pB - pA

      // 3. Yenilik durumu
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
      {COLUMNS.map(column => {
        const columnTasks = sortTasks(tasks.filter(t => t.status === column.id))

        return (
          <div 
            key={column.id} 
            className={`flex-1 min-w-[300px] max-w-[400px] rounded-xl border ${column.color} p-4 flex flex-col`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">{column.title}</h3>
              <Badge variant="secondary" className="bg-white">
                {columnTasks.length}
              </Badge>
            </div>
            
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {columnTasks.map(task => {
                const isOverdue = task.dueDate && task.status !== "DONE" && isPast(startOfDay(new Date(task.dueDate)))
                const attachmentCount = JSON.parse(task.attachments || "[]").length

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
                      isOverdue ? "border-2 border-red-500 ring-2 ring-red-100" : "border border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className={`text-[10px] border-none ${PRIORITY_MAP[task.priority]?.color || ""}`}>
                          {PRIORITY_MAP[task.priority]?.label || task.priority}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            GECİKMİŞ
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm text-slate-900 mb-1 line-clamp-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border">
                          <AvatarImage src={task.assignee.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {task.assignee.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-600 line-clamp-1 max-w-[100px]">
                          {task.assignee.fullName}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {attachmentCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Paperclip size={12} />
                            {attachmentCount}
                          </div>
                        )}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${isOverdue ? "text-red-700 bg-red-100" : "text-slate-400 bg-slate-50"}`}>
                            <Calendar size={12} />
                            {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {columnTasks.length === 0 && (
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-6 text-center text-sm text-slate-400">
                  Buraya sürükleyin
                </div>
              )}
            </div>
          </div>
        )
      })}

      {selectedTask && (
        <TaskDetailDialog 
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(val) => !val && setSelectedTask(null)}
          onSuccess={() => {
            setSelectedTask(null)
            onTaskUpdated()
          }}
          isManager={isManager}
        />
      )}
    </div>
  )
}

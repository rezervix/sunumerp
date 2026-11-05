"use client"

import { useState } from "react"
import { motion } from "framer-motion"
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
  { id: "TODO", title: "Bekleyen İşler" },
  { id: "IN_PROGRESS", title: "Devam Ediyor" },
  { id: "REVIEW", title: "İncelemede" },
  { id: "DONE", title: "Tamamlandı" },
]

const PRIORITY_MAP: Record<string, { label: string, color: string, weight: number }> = {
  LOW: { label: "Düşük", color: "bg-white/5 text-zinc-400 border border-white/10", weight: 1 },
  MEDIUM: { label: "Orta", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", weight: 2 },
  HIGH: { label: "Yüksek", color: "bg-amber-500/10 text-amber-300 border border-amber-500/20", weight: 3 },
  URGENT: { label: "Acil", color: "bg-rose-500/15 text-rose-300 border border-rose-500/30", weight: 4 },
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
            className="flex-1 min-w-[300px] max-w-[400px] bg-[#111513]/60 border border-white/[0.05] rounded-[20px] p-4 flex flex-col shadow-xl"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-white">{column.title}</h3>
              <span className="bg-white/5 text-zinc-300 border border-white/10 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium">
                {columnTasks.length}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {columnTasks.map(task => {
                const isOverdue = task.dueDate && task.status !== "DONE" && isPast(startOfDay(new Date(task.dueDate)))
                const attachmentCount = JSON.parse(task.attachments || "[]").length

                return (
                  <motion.div
                    layout
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setSelectedTask(task)}
                    whileHover={{ y: -3 }}
                    className={`bg-[#0d100e] p-4 rounded-[16px] shadow-sm cursor-grab active:cursor-grabbing hover:border-emerald-500/30 transition-colors group text-white ${
                      isOverdue ? "border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]" : "border border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${PRIORITY_MAP[task.priority]?.color || "bg-white/5 text-zinc-400"}`}>
                          {PRIORITY_MAP[task.priority]?.label || task.priority}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] rounded-full px-2 py-0.5 font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            GECİKMİŞ
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm text-white mb-1 line-clamp-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{task.description}</p>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-white/10">
                          <AvatarImage src={task.assignee.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-400">
                            {task.assignee.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-zinc-300 line-clamp-1 max-w-[110px]">
                          {task.assignee.fullName}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {attachmentCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Paperclip size={12} />
                            {attachmentCount}
                          </div>
                        )}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono ${isOverdue ? "text-rose-300 bg-rose-500/15 border border-rose-500/30" : "text-zinc-400 bg-white/5 border border-white/10"}`}>
                            <Calendar size={11} />
                            {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              
              {columnTasks.length === 0 && (
                <div className="flex-1 border-2 border-dashed border-white/[0.06] rounded-xl flex items-center justify-center p-6 text-center text-xs text-zinc-600">
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

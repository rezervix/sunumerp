"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Paperclip, ExternalLink } from "lucide-react"
import type { Task } from "./task-board"

interface TaskDetailDialogProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isManager: boolean
}

export function TaskDetailDialog({ task, open, onOpenChange, onSuccess, isManager }: TaskDetailDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const attachments: { name: string, url: string }[] = JSON.parse(task.attachments || "[]")

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) throw new Error("Dosya sunucuya yuklenemedi.")
      const uploadData = await uploadRes.json()
      
      if (!uploadData.urls || uploadData.urls.length === 0) {
        throw new Error("Yol alınamadı.")
      }

      const uploadedUrl = uploadData.urls[0]
      const newAttachment = { name: file.name, url: uploadedUrl }
      
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: newAttachment })
      })

      if (!res.ok) throw new Error("Dosya göreve eklenemedi.")

      toast({ title: "Başarılı", description: "Dosya göreve eklendi." })
      setFile(null)
      onSuccess()
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Dosya yüklenirken bir sorun oluştu.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Silinemedi")
      
      toast({ title: "Başarılı", description: "Görev silindi." })
      onSuccess()
    } catch (error) {
      toast({ title: "Hata", description: "Görev silinemedi.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-slate-500">Açıklama</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">
              {task.description || "Açıklama bulunmuyor."}
            </p>
          </div>

          <div>
            <Label className="text-slate-500 flex items-center gap-2 mb-2">
              <Paperclip size={16} /> Yüklenen Dosyalar
            </Label>
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Henüz dosya yüklenmemiş.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-2 p-2 border rounded-md bg-slate-50">
                    <Paperclip size={14} className="text-slate-400" />
                    <span className="text-sm flex-1 truncate">{att.name}</span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                      Görüntüle <ExternalLink size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            
            <form onSubmit={handleFileUpload} className="mt-4 flex items-center gap-2">
              <input 
                type="file" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
                className="text-sm border rounded p-1"
                disabled={loading}
              />
              <Button type="submit" disabled={!file || loading} size="sm">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yükle
              </Button>
            </form>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
            <div><strong>Atayan:</strong> {task.assigner?.fullName || "Bilinmiyor"}</div>
            <div><strong>Sorumlu:</strong> {task.assignee?.fullName || "Bilinmiyor"}</div>
            <div><strong>Öncelik:</strong> {task.priority}</div>
            <div><strong>Durum:</strong> {task.status}</div>
          </div>
        </div>

        <DialogFooter className="pt-4 flex justify-between items-center w-full">
          {isManager ? (
             <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Görevi Sil
             </Button>
          ) : <div />}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  prefillTitle?: string
  prefillDescription?: string
  prefillBranchId?: string
}

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  prefillTitle = "",
  prefillDescription = "",
  prefillBranchId = ""
}: CreateTaskDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState("")

  useEffect(() => {
    if (open) {
      fetchUsers()
      fetchBranches()
      
      // Apply prefilled fields
      setTitle(prefillTitle)
      setDescription(prefillDescription)
      setBranchId(prefillBranchId || "none")
    }
  }, [open, prefillTitle, prefillDescription, prefillBranchId])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches")
      if (res.ok) {
        const data = await res.json()
        setBranches(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !assigneeId) {
      toast({ title: "Hata", description: "Başlık ve sorumlu personel zorunludur.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assigneeId,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          branchId: branchId && branchId !== "none" ? branchId : null,
        }),
      })

      if (!res.ok) throw new Error("Gorev olusturulamadi")

      toast({ title: "Başarılı", description: "Görev başarıyla oluşturuldu." })
      onSuccess()
      onOpenChange(false)
      
      // Formu sıfırla
      setTitle("")
      setDescription("")
      setAssigneeId("")
      setPriority("MEDIUM")
      setDueDate("")
      setBranchId("")
    } catch (error) {
      toast({ title: "Hata", description: "Bir sorun oluştu.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yeni Görev Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Görev Başlığı</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Deniz Üstü Afiş Revizesi" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branch">İlgili Müşteri / Şube (Opsiyonel)</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Müşteri / Şube Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seçim Yok (Genel)</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Sorumlu Personel</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Personel Seçin" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Görev Detayı / Açıklama</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Görevle ilgili ek bilgiler, linkler veya notlar..." 
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Düşük</SelectItem>
                  <SelectItem value="MEDIUM">Orta</SelectItem>
                  <SelectItem value="HIGH">Yüksek</SelectItem>
                  <SelectItem value="URGENT">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Bitiş Tarihi (Opsiyonel)</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

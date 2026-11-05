"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { HardDrive, FileText, Folder, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Stats {
  fileCount: number
  folderCount: number
  totalSizeBytes: number
  diskUsageBytes: number
  typeBreakdown: { type: string; count: number; sizeBytes: number }[]
}

interface DiskUsageBarProps {
  branchId: string
  refreshTrigger?: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const TYPE_COLORS: Record<string, string> = {
  image: "bg-blue-400",
  video: "bg-purple-400",
  audio: "bg-pink-400",
  document: "bg-red-400",
  archive: "bg-yellow-400",
  other: "bg-muted-foreground",
}

const TYPE_LABELS: Record<string, string> = {
  image: "Görseller",
  video: "Videolar",
  audio: "Sesler",
  document: "Belgeler",
  archive: "Arşivler",
  other: "Diğer",
}

export function DiskUsageBar({ branchId, refreshTrigger }: DiskUsageBarProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/ajans-kutuphanesi/stats?branchId=${branchId}`)
        if (res.ok) setStats(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [branchId, refreshTrigger])

  if (loading || !stats) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-3 bg-muted rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const totalSegments = stats.typeBreakdown.reduce((a, b) => a + b.sizeBytes, 0)

  return (
    <div className="p-4 space-y-4 border-t border-border">
      {/* Başlık */}
      <div className="flex items-center gap-2">
        <HardDrive size={14} className="text-muted-foreground" />
        <span className="text-label text-muted-foreground">Depolama</span>
      </div>

      {/* Özet istatistikler */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg p-2.5">
          <p className="text-label text-muted-foreground mb-1">Dosyalar</p>
          <div className="flex items-center gap-1.5">
            <FileText size={13} className="text-emerald-400" />
            <span className="text-sm font-semibold">{stats.fileCount.toLocaleString("tr")}</span>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2.5">
          <p className="text-label text-muted-foreground mb-1">Klasörler</p>
          <div className="flex items-center gap-1.5">
            <Folder size={13} className="text-amber-500" />
            <span className="text-sm font-semibold">{stats.folderCount.toLocaleString("tr")}</span>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2.5 col-span-2">
          <p className="text-label text-muted-foreground mb-1">Toplam Boyut</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-green-500" />
            <span className="text-sm font-semibold">{formatBytes(stats.totalSizeBytes)}</span>
          </div>
        </div>
      </div>

      {/* Tür dağılımı */}
      {stats.typeBreakdown.length > 0 && totalSegments > 0 && (
        <div>
          {/* Renk çubuğu - Animasyonlu Dolum */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-2.5 bg-white/[0.04] p-0.5 border border-white/[0.06]">
            {stats.typeBreakdown
              .filter((t) => t.sizeBytes > 0)
              .map((t) => (
                <motion.div
                  key={t.type}
                  initial={{ width: 0 }}
                  animate={{ width: `${(t.sizeBytes / totalSegments) * 100}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className={cn("h-full rounded-full", TYPE_COLORS[t.type] ?? "bg-zinc-600")}
                  title={`${TYPE_LABELS[t.type] ?? t.type}: ${formatBytes(t.sizeBytes)}`}
                />
              ))}
          </div>

          {/* Efsane */}
          <div className="space-y-1.5">
            {stats.typeBreakdown
              .filter((t) => t.count > 0)
              .map((t) => (
                <div key={t.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("size-2 rounded-full", TYPE_COLORS[t.type] ?? "bg-muted")} />
                    <span className="text-caption">{TYPE_LABELS[t.type] ?? t.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <span>{t.count} dosya</span>
                    <span>{formatBytes(t.sizeBytes)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

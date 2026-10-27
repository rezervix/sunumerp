import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

const STATUS_META_LOCAL: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: "Taslak",           color: "text-slate-600 dark:text-slate-300",   bg: "bg-slate-100 dark:bg-slate-800" },
  awaiting_shoot:   { label: "Çekim Bekleniyor", color: "text-amber-600 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-900/30" },
  in_editing:       { label: "Editleniyor",       color: "text-blue-600 dark:text-blue-350",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  pending_approval: { label: "Onay Bekliyor",     color: "text-violet-600 dark:text-violet-300",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  scheduled:        { label: "Planlandı",         color: "text-sky-600 dark:text-sky-300",     bg: "bg-sky-100 dark:bg-sky-900/30" },
  published:        { label: "Yayınlandı",        color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  cancelled:        { label: "İptal Edildi",      color: "text-red-600 dark:text-red-300",     bg: "bg-red-100 dark:bg-red-900/30" },
  missed:           { label: "Kaçırıldı",         color: "text-orange-650 dark:text-orange-300",  bg: "bg-orange-100 dark:bg-orange-900/30" },
  planned:          { label: "Planlandı",         color: "text-sky-600 dark:text-sky-300",     bg: "bg-sky-100 dark:bg-sky-900/30" },
  shot:             { label: "Çekildi",           color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  completed:        { label: "Tamamlandı",        color: "text-emerald-650 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  postponed:        { label: "Ertelendi",         color: "text-amber-600 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-900/30" },
}

interface MessageBubbleProps {
  msg: any
  currentUserId: string
  onReact: (emoji: string) => void
  onReply: () => void
  onForward: () => void
  onStar: () => void
  onPin: () => void
  onDelete: (forAll: boolean) => void
  onEdit: (newContent: string) => void
  onVote: (optionIds: string[]) => void
  onSelectRepliedMessage: (messageId: string) => void
}

export function MessageBubble({
  msg,
  currentUserId,
  onReact,
  onReply,
  onForward,
  onStar,
  onPin,
  onDelete,
  onEdit,
  onVote,
  onSelectRepliedMessage,
}: MessageBubbleProps) {
  const isMe = msg.fromUserId === currentUserId
  const isSystem = msg.contentType === "system" || msg.isSystemMessage
  const isDeleted = msg.isDeleted

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(msg.content)
  const [reactionSelectorOpen, setReactionSelectorOpen] = useState(false)

  // Task Card live state & handler
  let taskCardData: any = null
  if (msg.pollData) {
    try {
      const parsed = JSON.parse(msg.pollData)
      if (parsed && parsed.type === "content_task_card") {
        taskCardData = parsed
      }
    } catch (e) {}
  }

  const [entityStatus, setEntityStatus] = useState<string | null>(taskCardData?.status || null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!taskCardData) return
    let isMounted = true
    const fetchStatus = async () => {
      try {
        const url = taskCardData.entityType === "production_shoot"
          ? `/api/icerik-takvimi/cekim/${taskCardData.entityId}`
          : `/api/icerik-takvimi/${taskCardData.entityId}`
        const res = await fetch(url)
        if (res.ok && isMounted) {
          const data = await res.json()
          setEntityStatus(data.status)
        }
      } catch (err) {
        console.error("TaskCard fetch error:", err)
      }
    }
    fetchStatus()
    return () => { isMounted = false }
  }, [taskCardData?.entityId, taskCardData?.entityType])

  const handleTaskStatusChange = async (newStatus: string) => {
    if (!taskCardData) return
    setIsUpdatingStatus(true)
    const previousStatus = entityStatus
    setEntityStatus(newStatus)
    try {
      const url = taskCardData.entityType === "production_shoot"
        ? `/api/icerik-takvimi/cekim/${taskCardData.entityId}`
        : `/api/icerik-takvimi/${taskCardData.entityId}`
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          statusNote: `Chat üzerinden ${taskCardData.role} tarafından güncellendi.`,
        }),
      })
      if (!res.ok) {
        throw new Error()
      }
      toast.success("Görev durumu güncellendi")
    } catch {
      toast.error("Durum güncellenemedi")
      setEntityStatus(previousStatus)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Audio / Voice Message Player State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(msg.fileDuration || 0)
  const [playRate, setPlayRate] = useState(1) // 1x, 1.5x, 2x
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)

  // Waveform visualization data
  let waveformArray: number[] = []
  if (msg.contentType === "voice" && msg.waveformData) {
    try {
      waveformArray = JSON.parse(msg.waveformData)
    } catch {
      // Default fallback waveform
      waveformArray = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2)
    }
  }

  // Audio handlers
  useEffect(() => {
    if (msg.contentType === "voice" || msg.contentType === "audio") {
      const audio = new Audio(msg.fileUrl)
      audioRef.current = audio

      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        if (audio.duration) {
          setDuration(audio.duration)
          setProgressPercent((audio.currentTime / audio.duration) * 100)
        }
      }

      const onLoadedMetadata = () => {
        if (audio.duration) setDuration(audio.duration)
      }

      const onEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        setProgressPercent(0)
      }

      audio.addEventListener("timeupdate", onTimeUpdate)
      audio.addEventListener("loadedmetadata", onLoadedMetadata)
      audio.addEventListener("ended", onEnded)

      return () => {
        audio.pause()
        audio.removeEventListener("timeupdate", onTimeUpdate)
        audio.removeEventListener("loadedmetadata", onLoadedMetadata)
        audio.removeEventListener("ended", onEnded)
      }
    }
  }, [msg.fileUrl])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.playbackRate = playRate
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const changePlaybackRate = () => {
    const nextRates: Record<number, number> = { 1: 1.5, 1.5: 2, 2: 1 }
    const nextRate = nextRates[playRate] || 1
    setPlayRate(nextRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate
    }
  }

  const handleSeek = (index: number, total: number) => {
    if (!audioRef.current || duration === 0) return
    const targetTime = (index / total) * duration
    audioRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
    setProgressPercent((targetTime / duration) * 100)
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  // Poll option voting handler
  const handlePollVote = (optionId: string) => {
    let currentPoll: any = null
    try {
      currentPoll = JSON.parse(msg.pollData)
    } catch {
      return
    }

    if (!currentPoll) return

    let nextVotes: string[] = []
    if (currentPoll.allowMultiple) {
      // Find option
      const opt = currentPoll.options.find((o: any) => o.id === optionId)
      if (opt) {
        const alreadyVoted = opt.votes.includes(currentUserId)
        if (alreadyVoted) {
          // Remove vote
          nextVotes = currentPoll.options
            .flatMap((o: any) => o.votes)
            .filter((uid: string) => uid !== currentUserId)
        } else {
          // Add vote
          nextVotes = [
            ...currentPoll.options.flatMap((o: any) => o.votes),
            currentUserId,
          ]
        }
      }
    } else {
      // Single vote target option
      nextVotes = [optionId]
    }

    onVote(nextVotes)
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200/50 dark:border-gray-800 text-gray-500 tracking-wide select-none shadow-xs">
          {msg.content}
        </span>
      </div>
    )
  }

  // Reactions count mapping
  const reactionsMap = (msg.reactions || []).reduce((acc: any, r: any) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  // Quick reactions array
  const quickEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

  return (
    <div
      className={`flex flex-col group/bubble relative ${
        isMe ? "items-end" : "items-start"
      } mb-4 max-w-[85%] ${isMe ? "ml-auto" : "mr-auto"}`}
    >
      {/* Sender Name (for groups/channels) */}
      {!isMe && msg.conversation?.type !== "dm" && (
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-2 uppercase tracking-wider">
          {msg.fromUser?.fullName}
        </span>
      )}

      {/* Quoted Message (Reply Preview) */}
      {msg.replyToMessageId && (
        <button
          onClick={() => onSelectRepliedMessage(msg.replyToMessageId)}
          className={`flex flex-col text-left px-3 py-2 rounded-t-2xl border-l-4 bg-gray-50 dark:bg-black/20 text-xs text-gray-500 max-w-full truncate transition-all hover:bg-gray-100/50 dark:hover:bg-black/30 ${
            isMe ? "border-primary" : "border-gray-300 dark:border-gray-600"
          }`}
        >
          <span className="font-semibold text-[10px] text-primary">
            {msg.replyFromUserId === currentUserId ? "Sen" : msg.replyToMessage?.fromUser?.fullName || "Kullanıcı"}
          </span>
          <span className="truncate opacity-80">
            {msg.replyPreviewType === "image" ? "📷 Fotoğraf"
              : msg.replyPreviewType === "video" ? "🎥 Video"
              : msg.replyPreviewType === "voice" ? "🎤 Sesli Mesaj"
              : msg.replyPreviewText || "Mesaj içeriği"}
          </span>
        </button>
      )}

      {/* Balloon Area */}
      <div className="flex items-end gap-2 max-w-full">
        {/* Actions Dropdown on Hover */}
        {isMe && (
          <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-lg">
                <DropdownMenuItem onClick={onReply} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">reply</span> Yanıtla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onForward} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">forward</span> İlet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStar} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">star</span> Yıldızla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">push_pin</span> Sabitle
                </DropdownMenuItem>
                {msg.contentType === "text" && !isDeleted && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="rounded-lg gap-2 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-[18px]">edit</span> Düzenle
                  </DropdownMenuItem>
                )}
                {!isDeleted && (
                  <>
                    <DropdownMenuItem onClick={() => onDelete(false)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-500">
                      <span className="material-symbols-outlined text-[18px]">delete</span> Benden Sil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(true)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-500 font-semibold">
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span> Herkesten Sil
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Balloon Body */}
        <div
          className={`relative rounded-3xl shadow-xs overflow-hidden flex flex-col p-3 border ${
            isMe
              ? "bg-primary text-white border-primary-foreground/10 rounded-tr-none"
              : "bg-white dark:bg-[#1f1f1f] text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-800 rounded-tl-none"
          }`}
          style={{ minWidth: "120px" }}
        >
          {/* Starred tag */}
          {msg.isStarred && (
            <div className="absolute top-2 right-2 flex items-center text-amber-400 select-none">
              <span className="material-symbols-outlined text-[14px]">star</span>
            </div>
          )}

          {/* Forwarded tag */}
          {msg.isForwarded && (
            <div className="flex items-center gap-1 text-[9px] opacity-60 mb-1 select-none font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[12px]">forward</span> İletildi
            </div>
          )}

          {/* Edit State */}
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/20 text-sm focus:outline-none p-2 rounded-xl resize-none text-inherit"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-xs rounded-lg hover:bg-black/5"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    onEdit(editContent)
                    setIsEditing(false)
                  }}
                  className="px-2 py-1 text-xs bg-white text-black dark:bg-primary-foreground dark:text-primary rounded-lg font-semibold"
                >
                  Kaydet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Content Handler */}
              {isDeleted ? (
                <div className="flex items-center gap-1.5 text-xs italic opacity-60 select-none py-1">
                  <span className="material-symbols-outlined text-[16px]">block</span>
                  Bu mesaj silindi
                </div>
              ) : (
                <>
                  {/* File / Media Render */}
                  {msg.fileUrl && (
                    <div className="mb-2 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 shrink-0 max-w-[280px]">
                      {msg.contentType === "image" ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="block relative group/media">
                          <img
                            src={msg.fileUrl}
                            alt="Visual Media"
                            className="max-h-[220px] w-full object-cover transition-transform group-hover/media:scale-101 duration-300"
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-3xl">open_in_new</span>
                          </div>
                        </a>
                      ) : msg.contentType === "video" ? (
                        <video src={msg.fileUrl} controls className="w-full max-h-[220px] outline-none" />
                      ) : msg.contentType === "audio" ? (
                        <div className="p-2 flex flex-col gap-1.5 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={togglePlay}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isMe ? "bg-white text-primary" : "bg-primary text-white"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isPlaying ? "pause" : "play_arrow"}
                              </span>
                            </button>
                            <span className="text-[10px] select-none font-semibold">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-100"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : msg.contentType === "voice" ? (
                        // WhatsApp style voice message bar
                        <div className="p-3 flex items-center gap-3 min-w-[240px]">
                          {/* Play/Pause Button */}
                          <button
                            onClick={togglePlay}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105 ${
                              isMe ? "bg-white text-primary" : "bg-primary text-white"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[24px]">
                              {isPlaying ? "pause" : "play_arrow"}
                            </span>
                          </button>

                          {/* Waveform Visualizer */}
                          <div className="flex-1 flex items-end gap-[2px] h-8 relative select-none">
                            {waveformArray.map((val, idx) => {
                              const barHeight = Math.max(10, Math.min(100, val * 100))
                              const hasPlayed = (idx / waveformArray.length) * 100 < progressPercent
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSeek(idx, waveformArray.length)}
                                  className="flex-1 transition-colors rounded-full"
                                  style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: hasPlayed
                                      ? isMe
                                        ? "rgba(255,255,255,1)"
                                        : "var(--primary)"
                                      : isMe
                                      ? "rgba(255,255,255,0.4)"
                                      : "rgba(156,163,175,0.4)",
                                  }}
                                />
                              )
                            })}
                          </div>

                          {/* Controls (Speed/Time) */}
                          <div className="flex flex-col gap-1 items-end shrink-0 select-none">
                            <button
                              onClick={changePlaybackRate}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition ${
                                isMe
                                  ? "border-white/30 hover:bg-white/10"
                                  : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {playRate}x
                            </button>
                            <span className="text-[10px] opacity-85 font-semibold">
                              {formatTime(isPlaying ? currentTime : duration)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Document / General attachment
                        <a
                          href={msg.fileUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 transition group/doc min-w-[200px]"
                        >
                          <div
                            className={`p-2.5 rounded-xl ${
                              isMe ? "bg-white/20" : "bg-gray-100 dark:bg-gray-850"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[24px]">description</span>
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-sm font-semibold truncate max-w-[140px]">
                              {msg.fileName || "Belge"}
                            </span>
                            <span className="text-[10px] opacity-75 uppercase font-medium">
                              İndir
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-[18px] opacity-0 group-hover/doc:opacity-100 transition-opacity ml-auto">
                            download
                          </span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Location Preview */}
                  {msg.contentType === "location" && msg.locationLat && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${msg.locationLat},${msg.locationLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 overflow-hidden rounded-2xl block border border-gray-250 dark:border-gray-750 bg-gray-50 dark:bg-black/10 transition hover:opacity-95 max-w-[280px]"
                    >
                      <div className="h-32 bg-sky-100 flex items-center justify-center relative">
                        <span className="material-symbols-outlined text-red-500 text-4xl animate-bounce">
                          location_on
                        </span>
                        <div className="absolute bottom-2 right-2 bg-black/60 text-[9px] text-white px-2 py-0.5 rounded-md font-semibold select-none">
                          Google Maps
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-bold text-xs truncate">
                          {msg.locationName || "Konum Paylaşıldı"}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {msg.locationAddress || `${msg.locationLat.toFixed(5)}, ${msg.locationLng.toFixed(5)}`}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Poll (Anket) View */}
                  {msg.contentType === "poll" && msg.pollData && (
                    <div className="p-3 min-w-[260px] max-w-[320px] select-none">
                      {/* Poll Title */}
                      <div className="font-bold text-sm mb-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          ballot
                        </span>
                        <span>{JSON.parse(msg.pollData).question}</span>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {JSON.parse(msg.pollData).options.map((opt: any) => {
                          const votes = opt.votes || []
                          const hasVoted = votes.includes(currentUserId)
                          const totalVotes = JSON.parse(msg.pollData).options.reduce(
                            (sum: number, o: any) => sum + (o.votes || []).length,
                            0
                          )
                          const percentage =
                            totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0

                          return (
                            <div key={opt.id} className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-2.5">
                              {/* Percentage Progress Bar */}
                              <div
                                className="absolute top-0 left-0 bottom-0 bg-primary/10 dark:bg-primary/20 transition-all duration-300 pointer-events-none"
                                style={{ width: `${percentage}%` }}
                              />

                              <div className="relative flex items-center justify-between gap-3">
                                <button
                                  onClick={() => handlePollVote(opt.id)}
                                  className="flex-1 flex items-center gap-2 text-left"
                                >
                                  <span className="material-symbols-outlined text-primary text-[18px]">
                                    {hasVoted ? "check_box" : "check_box_outline_blank"}
                                  </span>
                                  <span className="text-xs font-semibold">{opt.text}</span>
                                </button>

                                <span className="text-[10px] font-bold text-gray-500">
                                  {votes.length} ({percentage}%)
                                </span>
                              </div>

                              {/* Voter avatars list (if not anonymous) */}
                              {!JSON.parse(msg.pollData).isAnonymous && votes.length > 0 && (
                                <div className="mt-1 flex items-center gap-1">
                                  {/* Just show simple count/dots or simple initials */}
                                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                                    {votes.length} oy verildi
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Task Card View (if pollData holds content_task_card) */}
                  {taskCardData ? (
                    <div className="flex flex-col gap-3 p-3 text-xs min-w-[280px] max-w-[340px] select-none bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50">
                      {/* Firma & Rol */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <span className="font-bold text-[13px] text-foreground truncate max-w-[180px] dark:text-white">
                          {taskCardData.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary dark:bg-white/10 dark:text-primary-foreground font-bold text-[10px] tracking-wide uppercase shrink-0">
                          {taskCardData.role}
                        </span>
                      </div>

                      {/* Bilgiler */}
                      <div className="space-y-1.5 text-foreground/80 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] opacity-70">calendar_today</span>
                          <span>Tarih: {taskCardData.date}</span>
                        </div>
                        {taskCardData.location && (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] opacity-70">location_on</span>
                            <span className="truncate">Konum: {taskCardData.location}</span>
                          </div>
                        )}
                        {taskCardData.extraNote && (
                          <div className="flex flex-col gap-0.5 mt-1 p-2 bg-muted/40 dark:bg-black/20 rounded-lg text-foreground/75 dark:text-gray-300">
                            <span className="font-semibold text-[10px] text-muted-foreground uppercase">Görev Notu:</span>
                            <span className="italic">"{taskCardData.extraNote}"</span>
                          </div>
                        )}
                      </div>

                      {/* Canlı Durum */}
                      <div className="flex items-center justify-between gap-2 bg-muted/40 dark:bg-black/10 p-2 rounded-xl border border-border/30">
                        <span className="text-muted-foreground dark:text-gray-400 font-medium">Güncel Durum:</span>
                        <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          entityStatus ? (STATUS_META_LOCAL[entityStatus]?.bg || "bg-slate-100") : "bg-slate-100"
                        } ${
                          entityStatus ? (STATUS_META_LOCAL[entityStatus]?.color || "text-slate-700") : "text-slate-700"
                        }`}>
                          {entityStatus ? (STATUS_META_LOCAL[entityStatus]?.label || entityStatus) : "Taslak"}
                        </span>
                      </div>

                      {/* Deep Link Butonu */}
                      <a
                        href={taskCardData.deepLink}
                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-center shadow-xs transition hover:opacity-90 mt-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        <span>İçeriği / Çekimi Görüntüle</span>
                      </a>

                      {/* Durum Değiştirme Butonları */}
                      <div className="border-t border-border/40 pt-2.5 mt-1">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                          Durumu Güncelle
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {taskCardData.statusOptions.map((opt: string) => {
                            const meta = STATUS_META_LOCAL[opt] || { label: opt, color: "text-slate-700", bg: "bg-slate-100" }
                            const isActive = entityStatus === opt
                            return (
                              <button
                                key={opt}
                                disabled={isUpdatingStatus || isActive}
                                onClick={() => handleTaskStatusChange(opt)}
                                className={`flex-1 min-w-[70px] px-2 py-1.5 rounded-lg border text-[10px] font-bold text-center transition-all ${
                                  isActive
                                    ? "bg-foreground text-background border-foreground dark:bg-white dark:text-black opacity-100 cursor-default scale-100"
                                    : "border-border/60 hover:bg-muted/50 text-foreground/85 dark:text-gray-200"
                                }`}
                              >
                                {meta.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard text content */
                    msg.content && msg.contentType === "text" && (
                      <p className="leading-relaxed whitespace-pre-wrap break-words px-1.5 pt-0.5 text-sm font-medium">
                        {msg.content}
                      </p>
                    )
                  )}
                </>
              )}
            </>
          )}

          {/* Balloon Footer (Time, Edit Status, Single/Double Ticks) */}
          <div className="flex items-center justify-end gap-1 px-1 mt-1 opacity-70 select-none">
            {msg.importedFrom === "whatsapp" && (
              <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mr-1" title="WhatsApp'tan içe aktarıldı">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.62.962 3.21 1.493 4.904 1.496 5.55.003 10.067-4.509 10.07-10.066.002-2.693-1.041-5.225-2.939-7.126-1.898-1.9-4.426-2.946-7.124-2.947-5.557 0-10.069 4.512-10.072 10.07-.001 1.761.461 3.48 1.337 5.008l-.998 3.645 3.73-.978zm11.235-7.67c-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.15-.173.198-.297.298-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                WhatsApp
              </span>
            )}
            {msg.isEdited && !isDeleted && (
              <span className="text-[8px] uppercase tracking-wider font-semibold opacity-70">
                Düzenlendi
              </span>
            )}
            <span className="text-[9px] font-semibold">
              {new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isMe && !isDeleted && (
              <span className="material-symbols-outlined text-[14px]">
                {/* Double tick logic */}
                {msg.readReceipts && msg.readReceipts.length > 1 ? "done_all" : "done"}
              </span>
            )}
          </div>
        </div>

        {/* Actions Dropdown on Hover for Non-Me */}
        {!isMe && (
          <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-lg">
                <DropdownMenuItem onClick={onReply} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">reply</span> Yanıtla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onForward} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">forward</span> İlet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStar} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">star</span> Yıldızla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin} className="rounded-lg gap-2 cursor-pointer py-2">
                  <span className="material-symbols-outlined text-[18px]">push_pin</span> Sabitle
                </DropdownMenuItem>
                {!isDeleted && (
                  <DropdownMenuItem onClick={() => onDelete(false)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-500">
                    <span className="material-symbols-outlined text-[18px]">delete</span> Benden Sil
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reaction Selector Popup Trigger */}
            <div className="relative">
              <button
                onClick={() => setReactionSelectorOpen(!reactionSelectorOpen)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 text-base"
              >
                😊
              </button>

              {reactionSelectorOpen && (
                <div className="absolute bottom-9 left-0 bg-white dark:bg-[#1f1f1f] border border-gray-250 dark:border-gray-750 p-1.5 rounded-full flex gap-1 shadow-xl z-20 animate-in slide-in-from-bottom-2 duration-150">
                  {quickEmojis.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        onReact(e)
                        setReactionSelectorOpen(false)
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:scale-115 transition-transform text-lg"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Reactions display at balloon bottom */}
      {(msg.reactions || []).length > 0 && (
        <div
          className={`flex items-center gap-1 mt-[-6px] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-full px-2 py-0.5 shadow-xs z-10 select-none ${
            isMe ? "mr-3" : "ml-3"
          }`}
        >
          {Object.entries(reactionsMap).map(([emoji, count]) => (
            <span key={emoji} className="text-xs">
              {emoji} <span className="text-[10px] font-bold text-gray-500">{count as number}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

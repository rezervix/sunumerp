import { useState, useRef, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MessageInputBarProps {
  onSendText: (text: string) => void
  onSendFile: (fileUrl: string, fileType: string, fileName: string, fileSize: number) => void
  onSendVoice: (fileUrl: string, duration: number, waveform: number[], fileSize: number) => void
  onSendLocation: (lat: number, lng: number, name?: string, address?: string) => void
  onSendPoll: (pollData: {
    question: string
    options: { id: string; text: string; votes: string[] }[]
    isAnonymous: boolean
    allowMultiple: boolean
    expiresAt: string | null
  }) => void
  replyMessage: any
  onCancelReply: () => void
  isTyping: boolean
  onTypingStatusChange: (isTyping: boolean) => void
}

export function MessageInputBar({
  onSendText,
  onSendFile,
  onSendVoice,
  onSendLocation,
  onSendPoll,
  replyMessage,
  onCancelReply,
  isTyping,
  onTypingStatusChange,
}: MessageInputBarProps) {
  const [content, setContent] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isPollOpen, setIsPollOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [acceptType, setAcceptType] = useState("*")

  // Voice Recorder States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Poll Form States
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false)
  const [pollAllowMultiple, setPollAllowMultiple] = useState(true)
  const [pollExpiresAt, setPollExpiresAt] = useState("")

  // Typing status timer
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)

    if (!isTyping) {
      onTypingStatusChange(true)
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStatusChange(false)
    }, 2000)
  }

  const handleSend = () => {
    if (!content.trim()) return
    onSendText(content.trim())
    setContent("")
    onTypingStatusChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // File Upload Handlers
  const triggerUpload = (type: string) => {
    if (type === "image") setAcceptType("image/*,video/*")
    else if (type === "document") setAcceptType(".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv")
    else if (type === "audio") setAcceptType("audio/*")
    else setAcceptType("*")

    setTimeout(() => fileInputRef.current?.click(), 10)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        const url = data.urls[0]

        let fType = "document"
        if (file.type.startsWith("image/")) fType = "image"
        else if (file.type.startsWith("video/")) fType = "video"
        else if (file.type.startsWith("audio/")) fType = "audio"

        onSendFile(url, fType, file.name, file.size)
      }
    } catch (err) {
      console.error("Upload error", err)
      alert("Dosya yüklenirken bir hata oluştu.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Location Share
  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert("Tarayıcınız konum paylaşımını desteklemiyor.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onSendLocation(latitude, longitude, "Mevcut Konum")
      },
      (error) => {
        alert(`Konum alınamadı: ${error.message}`)
      }
    )
  }

  // Voice Recorder Logics
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tarayıcınız mikrofon erişimini desteklemiyor.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        await uploadVoice(audioBlob, recordingSeconds)
      }

      // Analyser context setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser
      setIsRecording(true)
      setRecordingSeconds(0)

      // Start timers and audio context animation
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)

      mediaRecorder.start()
      drawWaveform()
    } catch (err) {
      console.error("Microphone access error", err)
      alert("Mikrofona erişilemedi.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      cleanupRecording()
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null // discard result
      mediaRecorderRef.current.stop()
      cleanupRecording()
    }
  }

  const cleanupRecording = () => {
    setIsRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
  }

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording) return
      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)
      ctx.fillStyle = "rgba(0, 0, 0, 0)"
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2

        ctx.fillStyle = "rgb(59, 130, 246)" // Primary color
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()
  }

  const uploadVoice = async (blob: Blob, secs: number) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("audio", blob, "voice.webm")
      formData.append("duration", secs.toString())

      // Dummy simple waveform data
      const sampleWaveform = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2)
      formData.append("waveform", JSON.stringify(sampleWaveform))

      const res = await fetch("/api/chat/voice-upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onSendVoice(data.fileUrl, data.duration, data.waveform, data.fileSize)
      }
    } catch (err) {
      console.error("Voice upload failure", err)
      alert("Ses kaydı yüklenemedi.")
    } finally {
      setUploading(false)
    }
  }

  // Poll Form Logics
  const addPollOption = () => {
    if (pollOptions.length < 10) setPollOptions([...pollOptions, ""])
  }

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx))
    }
  }

  const handlePollSubmit = () => {
    if (!pollQuestion.trim()) {
      alert("Anket sorusu boş olamaz.")
      return
    }

    const filledOptions = pollOptions.filter((o) => o.trim() !== "")
    if (filledOptions.length < 2) {
      alert("En az iki seçenek doldurmalısınız.")
      return
    }

    const uuid = () => Math.random().toString(36).substring(2, 9)

    onSendPoll({
      question: pollQuestion.trim(),
      options: filledOptions.map((o) => ({ id: uuid(), text: o.trim(), votes: [] })),
      isAnonymous: pollIsAnonymous,
      allowMultiple: pollAllowMultiple,
      expiresAt: pollExpiresAt ? new Date(pollExpiresAt).toISOString() : null,
    })

    setIsPollOpen(false)
    setPollQuestion("")
    setPollOptions(["", ""])
    setPollIsAnonymous(false)
    setPollAllowMultiple(true)
    setPollExpiresAt("")
  }

  const formatSeconds = (total: number) => {
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="flex flex-col border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] relative">
      {/* Reply Preview Bar */}
      {replyMessage && (
        <div className="px-6 py-2.5 bg-gray-50 dark:bg-black/20 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col text-xs text-gray-500">
            <span className="font-semibold text-primary">
              Şu mesaja yanıt veriyorsun:
            </span>
            <span className="truncate opacity-80 max-w-[400px]">
              {replyMessage.contentType === "image" ? "📷 Fotoğraf" : replyMessage.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Main input wrapper */}
      <div className="p-3 flex items-end gap-2 shrink-0 relative">
        {isRecording ? (
          // Recording Mode Overlay
          <div className="flex-1 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/20 rounded-2xl flex items-center gap-3 px-4 py-2 min-h-[46px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-red-500 text-xs font-bold shrink-0 select-none">
              Kayıt: {formatSeconds(recordingSeconds)}
            </span>
            
            {/* Visualizer Canvas */}
            <canvas ref={canvasRef} className="flex-1 h-6 shrink-0 opacity-70" />

            <button
              onClick={cancelRecording}
              className="px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs font-semibold"
            >
              Sil
            </button>
            <button
              onClick={stopRecording}
              className="h-9 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/20"
            >
              Gönder
            </button>
          </div>
        ) : (
          <>
            {/* Attachments Dropdown Trigger */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-[46px] w-[46px] rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-[24px]">add_circle</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="absolute bottom-14 left-0 mb-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 z-10">
                  <DropdownMenuItem onClick={() => triggerUpload("document")} className="rounded-xl gap-3 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-indigo-500">description</span>
                    Belge
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => triggerUpload("image")} className="rounded-xl gap-3 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-blue-500">photo_library</span>
                    Fotoğraf / Video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => triggerUpload("audio")} className="rounded-xl gap-3 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-orange-500">headphones</span>
                    Ses Dosyası
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareLocation} className="rounded-xl gap-3 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-emerald-500">location_on</span>
                    Konum
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPollOpen(true)} className="rounded-xl gap-3 cursor-pointer py-2">
                    <span className="material-symbols-outlined text-purple-500">ballot</span>
                    Anket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept={acceptType} onChange={handleFileSelect} />

            {/* Main Textarea Container */}
            <div className="flex-1 bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-end overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all relative min-h-[46px] max-h-[120px]">
              {uploading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center gap-2 select-none">
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-primary">Gönderiliyor...</span>
                </div>
              )}
              
              {/* Simple inline Emojis list as quick picker */}
              <button
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                😊
              </button>

              {isEmojiPickerOpen && (
                <div className="absolute bottom-14 left-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-wrap gap-2 max-w-[200px] shadow-xl z-20">
                  {["😊", "👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "💯", "🎉"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setContent((prev) => prev + emoji)
                        setIsEmojiPickerOpen(false)
                      }}
                      className="text-lg hover:scale-120 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                placeholder="Bir mesaj yazın..."
                value={content}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                className="w-full px-1 py-3.5 bg-transparent text-sm focus:outline-none resize-none max-h-[120px] custom-scrollbar text-gray-850 dark:text-gray-150"
                rows={1}
                style={{ height: "auto", minHeight: "46px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
            </div>

            {/* Voice Recorder or Send Text Toggle */}
            {content.trim() ? (
              <button
                onClick={handleSend}
                className="h-[46px] w-[46px] bg-primary hover:bg-primary/95 text-white rounded-full shadow-sm transition-all flex items-center justify-center shrink-0 p-0 hover:scale-105"
              >
                <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="h-[46px] w-[46px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-primary rounded-full transition-all flex items-center justify-center shrink-0 p-0 hover:scale-105"
              >
                <span className="material-symbols-outlined text-[22px]">mic</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Poll Creation Dialog */}
      <Dialog open={isPollOpen} onOpenChange={() => setIsPollOpen(false)}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Anket Oluştur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">SORU</label>
              <input
                type="text"
                placeholder="Bir soru yazın"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">SEÇENEKLER</label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Seçenek ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions]
                        next[idx] = e.target.value
                        setPollOptions(next)
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(idx)}
                        className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg shrink-0"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 10 && (
                <button
                  onClick={addPollOption}
                  className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> Seçenek Ekle
                </button>
              )}
            </div>

            {/* Config Toggles */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition cursor-pointer">
                <span className="text-xs font-semibold">Anonim Oy Verme</span>
                <input
                  type="checkbox"
                  checked={pollIsAnonymous}
                  onChange={(e) => setPollIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition cursor-pointer">
                <span className="text-xs font-semibold">Çoklu Seçime İzin Ver</span>
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={(e) => setPollAllowMultiple(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
              </label>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">SONA ERME TARİHİ</label>
                <input
                  type="datetime-local"
                  value={pollExpiresAt}
                  onChange={(e) => setPollExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 text-xs text-gray-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <button
              onClick={() => setIsPollOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              İptal
            </button>
            <button
              onClick={handlePollSubmit}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/20"
            >
              Anketi Paylaş
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

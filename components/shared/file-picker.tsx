"use client"

import { useEffect, useRef, useState } from "react"
import { Progress } from "@/components/ui/progress"

interface FilePickerProps {
    onFilesSelected: (urls: string[]) => void
    maxFiles?: number
    accept?: string
    label?: string
    disabled?: boolean
    showContentCalendarSelect?: boolean
    contentCalendars?: Array<{ id: string; title: string; scheduledDate?: string | Date | null }>
    selectedContentCalendarId?: string
    onContentCalendarChange?: (id: string) => void
    onUploadComplete?: (urls: string[], contentCalendarId?: string) => void
    branchId?: string
}

export function FilePicker({
    onFilesSelected,
    maxFiles = 5,
    accept = "*",
    label = "Dosya Yükle",
    disabled = false,
    showContentCalendarSelect = false,
    contentCalendars = [],
    selectedContentCalendarId,
    onContentCalendarChange,
    onUploadComplete,
    branchId,
}: FilePickerProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [selectedUrls, setSelectedUrls] = useState<string[]>([])
    const [selectedCalendarId, setSelectedCalendarId] = useState(selectedContentCalendarId || "")
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (selectedContentCalendarId) {
            setSelectedCalendarId(selectedContentCalendarId)
        }
    }, [selectedContentCalendarId])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (selectedUrls.length + files.length > maxFiles) {
            alert(`En fazla ${maxFiles} dosya yükleyebilirsiniz.`)
            return
        }

        setUploading(true)
        setProgress(10)

        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i])
        }

        try {
            setProgress(30)
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            setProgress(80)
            const data = await response.json()

            if (response.ok) {
                const newUrls = [...selectedUrls, ...data.urls]
                setSelectedUrls(newUrls)
                onFilesSelected(newUrls)

                if (showContentCalendarSelect && (selectedCalendarId || selectedContentCalendarId) && branchId) {
                    await fetch("/api/files/attach", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            urls: data.urls,
                            contentCalendarId: selectedCalendarId || selectedContentCalendarId,
                            branchId,
                        }),
                    })
                }

                onUploadComplete?.(newUrls, selectedCalendarId || selectedContentCalendarId)
            } else {
                alert(data.error || "Yükleme sırasında hata oluştu.")
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Yükleme sırasında teknik bir hata oluştu.")
        } finally {
            setProgress(100)
            setTimeout(() => {
                setUploading(false)
                setProgress(0)
            }, 500)
        }
    }

    const removeFile = (index: number) => {
        const newUrls = selectedUrls.filter((_, i) => i !== index)
        setSelectedUrls(newUrls)
        onFilesSelected(newUrls)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
                <span className="text-xs text-gray-500">{selectedUrls.length}/{maxFiles} Dosya</span>
            </div>

            {showContentCalendarSelect && contentCalendars.length > 0 && (
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">İçerik Takvimi Kaydı</label>
                    <select
                        value={selectedCalendarId || selectedContentCalendarId || ""}
                        onChange={(e) => {
                            const nextValue = e.target.value
                            setSelectedCalendarId(nextValue)
                            onContentCalendarChange?.(nextValue)
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                        <option value="">Bir kayıt seçin</option>
                        {contentCalendars.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${disabled ? "cursor-not-allowed opacity-60 border-gray-300 dark:border-gray-700" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 border-gray-200 dark:border-gray-800"}`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={accept}
                    multiple
                    disabled={disabled}
                    className="hidden"
                />
                <span className="material-symbols-outlined text-primary text-3xl mb-2">cloud_upload</span>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
                    Tıklayın veya dosyaları buraya sürükleyin
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Tüm dosya türlerine izin verilir (Maks. 10GB)</p>
            </div>

            {uploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Yükleniyor...</span>
                        <span className="font-bold text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
            )}

            {selectedUrls.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                    {selectedUrls.map((url, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-lg group">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">description</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">
                                    {url.split('/').pop()}
                                </span>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

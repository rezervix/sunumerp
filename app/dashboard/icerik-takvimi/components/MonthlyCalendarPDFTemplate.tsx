import React from "react"
import { ContentItem } from "../shared-types"
import { BRAND_CONFIG } from "@/lib/config/brand"

interface MonthlyCalendarPDFTemplateProps {
  branch: { id: string; name: string; themeColor: string; logoUrl?: string | null } | undefined
  items: ContentItem[]
  currentDate: Date
}

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
]
const TURKISH_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Pazartesi'den başla
  let startDow = firstDay.getDay() // 0=Pazar
  startDow = startDow === 0 ? 6 : startDow - 1 // 0=Pzt

  const days: Date[] = []
  for (let i = startDow; i > 0; i--) {
    days.push(new Date(year, month, 1 - i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1))
  }
  return days
}

export const MonthlyCalendarPDFTemplate: React.FC<MonthlyCalendarPDFTemplateProps> = ({
  branch,
  items,
  currentDate
}) => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = getMonthDays(year, month)

  // Aggregate statistics
  const totalPlanned = items.length
  const reelsCount = items.filter(item => item.contentType === "reels").length
  const storyCount = items.filter(item => item.contentType === "story").length
  const postCount = items.filter(item =>
    ["akis", "motion", "static_post", "carousel", "video", "blog", "other"].includes(item.contentType)
  ).length

  // Check if there are pending approvals
  const hasPending = items.some(item => item.status === "cekim_tasarim_bekliyor" || item.status === "taslak" || item.status === "revize_istendi")
  
  const footerNote = hasPending
    ? "İçerikler onay sürecindedir. Lütfen kontrol edip onay bekleyen içerikleri geri bildirimlerinizle tamamlayınız."
    : "Tüm içerikler onaylanmıştır. Belirtilen tarihlerde otomatik olarak yayına alınacaktır."

  const todayStr = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })

  // Start of month formatted
  const startOfMonthStr = `01.${String(month + 1).padStart(2, "0")}.${year}`

  return (
    <div
      className="pdf-calendar-root text-slate-800 antialiased flex flex-col bg-[#f3f4f5]"
      style={{
        width: "297mm",
        height: "210mm",
        padding: "24px",
        boxSizing: "border-box",
        gap: "16px"
      }}
    >
      {/* Stylesheets and Custom Fonts for PDF rendering */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .pdf-calendar-root {
          font-family: 'Inter', sans-serif !important;
        }
        .pdf-calendar-root .material-symbols-outlined {
          font-family: 'Material Symbols Outlined' !important;
          font-size: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
        }
      `}</style>

      {/* Header Section */}
      <header className="flex justify-between items-center pb-1 px-1">
        {/* Left: Logos */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-9 px-2 bg-white rounded border border-gray-200 shadow-xs">
            <span className="font-bold text-xs text-slate-800 tracking-tight">{BRAND_CONFIG.name}</span>
          </div>
          <div className="w-[1px] h-6 bg-gray-300"></div>
          {branch?.logoUrl ? (
            <img
              alt={branch.name}
              className="h-8 object-contain opacity-90 max-w-[120px]"
              src={branch.logoUrl}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none"
                const fallback = (e.target as HTMLElement).nextElementSibling;
                if (fallback) fallback.classList.remove("hidden")
              }}
            />
          ) : null}
          <div className={`text-slate-800 tracking-widest text-[9px] uppercase font-bold border border-gray-300 rounded px-2 py-0.5 bg-gray-50 ${branch?.logoUrl ? "hidden" : ""}`}>
            {branch?.name || "Sistem Firması"}
          </div>
        </div>

        {/* Right: Title & Metadata */}
        <div className="text-right flex flex-col items-end">
          <h1 className="font-bold text-lg text-[#041627] uppercase tracking-wider mb-0.5">
            {branch?.name || "MÜŞTERİ ADI"}
          </h1>
          <p className="text-xs text-slate-600 font-medium tracking-wide mb-1">
            {TURKISH_MONTHS[month]} {year} Sosyal Medya Yayın Takvimi
          </p>
          <div className="flex items-center gap-3 text-[9px] text-slate-500 uppercase font-semibold">
            <span>{startOfMonthStr}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-slate-300"></span>
            <span>Rapor Tarihi: {todayStr}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-slate-300"></span>
            <span>v1.0</span>
          </div>
        </div>
      </header>

      {/* White Container Card */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden gap-4 min-h-0">
        
        {/* Summary Bar */}
        <div className="flex items-center w-full bg-slate-50/70 rounded-lg border border-slate-200 p-3 shrink-0">
          <div className="flex items-center gap-0 w-full">
            {/* Total Planned */}
            <div className="flex flex-col flex-1 px-4 border-r border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase tracking-[0.1em] mb-0.5 font-semibold">Toplam Planlanan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl text-orange-500 font-bold">{totalPlanned}</span>
              </div>
            </div>
            {/* Gönderi */}
            <div className="flex flex-col flex-1 px-4 border-r border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase tracking-[0.1em] mb-0.5 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[11px] text-green-600">image</span> Gönderi
              </span>
              <div className="text-xl text-[#041627] font-semibold">{postCount}</div>
            </div>
            {/* Reels */}
            <div className="flex flex-col flex-1 px-4 border-r border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase tracking-[0.1em] mb-0.5 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[11px] text-blue-600">movie</span> Reels
              </span>
              <div className="text-xl text-[#041627] font-semibold">{reelsCount}</div>
            </div>
            {/* Story */}
            <div className="flex flex-col flex-1 px-4">
              <span className="text-[9px] text-slate-500 uppercase tracking-[0.1em] mb-0.5 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[11px] text-purple-600">amp_stories</span> Story
              </span>
              <div className="text-xl text-[#041627] font-semibold">{storyCount}</div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col rounded-lg overflow-hidden border border-slate-200 min-h-0">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 shrink-0">
            {TURKISH_DAYS.map((d) => (
              <div key={d} className="py-1.5 px-2 text-left text-[9px] text-slate-600 uppercase tracking-widest border-r last:border-r-0 border-slate-200 font-semibold">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar Body */}
          <div className={`grid grid-cols-7 flex-1 bg-slate-200 gap-[1px] min-h-0 ${days.length === 42 ? "grid-rows-6" : "grid-rows-5"}`}>
            {days.map((day, idx) => {
              const isCurrentMonth = day.getMonth() === month
              const dayItems = items.filter(item => {
                const itemDate = new Date(item.scheduledDate)
                return itemDate.getFullYear() === day.getFullYear() &&
                       itemDate.getMonth() === day.getMonth() &&
                       itemDate.getDate() === day.getDate()
              })

              const maxDisplay = 2
              const displayItems = dayItems.slice(0, maxDisplay)
              const remainingCount = dayItems.length - maxDisplay

              if (!isCurrentMonth) {
                return (
                  <div key={idx} className="p-1.5 bg-[#fbfcfd] relative min-h-0">
                    <span className="absolute top-1.5 right-1.5 text-[10px] text-slate-300 font-medium">
                      {day.getDate()}
                    </span>
                  </div>
                )
              }

              return (
                <div key={idx} className="p-1.5 bg-white relative flex flex-col justify-between min-h-0 overflow-hidden">
                  <div>
                    {/* Day number */}
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-bold text-slate-700">
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Posts list */}
                    <div className="flex flex-col gap-1 min-h-0">
                      {displayItems.map((item) => {
                        let badgeStyle = "border-green-500 text-green-700 bg-green-50/30"
                        let iconName = "image"
                        let typeLabel = "Gönderi"

                        if (item.contentType === "reels") {
                          badgeStyle = "border-blue-500 text-blue-700 bg-blue-50/30"
                          iconName = "movie"
                          typeLabel = "Reels"
                        } else if (item.contentType === "story") {
                          badgeStyle = "border-purple-500 text-purple-700 bg-purple-50/30"
                          iconName = "amp_stories"
                          typeLabel = "Story"
                        }

                        return (
                          <div
                            key={item.id}
                            className={`text-[9px] leading-tight p-1 border-l-2 rounded-r-sm font-medium tracking-wide flex flex-col ${badgeStyle}`}
                          >
                            <span className="font-bold uppercase tracking-wider flex items-center gap-0.5 mb-0.5">
                              <span className="material-symbols-outlined text-[9px]">{iconName}</span>
                              {typeLabel}
                              {item.scheduledTime && (
                                <span className="ml-auto font-normal lowercase opacity-80">{item.scheduledTime}</span>
                              )}
                            </span>
                            <span className="truncate block font-normal">{item.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Visual indicator if more than 2 posts */}
                  {remainingCount > 0 && (
                    <div className="text-[8px] text-slate-400 font-semibold text-right mt-0.5">
                      +{remainingCount} daha
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex justify-between items-center px-2 shrink-0">
        <div>
          <p className="text-[9px] text-slate-500 leading-relaxed font-medium max-w-xl">
            {footerNote}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[#041627]/70 uppercase tracking-widest font-bold">
          <span className="material-symbols-outlined text-[12px] text-orange-500 font-bold">bolt</span> GENERATED VIA SUNUM ERP SYSTEM
        </div>
      </footer>
    </div>
  )
}

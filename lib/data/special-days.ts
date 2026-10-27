export type SpecialDay = {
  id: string
  title: string
  month: number // 1-12
  day: number   // 1-31
  isHoliday?: boolean
  color: string
  description?: string
}

export const SPECIAL_DAYS: SpecialDay[] = [
  { id: "new-year", title: "Yılbaşı", month: 1, day: 1, isHoliday: true, color: "#EF4444" },
  { id: "ramadan-1", title: "Ramazan Bayramı", month: 4, day: 10, isHoliday: true, color: "#10B981" },
  { id: "sov-children", title: "Ulusal Egemenlik ve Çocuk Bayramı", month: 4, day: 23, isHoliday: true, color: "#EF4444" },
  { id: "labor", title: "Emek ve Dayanışma Günü", month: 5, day: 1, isHoliday: true, color: "#3B82F6" },
  { id: "youth", title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", month: 5, day: 19, isHoliday: true, color: "#EF4444" },
  { id: "sacrifice-1", title: "Kurban Bayramı", month: 6, day: 16, isHoliday: true, color: "#10B981" },
  { id: "democracy", title: "Demokrasi ve Milli Birlik Günü", month: 7, day: 15, isHoliday: true, color: "#EF4444" },
  { id: "victory", title: "Zafer Bayramı", month: 8, day: 30, isHoliday: true, color: "#EF4444" },
  { id: "republic", title: "Cumhuriyet Bayramı", month: 10, day: 29, isHoliday: true, color: "#EF4444" },
]

export function getSpecialDaysForDate(date: Date): SpecialDay[] {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return SPECIAL_DAYS.filter(sd => sd.month === m && sd.day === d)
}

export function getUpcomingSpecialDays(limit = 3): (SpecialDay & { date: Date, daysLeft: number })[] {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()
  const year = today.getFullYear()

  // Sadece bugünden sonraki veya bugünkü özel günleri al
  let upcoming = SPECIAL_DAYS.filter(sd => 
    sd.month > currentMonth || (sd.month === currentMonth && sd.day >= currentDay)
  ).map(sd => {
    const date = new Date(year, sd.month - 1, sd.day)
    return {
      ...sd,
      date,
      daysLeft: Math.ceil((date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
    }
  })

  // Eğer limit dolmadıysa seneye olanları ekle
  if (upcoming.length < limit) {
    const nextYearDays = SPECIAL_DAYS.filter(sd => 
      sd.month < currentMonth || (sd.month === currentMonth && sd.day < currentDay)
    ).map(sd => {
      const date = new Date(year + 1, sd.month - 1, sd.day)
      return {
        ...sd,
        date,
        daysLeft: Math.ceil((date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
      }
    })
    upcoming = [...upcoming, ...nextYearDays]
  }

  // Tarihe göre sırala ve limit kadarını döndür
  return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit)
}

// Encoding fix for Ubuntu

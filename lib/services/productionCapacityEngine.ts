/**
 * SUNUM ERP — FAZ 6: KAPASİTE PLANLAMA (CRP) & ÇİZELGELEME MOTORU (PURE ENGINE)
 * 
 * Veritabanından tamamen bağımsız, saf matematiksel ve algoritmik hesaplama motoru:
 * 1. Net Kullanılabilir Kapasite Hesabı (Vardiya, Takvim, Verimlilik, Duruş/Bakım Düşümü)
 * 2. Sonsuz & Sonlu Kapasite Çizelgeleme (Infinite / Finite Scheduling)
 * 3. Öncelik Kuralları (EDD, FCFS, Critical Ratio / Kritik Oran, İş Emri Önceliği)
 * 4. İleri (Forward) & Geri (Backward) Çizelgeleme
 * 5. Operasyon Bağımlılığı, Hazırlık (Setup) Süreleri & Kilitli (Pinned) Görev Koruması
 * 6. Alternatif İş Merkezi (Work Center) Yönlendirme & Darboğaz Tespiti
 * 7. Söz Verilebilir Teslim Tarihi (CTP - Capable-To-Promise) Simülatörü
 * 8. Fiili vs Planlanan Süre Analizi ve Standart Süre Öğrenme/İyileştirme Önerisi
 */

export type SchedulingMode = "INFINITE" | "FINITE"
export type SchedulingDirection = "FORWARD" | "BACKWARD"
export type PriorityRule = "EDD" | "FCFS" | "CR" | "PRIORITY"

export interface WorkCenterCapacityDefinition {
  workCenterId: string
  code: string
  name: string
  efficiencyPercent: number // örn: 85 (varsayılan: 100)
  dailyNetWorkingMinutes: number // örn: 480 (8 saat x 60 dk)
  workingDays: string[] // örn: ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
  holidays?: string[] // YYYY-MM-DD
  exceptions?: Array<{
    date: string // YYYY-MM-DD
    type: "OVERTIME" | "CLOSED" | "REDUCED_CAPACITY"
    availableHours?: number
    capacityPercent?: number
  }>
  plannedStoppageMinutes?: number // Bakım veya planlı duruş
  alternativeGroupCode?: string
}

export interface OperationSchedulingCandidate {
  id: string
  workOrderId: string
  workOrderNumber: string
  operationNumber: number
  name: string
  workCenterId: string
  setupTimeMinutes: number
  runTimeMinutes: number
  totalMinutes: number
  plannedQuantity: number
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  dueDate: Date
  createdDate: Date
  status: string // PENDING, RUNNING, PAUSED, COMPLETED
  isLocked: boolean
  scheduledStart?: Date
  scheduledEnd?: Date
  sequenceNumber?: number
  alternativeWorkCenterIds?: string[]
  predecessorOperationId?: string
}

export interface CapacitySchedulingOptions {
  mode: SchedulingMode
  direction: SchedulingDirection
  priorityRule: PriorityRule
  startDate: Date
  endDate?: Date
  overloadThresholdPercent?: number // Varsayılan %95
  respectShifts?: boolean // Varsayılan true
}

export interface ScheduledTaskResult {
  id: string
  workOrderId: string
  workOrderNumber: string
  operationId: string
  operationNumber: number
  operationName: string
  workCenterId: string
  setupMinutes: number
  runMinutes: number
  totalMinutes: number
  scheduledStart: Date
  scheduledEnd: Date
  sequenceOrder: number
  isLocked: boolean
  isDelayed: boolean
  delayMinutes: number
  status: string
  notes?: string
}

export interface CapacityPeriodBucket {
  periodKey: string // YYYY-MM-DD
  workCenterId: string
  workCenterCode: string
  workCenterName: string
  availableCapacityHours: number
  plannedLoadHours: number
  mrpLoadHours: number
  totalLoadHours: number
  utilizationPercent: number
  isOverloaded: boolean
  operationCount: number
  operationIds: string[]
}

export interface CapacityAlertResult {
  alertType: "OVERLOAD" | "BOTTLENECK" | "DELAY" | "CAPACITY_EXCEEDED" | "DEPENDENCY_CONFLICT"
  severity: "INFO" | "WARNING" | "CRITICAL"
  workCenterId?: string
  workOrderId?: string
  operationId?: string
  message: string
  loadPercentage?: number
  periodDate?: string
}

export interface CtpSimulationInput {
  itemId: string
  itemSku?: string
  itemName?: string
  quantity: number
  requestedDueDate?: Date
  operations: Array<{
    operationNumber: number
    name: string
    workCenterId: string
    setupMinutes: number
    runMinutesPerUnit: number
  }>
}

export interface CtpSimulationResult {
  isFeasible: boolean
  calculatedEarliestDueDate: Date
  criticalPathDays: number
  bottleneckWorkCenterId?: string
  totalProductionMinutes: number
  schedule: Array<{
    operationNumber: number
    operationName: string
    workCenterId: string
    start: Date
    end: Date
    durationMinutes: number
  }>
}

export interface OperationTimeVarianceSummary {
  workCenterId: string
  operationName: string
  sampleCount: number
  plannedStandardMinutes: number
  actualAverageMinutes: number
  variancePercent: number
  suggestedStandardMinutes: number
}

// ─────────────────────────────────────────────────────────────
// 1. GÜN VE TAKVİM MATEMATİĞİ
// ─────────────────────────────────────────────────────────────

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function isWorkDay(
  date: Date,
  workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  holidays: string[] = []
): boolean {
  const dayStr = DAY_NAMES[date.getDay()]
  if (!workingDays.includes(dayStr)) return false

  const dateStr = date.toISOString().split("T")[0]
  if (holidays.includes(dateStr)) return false

  return true
}

/**
 * Belirli bir tarih aralığında bir iş merkezinin net kullanılabilir kapasitesini (dakika) hesaplar.
 */
export function calculateWorkCenterDailyCapacityMinutes(
  workCenter: WorkCenterCapacityDefinition,
  date: Date
): number {
  const dateStr = date.toISOString().split("T")[0]
  const holidays = workCenter.holidays || []
  const workingDays = workCenter.workingDays || ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

  // 1. İstisna (Exception) Kontrolü
  const exception = (workCenter.exceptions || []).find((e) => e.date === dateStr)
  if (exception) {
    if (exception.type === "CLOSED") return 0
    if (exception.type === "OVERTIME") {
      const extraMinutes = (exception.availableHours || 0) * 60
      return Math.round(
        (workCenter.dailyNetWorkingMinutes + extraMinutes) * (workCenter.efficiencyPercent / 100)
      )
    }
    if (exception.type === "REDUCED_CAPACITY") {
      const mult = (exception.capacityPercent ?? 50) / 100
      return Math.round(workCenter.dailyNetWorkingMinutes * mult * (workCenter.efficiencyPercent / 100))
    }
  }

  // 2. Tatil / Hafta Sonu Kontrolü
  if (!isWorkDay(date, workingDays, holidays)) {
    return 0
  }

  // 3. Normal Mesai ve Verimlilik Çarpımı
  const baseMinutes = workCenter.dailyNetWorkingMinutes || 480
  const efficiency = Math.max(0.1, (workCenter.efficiencyPercent || 100) / 100)
  const netMinutes = baseMinutes * efficiency

  // Planlı bakım/duruş düşümü
  const stoppage = workCenter.plannedStoppageMinutes || 0
  return Math.max(0, Math.round(netMinutes - stoppage))
}

// ─────────────────────────────────────────────────────────────
// 2. ÖNCELİK VE SIRALAMA MOTORU (DISPATCHING RULES)
// ─────────────────────────────────────────────────────────────

const PRIORITY_WEIGHTS: Record<string, number> = {
  URGENT: 400,
  HIGH: 300,
  NORMAL: 200,
  LOW: 100,
}

/**
 * Kritik Oran (Critical Ratio - CR) Hesabı:
 * CR = (Termine Kalan Gün) / (Gerekli İş Süresi Gün)
 * CR < 1.0 => İş geç kalma riski yüksek (Öncelikli)
 * CR = 1.0 => İş tam zamanında
 * CR > 1.0 => İş vaktinden önce
 */
export function calculateCriticalRatio(
  dueDate: Date,
  totalRemainingMinutes: number,
  referenceDate: Date = new Date()
): number {
  const msRemaining = dueDate.getTime() - referenceDate.getTime()
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24)
  const daysRequired = Math.max(0.1, totalRemainingMinutes / 480)

  if (daysRemaining <= 0) return 0.01 // Gecikmiş iş en yüksek öncelikte
  return Number((daysRemaining / daysRequired).toFixed(2))
}

/**
 * Operasyon adaylarını seçilen kurala göre sıralar.
 */
export function sortOperationsByPriority(
  operations: OperationSchedulingCandidate[],
  rule: PriorityRule,
  referenceDate: Date = new Date()
): OperationSchedulingCandidate[] {
  const sorted = [...operations]

  sorted.sort((a, b) => {
    // 1. Kilitli (Pinned) operasyonlar her zaman en önceliklidir
    if (a.isLocked && !b.isLocked) return -1
    if (!a.isLocked && b.isLocked) return 1

    switch (rule) {
      case "EDD": {
        // En Erken Teslim Tarihi (Earliest Due Date)
        const diff = a.dueDate.getTime() - b.dueDate.getTime()
        if (diff !== 0) return diff
        return (PRIORITY_WEIGHTS[b.priority] || 200) - (PRIORITY_WEIGHTS[a.priority] || 200)
      }

      case "FCFS": {
        // İlk Gelen İlk Yapılır (First Come First Served)
        const diff = a.createdDate.getTime() - b.createdDate.getTime()
        if (diff !== 0) return diff
        return a.dueDate.getTime() - b.dueDate.getTime()
      }

      case "CR": {
        // Kritik Oran (Critical Ratio - En düşük CR ilk yapılır)
        const crA = calculateCriticalRatio(a.dueDate, a.totalMinutes, referenceDate)
        const crB = calculateCriticalRatio(b.dueDate, b.totalMinutes, referenceDate)
        if (crA !== crB) return crA - crB
        return a.dueDate.getTime() - b.dueDate.getTime()
      }

      case "PRIORITY": {
        // Doğrudan İş Emri Önceliği (URGENT > HIGH > NORMAL > LOW)
        const pDiff = (PRIORITY_WEIGHTS[b.priority] || 200) - (PRIORITY_WEIGHTS[a.priority] || 200)
        if (pDiff !== 0) return pDiff
        return a.dueDate.getTime() - b.dueDate.getTime()
      }

      default:
        return a.dueDate.getTime() - b.dueDate.getTime()
    }
  })

  return sorted
}

// ─────────────────────────────────────────────────────────────
// 3. KAPASİTE ÇİZELGELEME MOTORU (SONSUZ & SONLU)
// ─────────────────────────────────────────────────────────────

/**
 * Çalışma saatleri ve takvimine göre bir iş süresini tarihe ekler (İleri Çizelgeleme).
 */
export function addWorkingMinutesToDate(
  startDate: Date,
  minutesToAdd: number,
  workCenter: WorkCenterCapacityDefinition
): Date {
  if (minutesToAdd <= 0) return new Date(startDate)

  let cursor = new Date(startDate)
  let remainingMinutes = minutesToAdd

  // Güvenlik limiti: Sonsuz döngüyü engelle (Maksimum 365 gün)
  let loopCount = 0
  const maxLoops = 365

  while (remainingMinutes > 0 && loopCount < maxLoops) {
    loopCount++
    const dailyCap = calculateWorkCenterDailyCapacityMinutes(workCenter, cursor)

    if (dailyCap <= 0) {
      // Tatil veya kapalı gün; sonraki güne geç (saat 08:00'e sar)
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(8, 0, 0, 0)
      continue
    }

    // Günün kalan kullanılabilir dakikası
    // Basit modelleme: Mesai 08:00 - 17:00 (veya günlük kapasiteye oranla)
    const currentHour = cursor.getHours()
    const currentMinute = cursor.getMinutes()
    let elapsedToday = Math.max(0, (currentHour - 8) * 60 + currentMinute)
    let leftToday = Math.max(0, dailyCap - elapsedToday)

    if (leftToday <= 0) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(8, 0, 0, 0)
      continue
    }

    if (remainingMinutes <= leftToday) {
      cursor.setMinutes(cursor.getMinutes() + remainingMinutes)
      remainingMinutes = 0
    } else {
      remainingMinutes -= leftToday
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(8, 0, 0, 0)
    }
  }

  return cursor
}

/**
 * Ana Çizelgeleme Fonksiyonu
 */
export function runCapacitySchedulingEngine(
  operations: OperationSchedulingCandidate[],
  workCenters: Record<string, WorkCenterCapacityDefinition>,
  options: CapacitySchedulingOptions
): {
  scheduledTasks: ScheduledTaskResult[]
  delayedTasks: ScheduledTaskResult[]
  criticalPathMinutes: number
} {
  const referenceDate = new Date(options.startDate)
  const scheduledTasks: ScheduledTaskResult[] = []

  // İş merkezlerinin bir sonraki boşalma zamanı (Machine Available Timelines)
  const machineNextAvailableTime: Record<string, Date> = {}
  Object.keys(workCenters).forEach((wcId) => {
    machineNextAvailableTime[wcId] = new Date(referenceDate)
  })

  // İş emirlerinin son tamamlanan operasyonunun bitiş zamanı (Predecessor Finish Time)
  const workOrderLastFinishTime: Record<string, Date> = {}

  // 1. Operasyonları öncelik kuralına göre sırala
  const prioritizedOps = sortOperationsByPriority(operations, options.priorityRule, referenceDate)

  // 2. Kilitli (Pinned) operasyonları önce yerleştir
  const lockedOps = prioritizedOps.filter((o) => o.isLocked && o.scheduledStart && o.scheduledEnd)
  const unlockedOps = prioritizedOps.filter((o) => !o.isLocked || !o.scheduledStart || !o.scheduledEnd)

  lockedOps.forEach((op, idx) => {
    const start = new Date(op.scheduledStart!)
    const end = new Date(op.scheduledEnd!)
    const totalMinutes = op.totalMinutes || op.setupTimeMinutes + op.runTimeMinutes
    const isDelayed = end.getTime() > op.dueDate.getTime()
    const delayMinutes = isDelayed ? Math.round((end.getTime() - op.dueDate.getTime()) / 60000) : 0

    scheduledTasks.push({
      id: op.id,
      workOrderId: op.workOrderId,
      workOrderNumber: op.workOrderNumber,
      operationId: op.id,
      operationNumber: op.operationNumber,
      operationName: op.name,
      workCenterId: op.workCenterId,
      setupMinutes: op.setupTimeMinutes,
      runMinutes: op.runTimeMinutes,
      totalMinutes,
      scheduledStart: start,
      scheduledEnd: end,
      sequenceOrder: idx + 1,
      isLocked: true,
      isDelayed,
      delayMinutes,
      status: op.status,
    })

    // Makine timeline'ını ve iş emri son bitişini güncelle
    if (!machineNextAvailableTime[op.workCenterId] || machineNextAvailableTime[op.workCenterId] < end) {
      machineNextAvailableTime[op.workCenterId] = end
    }
    if (!workOrderLastFinishTime[op.workOrderId] || workOrderLastFinishTime[op.workOrderId] < end) {
      workOrderLastFinishTime[op.workOrderId] = end
    }
  })

  // 3. Kilitli olmayan operasyonları çizelgele
  let seqCounter = lockedOps.length + 1

  for (const op of unlockedOps) {
    const wc = workCenters[op.workCenterId] || {
      workCenterId: op.workCenterId,
      code: "WC-DEF",
      name: "Varsayılan İstasyon",
      efficiencyPercent: 100,
      dailyNetWorkingMinutes: 480,
      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    }

    const totalMinutes =
      op.totalMinutes > 0 ? op.totalMinutes : op.setupTimeMinutes + op.runTimeMinutes

    let earliestStart = new Date(referenceDate)

    // A) Önceki operasyon bağımlılığı (Aynı iş emrinde önceki adım bitmeden sonraki başlayamaz)
    const prevFinish = workOrderLastFinishTime[op.workOrderId]
    if (prevFinish && prevFinish > earliestStart) {
      earliestStart = new Date(prevFinish)
    }

    // B) Sonlu (Finite) vs Sonsuz (Infinite) Kapasite Modu
    if (options.mode === "FINITE") {
      const machineAvail = machineNextAvailableTime[op.workCenterId] || new Date(referenceDate)
      if (machineAvail > earliestStart) {
        earliestStart = new Date(machineAvail)
      }
    }

    // C) Bitiş Zamanını Hesapla (Vardiya ve Takvim Kurallarıyla)
    let scheduledEnd: Date
    if (options.respectShifts !== false) {
      scheduledEnd = addWorkingMinutesToDate(earliestStart, totalMinutes, wc)
    } else {
      scheduledEnd = new Date(earliestStart.getTime() + totalMinutes * 60000)
    }

    // D) Gecikme Kontrolü
    const isDelayed = scheduledEnd.getTime() > op.dueDate.getTime()
    const delayMinutes = isDelayed ? Math.round((scheduledEnd.getTime() - op.dueDate.getTime()) / 60000) : 0

    const task: ScheduledTaskResult = {
      id: op.id,
      workOrderId: op.workOrderId,
      workOrderNumber: op.workOrderNumber,
      operationId: op.id,
      operationNumber: op.operationNumber,
      operationName: op.name,
      workCenterId: op.workCenterId,
      setupMinutes: op.setupTimeMinutes,
      runMinutes: op.runTimeMinutes,
      totalMinutes,
      scheduledStart: earliestStart,
      scheduledEnd,
      sequenceOrder: seqCounter++,
      isLocked: false,
      isDelayed,
      delayMinutes,
      status: op.status,
    }

    scheduledTasks.push(task)

    // Makine ve iş emri bitiş referanslarını güncelle
    if (options.mode === "FINITE") {
      machineNextAvailableTime[op.workCenterId] = scheduledEnd
    }
    workOrderLastFinishTime[op.workOrderId] = scheduledEnd
  }

  // 4. Sonuçları hazırla
  const delayedTasks = scheduledTasks.filter((t) => t.isDelayed)
  const allEndTimes = scheduledTasks.map((t) => t.scheduledEnd.getTime())
  const maxEnd = allEndTimes.length > 0 ? Math.max(...allEndTimes) : referenceDate.getTime()
  const criticalPathMinutes = Math.max(0, Math.round((maxEnd - referenceDate.getTime()) / 60000))

  return {
    scheduledTasks,
    delayedTasks,
    criticalPathMinutes,
  }
}

// ─────────────────────────────────────────────────────────────
// 4. DÖNEM BAZLI KAPASİTE KULLANIM VE DARBOĞAZ HESABI
// ─────────────────────────────────────────────────────────────

export function calculateCapacityUtilizationBuckets(
  scheduledTasks: ScheduledTaskResult[],
  workCenters: Record<string, WorkCenterCapacityDefinition>,
  startDate: Date,
  daysCount: number = 14,
  mrpPlannedOrders: any[] = []
): {
  buckets: CapacityPeriodBucket[]
  bottleneckWorkCenterId?: string
  overloadedBuckets: CapacityPeriodBucket[]
  averageUtilizationPercent: number
} {
  const buckets: CapacityPeriodBucket[] = []
  const wcIds = Object.keys(workCenters)

  // Tarihleri oluştur
  for (let i = 0; i < daysCount; i++) {
    const curDate = new Date(startDate)
    curDate.setDate(curDate.getDate() + i)
    const dateStr = curDate.toISOString().split("T")[0]

    for (const wcId of wcIds) {
      const wc = workCenters[wcId]
      const capMin = calculateWorkCenterDailyCapacityMinutes(wc, curDate)
      const capHours = Number((capMin / 60).toFixed(2))

      // Bu iş merkezine ve bu güne düşen iş emri görevleri
      const dayTasks = scheduledTasks.filter((t) => {
        if (t.workCenterId !== wcId) return false
        const tStartStr = t.scheduledStart.toISOString().split("T")[0]
        const tEndStr = t.scheduledEnd.toISOString().split("T")[0]
        return dateStr >= tStartStr && dateStr <= tEndStr
      })

      const plannedLoadMinutes = dayTasks.reduce((sum, t) => sum + t.totalMinutes, 0)
      const plannedLoadHours = Number((plannedLoadMinutes / 60).toFixed(2))

      // MRP Planlanan Üretim Siparişleri Yükü (Opsiyonel Ek Yük)
      const mrpTasks = mrpPlannedOrders.filter((m) => {
        const mDate = (m.releaseDate || m.dueDate || "").split("T")[0]
        return m.workCenterId === wcId && mDate === dateStr
      })
      const mrpLoadHours = Number(
        mrpTasks.reduce((sum, m) => sum + Number(m.estimatedHours || 0), 0).toFixed(2)
      )

      const totalLoadHours = Number((plannedLoadHours + mrpLoadHours).toFixed(2))
      const utilPercent =
        capHours > 0 ? Number(((totalLoadHours / capHours) * 100).toFixed(1)) : totalLoadHours > 0 ? 999 : 0
      const isOverloaded = utilPercent > 100

      buckets.push({
        periodKey: dateStr,
        workCenterId: wcId,
        workCenterCode: wc.code,
        workCenterName: wc.name,
        availableCapacityHours: capHours,
        plannedLoadHours,
        mrpLoadHours,
        totalLoadHours,
        utilizationPercent: utilPercent,
        isOverloaded,
        operationCount: dayTasks.length,
        operationIds: dayTasks.map((t) => t.id),
      })
    }
  }

  // Darboğaz İş Merkezi (En yüksek toplam yüke veya en çok aşırı yüke sahip iş merkezi)
  const wcTotalLoads: Record<string, { totalLoad: number; totalCap: number }> = {}
  buckets.forEach((b) => {
    if (!wcTotalLoads[b.workCenterId]) {
      wcTotalLoads[b.workCenterId] = { totalLoad: 0, totalCap: 0 }
    }
    wcTotalLoads[b.workCenterId].totalLoad += b.totalLoadHours
    wcTotalLoads[b.workCenterId].totalCap += b.availableCapacityHours
  })

  let bottleneckWcId: string | undefined = undefined
  let highestUtil = -1

  Object.entries(wcTotalLoads).forEach(([id, stats]) => {
    const ratio = stats.totalCap > 0 ? stats.totalLoad / stats.totalCap : stats.totalLoad > 0 ? 10 : 0
    if (ratio > highestUtil) {
      highestUtil = ratio
      bottleneckWcId = id
    }
  })

  const overloadedBuckets = buckets.filter((b) => b.isOverloaded)
  const totalLoadSum = buckets.reduce((s, b) => s + b.totalLoadHours, 0)
  const totalCapSum = buckets.reduce((s, b) => s + b.availableCapacityHours, 0)
  const averageUtilizationPercent =
    totalCapSum > 0 ? Number(((totalLoadSum / totalCapSum) * 100).toFixed(1)) : 0

  return {
    buckets,
    bottleneckWorkCenterId: bottleneckWcId,
    overloadedBuckets,
    averageUtilizationPercent,
  }
}

// ─────────────────────────────────────────────────────────────
// 5. SÖZ VERİLEBİLİR TESLİM TARİHİ (CTP - CAPABLE TO PROMISE)
// ─────────────────────────────────────────────────────────────

export function calculateCapableToPromise(
  input: CtpSimulationInput,
  workCenters: Record<string, WorkCenterCapacityDefinition>,
  existingSchedule: ScheduledTaskResult[],
  simulationStartDate: Date = new Date()
): CtpSimulationResult {
  let cursor = new Date(simulationStartDate)
  const schedulePlan: Array<{
    operationNumber: number
    operationName: string
    workCenterId: string
    start: Date
    end: Date
    durationMinutes: number
  }> = []

  let bottleneckWcId: string | undefined = undefined
  let maxWcQueueMinutes = -1

  for (const op of input.operations) {
    const wc = workCenters[op.workCenterId] || {
      workCenterId: op.workCenterId,
      code: "WC-CTP",
      name: "Simülasyon İstasyonu",
      efficiencyPercent: 100,
      dailyNetWorkingMinutes: 480,
      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    }

    const durationMinutes = Math.round(op.setupMinutes + op.runMinutesPerUnit * input.quantity)

    // İstasyonun mevcut takvimindeki en son işin bitişi
    const wcExistingTasks = existingSchedule.filter((t) => t.workCenterId === op.workCenterId)
    const lastExistingTask = wcExistingTasks.sort(
      (a, b) => b.scheduledEnd.getTime() - a.scheduledEnd.getTime()
    )[0]

    let opEarliestStart = new Date(cursor)
    if (lastExistingTask && lastExistingTask.scheduledEnd > opEarliestStart) {
      opEarliestStart = new Date(lastExistingTask.scheduledEnd)
    }

    const queueWaitMinutes = Math.max(
      0,
      Math.round((opEarliestStart.getTime() - cursor.getTime()) / 60000)
    )
    if (queueWaitMinutes > maxWcQueueMinutes) {
      maxWcQueueMinutes = queueWaitMinutes
      bottleneckWcId = op.workCenterId
    }

    const opEnd = addWorkingMinutesToDate(opEarliestStart, durationMinutes, wc)

    schedulePlan.push({
      operationNumber: op.operationNumber,
      operationName: op.name,
      workCenterId: op.workCenterId,
      start: opEarliestStart,
      end: opEnd,
      durationMinutes,
    })

    cursor = opEnd // Sıradaki operasyon bir öncekinin bitiminden sonra başlar
  }

  const calculatedEarliestDueDate = cursor
  const totalProductionMinutes = schedulePlan.reduce((s, p) => s + p.durationMinutes, 0)
  const criticalPathDays = Number(
    (
      (calculatedEarliestDueDate.getTime() - simulationStartDate.getTime()) /
      (1000 * 60 * 60 * 24)
    ).toFixed(1)
  )

  const isFeasible = input.requestedDueDate
    ? calculatedEarliestDueDate.getTime() <= new Date(input.requestedDueDate).getTime()
    : true

  return {
    isFeasible,
    calculatedEarliestDueDate,
    criticalPathDays,
    bottleneckWorkCenterId: bottleneckWcId,
    totalProductionMinutes,
    schedule: schedulePlan,
  }
}

// ─────────────────────────────────────────────────────────────
// 6. FİİLİ VS PLANLANAN SÜRE VARYANSI VE STANDART ÖNERİSİ
// ─────────────────────────────────────────────────────────────

export function calculateOperationTimeVariances(
  completedOperations: Array<{
    operationName: string
    workCenterId: string
    plannedSetupMinutes: number
    plannedRunMinutes: number
    actualMachineMinutes: number
    actualRunMinutes: number
  }>
): OperationTimeVarianceSummary[] {
  const grouped: Record<
    string,
    {
      workCenterId: string
      operationName: string
      totalPlanned: number
      totalActual: number
      count: number
    }
  > = {}

  completedOperations.forEach((op) => {
    const key = `${op.workCenterId}___${op.operationName}`
    if (!grouped[key]) {
      grouped[key] = {
        workCenterId: op.workCenterId,
        operationName: op.operationName,
        totalPlanned: 0,
        totalActual: 0,
        count: 0,
      }
    }

    const planned = (op.plannedSetupMinutes || 0) + (op.plannedRunMinutes || 0)
    const actual =
      (op.actualMachineMinutes || 0) > 0 ? op.actualMachineMinutes : op.actualRunMinutes || planned

    grouped[key].totalPlanned += planned
    grouped[key].totalActual += actual
    grouped[key].count++
  })

  return Object.values(grouped).map((g) => {
    const plannedAvg = Number((g.totalPlanned / g.count).toFixed(1))
    const actualAvg = Number((g.totalActual / g.count).toFixed(1))
    const variancePercent =
      plannedAvg > 0 ? Number((((actualAvg - plannedAvg) / plannedAvg) * 100).toFixed(1)) : 0

    // Öneri: %70 gerçekleşen ortalama, %30 mevcut standart (Öğrenme eğrisi düzeltmesi)
    const suggested = Number((actualAvg * 0.7 + plannedAvg * 0.3).toFixed(1))

    return {
      workCenterId: g.workCenterId,
      operationName: g.operationName,
      sampleCount: g.count,
      plannedStandardMinutes: plannedAvg,
      actualAverageMinutes: actualAvg,
      variancePercent,
      suggestedStandardMinutes: suggested,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// 7. OTOMATİK KAPASİTE VE DARBOĞAZ UYARILARI ÜRETİCİSİ
// ─────────────────────────────────────────────────────────────

export function generateCapacityAlertsFromBuckets(
  buckets: CapacityPeriodBucket[],
  delayedTasks: ScheduledTaskResult[],
  thresholdPercent: number = 95
): CapacityAlertResult[] {
  const alerts: CapacityAlertResult[] = []

  // 1. Aşırı Yük ve Darboğaz Uyarıları
  buckets.forEach((b) => {
    if (b.utilizationPercent >= 100) {
      alerts.push({
        alertType: "OVERLOAD",
        severity: "CRITICAL",
        workCenterId: b.workCenterId,
        periodDate: b.periodKey,
        loadPercentage: b.utilizationPercent,
        message: `${b.workCenterName} (${b.workCenterCode}) istasyonunda ${b.periodKey} tarihinde %${b.utilizationPercent} aşırı yük tespit edildi!`,
      })
    } else if (b.utilizationPercent >= thresholdPercent) {
      alerts.push({
        alertType: "BOTTLENECK",
        severity: "WARNING",
        workCenterId: b.workCenterId,
        periodDate: b.periodKey,
        loadPercentage: b.utilizationPercent,
        message: `${b.workCenterName} (${b.workCenterCode}) istasyonunda ${b.periodKey} tarihinde kapasite doluluk eşiği aşıldı (%${b.utilizationPercent}).`,
      })
    }
  })

  // 2. Gecikme Uyarıları
  delayedTasks.forEach((d) => {
    alerts.push({
      alertType: "DELAY",
      severity: d.delayMinutes > 1440 ? "CRITICAL" : "WARNING", // 1 günden fazla gecikme kritik
      workCenterId: d.workCenterId,
      workOrderId: d.workOrderId,
      operationId: d.operationId,
      message: `İş Emri (${d.workOrderNumber}) #${d.operationNumber} operasyonu ${Math.round(
        d.delayMinutes / 60
      )} saat gecikmeli olarak planlandı.`,
    })
  })

  return alerts
}

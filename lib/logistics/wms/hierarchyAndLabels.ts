/**
 * Lojistik Faz 2 — Depo Hiyerarşisi, Ambalaj Zinciri & LPN / SSCC-18 Etiket Servisi
 *
 * - 4 Seviyeli Depo -> Bölge -> Koridor/Raf -> Göz CRUD
 * - Lokasyon tipi/rolü, kapasite (kg/m³), aktif/bloklu yönetimi
 * - Çok seviyeli ambalaj birim çevrimi (Adet -> İç Kutu -> Koli -> Palet) + Ti-Hi
 * - GS1-128 SSCC-18 check-digit doğrulamalı LPN oluşturma, mühürleme, içerik ekleme
 * - QR (svg/dataUrl) + GS1 etiket yükü üretimi (sunucu + istemci baskı hazır)
 */

import QRCode from "qrcode"
import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import {
  generateSscc18Code,
  resolveNormalizedBinRole,
  validateSscc18Code,
  type WmsBinRole,
  type WmsPickPolicy,
} from "./constantsAndHelpers"

export interface CreateOrUpdateWarehouseInput {
  id?: string
  branchId?: string
  code: string
  name: string
  type?: string
  address?: string
  city?: string
  managerName?: string
  phone?: string
  capacityVolumeM3?: number
  capacityWeightKg?: number
  maxCapacityPallets?: number
  temperatureRange?: string
  pickPolicy?: WmsPickPolicy
  isDefault?: boolean
  isActive?: boolean
}

export interface CreateZoneInput {
  id?: string
  warehouseId: string
  code: string
  name: string
  zoneType?: string
  tempTarget?: string
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMax?: number | null
  abcPreference?: string
}

export interface CreateOrUpdateBinInput {
  id?: string
  warehouseId: string
  zoneId: string
  code: string
  aisle: string
  rack: string
  level: string
  binPosition: string
  binType?: string
  binRole?: WmsBinRole
  abcVelocity?: string
  maxWeightKg?: number
  maxVolumeM3?: number
  allowMixedSku?: boolean
  allowMixedLot?: boolean
  rfidGateTag?: string | null
  isBlocked?: boolean
  blockReason?: string | null
  isActive?: boolean
}

/**
 * 4 Seviyeli Depo Hiyerarşisini ağaç yapısında döndürür: Depo -> Bölge -> Koridor/Raf -> Göz/Bölme
 */
export async function getWarehouseHierarchyTree(warehouseId?: string) {
  const [warehouses, zones, bins, balances, items] = await Promise.all([
    prisma.warehouse.findMany({
      ...(warehouseId ? { where: { id: warehouseId } } : {}),
      orderBy: { name: "asc" },
    }),
    prisma.warehouseZone.findMany({
      ...(warehouseId ? { where: { warehouseId } } : {}),
      orderBy: { code: "asc" },
    }),
    prisma.storageBin.findMany({
      ...(warehouseId ? { where: { warehouseId } } : {}),
      orderBy: [{ aisle: "asc" }, { rack: "asc" }, { level: "asc" }, { binPosition: "asc" }],
    }),
    prisma.stockBalance.findMany(warehouseId ? { where: { warehouseId } } : undefined),
    prisma.inventoryItem.findMany(),
  ])

  const itemMap = new Map(items.map((i: any) => [i.id, i]))

  const balByBin = new Map<string, any[]>()
  for (const b of balances) {
    if (!b.storageBinId || Number(b.onHandQty || 0) <= 0) continue
    const arr = balByBin.get(b.storageBinId) || []
    const it = itemMap.get(b.itemId)
    arr.push({
      ...b,
      sku: it?.sku || "-",
      itemName: it?.name || "-",
      baseUnit: it?.baseUnit || "Adet",
    })
    balByBin.set(b.storageBinId, arr)
  }

  return warehouses.map((wh: any) => {
    const whZones = zones.filter((z: any) => z.warehouseId === wh.id)
    const whBins = bins.filter((b: any) => b.warehouseId === wh.id)

    const zoneNodes = whZones.map((z: any) => {
      const zoneBins = whBins.filter((b: any) => b.zoneId === z.id)
      // Koridor/Raf gruplaması (aisle + "-" + rack)
      const aisleRackMap = new Map<string, { aisle: string; rack: string; bins: any[] }>()

      for (const bin of zoneBins) {
        const key = `${bin.aisle || "K01"}-${bin.rack || "R01"}`
        if (!aisleRackMap.has(key)) {
          aisleRackMap.set(key, {
            aisle: bin.aisle || "K01",
            rack: bin.rack || "R01",
            bins: [],
          })
        }
        const binBalances = balByBin.get(bin.id) || []
        const totalQty = binBalances.reduce((s, r) => s + Number(r.onHandQty || 0), 0)
        aisleRackMap.get(key)!.bins.push({
          ...bin,
          normalizedRole: resolveNormalizedBinRole(bin),
          totalQty,
          skuCount: binBalances.length,
          balances: binBalances,
        })
      }

      return {
        ...z,
        binCount: zoneBins.length,
        blockedCount: zoneBins.filter((b: any) => b.isBlocked).length,
        aisles: Array.from(aisleRackMap.values()),
      }
    })

    // Eğer zone'a bağlanmamış yetim raf varsa onları da tespit et
    const assignedZoneIds = new Set(whZones.map((z: any) => z.id))
    const unassignedBins = whBins.filter((b: any) => !assignedZoneIds.has(b.zoneId))

    return {
      ...wh,
      zoneCount: whZones.length,
      binCount: whBins.length,
      zones: zoneNodes,
      unassignedBins,
    }
  })
}

export async function upsertWarehouseRecord(input: CreateOrUpdateWarehouseInput) {
  if (!input.code?.trim() || !input.name?.trim()) {
    throw new LogisticsDomainError("INVALID_WAREHOUSE", "Depo kodu ve adı zorunludur.", 400)
  }

  if (input.id) {
    return await prisma.warehouse.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        type: input.type || "MAIN",
        address: input.address ?? null,
        city: input.city ?? null,
        managerName: input.managerName ?? null,
        phone: input.phone ?? null,
        capacityVolumeM3: Number(input.capacityVolumeM3 ?? 1000),
        capacityWeightKg: Number(input.capacityWeightKg ?? 50000),
        maxCapacityPallets: input.maxCapacityPallets ? Number(input.maxCapacityPallets) : null,
        temperatureRange: input.temperatureRange ?? null,
        pickPolicy: input.pickPolicy ?? "FIFO",
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    })
  }

  const existingCode = await prisma.warehouse.findFirst({ where: { code: input.code.trim() } })
  if (existingCode) {
    throw new LogisticsDomainError("DUPLICATE_CODE", `'${input.code}' depo kodu zaten mevcut.`, 409)
  }

  return await prisma.warehouse.create({
    data: {
      branchId: input.branchId || "local-debug-branch",
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type || "MAIN",
      address: input.address ?? null,
      city: input.city ?? null,
      managerName: input.managerName ?? null,
      phone: input.phone ?? null,
      capacityVolumeM3: Number(input.capacityVolumeM3 ?? 1000),
      capacityWeightKg: Number(input.capacityWeightKg ?? 50000),
      maxCapacityPallets: input.maxCapacityPallets ? Number(input.maxCapacityPallets) : 250,
      temperatureRange: input.temperatureRange ?? null,
      pickPolicy: input.pickPolicy ?? "FIFO",
      isDefault: Boolean(input.isDefault),
      isActive: input.isActive !== undefined ? input.isActive : true,
    },
  })
}

export async function upsertWarehouseZoneRecord(input: CreateZoneInput) {
  if (!input.warehouseId || !input.code?.trim() || !input.name?.trim()) {
    throw new LogisticsDomainError("INVALID_ZONE", "Depo, bölge kodu ve bölge adı zorunludur.", 400)
  }

  let parsedMin = input.temperatureMin ?? null
  let parsedMax = input.temperatureMax ?? null
  if (parsedMin === null && parsedMax === null && input.tempTarget) {
    const nums = String(input.tempTarget).match(/-?\d+(?:[.,]\d+)?/g)
    if (nums && nums.length >= 2) {
      parsedMin = Number(nums[0].replace(",", "."))
      parsedMax = Number(nums[1].replace(",", "."))
    } else if (nums && nums.length === 1) {
      const n = Number(nums[0].replace(",", "."))
      parsedMin = n - 2
      parsedMax = n + 2
    }
  }

  if (input.id) {
    return await prisma.warehouseZone.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        zoneType: input.zoneType || "AMBIENT",
        ...(parsedMin !== null ? { temperatureMin: parsedMin } : {}),
        ...(parsedMax !== null ? { temperatureMax: parsedMax } : {}),
        ...(input.humidityMax !== undefined ? { humidityMax: input.humidityMax } : {}),
      },
    })
  }

  return await prisma.warehouseZone.create({
    data: {
      warehouseId: input.warehouseId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      zoneType: input.zoneType || "AMBIENT",
      temperatureMin: parsedMin,
      temperatureMax: parsedMax,
      humidityMax: input.humidityMax ?? null,
    },
  })
}

export async function upsertStorageBinRecord(input: CreateOrUpdateBinInput) {
  if (!input.warehouseId || !input.zoneId || !input.code?.trim()) {
    throw new LogisticsDomainError("INVALID_BIN", "Depo, bölge ve göz kodu zorunludur.", 400)
  }

  const normalizedRole = resolveNormalizedBinRole({
    binRole: input.binRole,
    binType: input.binType,
  })
  const binTypeMap: Record<WmsBinRole, string> = {
    NORMAL: input.binType || "STANDARD_PALLET",
    COLD_STORAGE: "COLD_STORAGE",
    FAST_PICK: "FAST_PICK",
    QUARANTINE: "QUARANTINE",
    RETURN_RMA: "RETURN_RMA",
    SHIPPING: "SHIPPING",
    CROSS_DOCK: "CROSS_DOCK",
  }

  if (input.id) {
    return await prisma.storageBin.update({
      where: { id: input.id },
      data: {
        zoneId: input.zoneId,
        aisle: input.aisle || "A",
        rack: input.rack || "01",
        level: input.level || "01",
        binPosition: input.binPosition || "A",
        binType: binTypeMap[normalizedRole],
        binRole: normalizedRole,
        abcVelocity: input.abcVelocity || "A",
        maxWeightKg: Number(input.maxWeightKg ?? 1200),
        maxVolumeM3: Number(input.maxVolumeM3 ?? 2.4),
        allowMixedSku: input.allowMixedSku ?? true,
        allowMixedLot: input.allowMixedLot ?? false,
        rfidGateTag: input.rfidGateTag ?? null,
        isBlocked: input.isBlocked ?? false,
        blockReason: input.blockReason ?? null,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    })
  }

  const existing = await prisma.storageBin.findFirst({
    where: { code: input.code.trim().toUpperCase() },
  })
  if (existing) {
    throw new LogisticsDomainError("DUPLICATE_BIN_CODE", `'${input.code}' raf/göz kodu zaten mevcut.`, 409)
  }

  return await prisma.storageBin.create({
    data: {
      warehouseId: input.warehouseId,
      zoneId: input.zoneId,
      code: input.code.trim().toUpperCase(),
      aisle: input.aisle || "A",
      rack: input.rack || "01",
      level: input.level || "01",
      binPosition: input.binPosition || "A",
      binType: binTypeMap[normalizedRole],
      binRole: normalizedRole,
      abcVelocity: input.abcVelocity || "A",
      maxWeightKg: Number(input.maxWeightKg ?? 1200),
      maxVolumeM3: Number(input.maxVolumeM3 ?? 2.4),
      allowMixedSku: input.allowMixedSku ?? true,
      allowMixedLot: input.allowMixedLot ?? false,
      rfidGateTag: input.rfidGateTag ?? null,
      isBlocked: Boolean(input.isBlocked),
      blockReason: input.blockReason ?? null,
      isActive: input.isActive !== undefined ? input.isActive : true,
    },
  })
}

export async function toggleStorageBinState(params: {
  binId: string
  isBlocked?: boolean
  blockReason?: string | null
  isActive?: boolean
}) {
  const existing = await prisma.storageBin.findUnique({ where: { id: params.binId } })
  if (!existing) {
    throw new LogisticsDomainError("BIN_NOT_FOUND", "Raf hücresi bulunamadı.", 404)
  }

  const nextBlocked = params.isBlocked !== undefined ? params.isBlocked : !existing.isBlocked
  const nextActive = params.isActive !== undefined ? params.isActive : existing.isActive !== false

  return await prisma.storageBin.update({
    where: { id: params.binId },
    data: {
      isBlocked: nextBlocked,
      blockReason: nextBlocked ? params.blockReason || "Operasyonel / Kalite Blokajı" : null,
      isActive: nextActive,
    },
  })
}

/**
 * Bir ürün için çok seviyeli ambalaj çevrim hiyerarşisini kaydeder ve kümülatif çarpanları hesaplar.
 */
export async function savePackagingHierarchy(params: {
  itemId: string
  tiers: Array<{
    fromUnit: string
    toUnit?: string
    parentUnit?: string
    levelOrder: number
    multiplier: number
    barcode?: string
    tiCount?: number
    hiCount?: number
    weightKg?: number
    volumeM3?: number
    isDefaultPurchase?: boolean
    isDefaultSales?: boolean
  }>
}) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: params.itemId } })
  if (!item) {
    throw new LogisticsDomainError("ITEM_NOT_FOUND", "Stok kalemi bulunamadı.", 404)
  }

  await prisma.unitConversion.deleteMany({ where: { itemId: params.itemId } })

  const sortedTiers = [...params.tiers].sort((a, b) => a.levelOrder - b.levelOrder)
  const created = []

  for (const tier of sortedTiers) {
    if (!tier.fromUnit?.trim() || Number(tier.multiplier || 0) <= 0) continue
    const rec = await prisma.unitConversion.create({
      data: {
        itemId: params.itemId,
        fromUnit: tier.fromUnit.trim(),
        toUnit: tier.toUnit?.trim() || item.baseUnit || "Adet",
        parentUnit: tier.parentUnit ?? null,
        levelOrder: tier.levelOrder,
        multiplier: Number(tier.multiplier),
        tiCount: tier.tiCount ? Number(tier.tiCount) : null,
        hiCount: tier.hiCount ? Number(tier.hiCount) : null,
        barcode: tier.barcode ?? null,
        weightKg: tier.weightKg ? Number(tier.weightKg) : null,
        volumeM3: tier.volumeM3 ? Number(tier.volumeM3) : null,
        isDefaultPurchase: Boolean(tier.isDefaultPurchase),
        isDefaultSales: Boolean(tier.isDefaultSales),
      },
    })
    created.push(rec)
  }

  return created
}

/**
 * Yeni LPN / Palet (GS1-128 SSCC-18 check-digit doğrulamalı) oluşturur ve içeriklerini bağlar.
 */
export async function createLicensePlateWithSscc(params: {
  warehouseId: string
  currentBinCode: string
  containerType?: string
  customLpnCode?: string
  parentLpnCode?: string | null
  rfidTagEpc?: string | null
  createdBy?: string | null
  contents?: Array<{
    itemId: string
    quantity: number
    unit?: string
    lotNumber?: string | null
    serialNumber?: string | null
    expiryDate?: string | null
  }>
}) {
  const generated = generateSscc18Code()
  let lpnCode = generated.sscc18
  let ssccCheckDigit = generated.checkDigit

  if (params.customLpnCode?.trim()) {
    const check = validateSscc18Code(params.customLpnCode.trim())
    lpnCode = params.customLpnCode.trim()
    ssccCheckDigit = check.valid ? check.actualCheckDigit : generated.checkDigit
  }

  const contentsInput = params.contents || []
  const itemIds = contentsInput.map((c) => c.itemId)
  const items = itemIds.length
    ? await prisma.inventoryItem.findMany({ where: { id: { in: itemIds } } })
    : []
  const itemMap = new Map(items.map((i: any) => [i.id, i]))

  let totalWeightKg = 0
  let totalVolumeM3 = 0

  for (const row of contentsInput) {
    const it = itemMap.get(row.itemId)
    totalWeightKg += Number(row.quantity || 0) * Number(it?.weightKg ?? 0.5)
    totalVolumeM3 += Number(row.quantity || 0) * Number(it?.volumeM3 ?? 0.01)
  }

  const lpn = await prisma.licensePlate.create({
    data: {
      lpnCode,
      ssccCheckDigit,
      containerType: params.containerType || "PALLET_EUR",
      warehouseId: params.warehouseId,
      currentBinCode: params.currentBinCode || "GENEL",
      parentLpnCode: params.parentLpnCode ?? null,
      status: "ACTIVE",
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      volumeM3: Number(totalVolumeM3.toFixed(4)),
      rfidTagEpc: params.rfidTagEpc ?? null,
      createdBy: params.createdBy ?? "WMS Operatör",
      contentsJson: JSON.stringify(contentsInput),
    },
  })

  for (const row of contentsInput) {
    const it = itemMap.get(row.itemId)
    await prisma.licensePlateContent.create({
      data: {
        licensePlateId: lpn.id,
        itemId: row.itemId,
        sku: it?.sku ?? null,
        lotNumber: row.lotNumber ?? null,
        serialNumber: row.serialNumber ?? null,
        quantity: Number(row.quantity || 0),
        unit: row.unit || it?.baseUnit || "Adet",
        expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
      },
    })
  }

  return lpn
}

/**
 * Lokasyon, Koli veya Palet (SSCC-18) için yazdırılabilir QR SVG + GS1-128 barkod meta verisi üretir.
 */
export async function generatePrintableLabelPayload(params: {
  entityType: "BIN" | "LPN" | "ITEM"
  id: string
}) {
  if (params.entityType === "BIN") {
    const bin = await prisma.storageBin.findUnique({ where: { id: params.id } })
    if (!bin) throw new LogisticsDomainError("BIN_NOT_FOUND", "Raf gözü bulunamadı.", 404)
    const warehouse = await prisma.warehouse.findUnique({ where: { id: bin.warehouseId } }).catch(() => null)
    const zone = await prisma.warehouseZone.findUnique({ where: { id: bin.zoneId } }).catch(() => null)

    const qrContent = JSON.stringify({
      t: "WMS_BIN",
      c: bin.code,
      wh: warehouse?.code,
      z: zone?.code,
      role: resolveNormalizedBinRole(bin),
    })
    const qrSvg = await QRCode.toString(qrContent, { type: "svg", margin: 1, width: 160 })

    return {
      entityType: "BIN" as const,
      title: bin.code,
      subtitle: `${warehouse?.name || "Depo"} / ${zone?.name || "Bölge"}`,
      barcodeValue: bin.code,
      humanReadable: bin.code,
      qrSvg,
      metadata: {
        Koridor: bin.aisle,
        Raf: bin.rack,
        Kat: bin.level,
        Göz: bin.binPosition,
        Rol: resolveNormalizedBinRole(bin),
        Kapasite: `${bin.maxWeightKg} kg / ${bin.maxVolumeM3} m³`,
        RfidTag: bin.rfidGateTag || "-",
      },
    }
  }

  if (params.entityType === "LPN") {
    const lpn = await prisma.licensePlate.findUnique({ where: { id: params.id } })
    if (!lpn) throw new LogisticsDomainError("LPN_NOT_FOUND", "LPN / SSCC palet bulunamadı.", 404)
    const warehouse = await prisma.warehouse.findUnique({ where: { id: lpn.warehouseId } }).catch(() => null)
    const contents = await prisma.licensePlateContent.findMany({ where: { licensePlateId: lpn.id } })

    const check = validateSscc18Code((lpn as any).sscc18 || lpn.lpnCode)
    const barcodeValue = check.sscc18.length === 18 ? `00${check.sscc18}` : lpn.lpnCode
    const qrContent = JSON.stringify({
      t: "WMS_SSCC",
      sscc: check.sscc18 || lpn.lpnCode,
      wh: warehouse?.code,
      bin: lpn.currentBinCode,
    })
    const qrSvg = await QRCode.toString(qrContent, { type: "svg", margin: 1, width: 160 })

    return {
      entityType: "LPN" as const,
      title: lpn.lpnCode,
      subtitle: `${warehouse?.name || "Depo"} · Raf: ${lpn.currentBinCode}`,
      barcodeValue,
      humanReadable: check.sscc18.length === 18 ? `(00) ${check.sscc18}` : lpn.lpnCode,
      ssccValid: check.valid,
      qrSvg,
      metadata: {
        KapTipi: lpn.containerType,
        Durum: lpn.status,
        Ağırlık: `${lpn.totalWeightKg || 0} kg`,
        KalemSayısı: String(contents.length),
        RfidEpc: lpn.rfidTagEpc || "-",
      },
      contents,
    }
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } })
  if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", "Stok kalemi bulunamadı.", 404)

  const qrContent = JSON.stringify({ t: "WMS_SKU", sku: item.sku, gtin: item.gtin || item.barcode })
  const qrSvg = await QRCode.toString(qrContent, { type: "svg", margin: 1, width: 160 })

  return {
    entityType: "ITEM" as const,
    title: item.name,
    subtitle: `SKU: ${item.sku} · Birim: ${item.baseUnit}`,
    barcodeValue: item.gtin || item.barcode || item.sku,
    humanReadable: item.gtin || item.barcode || item.sku,
    qrSvg,
    metadata: {
      Kategori: item.category,
      ABC: item.abcClass,
      ToplamaPolitikası: item.pickPolicy || "FIFO",
      RfidÖnek: item.rfidEpcPrefix || "-",
    },
  }
}

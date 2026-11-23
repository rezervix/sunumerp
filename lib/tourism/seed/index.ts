/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi — Demo Seed Kayıt Defteri
 *
 * Mevcut `lib/logistics/seed/framework.ts` altyapısını yeniden kullanır.
 * Her modül kendi bağımsız seed modülü olarak burada sıralanır.
 */

import {
  executeLogisticsDemoRollback,
  executeLogisticsDemoSeed,
  type LogisticsSeedModule,
} from "@/lib/logistics/seed/framework"
import { faz1TourismPartnerFoundationSeedModule } from "./faz1-partner-firmalar-ve-kullanicilar"
import { faz2RentACarSeedModule } from "./faz2-arac-kiralama"
import { faz3HotelPmsSeedModule } from "./faz3-otel-pms"

export const ALL_TOURISM_SEED_MODULES: readonly LogisticsSeedModule[] = [
  faz1TourismPartnerFoundationSeedModule,
  faz2RentACarSeedModule,
  faz3HotelPmsSeedModule,
] as const

function filterModules(onlyModuleKeys?: string[]): readonly LogisticsSeedModule[] {
  if (!onlyModuleKeys || onlyModuleKeys.length === 0) return ALL_TOURISM_SEED_MODULES
  const keySet = new Set(onlyModuleKeys)
  return ALL_TOURISM_SEED_MODULES.filter((m) => keySet.has(m.moduleKey))
}

export async function runAllTourismDemoSeeds(options?: {
  onlyModuleKeys?: string[]
  createBackup?: boolean
  backupLabel?: string
}) {
  return await executeLogisticsDemoSeed(filterModules(options?.onlyModuleKeys), {
    createBackup: options?.createBackup,
    backupLabel: options?.backupLabel ?? "pre-tourism-seed",
  })
}

export function rollbackAllTourismDemoSeeds(options?: {
  onlyModuleKeys?: string[]
  createSafetyBackup?: boolean
  backupLabel?: string
}) {
  return executeLogisticsDemoRollback(filterModules(options?.onlyModuleKeys), {
    createSafetyBackup: options?.createSafetyBackup,
    backupLabel: options?.backupLabel ?? "pre-tourism-rollback",
  })
}

export {
  faz1TourismPartnerFoundationSeedModule,
  faz2RentACarSeedModule,
  faz3HotelPmsSeedModule,
}

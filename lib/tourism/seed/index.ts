/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi — Demo Seed Kayıt Defteri
 *
 * Mevcut `lib/logistics/seed/framework.ts` altyapısını yeniden kullanır.
 * Her modül kendi bağımsız seed modülü olarak burada sıralanır.
 */

import {
  rollbackTourismSeedModules,
  runTourismSeedModules,
  type LogisticsSeedModule,
  type LogisticsSeedRollbackReport,
  type LogisticsSeedRunReport,
} from "@/lib/logistics/seed/framework"
import { faz1TourismPartnerFoundationSeedModule } from "./faz1-partner-firmalar-ve-kullanicilar"
import { faz2RentACarSeedModule } from "./faz2-arac-kiralama"

export const ALL_TOURISM_SEED_MODULES: readonly LogisticsSeedModule[] = [
  faz1TourismPartnerFoundationSeedModule,
  faz2RentACarSeedModule,
] as const

export async function runAllTourismDemoSeeds(options?: {
  onlyModuleKeys?: string[]
  createBackup?: boolean
  backupLabel?: string
}): Promise<LogisticsSeedRunReport> {
  return await runTourismSeedModules(ALL_TOURISM_SEED_MODULES, options)
}

export function rollbackAllTourismDemoSeeds(options?: {
  onlyModuleKeys?: string[]
  createSafetyBackup?: boolean
  backupLabel?: string
}): LogisticsSeedRollbackReport {
  return rollbackTourismSeedModules(ALL_TOURISM_SEED_MODULES, options)
}

export { faz1TourismPartnerFoundationSeedModule, faz2RentACarSeedModule }

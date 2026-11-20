/**
 * Sunum ERP — Turizm, Araç Kiralama, Konaklama ve B2B Partner Ağı Demo Seed Modülleri
 *
 * NOT: Yeni paralel seed motoru kurmaz; Lojistik fazlarındaki mevcut `lib/logistics/seed/framework.ts`
 * (idempotent, rollback'li, DISABLE_DEMO_MODE kilitli, çalışma öncesi SHA-256 yedekli) motorunu doğrudan kullanır.
 * Sonraki fazlarda Rent-a-Car, Otel PMS, Tur Operatörlüğü ve B2B Partner seed modülleri bu listeye eklenir.
 */

import {
  executeLogisticsDemoRollback,
  executeLogisticsDemoSeed,
  type LogisticsSeedModule,
} from "@/lib/logistics/seed/framework"
import { faz1TourismPartnerFoundationSeedModule } from "./faz1-partner-firmalar-ve-kullanicilar"

export const TOURISM_SEED_MODULES: readonly LogisticsSeedModule[] = [
  faz1TourismPartnerFoundationSeedModule,
] as const

export async function runAllTourismDemoSeeds(options?: {
  createBackup?: boolean
  backupLabel?: string
}) {
  return executeLogisticsDemoSeed(TOURISM_SEED_MODULES, {
    createBackup: options?.createBackup ?? true,
    backupLabel: options?.backupLabel ?? "pre-tourism-seed",
  })
}

export function rollbackAllTourismDemoSeeds(options?: {
  createSafetyBackup?: boolean
  backupLabel?: string
}) {
  return executeLogisticsDemoRollback(TOURISM_SEED_MODULES, {
    createSafetyBackup: options?.createSafetyBackup ?? true,
    backupLabel: options?.backupLabel ?? "pre-tourism-rollback",
  })
}

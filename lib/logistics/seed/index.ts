/**
 * Lojistik Demo Seed Kayıt Defteri
 * Sonraki fazlarda (Faz 2–7) her yeni modül kendi eklemeli seed parçasını bu diziye kaydeder.
 */

import {
  executeLogisticsDemoRollback,
  executeLogisticsDemoSeed,
  type LogisticsSeedModule,
} from "./framework"
import { faz1SupplierAuthSeedModule } from "./faz1-tedarikci-rol-ve-kullanici"

export const LOGISTICS_SEED_MODULES: readonly LogisticsSeedModule[] = [
  faz1SupplierAuthSeedModule,
]

export async function runAllLogisticsDemoSeeds(options?: {
  createBackup?: boolean
  backupLabel?: string
}) {
  return await executeLogisticsDemoSeed(LOGISTICS_SEED_MODULES, options)
}

export function rollbackAllLogisticsDemoSeeds(options?: {
  createSafetyBackup?: boolean
}) {
  return executeLogisticsDemoRollback(LOGISTICS_SEED_MODULES, options)
}

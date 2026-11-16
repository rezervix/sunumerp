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
import { faz2WmsDeepeningSeedModule } from "./faz2-wms-derinlestirme"
import { faz3ProcurementAndSupplierSeedModule } from "./faz3-tedarikci-ve-satinalma"
import { faz4ReturnsAndRmaSeedModule } from "./faz4-iade-ve-rma"
import { faz5FleetAndTelematicsSeedModule } from "./faz5-filo-ve-telematik"

export const LOGISTICS_SEED_MODULES: readonly LogisticsSeedModule[] = [
  faz1SupplierAuthSeedModule,
  faz2WmsDeepeningSeedModule,
  faz3ProcurementAndSupplierSeedModule,
  faz4ReturnsAndRmaSeedModule,
  faz5FleetAndTelematicsSeedModule,
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

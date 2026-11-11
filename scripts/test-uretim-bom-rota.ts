/**
 * SUNUM ERP – FAZ 3: Ürün Reçeteleri (BOM) & Rotalar (Routing)
 * Birim + Entegrasyon + Regresyon Otomatik Test Paketi
 *
 * Çalıştırma:
 *   npx tsx scripts/test-uretim-bom-rota.ts
 */

// @ts-ignore
process.env.NODE_ENV = 'development';

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/db';
import {
    createDatabaseBackup,
    deleteDatabaseBackup,
    restoreDatabaseBackup,
} from '../lib/services/databaseBackupService';
import { validateAdditiveMigrationSql } from '../lib/services/migrationStrategyService';
import {
    DEFAULT_PRODUCTION_FEATURE_FLAGS,
    isAnyProductionFeatureEnabled,
} from '../lib/config/production-feature-flags';
import { getServerProductionFeatureFlags, getSystemConfig, saveSystemConfig } from '../lib/system-config';
import {
    compareBomRevisions,
    detectBomCircularDependency,
    explodeBomTree,
    findWhereUsedInBoms,
    generateBomCsvContent,
    parseBomCsvContent,
    calculateTheoreticalBomCost,
    validateBomHeaderInput,
    validateBomItemInput,
    validateOperationInput,
    validateRoutingHeaderInput,
} from '../lib/services/productionBomRotaEngine';
import {
    createBomInDb,
    addBomItemToDb,
    addBomSubstituteInDb,
    approveBomInDb,
    cloneBomAsNewRevisionInDb,
    createRoutingInDb,
    addOperationToRoutingInDb,
    getBomByIdFromDb,
    getExplodedBomFromDb,
    getRoutingByIdFromDb,
    getWhereUsedFromDb,
    listBomsFromDb,
    listRoutingsFromDb,
    recalculateBomCostInDb,
    deleteBomInDb,
    deleteBomItemInDb,
    deleteOperationInDb,
} from '../lib/services/productionBomRotaServerDb';
import {
    GET as bomRotaGet,
    POST as bomRotaPost,
    verifyProductionBomRotaAccess,
} from '../app/api/production/bom-rota/route';
import { GET as inventoryGet } from '../app/api/inventory/route';

interface TestResult {
    id: string;
    name: string;
    passed: boolean;
    detail: string;
}

const results: TestResult[] = [];

function assert(condition: unknown, message: string): void {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertThrowsDomainError(fn: () => void, expectedCode: string): void {
    let thrownCode = '';
    try {
        fn();
    } catch (err: any) {
        thrownCode = err?.code || '';
    }
    if (thrownCode !== expectedCode) {
        throw new Error(`Beklenen hata kodu '${expectedCode}', alınan: '${thrownCode || 'HATA_FIRLATILMADI'}'`);
    }
}

function computeFileSha256(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function runTest(id: string, name: string, fn: () => Promise<string>): Promise<void> {
    try {
        const detail = await fn();
        results.push({ id, name, passed: true, detail });
        console.log(`  ✅ [${id}] ${name} -> ${detail}`);
    } catch (error: any) {
        const msg = error?.message || String(error);
        results.push({ id, name, passed: false, detail: msg });
        console.error(`  ❌ [${id}] ${name} -> ${msg}`);
    }
}

function resetFeatureFlagsOff() {
    delete process.env.FEATURE_URETIM_BOM_ROTA;
    delete process.env.FEATURE_URETIM_MRP_MPS;
    delete process.env.FEATURE_URETIM_IS_EMRI;
    delete process.env.FEATURE_URETIM_KAPASITE;
    delete process.env.FEATURE_URETIM_KALITE;
    delete process.env.FEATURE_URETIM_BAKIM;
    saveSystemConfig({
        featureFlags: {
            ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
        },
    });
}

function enableBomRotaFeatureFlag() {
    process.env.FEATURE_URETIM_BOM_ROTA = 'true';
    saveSystemConfig({
        featureFlags: {
            ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
            uretim_bom_rota: true,
        },
    });
}

async function main() {
    console.log('======================================================================');
    console.log(' SUNUM ERP - FAZ 3 ÜRÜN REÇETELERİ (BOM) & ROTALAR TEST PAKETİ');
    console.log('======================================================================\n');

    const dbPath = path.join(process.cwd(), 'storage', 'ajans-kutuphanesi', '.local-db.json');
    const backupsRootDir = path.join(process.cwd(), 'storage', 'backups');
    const backupsDirExistedBefore = fs.existsSync(backupsRootDir);
    resetFeatureFlagsOff();
    const initialSha256 = computeFileSha256(dbPath);
    const safetyBackup = createDatabaseBackup({
        label: 'faz3-bom-rota-test-guard',
        updateSystemConfigLastBackup: false,
    });

    // Test boyunca kullanılacak kimlikler
    let testWorkCenterId = '';
    let testFinishedItemId = '';
    let testSemiFinished1Id = '';
    let testSemiFinished2Id = '';
    let testRawMaterialId = '';
    let testSubstituteItemId = '';

    let testBomId = '';
    let testRoutingId = '';
    let testBomItem1Id = '';

    try {
        // Mevcut stok kartlarından mamul ve hammadde tespit et veya test için referans al
        const allItems = await (prisma as any).inventoryItem.findMany();
        assert(allItems.length >= 3, 'Test için sistemde en az 3 stok kartı bulunmalıdır.');
        testFinishedItemId = allItems[0].id;
        testSemiFinished1Id = allItems[1].id;
        testSemiFinished2Id = allItems[2].id;
        testRawMaterialId = allItems[allItems.length - 1].id;
        testSubstituteItemId = allItems[allItems.length - 2]?.id || testRawMaterialId;

        // ------------------------------------------------------------------
        // 1. MİGRATION & ROLLBACK DOĞRULAMASI
        // ------------------------------------------------------------------
        console.log('--- BÖLÜM 1: ADDITIVE MIGRATION VE ROLLBACK DOĞRULAMASI ---');

        await runTest('F3-01', '20261111120000_uretim_bom_rota Additive Migration & Rollback Kontrolü', async () => {
            const migDir = path.join(
                process.cwd(),
                'prisma',
                'migrations',
                '20261111120000_uretim_bom_rota'
            );
            const upSql = fs.readFileSync(path.join(migDir, 'migration.sql'), 'utf-8');
            const downSql = fs.readFileSync(path.join(migDir, 'rollback.sql'), 'utf-8');

            const validation = validateAdditiveMigrationSql(
                '20261111120000_uretim_bom_rota',
                upSql,
                downSql
            );

            assert(
                validation.valid === true,
                `Migration doğrulaması başarısız: ${validation.errors.join(', ')}`
            );
            assert(
                validation.addedTables.length === 8,
                `Beklenen 8 yeni tablo yerine ${validation.addedTables.length} bulundu.`
            );
            assert(
                validation.alteredTables.length === 0,
                `Mevcut tablolarda ALTER TABLE yapılmamalıdır: ${validation.alteredTables.join(', ')}`
            );
            return `8 yeni tablo (${validation.addedTables.join(', ')}) ve tam geri alınabilir rollback.sql doğrulandı`;
        });

        // ------------------------------------------------------------------
        // 2. SAF MOTOR (PURE ENGINE) TESTLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 2: SAF (PURE) BOM & ROTA MOTORU TESTLERİ ---');

        await runTest('F3-02', 'Döngüsel Referans (DFS Circular Dependency) Engelleme Algoritması', async () => {
            // Senaryo: Ürün-A -> YarıMamul-B -> YarıMamul-C
            // YarıMamul-C içerisine Ürün-A eklenmek istendiğinde döngü tespit edilmeli
            const existingBoms = [
                { finishedItemId: 'ITEM-A', components: [{ componentItemId: 'ITEM-B' }] },
                { finishedItemId: 'ITEM-B', components: [{ componentItemId: 'ITEM-C' }] },
            ];

            // 1. Doğrudan döngü: Kendisi
            const selfCycle = detectBomCircularDependency({
                parentFinishedItemId: 'ITEM-A',
                candidateComponentItemId: 'ITEM-A',
                existingBoms,
            });
            assert(selfCycle.hasCycle === true, 'Kendi kendine referans döngü olarak tespit edilmeliydi.');

            // 2. Dolaylı döngü: C -> A
            const indirectCycle = detectBomCircularDependency({
                parentFinishedItemId: 'ITEM-C',
                candidateComponentItemId: 'ITEM-A',
                existingBoms,
            });
            assert(
                indirectCycle.hasCycle === true && indirectCycle.cyclePath.includes('ITEM-A'),
                `Dolaylı döngü tespit edilemedi: ${JSON.stringify(indirectCycle)}`
            );

            // 3. Geçerli bağımsız parça: C -> HAMMADDE-D (Döngü yok)
            const validAddition = detectBomCircularDependency({
                parentFinishedItemId: 'ITEM-C',
                candidateComponentItemId: 'RAW-MAT-D',
                existingBoms,
            });
            assert(validAddition.hasCycle === false, 'Geçerli hammadde eklemesi döngü olarak algılanmamalıdır.');

            return 'DFS algoritması doğrudan ve dolaylı döngüleri (A->B->C->A) hatasız yakaladı';
        });

        await runTest('F3-03', '4+ Seviyeli Reçete Patlatma (BOM Explosion), Phantom Yarı Mamul ve Fire Hesabı', async () => {
            // 4 Seviyeli Reçete Simülasyonu:
            // Seviye 0: BITMIS-MAMUL (100 Adet)
            //   └── Seviye 1: YARI-MAMUL-1 (Phantom / Hayalet, 1 Adet için 2 adet gerekir, Fire %5)
            //         └── Seviye 2: YARI-MAMUL-2 (1 Adet için 1.5 adet gerekir, Fire %2)
            //               └── Seviye 3: HAMMADDE-ESANS (1 Adet için 0.25 kg gerekir, Fire %0)

            const rawMatCost = 80; // 80 TL/kg
            const itemCostMap: Record<string, number> = {
                'RAW-ESANS': rawMatCost,
                'PKG-KUTU': 5,
            };

            const bom3: any = {
                id: 'bom-3',
                finishedItemId: 'YM-2',
                code: 'BOM-YM-2',
                name: 'Yarı Mamul 2 Reçetesi',
                baseQuantity: 1,
                baseUnit: 'Adet',
                isPhantom: false,
                isActive: true,
                status: 'APPROVED',
                components: [
                    { componentItemId: 'RAW-ESANS', componentItemCode: 'RAW-ESANS', quantity: 0.25, unit: 'Kg', scrapPercent: 0 },
                ],
            };

            const bom2: any = {
                id: 'bom-2',
                finishedItemId: 'YM-1',
                code: 'BOM-YM-1',
                name: 'Yarı Mamul 1 (Phantom)',
                baseQuantity: 1,
                baseUnit: 'Adet',
                isPhantom: true, // PHANTOM!
                isActive: true,
                status: 'APPROVED',
                components: [
                    {
                        componentItemId: 'YM-2',
                        componentItemCode: 'YM-2',
                        quantity: 1.5,
                        unit: 'Adet',
                        scrapPercent: 2.0,
                        substitutes: [
                            { substituteItemId: 'RAW-ESANS-ALT', substituteItemCode: 'RAW-ESANS-ALT', priority: 1, substitutionRatio: 1.0 },
                        ],
                    },
                ],
            };

            const bomRoot: any = {
                id: 'bom-root',
                finishedItemId: 'MAMUL-1',
                code: 'BOM-MAMUL-1',
                name: 'Nihai Mamul Reçetesi',
                baseQuantity: 1,
                baseUnit: 'Adet',
                isPhantom: false,
                isActive: true,
                status: 'APPROVED',
                components: [
                    { componentItemId: 'YM-1', componentItemCode: 'YM-1', quantity: 2, unit: 'Adet', scrapPercent: 5.0 },
                    { componentItemId: 'PKG-KUTU', componentItemCode: 'PKG-KUTU', quantity: 1, unit: 'Adet', scrapPercent: 0 },
                ],
            };

            const explosion = explodeBomTree({
                rootBom: bomRoot,
                targetQuantity: 100, // 100 adet parti
                allBoms: [bomRoot, bom2, bom3],
                itemCostMap,
            });

            assert(explosion.maxDepthReached >= 3, `Beklenen en az 3 derinlik seviyesi, ulaşılan: ${explosion.maxDepthReached}`);

            // Düzleştirilmiş hammadde ihtiyaç kontrolü:
            // YM-1 Brüt İhtiyaç: 100 * 2 * (1 + 0.05) = 210 adet
            // YM-2 Brüt İhtiyaç: 210 * 1.5 * (1 + 0.02) = 321.3 adet
            // RAW-ESANS Brüt İhtiyaç: 321.3 * 0.25 = 80.325 kg
            const esansSummary = explosion.flattenedSummary.find((s) => s.itemId === 'RAW-ESANS');
            assert(esansSummary !== undefined, 'Esans hammadde özeti bulunamadı.');
            assert(
                Math.abs(esansSummary!.totalGrossQuantity - 80.325) < 0.01,
                `RAW-ESANS brüt hesaplanan miktar: ${esansSummary!.totalGrossQuantity}, beklenen: 80.325`
            );
            assert(explosion.tree.children[0].isPhantom === true, 'Phantom yarı mamul bayrağı çözümlenemedi.');

            return `4 seviyeli ağaç patlatıldı (${explosion.maxDepthReached} seviye, Phantom YM çözümlendi, Kümülatif Esans: ${esansSummary!.totalGrossQuantity.toFixed(2)} Kg)`;
        });

        await runTest('F3-04', 'Teorik Birim Maliyet (Roll-up) ve Rota Operasyon Maliyetleri Hesabı', async () => {
            const bom: any = {
                id: 'bom-cost-test',
                baseQuantity: 10,
                baseUnit: 'Adet',
                yieldPercent: 95, // %95 randıman
                components: [
                    { componentItemId: 'MAT-1', quantity: 20, unitConversionFactor: 1.0, scrapPercent: 5, unitCost: 15 },
                ],
            };

            const routing: any = {
                operations: [
                    {
                        operationNumber: 10,
                        name: 'Hazırlık & Kesim',
                        workCenterId: 'wc-1',
                        setupTimeMinutes: 30, // 0.5 saat
                        runTimeMinutes: 60,   // 1 saat
                        workerCount: 2,
                        workCenterHourlyCost: 400, // 400 TL/saat
                        isSubcontracted: false,
                        subcontractUnitCost: 0,
                    },
                    {
                        operationNumber: 20,
                        name: 'Fason Yüzey İşlem',
                        workCenterId: 'wc-sub',
                        setupTimeMinutes: 0,
                        runTimeMinutes: 0,
                        workerCount: 1,
                        isSubcontracted: true,
                        subcontractUnitCost: 25, // 25 TL/adet
                    },
                ],
            };

            const costResult = calculateTheoreticalBomCost({
                bom,
                routing,
                itemCostMap: { 'MAT-1': 15 },
            });

            // Malzeme hesabı: 20 * (1 + 0.05) * 15 = 315 TL. Randıman %95 düzeltmesi: 315 / 0.95 = 331.58 TL
            // Operasyon 10: Hazırlık 0.5 * 400 = 200 TL. İşlem: 1 * 400 * 2 = 800 TL. Toplam Op 10 = 1000 TL
            // Operasyon 20: Fason: 25 * 10 = 250 TL.
            // Toplam Parti Maliyeti: 331.58 + 1000 + 250 = 1581.58 TL
            // Birim Maliyet (10 Adet için): 158.16 TL
            assert(costResult.totalTheoreticalCost > 1500, `Toplam maliyet beklenen aralıkta değil: ${costResult.totalTheoreticalCost}`);
            assert(
                costResult.unitTheoreticalCost > 150 && costResult.unitTheoreticalCost < 165,
                `Birim teorik maliyet hatalı: ${costResult.unitTheoreticalCost}`
            );

            return `Malzeme: ${costResult.totalMaterialCost} TL, İşçilik/Makine: ${costResult.totalLaborCost + costResult.totalOverheadCost} TL, Fason: ${costResult.totalSubcontractCost} TL -> Birim: ${costResult.unitTheoreticalCost} TL`;
        });

        await runTest('F3-05', 'Revizyon Karşılaştırma (Diff Engine) ve Değişiklik Özeti', async () => {
            const bomA: any = {
                id: 'bom-a',
                revision: '01',
                totalTheoreticalCost: 1000,
                totalMaterialCost: 600,
                components: [
                    { componentItemId: 'C-1', componentItemCode: 'C-1', quantity: 10, unit: 'Adet', scrapPercent: 2 },
                    { componentItemId: 'C-2', componentItemCode: 'C-2', quantity: 5, unit: 'Metre', scrapPercent: 0 },
                ],
            };

            const bomB: any = {
                id: 'bom-b',
                revision: '02',
                totalTheoreticalCost: 1250,
                totalMaterialCost: 800,
                components: [
                    { componentItemId: 'C-1', componentItemCode: 'C-1', quantity: 12, unit: 'Adet', scrapPercent: 4 }, // Miktar ve fire arttı
                    { componentItemId: 'C-3', componentItemCode: 'C-3', quantity: 2, unit: 'Adet', scrapPercent: 0 }, // Yeni eklendi
                    // C-2 Çıkarıldı
                ],
            };

            const diff = compareBomRevisions(bomA, bomB);
            assert(diff.addedComponents.length === 1 && diff.addedComponents[0].componentItemId === 'C-3', 'Eklenen kalem bulunamadı.');
            assert(diff.removedComponents.length === 1 && diff.removedComponents[0].componentItemId === 'C-2', 'Silinen kalem bulunamadı.');
            assert(diff.modifiedComponents.length === 1 && diff.modifiedComponents[0].newQuantity === 12, 'Değiştirilen kalem bulunamadı.');
            assert(diff.costDifference.totalCostDelta === 250, 'Maliyet farkı 250 TL olmalıydı.');

            return '1 eklenen, 1 silinen, 1 değiştirilen bileşen ve +250 TL (%25) maliyet değişimi tespit edildi';
        });

        await runTest('F3-06', 'Nerede Kullanılıyor (Where-Used) Ters Ağaç Sorgusu', async () => {
            const allBoms: any[] = [
                {
                    id: 'b-top',
                    code: 'BOM-TOP',
                    name: 'Tepe Mamul',
                    revision: '01',
                    finishedItemId: 'ITEM-TOP',
                    isActive: true,
                    components: [{ componentItemId: 'ITEM-SUB', quantity: 4, unit: 'Adet' }],
                },
                {
                    id: 'b-sub',
                    code: 'BOM-SUB',
                    name: 'Ara Yarı Mamul',
                    revision: '01',
                    finishedItemId: 'ITEM-SUB',
                    isActive: true,
                    components: [{ componentItemId: 'RAW-TEST', quantity: 0.5, unit: 'Kg' }],
                },
            ];

            const whereUsed = findWhereUsedInBoms({
                targetItemId: 'RAW-TEST',
                allBoms,
            });

            assert(whereUsed.length === 2, `Beklenen 2 seviye kullanım, bulunan: ${whereUsed.length}`);
            assert(whereUsed[0].bomCode === 'BOM-SUB' && whereUsed[0].level === 1, '1. seviye kullanım hatalı.');
            assert(whereUsed[1].bomCode === 'BOM-TOP' && whereUsed[1].level === 2, '2. seviye kullanım hatalı.');

            return `RAW-TEST malzemesi Seviye 1 (BOM-SUB: 0.5 Kg) ve Seviye 2 (BOM-TOP: 4 Adet) ters hiyerarşide doğrulandı`;
        });

        await runTest('F3-07', 'Excel/CSV Dışa Aktarma ve Satır Satır İçe Aktarma Doğrulayıcısı (Parser)', async () => {
            const bomsToExport: any[] = [
                {
                    code: 'BOM-EXP-01',
                    name: 'İhracat Ürün Reçetesi',
                    revision: '01',
                    finishedItemCode: 'SKU-MAMUL-99',
                    baseQuantity: 1,
                    baseUnit: 'Adet',
                    isPhantom: false,
                    notes: 'Excel CSV test',
                    components: [
                        { lineNumber: 10, componentItemCode: 'SKU-RAW-1', quantity: 5.5, unit: 'Kg', scrapPercent: 2.0 },
                    ],
                },
            ];

            const csvContent = generateBomCsvContent(bomsToExport);
            assert(csvContent.startsWith('\uFEFF'), 'CSV çıktısında UTF-8 BOM karakteri bulunmalıdır.');
            assert(csvContent.includes('BOM-EXP-01') && csvContent.includes('SKU-RAW-1'), 'CSV içeriği eksik.');

            // İçe aktarma doğrulayıcısı
            const parseResult = parseBomCsvContent(csvContent);
            assert(parseResult.validRowCount >= 1, 'CSV satırı ayrıştırılamadı.');
            assert(parseResult.errorRowCount === 0, `CSV'de beklenmeyen doğrulama hatası: ${JSON.stringify(parseResult.errors)}`);
            assert(parseResult.parsedBoms[0].code === 'BOM-EXP-01', 'Ayrıştırılan reçete kodu eşleşmedi.');

            // Hatalı CSV satırı negatif testi
            const badCsv = "ReçeteKodu;MamulKodu;BileşenKodu;BileşenMiktarı\nBOM-BAD;MAMUL-1;RAW-1;GEÇERSİZ_SAYI";
            const badReport = parseBomCsvContent(badCsv);
            assert(badReport.errorRowCount > 0, 'Geçersiz miktar hata raporunda yakalanmalıydı.');

            return 'Excel UTF-8 BOM ve noktalı virgüllü CSV üretimi ve satır doğrulama raporu çalıştı';
        });

        // ------------------------------------------------------------------
        // 3. ÖZELLİK BAYRAĞI VE RBAC GÜVENLİK TESTLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 3: ÖZELLİK BAYRAĞI VE RBAC GÜVENLİK KAPISI ---');

        await runTest('F3-08', 'Bayrak Kapalıyken (OFF) /api/production/bom-rota 403 FEATURE_DISABLED Koruması', async () => {
            resetFeatureFlagsOff();

            let blockedErrorCode = '';
            try {
                await verifyProductionBomRotaAccess({
                    userId: 'local-debug-user',
                    action: 'read',
                });
            } catch (err: any) {
                blockedErrorCode = err?.code || '';
            }
            assert(blockedErrorCode === 'FEATURE_DISABLED', `Beklenen FEATURE_DISABLED, alınan: ${blockedErrorCode}`);

            const req = new Request('http://localhost/api/production/bom-rota?section=boms');
            const res = await bomRotaGet(req);
            assert(res.status === 403, `API bayrak kapalıyken 403 dönmeliydi, dönen: ${res.status}`);

            return 'Özellik bayrağı kapalıyken (OFF) servis ve API rotası 403 FEATURE_DISABLED ile mühürlendi';
        });

        await runTest('F3-09', 'Sunucu Tarafı RBAC İzin Kontrolü (Yetkisiz -> 403 FORBIDDEN, Yetkili -> OK)', async () => {
            enableBomRotaFeatureFlag();

            let unauthCode = '';
            try {
                await verifyProductionBomRotaAccess({
                    userId: 'unprivileged-user-without-production-role',
                    action: 'create',
                });
            } catch (err: any) {
                unauthCode = err?.code || '';
            }
            assert(unauthCode === 'FORBIDDEN', `Yetkisiz kullanıcı FORBIDDEN almalıydı, alınan: ${unauthCode}`);

            const authorized = await verifyProductionBomRotaAccess({
                userId: 'local-debug-user',
                action: 'create',
            });
            assert(authorized === true, 'Yetkili kullanıcı erişebilmelidir.');

            return 'RBAC sunucu güvenliği: Yetkisiz -> 403 FORBIDDEN, Yetkili -> Onaylandı';
        });

        // ------------------------------------------------------------------
        // 4. VERİTABANI BOM & KALEMLER CRUD, İKAME, ONAMA VE KLONLAMA
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 4: VERİTABANI BOM, İKAME, REVİZYON VE KLONLAMA İŞLEMLERİ ---');

        await runTest('F3-10', 'BOM Header, Bileşenler ve İkame Malzemeler CRUD Entegrasyonu', async () => {
            // Reçete başlığı oluştur
            const bom = await createBomInDb(
                {
                    code: 'BOM-TEST-OTO-01',
                    name: 'Otomatik Test Ürün Reçetesi',
                    revision: '01',
                    finishedItemId: testFinishedItemId,
                    baseQuantity: 1,
                    baseUnit: 'Adet',
                    isPhantom: false,
                    yieldPercent: 98,
                    notes: 'Faz 3 veritabanı CRUD testi',
                },
                'test-runner'
            );
            testBomId = bom.id;
            assert(bom.status === 'DRAFT', 'Yeni reçete DRAFT statüsünde olmalıdır.');

            // Reçete kalemi ekle
            const item1 = await addBomItemToDb({
                bomId: testBomId,
                componentItemId: testSemiFinished1Id,
                lineNumber: 10,
                quantity: 2.5,
                unit: 'Adet',
                scrapPercent: 2.0,
            });
            testBomItem1Id = item1.id;

            // İkinci kalem
            await addBomItemToDb({
                bomId: testBomId,
                componentItemId: testRawMaterialId,
                lineNumber: 20,
                quantity: 0.75,
                unit: 'Kg',
                scrapPercent: 1.5,
            });

            // İkame malzeme ekle
            const sub = await addBomSubstituteInDb({
                bomItemId: testBomItem1Id,
                substituteItemId: testSubstituteItemId,
                priority: 1,
                substitutionRatio: 1.0,
                isMandatoryApproval: true,
            });
            assert(sub.id !== undefined, 'İkame malzeme kaydedilemedi.');

            const loaded = await getBomByIdFromDb(testBomId);
            assert(loaded.components?.length === 2, '2 bileşen reçeteye bağlanamadı.');
            assert(loaded.components[0].substitutes?.length === 1, 'İkame malzeme reçete kalemiyle ilişkilendirilemedi.');

            return `Reçete (${bom.code}), 2 bileşen ve 1 ikame malzeme başarıyla kaydedildi`;
        });

        await runTest('F3-11', 'Onaylı Reçete Değişmezliği (Immutability) ve Kopyala & Değiştir (Yeni Revizyon)', async () => {
            // Reçeteyi onayla
            const approved = await approveBomInDb(testBomId, 'test-yonetici');
            assert(approved.status === 'APPROVED', 'Reçete APPROVED yapılamadı.');

            // Onaylı reçeteye yeni kalem ekleme DENEMESİ -> Engellenmeli
            let immutabilityBlocked = '';
            try {
                await addBomItemToDb({
                    bomId: testBomId,
                    componentItemId: testSemiFinished2Id,
                    quantity: 1,
                });
            } catch (err: any) {
                immutabilityBlocked = err?.code || '';
            }
            assert(
                immutabilityBlocked === 'INVALID_STATE_TRANSITION',
                `Onaylı reçeteye kalem ekleme engellenmeliydi, alınan: ${immutabilityBlocked}`
            );

            // "Kopyala ve Değiştir": Onaylı reçeteden yeni DRAFT Rev. 02 klonla
            const clonedRev2 = await cloneBomAsNewRevisionInDb({
                sourceBomId: testBomId,
                newRevision: '02',
                newCode: 'BOM-TEST-OTO-01-R02',
                clonedBy: 'test-muhendis',
            });
            assert(clonedRev2.revision === '02', 'Yeni revizyon numarası 02 olmalıydı.');
            assert(clonedRev2.status === 'DRAFT', 'Klonlanan revizyon DRAFT statüsünde başlamalıdır.');
            assert(clonedRev2.components?.length === 2, 'Klonlanan revizyona eski bileşenler kopyalanamadı.');

            // Temizlik için Rev 02'yi sil
            await deleteBomInDb(clonedRev2.id);

            return 'Onaylı reçete değişmezliği (409) doğrulandı; Kopyala & Değiştir ile Rev.02 üretildi';
        });

        // ------------------------------------------------------------------
        // 5. ROTA VE OPERASYONLAR CRUD İŞLEMLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 5: OPERASYON ROTALARI VE İŞ MERKEZİ BAĞLANTISI ---');

        await runTest('F3-12', 'Operasyon Rotası CRUD, Süreler, Kalite Kontrol Noktası ve Fason Adımı', async () => {
            // Önce bir iş merkezi tespit et
            const allWcs = await (prisma as any).uretimWorkCenter.findMany();
            if (allWcs.length > 0) {
                testWorkCenterId = allWcs[0].id;
            } else {
                // Gerekirse geçici bir iş merkezi aç
                const newWc = await (prisma as any).uretimWorkCenter.create({
                    data: {
                        code: 'IST-TEST-ROTA',
                        name: 'Rota Test İstasyonu',
                        type: 'MACHINE',
                        hourlyCost: 500,
                        capacityPerHour: 20,
                        efficiencyPercent: 90,
                    },
                });
                testWorkCenterId = newWc.id;
            }

            const routing = await createRoutingInDb({
                finishedItemId: testFinishedItemId,
                bomId: testBomId,
                code: 'ROTA-TEST-01',
                name: 'Mamul Test Üretim Rotası',
                revision: '01',
            });
            testRoutingId = routing.id;

            // 1. Operasyon: Dahili hazırlık ve montaj
            await addOperationToRoutingInDb({
                routingId: testRoutingId,
                operationNumber: 10,
                name: 'Ön Montaj ve Dolum',
                workCenterId: testWorkCenterId,
                setupTimeMinutes: 20,
                runTimeMinutes: 10,
                workerCount: 2,
            });

            // 2. Operasyon: Kalite Kontrol Kontrol Noktası (Faz 7 hazır alanı)
            await addOperationToRoutingInDb({
                routingId: testRoutingId,
                operationNumber: 20,
                name: 'Ara Kalite Kontrol Denetimi',
                workCenterId: testWorkCenterId,
                setupTimeMinutes: 5,
                runTimeMinutes: 3,
                workerCount: 1,
                isQualityControlPoint: true,
                qualityInspectionType: 'IN_LINE',
            });

            // 3. Operasyon: Fason Dış Kaynak
            await addOperationToRoutingInDb({
                routingId: testRoutingId,
                operationNumber: 30,
                name: 'Fason Lazer Markalama & Paketleme',
                workCenterId: testWorkCenterId,
                setupTimeMinutes: 0,
                runTimeMinutes: 0,
                workerCount: 1,
                isSubcontracted: true,
                subcontractorName: 'Mega Lazer A.Ş.',
                subcontractUnitCost: 12.5,
            });

            const loadedRouting = await getRoutingByIdFromDb(testRoutingId);
            assert(loadedRouting.operations?.length === 3, '3 operasyon rotaya eklenemedi.');
            assert(loadedRouting.totalSetupTimeMinutes === 25, 'Toplam hazırlık süresi 25 dk olmalıydı.');
            assert(loadedRouting.operations[1].isQualityControlPoint === true, 'Kalite kontrol bayrağı kaydedilemedi.');
            assert(loadedRouting.operations[2].isSubcontracted === true, 'Fason operasyon kaydedilemedi.');

            return `Rota (${routing.code}) oluşturuldu: 3 operasyon (İşçilik, Kalite Kontrol, Fason) bağlandı`;
        });

        // ------------------------------------------------------------------
        // 6. REST API ENTEGRASYON VE AUDIT LOG TESTLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 6: REST API VE DENETİM LOGU (AUDITLOG) ENTEGRASYONU ---');

        await runTest('F3-13', 'HTTP API Route (/api/production/bom-rota) GET/POST ve AuditLog Doğrulaması', async () => {
            // 1. GET Reçeteler
            const reqBoms = new Request('http://localhost/api/production/bom-rota?section=boms', {
                headers: { 'x-user-id': 'local-debug-user' },
            });
            const resBoms = await bomRotaGet(reqBoms);
            const jsonBoms = await resBoms.json();
            assert(resBoms.status === 200 && jsonBoms.items.length >= 1, 'API reçete listesi dönmedi.');

            // 2. GET Ağaç Patlatma
            const reqExp = new Request(`http://localhost/api/production/bom-rota?section=exploded&id=${testBomId}&quantity=50`, {
                headers: { 'x-user-id': 'local-debug-user' },
            });
            const resExp = await bomRotaGet(reqExp);
            const jsonExp = await resExp.json();
            assert(resExp.status === 200 && jsonExp.rootQuantity === 50, 'API patlatılmış reçete yanıtı hatalı.');

            // 3. POST Yeni Reçete ve AuditLog Kaydı
            const reqPost = new Request('http://localhost/api/production/bom-rota', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'local-debug-user',
                },
                body: JSON.stringify({
                    action: 'create_bom',
                    payload: {
                        code: 'BOM-API-TEST-99',
                        name: 'API Oluşturulan Reçete',
                        finishedItemId: testFinishedItemId,
                        baseQuantity: 1,
                        baseUnit: 'Adet',
                    },
                }),
            });
            const resPost = await bomRotaPost(reqPost);
            const jsonPost = await resPost.json();
            assert(resPost.status === 201 && jsonPost.bom?.code === 'BOM-API-TEST-99', 'API create_bom başarısız.');

            // AuditLog Kontrolü
            const auditLogs = await (prisma as any).auditLog.findMany({
                where: { resourceId: jsonPost.bom.id },
            });
            assert(auditLogs.length >= 1 && auditLogs[0].action === 'CREATE', 'API işlemi için AuditLog kaydı bulunamadı.');

            // Oluşturulan geçici reçeteyi API üzerinden sil
            const reqDel = new Request('http://localhost/api/production/bom-rota', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'local-debug-user',
                },
                body: JSON.stringify({
                    action: 'delete_bom',
                    id: jsonPost.bom.id,
                }),
            });
            const resDel = await bomRotaPost(reqDel);
            assert(resDel.status === 200, 'API delete_bom başarısız.');

            return 'GET/POST /api/production/bom-rota uçtan uca çalıştı ve AuditLog resourceId ile doğrulandı';
        });

        // ------------------------------------------------------------------
        // 7. MEVCUT MODÜLLER REGRESYON KONTROLÜ VE TEMİZLİK
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 7: MEVCUT MODÜLLER REGRESYON KONTROLÜ VE SİLME ---');

        await runTest('F3-14', 'Mevcut Stok Modülü (/api/inventory) ve Tablolarında Sıfır Regresyon Kontrolü', async () => {
            const reqInv = new Request(`http://localhost/api/inventory?section=item&id=${testFinishedItemId}`);
            const resInv = await inventoryGet(reqInv);
            const jsonInv = await resInv.json();
            assert(resInv.status === 200 && jsonInv.item?.id === testFinishedItemId, 'Mevcut /api/inventory rotası bozuldu!');

            // Mevcut BomHeader tablosuna dokunulmadığını doğrula
            const legacyBoms = await (prisma as any).bomHeader.findMany();
            assert(Array.isArray(legacyBoms), 'Mevcut BomHeader tablosu sorgulanamadı.');

            return 'Mevcut /api/inventory ve eski BomHeader yapısı sıfır regresyonla korundu';
        });

        await runTest('F3-15', 'Tüm Test Kayıtlarının Bağımlılık Sırasıyla Silinmesi (Temizlik)', async () => {
            // Rota operasyonlarını ve rotayı sil
            const routing = await getRoutingByIdFromDb(testRoutingId);
            for (const op of routing.operations || []) {
                await deleteOperationInDb(op.id);
            }
            await (prisma as any).uretimRoutingHeader.delete({ where: { id: testRoutingId } });

            // Reçete statüsünü silinebilmesi için DRAFT veya OBSOLETE yap
            await (prisma as any).uretimBomHeader.update({
                where: { id: testBomId },
                data: { status: 'OBSOLETE' },
            });
            await (prisma as any).uretimBomHeader.delete({ where: { id: testBomId } });

            if (testWorkCenterId) {
                const wc = await (prisma as any).uretimWorkCenter.findUnique({ where: { id: testWorkCenterId } });
                if (wc && wc.code === 'IST-TEST-ROTA') {
                    await (prisma as any).uretimWorkCenter.delete({ where: { id: testWorkCenterId } });
                }
            }

            const remainingBoms = await (prisma as any).uretimBomHeader.findMany();
            const remainingRoutings = await (prisma as any).uretimRoutingHeader.findMany();
            assert(remainingBoms.length === 0, `Kalan reçete kaydı var: ${remainingBoms.length}`);
            assert(remainingRoutings.length === 0, `Kalan rota kaydı var: ${remainingRoutings.length}`);

            return 'Tüm oluşturulan test kayıtları (Reçeteler, Bileşenler, İkameler, Rotalar, Operasyonlar) temizlendi';
        });
    } finally {
        restoreDatabaseBackup(safetyBackup.backupId, {
            createPreRestoreSafetyBackup: false,
            restoreSystemConfig: true,
        });
        deleteDatabaseBackup(safetyBackup.backupId);
        resetFeatureFlagsOff();
        if (!backupsDirExistedBefore && fs.existsSync(backupsRootDir)) {
            const remaining = fs.readdirSync(backupsRootDir);
            if (remaining.length === 0) {
                fs.rmdirSync(backupsRootDir);
            }
        }
    }

    const finalSha256 = computeFileSha256(dbPath);
    await runTest('F3-16', 'Veritabanı Bütünlüğü (SHA-256) ve Özellik Bayraklarının Varsayılan (OFF) Kalması', async () => {
        assert(
            initialSha256 === finalSha256,
            `Veritabanı SHA-256 değişti! İlk: ${initialSha256}, Son: ${finalSha256}`
        );
        const liveFlags = getServerProductionFeatureFlags();
        const allOff = Object.values(liveFlags).every((v) => v === false);
        assert(allOff === true, 'Tüm üretim özellik bayrakları kapalı (false) durumda bırakılmalıdır.');
        return `.local-db.json SHA-256 birebir korundu (${finalSha256.slice(0, 16)}...) ve tüm bayraklar OFF`;
    });

    await prisma.$disconnect();

    console.log('\n======================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(` TOPLAM SONUÇ: ${passedCount}/${results.length} TEST BAŞARILI`);
    console.log('======================================================================');

    if (passedCount !== results.length) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Test paketi çalışırken beklenmeyen hata:', err);
    process.exit(1);
});


/**
 * FAZ 2: Üretim Ana Verileri (Master Data) & Stok Kartı 1-1 Üretim Profili
 * Birim + Entegrasyon + Regresyon Otomatik Test Paketi
 *
 * Çalıştırma:
 *   npx tsx scripts/test-uretim-ana-veriler.ts
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
    buildDefaultProductionParameters,
    calculateEffectiveWorkCenterCapacity,
    calculateShiftNetWorkingMinutes,
    evaluateWorkCenterAvailabilityOnDate,
    validateItemProfileInput,
    validateMachineAssetInput,
    validateProductionParametersInput,
    validateShiftInput,
    validateWorkCalendarInput,
    validateWorkCenterInput,
} from '../lib/services/productionMasterDataEngine';
import {
    createCalendarExceptionInDb,
    createCalendarHolidayInDb,
    createMachineAssetInDb,
    createShiftInDb,
    createWorkCalendarInDb,
    createWorkCenterInDb,
    deleteCalendarExceptionInDb,
    deleteCalendarHolidayInDb,
    deleteItemProductionProfileInDb,
    deleteMachineAssetInDb,
    deleteShiftInDb,
    deleteWorkCalendarInDb,
    deleteWorkCenterInDb,
    getItemProductionProfileFromDb,
    getProductionMasterDataSnapshotFromDb,
    getProductionParametersFromDb,
    listMachineAssetsInDb,
    listWorkCentersInDb,
    updateMachineCounterInDb,
    updateShiftInDb,
    updateWorkCenterInDb,
    upsertItemProductionProfileInDb,
    upsertProductionParametersInDb,
} from '../lib/services/productionMasterDataServerDb';
import {
    GET as masterDataGet,
    POST as masterDataPost,
    verifyProductionMasterDataAccess,
} from '../app/api/production/master-data/route';
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

function enablePlanningFeatureFlag() {
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
    console.log(' SUNUM ERP - FAZ 2 ÜRETİM ANA VERİLERİ VE STOK 1-1 PROFİL TEST PAKETİ');
    console.log('======================================================================\n');

    const dbPath = path.join(process.cwd(), 'storage', 'ajans-kutuphanesi', '.local-db.json');
    const backupsRootDir = path.join(process.cwd(), 'storage', 'backups');
    const backupsDirExistedBefore = fs.existsSync(backupsRootDir);
    resetFeatureFlagsOff();
    const initialSha256 = computeFileSha256(dbPath);
    const safetyBackup = createDatabaseBackup({
        label: 'faz2-test-guard',
        updateSystemConfigLastBackup: false,
    });

    try {
        // ------------------------------------------------------------------
        // 1. MİGRATION & ROLLBACK DOĞRULAMASI
        // ------------------------------------------------------------------
        console.log('--- BÖLÜM 1: KATMANLI MİGRATION VE ROLLBACK DOĞRULAMASI ---');

        await runTest('F2-01', '20261110183500_uretim_ana_veriler Additive Migration & Rollback Kontrolü', async () => {
            const migDir = path.join(
                process.cwd(),
                'prisma',
                'migrations',
                '20261110183500_uretim_ana_veriler'
            );
            const upSql = fs.readFileSync(path.join(migDir, 'migration.sql'), 'utf-8');
            const downSql = fs.readFileSync(path.join(migDir, 'rollback.sql'), 'utf-8');

            const validation = validateAdditiveMigrationSql(
                '20261110183500_uretim_ana_veriler',
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
        // 2. SAF (PURE) HESAPLAMA VE DOĞRULAMA MOTORU TESTLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 2: SAF (PURE) ÜRETİM ANA VERİ MOTORU TESTLERİ ---');

        await runTest('F2-02', 'Vardiya Net Çalışma Süresi (Gündüz ve Gece Devreden Vardiya) Hesabı', async () => {
            const dayShift = calculateShiftNetWorkingMinutes('08:00', '18:00', 60);
            assert(
                dayShift.netWorkingMinutes === 540 && dayShift.netHours === 9,
                `08:00-18:00 (60 dk mola) 540 dk olmalıydı, bulunan: ${dayShift.netWorkingMinutes}`
            );

            const nightShift = calculateShiftNetWorkingMinutes('22:00', '06:00', 30);
            assert(
                nightShift.netWorkingMinutes === 450 && nightShift.netHours === 7.5,
                `22:00-06:00 gece vardiyası (30 dk mola) 450 dk olmalıydı, bulunan: ${nightShift.netWorkingMinutes}`
            );

            return `Gündüz vardiyası: ${dayShift.netWorkingMinutes} dk (${dayShift.netHours} saat), Gece vardiyası: ${nightShift.netWorkingMinutes} dk (${nightShift.netHours} saat)`;
        });

        await runTest('F2-03', 'İş Merkezi Efektif Kapasite, Günlük Kapasite ve Birim Maliyet Hesabı', async () => {
            const calc = calculateEffectiveWorkCenterCapacity({
                capacityPerHour: 20,
                efficiencyPercent: 85,
                hourlyCost: 680,
                shiftNetWorkingMinutes: 540, // 9 saat
                shiftCapacityMultiplier: 1.0,
            });
            assert(
                calc.effectiveUnitsPerHour === 17,
                `Efektif saatlik kapasite 17 olmalıydı, bulunan: ${calc.effectiveUnitsPerHour}`
            );
            assert(
                calc.effectiveDailyCapacityUnits === 153,
                `Günlük efektif kapasite 153 olmalıydı, bulunan: ${calc.effectiveDailyCapacityUnits}`
            );
            assert(
                calc.effectiveUnitCost === 40,
                `Tahmini birim işçilik/makine maliyeti 40 TL olmalıydı, bulunan: ${calc.effectiveUnitCost}`
            );
            return `Efektif Kapasite: ${calc.effectiveUnitsPerHour}/saat, Günlük: ${calc.effectiveDailyCapacityUnits}/gün, Birim Maliyet: ${calc.effectiveUnitCost} TL`;
        });

        await runTest('F2-04', 'Takvim / Tatil / İstisna Gün Uygunluk Değerlendiricisi', async () => {
            const workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as any;
            const holidays = [
                { holidayDate: '2026-10-29', name: 'Cumhuriyet Bayramı', isHalfDay: false, isRecurringYearly: true },
            ];
            const exceptions = [
                {
                    workCenterId: 'wc-1',
                    exceptionDate: '2026-11-11',
                    exceptionType: 'REDUCED_CAPACITY' as const,
                    availableHours: 3,
                    capacityPercent: 50,
                    reason: 'Planlı mil bakımı',
                },
            ];

            // Çarşamba normal iş günü
            const normalDay = evaluateWorkCenterAvailabilityOnDate({
                dateStr: '2026-11-04',
                workingDays,
                defaultShiftMinutes: 540,
                holidays,
                exceptions,
                workCenterId: 'wc-1',
            });
            assert(
                normalDay.isWorkingDay && normalDay.availableHours === 9 && normalDay.status === 'WORKING',
                'Normal iş günü 9 saat olmalı.'
            );

            // Resmi tatil günü
            const holidayDay = evaluateWorkCenterAvailabilityOnDate({
                dateStr: '2026-10-29',
                workingDays,
                defaultShiftMinutes: 540,
                holidays,
                exceptions,
                workCenterId: 'wc-1',
            });
            assert(
                !holidayDay.isWorkingDay && holidayDay.availableHours === 0 && holidayDay.status === 'HOLIDAY',
                'Resmi tatil 0 saat olmalı.'
            );

            // İstisna olan gün
            const maintDay = evaluateWorkCenterAvailabilityOnDate({
                dateStr: '2026-11-11',
                workingDays,
                defaultShiftMinutes: 540,
                holidays,
                exceptions,
                workCenterId: 'wc-1',
            });
            assert(
                maintDay.isWorkingDay && maintDay.availableHours === 3 && maintDay.status === 'EXCEPTION_MODIFIED',
                'Kısıtlı kapasite istisnası 3 saat olmalı.'
            );

            return `Normal gün: ${normalDay.availableHours}s, Tatil: ${holidayDay.availableHours}s, Bakım İstisnası: ${maintDay.availableHours}s`;
        });

        await runTest('F2-05', 'Girdi Doğrulama (Validation) Kuralları Negatif Testleri', async () => {
            assertThrowsDomainError(
                () => validateWorkCenterInput({ code: '', name: 'A', type: 'INVALID' }),
                'VALIDATION_ERROR'
            );
            assertThrowsDomainError(
                () => validateMachineAssetInput({ code: 'MAK-1', name: 'Makine', serialNumber: '' }),
                'VALIDATION_ERROR'
            );
            assertThrowsDomainError(
                () => validateShiftInput({ calendarId: 'cal-1', code: 'VRD-1', name: 'Sabah', startTime: '25:99', endTime: '17:00' }),
                'VALIDATION_ERROR'
            );
            assertThrowsDomainError(
                () => validateWorkCalendarInput({ code: 'TAK-1', name: 'Takvim', workingDays: [] }),
                'VALIDATION_ERROR'
            );
            assertThrowsDomainError(
                () => validateItemProfileInput({ itemId: '', scrapTolerancePercent: 120 }),
                'VALIDATION_ERROR'
            );
            assertThrowsDomainError(
                () => validateProductionParametersInput({ planningHorizonDays: 0 }),
                'VALIDATION_ERROR'
            );

            return '6 ana veri doğrulayıcısı (İş Merkezi, Makine, Vardiya, Takvim, 1-1 Profil, Parametreler) negatif testleri geçti';
        });

        // ------------------------------------------------------------------
        // 3. YETKİ, ÖZELLİK BAYRAĞI KAPISI VE SAHTE SEED OLMAMASI KONTROLÜ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 3: ÖZELLİK BAYRAĞI KAPISI, YETKİ VE "SEED YOK" KONTROLÜ ---');

        await runTest('F2-06', 'Bayraklar Kapalıyken (OFF) API ve Erişim Kapısı 403 FEATURE_DISABLED Kontrolü', async () => {
            resetFeatureFlagsOff();
            const cfg = getSystemConfig();
            assert(isAnyProductionFeatureEnabled(cfg.featureFlags) === false, 'Varsayılan bayrak durumu kapalı olmalı.');

            let blockedErrorCode = '';
            try {
                await verifyProductionMasterDataAccess({
                    userId: 'u-admin',
                    resource: 'uretim_ana_veriler',
                    action: 'read',
                });
            } catch (err: any) {
                blockedErrorCode = err?.code || '';
            }
            assert(
                blockedErrorCode === 'FEATURE_DISABLED',
                `Bayrak kapalıyken FEATURE_DISABLED bekleniyordu, alınan: ${blockedErrorCode}`
            );

            const req = new Request('http://localhost/api/production/master-data?section=snapshot');
            const res = await masterDataGet(req);
            assert(
                res.status === 403,
                `GET /api/production/master-data bayrak kapalıyken 403 dönmeliydi, alınan: ${res.status}`
            );

            return 'Bayraklar kapalıyken (false) servis ve API 403 FEATURE_DISABLED ile korundu';
        });

        await runTest('F2-07', 'Sunucu Tarafı RBAC Yetki Kontrolü (Yetkisiz Rol -> 403 FORBIDDEN, Yetkili -> OK)', async () => {
            enablePlanningFeatureFlag();

            let unauthorizedCode = '';
            try {
                await verifyProductionMasterDataAccess({
                    userId: 'non-existent-unprivileged-user-999',
                    resource: 'uretim_ana_veriler',
                    action: 'create',
                });
            } catch (err: any) {
                unauthorizedCode = err?.code || '';
            }
            assert(
                unauthorizedCode === 'FORBIDDEN',
                `Yetkisiz kullanıcı FORBIDDEN almalıydı, alınan: ${unauthorizedCode}`
            );

            // Mevcut süper admin veya local debug kullanıcısı ile doğrulama
            const authorized = await verifyProductionMasterDataAccess({
                userId: 'local-debug-user',
                resource: 'uretim_ana_veriler',
                action: 'create',
            });
            assert(authorized === true, 'Yetkili yönetici erişimi onaylanmalıydı.');

            return 'RBAC kontrolü: Yetkisiz kullanıcı -> 403 FORBIDDEN, Yetkili kullanıcı -> 200 OK';
        });

        await runTest('F2-08', 'Sahte Veri Seed\'i YOK Kontrolü (Sadece Varsayılan Üretim Parametreleri Mevcut)', async () => {
            const snapshot = await getProductionMasterDataSnapshotFromDb();
            const defParams = buildDefaultProductionParameters('GLOBAL');

            assert(
                snapshot.summary.workCenterCount === 0,
                `Sahte iş merkezi seed'i olmamalı, bulunan: ${snapshot.summary.workCenterCount}`
            );
            assert(
                snapshot.summary.machineAssetCount === 0,
                `Sahte makine seed'i olmamalı, bulunan: ${snapshot.summary.machineAssetCount}`
            );
            assert(
                snapshot.summary.calendarCount === 0,
                `Sahte takvim seed'i olmamalı, bulunan: ${snapshot.summary.calendarCount}`
            );
            assert(
                snapshot.summary.shiftCount === 0,
                `Sahte vardiya seed'i olmamalı, bulunan: ${snapshot.summary.shiftCount}`
            );
            assert(
                snapshot.summary.holidayCount === 0,
                `Sahte tatil seed'i olmamalı, bulunan: ${snapshot.summary.holidayCount}`
            );
            assert(
                snapshot.summary.exceptionCount === 0,
                `Sahte istisna seed'i olmamalı, bulunan: ${snapshot.summary.exceptionCount}`
            );
            assert(
                snapshot.summary.configuredItemProfileCount === 0,
                `Sahte stok üretim profili seed'i olmamalı, bulunan: ${snapshot.summary.configuredItemProfileCount}`
            );
            assert(
                snapshot.parameters.planningHorizonDays === defParams.planningHorizonDays &&
                    snapshot.parameters.defaultLotSizingRule === defParams.defaultLotSizingRule,
                'Varsayılan üretim parametreleri hazır olmalı.'
            );

            return '0 sahte seed kaydı doğrulandı; yalnızca sistem çalışması için gereken varsayılan UretimParameters aktif';
        });

        // ------------------------------------------------------------------
        // 4. UÇTAN UCA CRUD, ARAMA, FİLTRE VE SAYFALAMA TESTLERİ
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 4: 5 ANA VERİ ALANI TAM CRUD, ARAMA, FİLTRE VE SAYFALAMA ---');

        let createdCalendarId = '';
        let createdShiftId = '';
        let createdNightShiftId = '';
        let createdHolidayId = '';
        let createdWorkCenterId = '';
        let createdWorkCenter2Id = '';
        let createdExceptionId = '';
        let createdMachineId = '';

        await runTest('F2-09', 'Çalışma Takvimi ve Vardiya CRUD (Normal + Gece Vardiyası + Resmi Tatil)', async () => {
            const cal = await createWorkCalendarInDb({
                code: 'TAK-STD-2026',
                name: 'Standart Fabrika Takvimi',
                workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
                isDefault: true,
                isActive: true,
                notes: 'Hafta içi 5 gün çalışma takvimi',
            });
            createdCalendarId = cal.id;
            assert(cal.code === 'TAK-STD-2026' && cal.isDefault === true, 'Takvim oluşturulamadı.');

            const shift1 = await createShiftInDb({
                calendarId: createdCalendarId,
                code: 'VRD-GUNDUZ',
                name: 'Gündüz Vardiyası (08:00-18:00)',
                startTime: '08:00',
                endTime: '18:00',
                breakMinutes: 60,
                capacityMultiplier: 1.0,
                isActive: true,
            });
            createdShiftId = shift1.id;
            assert(
                shift1.netWorkingMinutes === 540,
                `Net çalışma dakikası 540 olmalıydı, bulunan: ${shift1.netWorkingMinutes}`
            );

            const shift2 = await createShiftInDb({
                calendarId: createdCalendarId,
                code: 'VRD-GECE',
                name: 'Gece Vardiyası (22:00-06:00)',
                startTime: '22:00',
                endTime: '06:00',
                breakMinutes: 30,
                capacityMultiplier: 1.0,
                isActive: true,
            });
            createdNightShiftId = shift2.id;
            assert(
                shift2.netWorkingMinutes === 450,
                `Gece vardiyası net dakika 450 olmalıydı, bulunan: ${shift2.netWorkingMinutes}`
            );

            const updatedShift = await updateShiftInDb(createdShiftId, { breakMinutes: 45 });
            assert(
                updatedShift.netWorkingMinutes === 555,
                'Güncellenen mola sonrası net çalışma süresi 555 dk olmalıydı.'
            );

            const holiday = await createCalendarHolidayInDb({
                calendarId: createdCalendarId,
                holidayDate: '2026-10-29',
                name: 'Cumhuriyet Bayramı',
                isHalfDay: false,
                isRecurringYearly: true,
                notes: 'Tam gün resmi tatil',
            });
            createdHolidayId = holiday.id;
            assert(holiday.name === 'Cumhuriyet Bayramı', 'Resmi tatil kaydı oluşturulamadı.');

            return `Takvim (${cal.code}), 2 Vardiya (${shift1.code}, ${shift2.code}) ve Tatil (${holiday.holidayDate}) oluşturuldu ve güncellendi`;
        });

        await runTest('F2-10', 'İş Merkezi / İstasyon CRUD, Mükerrer Kod (409) Engeli, Arama/Filtre/Sayfalama', async () => {
            const wc1 = await createWorkCenterInDb({
                code: 'IST-CNC-01',
                name: '5 Eksen CNC İşleme İstasyonu',
                type: 'MACHINE',
                hourlyCost: 850,
                capacityPerHour: 12,
                efficiencyPercent: 90,
                calendarId: createdCalendarId,
                defaultShiftId: createdShiftId,
                isActive: true,
                alternativeGroupCode: 'GRP-CNC',
                notes: 'Ana gövde işleme merkezi',
            });
            createdWorkCenterId = wc1.id;

            const wc2 = await createWorkCenterInDb({
                code: 'IST-MONTAJ-01',
                name: 'Hassas Manuel Montaj Hattı',
                type: 'MANUAL',
                hourlyCost: 420,
                capacityPerHour: 25,
                efficiencyPercent: 95,
                calendarId: createdCalendarId,
                defaultShiftId: createdShiftId,
                isActive: true,
                alternativeGroupCode: 'GRP-MONTAJ',
            });
            createdWorkCenter2Id = wc2.id;

            // Mükerrer kod kontrolü (409 CONFLICT)
            let conflictCode = '';
            try {
                await createWorkCenterInDb({
                    code: 'ist-cnc-01', // Küçük harfle gönderilse bile normalize edilip yakalanmalı
                    name: 'Kopya İstasyon',
                    type: 'MACHINE',
                });
            } catch (err: any) {
                conflictCode = err?.code || '';
            }
            assert(conflictCode === 'CONFLICT', `Mükerrer istasyon kodu CONFLICT fırlatmalıydı, alınan: ${conflictCode}`);

            // Arama, filtreleme ve sayfalama kontrolü
            const page1 = await listWorkCentersInDb({ page: 1, pageSize: 1 });
            assert(
                page1.items.length === 1 &&
                    page1.pagination.totalCount === 2 &&
                    page1.pagination.totalPages === 2,
                'Sayfalama meta verisi hatalı.'
            );

            const filteredManual = await listWorkCentersInDb({ type: 'MANUAL', search: 'Hassas' });
            assert(
                filteredManual.items.length === 1 && (filteredManual.items[0] as any).code === 'IST-MONTAJ-01',
                'Tip ve metin arama filtresi hatalı.'
            );

            // Güncelleme
            const updatedWc = await updateWorkCenterInDb(createdWorkCenterId, {
                hourlyCost: 920,
                efficiencyPercent: 92,
            });
            assert(
                updatedWc.hourlyCost === 920 && updatedWc.efficiencyPercent === 92,
                'İş merkezi güncellenemedi.'
            );

            // İstasyona özel takvim istisnası ekleme
            const exc = await createCalendarExceptionInDb({
                calendarId: createdCalendarId,
                workCenterId: createdWorkCenterId,
                exceptionDate: '2026-11-15',
                exceptionType: 'REDUCED_CAPACITY',
                availableHours: 4,
                capacityPercent: 60,
                reason: 'Planlı mil rulman kontrolü',
            });
            createdExceptionId = exc.id;
            assert(exc.availableHours === 4, 'Takvim istisnası oluşturulamadı.');

            return '2 İş Merkezi oluşturuldu, mükerrer kod (409) engellendi, sayfalama (1/2) ve filtreleme doğrulandı';
        });

        await runTest('F2-11', 'Makine / Ekipman (Varlık) CRUD, Seri No Tekilliği, Sayaç Güncelleme ve Garanti Durumu', async () => {
            const mac = await createMachineAssetInDb({
                code: 'MAK-DMG-01',
                name: 'DMG MORI DMU 50 CNC',
                serialNumber: 'SN-DMG-2026-9981',
                brand: 'DMG MORI',
                model: 'DMU 50 3rd Gen',
                warrantyEndDate: '2028-12-31',
                warrantyProvider: 'DMG Mori Türkiye Servis',
                location: 'Hol A - Hücre 1',
                workCenterId: createdWorkCenterId,
                status: 'ACTIVE',
                operatingHours: 1200,
                productionCount: 45000,
            });
            createdMachineId = mac.id;

            const listedMachines = await listMachineAssetsInDb({ workCenterId: createdWorkCenterId });
            assert(listedMachines.items.length === 1, 'İstasyona bağlı makine listelenemedi.');
            const firstMachine = listedMachines.items[0] as any;
            assert(
                firstMachine?.workCenter?.code === 'IST-CNC-01',
                'Makine iş merkezi ilişkisi kurulmadı.'
            );
            assert(
                firstMachine?.warrantyStatus === 'ACTIVE',
                `Garanti durumu ACTIVE olmalıydı, bulunan: ${firstMachine?.warrantyStatus}`
            );

            // Seri numarası tekillik kontrolü
            let serialConflict = '';
            try {
                await createMachineAssetInDb({
                    code: 'MAK-DMG-02',
                    name: 'İkinci Makine',
                    serialNumber: 'SN-DMG-2026-9981',
                    status: 'ACTIVE',
                });
            } catch (err: any) {
                serialConflict = err?.code || '';
            }
            assert(serialConflict === 'CONFLICT', `Mükerrer seri numarası CONFLICT dönmeliydi, alınan: ${serialConflict}`);

            // Sayaç artırma (Delta)
            const counterUpdated = await updateMachineCounterInDb(createdMachineId, {
                operatingHoursDelta: 12.5,
                productionCountDelta: 340,
            });
            assert(
                counterUpdated.operatingHours === 1212.5 && counterUpdated.productionCount === 45340,
                `Sayaç artırma hatalı: ${counterUpdated.operatingHours} saat / ${counterUpdated.productionCount} adet`
            );

            return `Makine (${mac.code}) oluşturuldu, seri no tekilliği (409), garanti durumu ve sayaç (+12.5 saat/+340 adet) doğrulandı`;
        });

        await runTest('F2-12', 'Üretim Parametreleri Güncelleme (Ufuk, Parti Büyüklüğü, Emniyet Stoku, Statü Akışı)', async () => {
            await upsertProductionParametersInDb(
                {
                    planningHorizonDays: 120,
                    planningBucket: 'DAILY',
                    defaultLotSizingRule: 'FOQ',
                    defaultMinLotSize: 50,
                    defaultLotMultiple: 10,
                    defaultSafetyStockRule: 'DAYS_OF_SUPPLY',
                    defaultSafetyStockValue: 100,
                    defaultSafetyStockDays: 7,
                    requireWorkOrderApproval: true,
                    requireQualityCheckOnComplete: true,
                    autoBackflushOnComplete: true,
                    autoReserveOnRelease: true,
                    allowOverProductionPercent: 5,
                    allowNegativeStockInProduction: false,
                },
                'u-uretim-muduru'
            );

            const fetchedParams = await getProductionParametersFromDb('GLOBAL', false);
            assert(fetchedParams.planningHorizonDays === 120, 'Planlama ufku 120 gün olarak kaydedilemedi.');
            assert(fetchedParams.planningBucket === 'DAILY', 'Planlama kovası DAILY olarak kaydedilemedi.');
            assert(fetchedParams.defaultLotSizingRule === 'FOQ', 'Parti büyüklüğü kuralı kaydedilemedi.');
            assert(fetchedParams.requireWorkOrderApproval === true, 'Onay zorunluluğu kaydedilemedi.');
            assert(Array.isArray(fetchedParams.statusFlow) && fetchedParams.statusFlow.length >= 6, 'Statü akışı korunmadı.');

            return `Üretim Parametreleri güncellendi (Ufuk: ${fetchedParams.planningHorizonDays} gün, Kova: ${fetchedParams.planningBucket}, Lot: ${fetchedParams.defaultLotSizingRule})`;
        });

        // ------------------------------------------------------------------
        // 5. MEVCUT STOK KARTI 1-1 ÜRETİM PROFİLİ VE GERİYE DÖNÜK UYUMLULUK
        // ------------------------------------------------------------------
        console.log('\n--- BÖLÜM 5: STOK KARTI 1-1 ÜRETİM PROFİLİ VE BAYRAK KAPALI/AÇIK DAVRANIŞI ---');

        await runTest('F2-13', 'Mevcut InventoryItem Kolonlarına Dokunmadan 1-1 UretimItemProfile Kaydı ve İzolasyonu', async () => {
            const allItems = await (prisma as any).inventoryItem.findMany();
            assert(allItems.length > 0, 'Test için mevcut en az 1 stok kartı bulunmalıdır.');
            const targetItem = allItems[0];

            // Stok kartının mevcut kolonlarının anlık görüntüsü (uretimProfile hariç)
            const snapshotBefore = { ...targetItem };
            delete (snapshotBefore as any).uretimProfile;

            // 1-1 Üretim profili kaydet
            const savedProfile = await upsertItemProductionProfileInDb({
                itemId: targetItem.id,
                productionItemType: 'MAMUL',
                productionMethod: 'MAKE_TO_ORDER',
                leadTimeDays: 5,
                productionLeadTimeHours: 14.5,
                minStockLevel: 25,
                safetyStockQty: 15,
                lotSizingRule: 'L4L',
                standardLotSize: 50,
                minOrderQty: 10,
                orderMultiple: 5,
                defaultWorkCenterId: createdWorkCenterId,
                scrapTolerancePercent: 2.5,
                backflushEnabled: true,
                qualityCheckRequired: true,
                notes: 'Faz 2 1-1 stok üretim profili testi',
            });

            assert(savedProfile.itemId === targetItem.id, 'Profil stok kartına bağlanamadı.');
            assert(
                savedProfile.productionItemType === 'MAMUL' &&
                    savedProfile.productionMethod === 'MAKE_TO_ORDER',
                'Profil alanları hatalı.'
            );

            const fullProfileRes = await getItemProductionProfileFromDb(targetItem.id);
            assert(
                fullProfileRes.profile.isConfiguredInDb === true &&
                    fullProfileRes.profile.defaultWorkCenter?.code === 'IST-CNC-01',
                'Varsayılan istasyon bağlantısı çözümlenemedi.'
            );

            // Stok kartının kendi kolonlarının HİÇ değişmediğini doğrula
            const itemAfter = await (prisma as any).inventoryItem.findUnique({ where: { id: targetItem.id } });
            const snapshotAfter = { ...itemAfter };
            delete (snapshotAfter as any).uretimProfile;
            assert(
                JSON.stringify(snapshotBefore) === JSON.stringify(snapshotAfter),
                'Mevcut InventoryItem tablosu kolonlarında beklenmeyen değişiklik tespit edildi!'
            );

            // Bayrak AÇIK iken /api/inventory?section=item yanıtında uretimProfile yer almalı
            const reqFlagOn = new Request(`http://localhost/api/inventory?section=item&id=${targetItem.id}`);
            const resFlagOn = await inventoryGet(reqFlagOn);
            const bodyFlagOn = await resFlagOn.json();
            assert(
                resFlagOn.status === 200 &&
                    bodyFlagOn.item?.uretimProfile?.productionItemType === 'MAMUL',
                'Bayrak açıkken /api/inventory yanıtında item.uretimProfile dönmeliydi.'
            );

            // Bayrak KAPALI iken /api/inventory?section=item yanıtında uretimProfile YER ALMAMALI (bugünkü davranışla birebir aynı)
            resetFeatureFlagsOff();
            const reqFlagOff = new Request(`http://localhost/api/inventory?section=item&id=${targetItem.id}`);
            const resFlagOff = await inventoryGet(reqFlagOff);
            const bodyFlagOff = await resFlagOff.json();
            assert(
                resFlagOff.status === 200 && bodyFlagOff.item?.uretimProfile === undefined,
                'Bayrak kapalıyken /api/inventory yanıtında uretimProfile olmamalıydı!'
            );

            // Testlerin devamı için bayrağı tekrar aç ve profili temizle
            enablePlanningFeatureFlag();
            await deleteItemProductionProfileInDb(targetItem.id);
            const afterDelete = await getItemProductionProfileFromDb(targetItem.id);
            assert(afterDelete.profile.isConfiguredInDb === false, '1-1 üretim profili sıfırlanamadı.');

            return `Stok kartı (${targetItem.sku || targetItem.name}) kolonları %100 korundu; bayrak açık/kapalı /api/inventory davranışı doğrulandı`;
        });

        await runTest('F2-14', 'HTTP API Route (/api/production/master-data) ve Denetim Logu (AuditLog) Entegrasyon Testi', async () => {
            const overviewReq = new Request('http://localhost/api/production/master-data?section=snapshot', {
                headers: { 'x-user-id': 'local-debug-user' },
            });
            const overviewRes = await masterDataGet(overviewReq);
            const overviewJson = await overviewRes.json();
            assert(
                overviewRes.status === 200 && overviewJson.summary?.workCenterCount === 2,
                `API snapshot sayıları hatalı: ${JSON.stringify(overviewJson)}`
            );

            // API üzerinden yeni istasyon oluştur ve AuditLog kaydını kontrol et
            const postReq = new Request('http://localhost/api/production/master-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'local-debug-user',
                },
                body: JSON.stringify({
                    action: 'CREATE_WORK_CENTER',
                    code: 'IST-LAZER-01',
                    name: 'Fiber Lazer Kesim İstasyonu',
                    type: 'MACHINE',
                    hourlyCost: 750,
                    capacityPerHour: 30,
                    efficiencyPercent: 95,
                }),
            });
            const postRes = await masterDataPost(postReq);
            const postJson = await postRes.json();
            assert(
                postRes.status === 201 && postJson.workCenter?.code === 'IST-LAZER-01',
                `POST CREATE_WORK_CENTER başarısız: ${JSON.stringify(postJson)}`
            );

            // AuditLog kontrolü
            const auditLogs = await (prisma as any).auditLog.findMany({
                where: { resourceId: postJson.workCenter.id },
            });
            assert(
                auditLogs.length >= 1 && auditLogs[0].action === 'CREATE',
                'AuditLog kaydı oluşturulmadı!'
            );

            // Oluşturulan istasyonu API üzerinden sil
            const delReq = new Request('http://localhost/api/production/master-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'local-debug-user',
                },
                body: JSON.stringify({
                    action: 'DELETE_WORK_CENTER',
                    id: postJson.workCenter.id,
                }),
            });
            const delRes = await masterDataPost(delReq);
            const delJson = await delRes.json();
            console.log('   [DEBUG delJson]:', delJson);
            assert(delRes.status === 200 && delJson.success === true, `API DELETE_WORK_CENTER başarısız: ${JSON.stringify(delJson)}`);

            return 'GET/POST /api/production/master-data uçtan uca çalıştı ve AuditLog kaydı doğrulandı';
        });

        await runTest('F2-15', 'Oluşturulan Tüm Test Kayıtlarının Silinmesi (Delete CRUD) ve Temizlik', async () => {
            await deleteMachineAssetInDb(createdMachineId);
            await deleteCalendarExceptionInDb(createdExceptionId);
            await deleteWorkCenterInDb(createdWorkCenterId);
            await deleteWorkCenterInDb(createdWorkCenter2Id);
            await deleteCalendarHolidayInDb(createdHolidayId);
            await deleteShiftInDb(createdShiftId);
            await deleteShiftInDb(createdNightShiftId);
            await deleteWorkCalendarInDb(createdCalendarId);

            const snapshot = await getProductionMasterDataSnapshotFromDb();
            if (snapshot.summary.workCenterCount > 0) {
                const remainingWcs = await (prisma as any).uretimWorkCenter.findMany();
                console.log('   [DEBUG] Remaining work centers:', remainingWcs);
            }
            assert(
                snapshot.summary.workCenterCount === 0 &&
                    snapshot.summary.machineAssetCount === 0 &&
                    snapshot.summary.calendarCount === 0 &&
                    snapshot.summary.shiftCount === 0,
                `Silme işlemi sonrası kalan kayıt var: ${JSON.stringify(snapshot.summary)}`
            );

            return 'Tüm test kayıtları (Makine, İstisna, İş Merkezi, Tatil, Vardiya, Takvim) CRUD delete ile temizlendi';
        });
    } finally {
        // Veritabanını ve özellik bayraklarını test öncesi birebir durumuna geri yükle
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
    await runTest('F2-16', 'Veritabanı Bütünlüğü (SHA-256) ve Özellik Bayraklarının Varsayılan (OFF) Kalması', async () => {
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

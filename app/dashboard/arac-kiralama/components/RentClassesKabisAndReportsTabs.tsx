'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RENT_INVOICE_TIMING_LABELS,
  RENT_KABIS_NOTIFICATION_TYPE_LABELS,
  RENT_KABIS_STATUS_BADGES,
  RENT_KABIS_STATUS_LABELS,
  RENT_SEASON_LABELS,
  type RentSeasonType,
} from '@/lib/tourism/rentacar/constantsAndHelpers';

export function RentClassesTariffsAndPolicyTab({
  classes,
  tariffs,
  extraServices,
  policyConfig,
  demoCompanyId,
  onRefresh,
}: {
  classes: any[];
  tariffs: any[];
  extraServices: any[];
  policyConfig: any;
  demoCompanyId?: string;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [templateText, setTemplateText] = useState<string>(
    policyConfig?.contractTemplateBodyText || ''
  );
  const [invoiceTimingMode, setInvoiceTimingMode] = useState<string>(
    policyConfig?.invoiceTimingMode || 'ON_RETURN_COMPLETION'
  );
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(
    Number(policyConfig?.gracePeriodMinutes ?? 60)
  );
  const [missingFuelRatePerPctTry, setMissingFuelRatePerPctTry] = useState<number>(
    Number(policyConfig?.missingFuelRatePerPctTry ?? 32)
  );
  const [adminServiceFeeForPenaltyTry, setAdminServiceFeeForPenaltyTry] = useState<number>(
    Number(policyConfig?.adminServiceFeeForPenaltyTry ?? 250)
  );

  // Hızlı Tarife Güncelleme / Ekleme
  const [newTariffName, setNewTariffName] = useState<string>('');
  const [newTariffClassId, setNewTariffClassId] = useState<string>(classes[0]?.id || '');
  const [newTariffDailyRate, setNewTariffDailyRate] = useState<number>(2400);
  const [newTariffKmLimit, setNewTariffKmLimit] = useState<number>(250);

  const handleSavePolicy = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_policy_config',
          demoCompanyId,
          invoiceTimingMode,
          gracePeriodMinutes,
          missingFuelRatePerPctTry,
          adminServiceFeeForPenaltyTry,
          contractTemplateBodyText: templateText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ayarlar kaydedilemedi.');
      }
      toast.success('Kiralama kuralları ve sözleşme şablonu kaydedildi.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTariffName.trim() || !newTariffClassId) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_tariff',
          demoCompanyId,
          name: newTariffName,
          vehicleClassId: newTariffClassId,
          dailyRateTry: newTariffDailyRate,
          dailyKmLimit: newTariffKmLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tarife kaydedilemedi.');
      }
      toast.success('Yeni fiyat tarifesi eklendi.');
      setNewTariffName('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* 1. Araç Sınıfları */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Araç Sınıfları &amp; Yaş / Ehliyet Yılı / Km Kuralları ({classes.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {classes.map((cls: any) => (
            <div
              key={cls.id}
              className="bg-[#080A09] border border-white/[0.08] rounded-xl p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{cls.name}</span>
                <span className="font-mono text-[11px] text-[#34D399]">{cls.code}</span>
              </div>
              <div className="text-[11px] text-zinc-400">{cls.description}</div>
              <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] font-mono text-zinc-300">
                <div>Min Yaş: {cls.minDriverAge}</div>
                <div>Min Ehliyet: {cls.minLicenseYears} yıl</div>
                <div>Günlük Km: {cls.dailyKmLimit} km</div>
                <div>Aşım: ₺{cls.extraKmUnitPriceTry}/km</div>
                <div>Depozito: ₺{Number(cls.defaultDepositTry).toLocaleString('tr-TR')}</div>
                <div>Geç İade: ₺{cls.lateReturnHourlyTry}/sa</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Fiyat Tarifeleri & Ek Hizmetler */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Fiyat Tarifeleri (Günlük / Haftalık / Aylık / Sezonluk — {tariffs.length})
          </h3>

          <form onSubmit={handleAddTariff} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              value={newTariffName}
              onChange={(e) => setNewTariffName(e.target.value)}
              placeholder="Yeni tarife adı..."
              className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-1.5 text-white"
            />
            <select
              value={newTariffClassId}
              onChange={(e) => setNewTariffClassId(e.target.value)}
              className="bg-[#080A09] border border-white/[0.1] rounded-xl px-2 py-1.5 text-white"
            >
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newTariffDailyRate}
              onChange={(e) => setNewTariffDailyRate(Number(e.target.value))}
              placeholder="Günlük TRY"
              className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-1.5 text-white font-mono"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 rounded-xl bg-[#34D399] text-[#061811] font-semibold cursor-pointer"
            >
              + Tarife Ekle
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] text-zinc-400">
                  <th className="py-2 px-2">Kod / Tarife Adı</th>
                  <th className="py-2 px-2">Sezon</th>
                  <th className="py-2 px-2">Günlük</th>
                  <th className="py-2 px-2">Haftalık (7+g)</th>
                  <th className="py-2 px-2">Aylık (30+g)</th>
                  <th className="py-2 px-2">Km / Aşım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {tariffs.map((t: any) => (
                  <tr key={t.id}>
                    <td className="py-2 px-2">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400">{t.code}</div>
                    </td>
                    <td className="py-2 px-2 text-[11px] text-zinc-300">
                      {RENT_SEASON_LABELS[t.seasonType as RentSeasonType] || t.seasonType}
                    </td>
                    <td className="py-2 px-2 font-mono text-[#34D399]">
                      ₺{Number(t.dailyRateTry).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-2 font-mono text-zinc-200">
                      ₺{Number(t.weeklyDailyRateTry).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-2 font-mono text-zinc-200">
                      ₺{Number(t.monthlyDailyRateTry).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-zinc-400">
                      {t.dailyKmLimit} km (₺{t.extraKmRateTry})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Ek Hizmetler &amp; Güvence Paketleri ({extraServices.length})
          </h3>
          <div className="space-y-2">
            {extraServices.map((ex: any) => (
              <div
                key={ex.id}
                className="bg-[#080A09] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">{ex.name}</div>
                  <div className="text-[11px] text-zinc-400">{ex.description}</div>
                </div>
                <div className="font-mono font-semibold text-[#34D399]">
                  ₺{Number(ex.unitPriceTry).toLocaleString('tr-TR')}/
                  {ex.pricingType === 'DAILY' ? 'gün' : 'kira'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Ayarlanabilir Kurallar & Sözleşme Şablon Metni (Hukuki İnceleme Uyarılı) */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Ayarlanabilir Hesaplama Kuralları, Faturalama Zamanlaması &amp; Sözleşme Şablonu
            </h3>
            <p className="text-[11px] text-amber-300 mt-0.5">
              Hukuki İnceleme Notu: {policyConfig?.legalReviewNoticeText}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSavePolicy}
            className="px-4 py-2 rounded-xl bg-[#34D399] text-[#061811] font-semibold cursor-pointer"
          >
            {submitting ? 'Kaydediliyor...' : 'Kuralları ve Şablonu Kaydet'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-zinc-400 mb-1">Faturalama Zamanlaması</label>
            <select
              value={invoiceTimingMode}
              onChange={(e) => setInvoiceTimingMode(e.target.value)}
              className="w-full bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
            >
              {Object.entries(RENT_INVOICE_TIMING_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Gecikme Hoşgörü Süresi (Dk)</label>
            <input
              type="number"
              value={gracePeriodMinutes}
              onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
              className="w-full bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Eksik Yakıt Birim Farkı (TRY / %1)</label>
            <input
              type="number"
              value={missingFuelRatePerPctTry}
              onChange={(e) => setMissingFuelRatePerPctTry(Number(e.target.value))}
              className="w-full bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Ceza/HGS Yansıtma Hizmet Bedeli (TRY)</label>
            <input
              type="number"
              value={adminServiceFeeForPenaltyTry}
              onChange={(e) => setAdminServiceFeeForPenaltyTry(Number(e.target.value))}
              className="w-full bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 mb-1">
            Sözleşme Şablon Metni (Değişkenler: {'{{CUSTOMER_NAME}}'}, {'{{VEHICLE_PLATE}}'},{' '}
            {'{{START_DATE}}'}, {'{{END_DATE}}'}, {'{{TOTAL_AMOUNT}}'}, {'{{DEPOSIT_AMOUNT}}'})
          </label>
          <textarea
            rows={7}
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            className="w-full bg-[#080A09] border border-white/[0.1] rounded-xl p-3 text-zinc-200 font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}

export function RentCustomersKvkkTab({
  customers,
  canRevealKvkkPii,
  isKvkkRevealed,
  onToggleRevealKvkk,
  demoCompanyId,
  onRefresh,
}: {
  customers: any[];
  canRevealKvkkPii: boolean;
  isKvkkRevealed: boolean;
  onToggleRevealKvkk: () => void;
  demoCompanyId?: string;
  onRefresh: () => void;
}) {
  const [name, setName] = useState<string>('');
  const [tckn, setTckn] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [licenseNo, setLicenseNo] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('1992-05-15');
  const [licenseIssuedAt, setLicenseIssuedAt] = useState<string>('2014-06-01');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string>('2032-06-01');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_customer',
          demoCompanyId,
          name,
          tckn: tckn || null,
          phone: phone || null,
          driverLicenseNo: licenseNo || null,
          driverLicenseClass: 'B',
          birthDate,
          driverLicenseIssuedAt: licenseIssuedAt,
          driverLicenseExpiresAt: licenseExpiresAt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Müşteri kaydedilemedi.');
      }
      toast.success('Kiracı / sürücü kaydı oluşturuldu.');
      setName('');
      setTckn('');
      setPhone('');
      setLicenseNo('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            Müşteri &amp; Sürücü Kayıtları (KVKK Maskeleme &amp; Ehliyet Doğrulama — {customers.length})
          </h3>
          <p className="text-[11px] text-zinc-400">
            Mevcut CRM Müşteri kartları kullanılmaktadır; T.C. Kimlik, Pasaport, Ehliyet No, Telefon ve Adres sunucuda KVKK gereği maskelenir ve açık görüntüleme denetim günlüğüne (AuditLog) kaydedilir.
          </p>
        </div>

        {canRevealKvkkPii && (
          <button
            type="button"
            onClick={onToggleRevealKvkk}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white cursor-pointer"
          >
            {isKvkkRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                KVKK Verilerini Maskele
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#34D399]" />
                KVKK Verilerini Göster (Loglanır)
              </>
            )}
          </button>
        )}
      </div>

      {/* Yeni Kiracı Ekleme Formu */}
      <form
        onSubmit={handleCreateCustomer}
        className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 grid grid-cols-1 md:grid-cols-6 gap-2.5"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ad Soyad / Firma..."
          className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
          required
        />
        <input
          type="text"
          value={tckn}
          onChange={(e) => setTckn(e.target.value)}
          placeholder="TCKN / Pasaport No"
          className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
        />
        <input
          type="text"
          value={licenseNo}
          onChange={(e) => setLicenseNo(e.target.value)}
          placeholder="Ehliyet No (Örn: EHL-34-901)"
          className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          title="Doğum Tarihi"
          className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
        />
        <input
          type="date"
          value={licenseExpiresAt}
          onChange={(e) => setLicenseExpiresAt(e.target.value)}
          title="Ehliyet Geçerlilik Tarihi"
          className="bg-[#080A09] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-[#34D399] text-[#061811] font-semibold cursor-pointer"
        >
          + Kiracı / Sürücü Ekle
        </button>
      </form>

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[880px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] text-zinc-400">
              <th className="py-2 px-3">Kiracı Ad Soyad / Firma</th>
              <th className="py-2 px-3">Uyruk</th>
              <th className="py-2 px-3">TCKN / Pasaport (KVKK)</th>
              <th className="py-2 px-3">Ehliyet No / Sınıf / Vade</th>
              <th className="py-2 px-3">Telefon (KVKK)</th>
              <th className="py-2 px-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {customers.map((c: any) => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-white">{c.name}</div>
                  {c.company && <div className="text-[11px] text-zinc-400">{c.company}</div>}
                </td>
                <td className="py-2.5 px-3 font-mono text-zinc-300">{c.nationality || 'TR'}</td>
                <td className="py-2.5 px-3 font-mono text-zinc-200">
                  {c.tckn || c.passportNo || '-'}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                  {c.driverLicenseNo || '-'} ({c.driverLicenseClass || 'B'}) ·{' '}
                  {c.driverLicenseExpiresAt
                    ? new Date(c.driverLicenseExpiresAt).toLocaleDateString('tr-TR')
                    : '-'}
                </td>
                <td className="py-2.5 px-3 font-mono text-zinc-300">{c.phone || '-'}</td>
                <td className="py-2.5 px-3">
                  {c.isBlacklisted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Kara Liste
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-[#34D399]">
                      Uygun
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RentKabisPreparationTab({
  kabisRecords,
  demoCompanyId,
  onRefresh,
}: {
  kabisRecords: any[];
  demoCompanyId?: string;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleExportPackage = async (format: 'CSV' | 'JSON_PAKET') => {
    try {
      setSubmitting(true);
      const res = await fetch(
        `/api/arac-kiralama?section=kabis_export&format=${format}${
          demoCompanyId ? `&demoCompanyId=${encodeURIComponent(demoCompanyId)}` : ''
        }`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'KABİS paketi dışa aktarılamadı.');
      }

      const content =
        format === 'CSV' ? data.csvText : JSON.stringify(data.records, null, 2);
      const blob = new Blob([content], {
        type: format === 'CSV' ? 'text/csv;charset=utf-8;' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SunumERP_KABIS_Hazirlik_Paketi_${new Date().toISOString().slice(0, 10)}.${
        format === 'CSV' ? 'csv' : 'json'
      }`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`KABİS bildirim hazırlık paketi (${format}) dışa aktarıldı.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryOrUpdateStatus = async (
    kabisId: string,
    preparationStatus: 'HAZIRLANDI' | 'GONDERILDI_MANUEL'
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_kabis_status',
          demoCompanyId,
          kabisId,
          preparationStatus,
          lastErrorNote: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Durum güncellenemedi.');
      }
      toast.success('KABİS bildirim hazırlık durumu güncellendi.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            KABİS Bildirim Hazırlık ve Dışa Aktarma Merkezi ({kabisRecords.length})
          </h3>
          <p className="text-[11px] text-zinc-400">
            Resmî kurum erişimi ve sabit IP yetkilendirmesi gerektiğinden bu ekran sözleşme/teslim/iade kayıtlarından bildirim alanlarını doğrular ve dışa aktarma paketi hazırlar; doğrudan dış bağlantı denemez.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleExportPackage('CSV')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#34D399] text-[#061811] font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Paketi Dışa Aktar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleExportPackage('JSON_PAKET')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#34D399]" />
            JSON Paketi İndir
          </button>
        </div>
      </div>

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] text-zinc-400">
              <th className="py-2 px-3">KABİS Ref No / Tip</th>
              <th className="py-2 px-3">Plaka &amp; Şasi No (VIN)</th>
              <th className="py-2 px-3">Kiracı &amp; Kimlik / Ehliyet (Maskeli)</th>
              <th className="py-2 px-3">Alış – İade Zamanı</th>
              <th className="py-2 px-3">Hazırlık Durumu</th>
              <th className="py-2 px-3 text-right">İşlem / Yeniden Deneme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {kabisRecords.map((k: any) => (
              <tr key={k.id} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-3">
                  <div className="font-mono font-semibold text-white">{k.kabisRefNo}</div>
                  <div className="text-[11px] text-zinc-400">
                    {RENT_KABIS_NOTIFICATION_TYPE_LABELS[k.notificationType] ||
                      k.notificationType}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <div className="text-white font-semibold">{k.plate}</div>
                  <div className="text-[10px] text-zinc-400">{k.vehicleVin || '-'}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-white">{k.renterFullName}</div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {k.renterNationality} · {k.renterTcknMasked || k.renterPassportMasked || '-'} ·
                    Ehl: {k.renterLicenseNoMasked || '-'}
                  </div>
                  {k.additionalDriverFullName && (
                    <div className="text-[10px] text-sky-300">
                      Ek Sürücü: {k.additionalDriverFullName}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                  <div>Alış: {new Date(k.pickupAt).toLocaleString('tr-TR')}</div>
                  <div>
                    İade:{' '}
                    {new Date(k.actualReturnAt || k.expectedReturnAt).toLocaleString('tr-TR')}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] border ${
                      RENT_KABIS_STATUS_BADGES[k.preparationStatus] ||
                      RENT_KABIS_STATUS_BADGES.HAZIRLANDI
                    }`}
                  >
                    {RENT_KABIS_STATUS_LABELS[k.preparationStatus] || k.preparationStatus}
                  </span>
                  {k.lastErrorNote && (
                    <div className="text-[10px] text-rose-300 mt-1">{k.lastErrorNote}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {k.preparationStatus === 'HATALI' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRetryOrUpdateStatus(k.id, 'HAZIRLANDI')}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 text-[#061811] font-semibold text-[11px] cursor-pointer"
                      >
                        Yeniden Hazırla
                      </button>
                    )}
                    {k.preparationStatus !== 'GONDERILDI_MANUEL' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRetryOrUpdateStatus(k.id, 'GONDERILDI_MANUEL')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-[#34D399] border border-emerald-500/30 text-[11px] cursor-pointer"
                      >
                        Manuel İşlendi İşaretle
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RentAnalyticsAndReportsTab({
  analytics,
  demoCompanyId,
}: {
  analytics: any;
  demoCompanyId?: string;
}) {
  const summary = analytics?.summary || {};
  const vehicleRows = analytics?.vehicleProfitabilityRows || [];
  const classRows = analytics?.classRevenueRows || [];
  const extraRows = analytics?.extraChargesBreakdown || [];

  const handleDownloadReport = (format: 'xlsx' | 'pdf') => {
    const url = `/api/arac-kiralama?section=report_export&format=${format}${
      demoCompanyId ? `&demoCompanyId=${encodeURIComponent(demoCompanyId)}` : ''
    }`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Üst KPI ve Excel / PDF Dışa Aktarma Butonları */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            Araç Doluluk, Gelir/Gider ve Filo TCO Entegre Kârlılık Raporları
          </h3>
          <p className="text-[11px] text-zinc-400">
            Tüm göstergeler veritabanındaki kiralama sözleşmeleri, ek ücretler ve Lojistik Filo TCO (yakıt, bakım, kira/amortisman, sigorta, ceza) kayıtlarından canlı hesaplanır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownloadReport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#34D399] text-[#061811] font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel (.xlsx) İndir
          </button>
          <button
            type="button"
            onClick={() => handleDownloadReport('pdf')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#34D399]" />
            PDF (.pdf) İndir
          </button>
        </div>
      </div>

      {/* Araç Başı Kârlılık Tablosu (Filo TCO ile) */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 overflow-x-auto">
        <h4 className="text-xs font-bold text-white mb-3">
          1. Araç Başı Doluluk &amp; Net Kârlılık Tablosu (Kiralama Geliri – Filo TCO Gideri)
        </h4>
        <table className="w-full text-left border-collapse min-w-[880px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] text-zinc-400">
              <th className="py-2 px-3">Plaka &amp; Araç</th>
              <th className="py-2 px-3">Sınıf</th>
              <th className="py-2 px-3">Kiralanan Gün / Doluluk</th>
              <th className="py-2 px-3">Kira Geliri</th>
              <th className="py-2 px-3">Ek Ücret Geliri</th>
              <th className="py-2 px-3">Toplam Gelir</th>
              <th className="py-2 px-3">Filo TCO Gideri</th>
              <th className="py-2 px-3 text-right">Araç Net Kârlılık</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] font-mono">
            {vehicleRows.map((row: any) => (
              <tr key={row.vehicleId} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-white">{row.plate}</div>
                  <div className="text-[11px] font-sans text-zinc-400">{row.brandModel}</div>
                </td>
                <td className="py-2.5 px-3 font-sans text-zinc-300">{row.className}</td>
                <td className="py-2.5 px-3 text-white">
                  {row.rentedDays} gün (%{row.utilizationPct})
                </td>
                <td className="py-2.5 px-3 text-zinc-200">
                  ₺{Number(row.baseRentalIncomeTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2.5 px-3 text-amber-300">
                  ₺{Number(row.extraChargesIncomeTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2.5 px-3 text-[#34D399] font-semibold">
                  ₺{Number(row.totalRevenueTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2.5 px-3 text-rose-300">
                  ₺{Number(row.fleetTcoExpenseTry).toLocaleString('tr-TR')}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-bold ${
                    row.netProfitTry >= 0 ? 'text-[#34D399]' : 'text-rose-400'
                  }`}
                >
                  ₺{Number(row.netProfitTry).toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sınıf Bazlı Gelir ve Ek Ücret Dökümü */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <h4 className="text-xs font-bold text-white mb-3">2. Sınıf Bazlı Gelir Dağılımı</h4>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] text-zinc-400">
                <th className="py-2 px-2">Sınıf</th>
                <th className="py-2 px-2">Rezervasyon / Gün</th>
                <th className="py-2 px-2">Ort. Günlük</th>
                <th className="py-2 px-2 text-right">Toplam Gelir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {classRows.map((c: any) => (
                <tr key={c.vehicleClassId}>
                  <td className="py-2 px-2 font-semibold text-white">{c.className}</td>
                  <td className="py-2 px-2 font-mono text-zinc-300">
                    {c.reservationCount} rez / {c.totalDays} gün
                  </td>
                  <td className="py-2 px-2 font-mono text-zinc-300">
                    ₺{Number(c.avgDailyRevenueTry).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-[#34D399]">
                    ₺{Number(c.revenueTry).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white">
              3. Ek Ücret Dökümü &amp; İptal / No-Show Oranı
            </h4>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300 font-mono">
              İptal / No-Show: %{summary.cancelOrNoShowRatePct ?? 0} ({summary.cancelledCount || 0}{' '}
              iptal, {summary.noShowCount || 0} no-show)
            </span>
          </div>
          <div className="space-y-2">
            {extraRows.map((ex: any) => (
              <div
                key={ex.entryType}
                className="bg-[#080A09] border border-white/[0.06] rounded-xl p-2.5 flex items-center justify-between"
              >
                <div>
                  <span className="text-white font-medium">{ex.label}</span>
                  <span className="text-[11px] text-zinc-400 ml-2">({ex.count} kayıt)</span>
                </div>
                <span className="font-mono font-semibold text-[#34D399]">
                  ₺{Number(ex.totalAmountTry).toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

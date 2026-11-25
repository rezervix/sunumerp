'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Plus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TOUR_EXPENSE_CATEGORIES,
  TOUR_EXPENSE_CATEGORY_LABELS,
  type TourExpenseCategory,
} from '@/lib/tourism/tur/constantsAndHelpers';

// ── F) Maliyet-Kâr Analizi & Gider Kalemleri Sekmesi ─────────────────────────

export function TourProfitabilityAndExpensesTab({
  tours,
  focusedTourId,
  demoCompanyId,
  onRefresh,
}: {
  tours: any[];
  focusedTourId: string | null;
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [selectedTourId, setSelectedTourId] = useState<string>(focusedTourId || tours[0]?.id || '');
  const [category, setCategory] = useState<TourExpenseCategory>('MUSEUM_TICKET');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCostTry, setUnitCostTry] = useState(500);
  const [busy, setBusy] = useState(false);

  const tour = useMemo(
    () => tours.find((t) => t.id === (focusedTourId || selectedTourId)) || tours[0] || null,
    [tours, focusedTourId, selectedTourId]
  );
  const prof = tour?.profitability;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !description.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_expense',
          tourId: tour.id,
          category,
          description,
          quantity,
          unitCostTry,
          postToFinance: true,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gider eklenemedi.');
      toast.success('Gider kalemi kaydedildi ve Finansa işlendi.');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Tur Bazlı Maliyet-Kâr Analizi & Yolcu Başı Kârlılık
          </h3>
        </div>
        <select
          value={tour?.id || ''}
          onChange={(e) => setSelectedTourId(e.target.value)}
          className="min-w-[280px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)]"
        >
          {tours.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.title}
            </option>
          ))}
        </select>
      </div>

      {tour && prof && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-3.5">
              <div className="text-[11px] text-[var(--text-muted)]">Brüt Tur Geliri</div>
              <div className="mt-1 text-lg font-bold text-[var(--text)]">
                {Number(prof.grossRevenueTry).toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Tahsil: {Number(prof.collectedRevenueTry).toLocaleString('tr-TR')} ₺
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-3.5">
              <div className="text-[11px] text-[var(--text-muted)]">Doğrudan Giderler</div>
              <div className="mt-1 text-lg font-bold text-[var(--bad)]">
                {Number(prof.directExpensesTotalTry).toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Yakıt / Rehber / Otel / Müze</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-3.5">
              <div className="text-[11px] text-[var(--text-muted)]">Acenta Komisyonu</div>
              <div className="mt-1 text-lg font-bold text-[var(--warn)]">
                {Number(prof.agencyCommissionTotalTry).toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Sözleşme oranından hesaplı</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-3.5">
              <div className="text-[11px] text-[var(--text-muted)]">Tur Net Kârı</div>
              <div
                className={`mt-1 text-lg font-bold ${ prof.netProfitTry >= 0 ? 'text-[var(--brand)]' : 'text-[var(--bad)]' }`}
              >
                {Number(prof.netProfitTry).toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Kâr Marjı: %{prof.profitMarginPct}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-3.5">
              <div className="text-[11px] text-[var(--text-muted)]">Yolcu Başı Net Kâr</div>
              <div className="mt-1 text-lg font-bold text-sky-300">
                {Number(prof.profitPerPassengerTry).toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">{prof.confirmedPassengers} yolcu</div>
            </div>
          </div>

          <form
            onSubmit={handleAddExpense}
            className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4 md:grid-cols-6"
          >
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Gider Kategorisi</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TourExpenseCategory)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              >
                {TOUR_EXPENSE_CATEGORIES.filter((c) => c !== 'AGENCY_COMMISSION').map((c) => (
                  <option key={c} value={c}>
                    {TOUR_EXPENSE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Açıklama</label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Örn. Müze giriş bileti veya öğle yemeği"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Miktar</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Birim Tutar (₺)</label>
              <input
                type="number"
                min={1}
                value={unitCostTry}
                onChange={(e) => setUnitCostTry(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--brand)] py-2 text-xs font-semibold text-[var(--text)]"
              >
                <Plus className="h-3.5 w-3.5" /> Gider Ekle
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-[--line] bg-[var(--muted-bg)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Açıklama</th>
                  <th className="px-3 py-2 text-right">Miktar × Birim</th>
                  <th className="px-3 py-2 text-right">Toplam Gider (₺)</th>
                  <th className="px-3 py-2">Kaynak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(tour.expenses || []).map((ex: any) => (
                  <tr key={ex.id}>
                    <td className="px-3 py-2 text-[var(--text-2)]">
                      {TOUR_EXPENSE_CATEGORY_LABELS[ex.category as TourExpenseCategory] ||
                        ex.category}
                    </td>
                    <td className="px-3 py-2 text-[var(--text)]">{ex.description}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)]">
                      {ex.quantity} × {Number(ex.unitCostTry).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--bad)]">
                      {Number(ex.totalCostTry).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)]">
                      {ex.sourceRefType || 'MANUAL'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── G) Acentalar & Rehberler Yönetimi Sekmesi ────────────────────────────────

export function TourAgenciesAndGuidesTab({
  agencies,
  agencyPerformanceRows,
  guides,
  demoCompanyId,
  onRefresh,
}: {
  agencies: any[];
  agencyPerformanceRows: any[];
  guides: any[];
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [agName, setAgName] = useState('');
  const [agComm, setAgComm] = useState(12);
  const [agQuota, setAgQuota] = useState(10);
  const [gdName, setGdName] = useState('');
  const [gdLicense, setGdLicense] = useState('');
  const [gdFee, setGdFee] = useState(4000);
  const [busy, setBusy] = useState(false);

  const postSimple = async (payload: Record<string, any>, msg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, demoCompanyId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Kaydedilemedi.');
      toast.success(msg);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Acenta Ekleme */}
        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <h4 className="text-sm font-semibold text-[var(--text)]">
            Acenta & Satış Kanalı Tanımları ({agencies.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={agName}
              onChange={(e) => setAgName(e.target.value)}
              placeholder="Acenta adı..."
              className="col-span-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <input
              type="number"
              value={agComm}
              onChange={(e) => setAgComm(Number(e.target.value))}
              placeholder="Komisyon %"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <input
              type="number"
              value={agQuota}
              onChange={(e) => setAgQuota(Number(e.target.value))}
              placeholder="Kontenjan"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <button
              type="button"
              disabled={busy || !agName.trim()}
              onClick={() => {
                postSimple(
                  {
                    action: 'upsert_agency',
                    name: agName,
                    commissionRatePct: agComm,
                    defaultQuotaPerTour: agQuota,
                  },
                  'Acenta tanımlandı.'
                );
                setAgName('');
              }}
              className="rounded-lg bg-[var(--brand)] text-xs font-semibold text-[var(--text)]"
            >
              Acenta Ekle
            </button>
          </div>
          <div className="space-y-2">
            {agencyPerformanceRows.map((ag) => (
              <div
                key={ag.agencyId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--muted-bg)] p-3 text-xs"
              >
                <div>
                  <span className="font-mono text-[var(--brand)]">{ag.code}</span>{' '}
                  <strong className="text-[var(--text)]">{ag.name}</strong>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Oran: %{ag.commissionRatePct} · {ag.passengersSold} yolcu ({ag.bookingCount} rez)
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[var(--text)]">
                    Satış: {Number(ag.grossSalesTry).toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-[11px] text-[var(--warn)]">
                    Komisyon: {Number(ag.commissionPayableTry).toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rehber Ekleme */}
        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <h4 className="text-sm font-semibold text-[var(--text)]">
            Kokartlı Tur Rehberleri ({guides.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={gdName}
              onChange={(e) => setGdName(e.target.value)}
              placeholder="Rehber ad soyad..."
              className="col-span-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <input
              value={gdLicense}
              onChange={(e) => setGdLicense(e.target.value)}
              placeholder="Kokart / Lisans No"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <input
              type="number"
              value={gdFee}
              onChange={(e) => setGdFee(Number(e.target.value))}
              placeholder="Günlük Ücret ₺"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
            <button
              type="button"
              disabled={busy || !gdName.trim()}
              onClick={() => {
                postSimple(
                  {
                    action: 'upsert_guide',
                    fullName: gdName,
                    licenseNo: gdLicense,
                    dailyFeeTry: gdFee,
                  },
                  'Rehber kaydedildi.'
                );
                setGdName('');
                setGdLicense('');
              }}
              className="rounded-lg bg-[var(--brand)] text-xs font-semibold text-[var(--text)]"
            >
              Rehber Ekle
            </button>
          </div>
          <div className="space-y-2">
            {guides.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--muted-bg)] p-3 text-xs"
              >
                <div>
                  <span className="font-mono text-[var(--brand)]">{g.code}</span>{' '}
                  <strong className="text-[var(--text)]">{g.fullName}</strong>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Lisans: {g.licenseNo || '-'} · Diller: {(g.languages || []).join(', ')} ·{' '}
                    {g.phoneMasked || '-'}
                  </div>
                </div>
                <span className="font-mono font-semibold text-[var(--text)]">
                  {Number(g.dailyFeeTry).toLocaleString('tr-TR')} ₺/gün
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── J) Tur Raporları & Dışa Aktarma (XLSX / PDF) ─────────────────────────────

export function TourAnalyticsAndReportsTab({
  analytics,
  demoCompanyId,
}: {
  analytics: any;
  demoCompanyId: string;
}) {
  const s = analytics?.summary || {};
  const profRows = analytics?.tourProfitabilityRows || [];
  const vehUsage = analytics?.vehicleUsageRows || [];

  const exportUrl = (fmt: 'xlsx' | 'pdf') =>
    `/api/tur?section=report_export&format=${fmt}&demoCompanyId=${encodeURIComponent(demoCompanyId)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--brand)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Tur Kârlılığı, Doluluk, İptal Oranı & Araç Kullanım Raporları
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Veritabanındaki canlı tur, gider, acenta komisyonu ve Filo araç kayıtlarından hesaplanır.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl('xlsx')}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[--brand-hover]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
          </a>
          <a
            href={exportUrl('pdf')}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--text)] hover:bg-white/[0.08]"
          >
            <FileText className="h-3.5 w-3.5" /> PDF (.pdf)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <div className="text-xs text-[var(--text-muted)]">Ortalama Doluluk</div>
          <div className="mt-1 text-2xl font-bold text-[var(--brand)]">%{s.avgOccupancyPct ?? 0}</div>
          <div className="text-[11px] text-[var(--text-muted)]">{s.totalPassengers ?? 0} toplam yolcu</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <div className="text-xs text-[var(--text-muted)]">Toplam Tur Geliri</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {Number(s.totalGrossRevenueTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">İptal oranı: %{s.cancellationRatePct ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <div className="text-xs text-[var(--text-muted)]">Toplam Net Kâr</div>
          <div className="mt-1 text-2xl font-bold text-[var(--brand)]">
            {Number(s.totalNetProfitTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Yolcu başı ort: {Number(s.avgProfitPerPassengerTry || 0).toLocaleString('tr-TR')} ₺
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
          <div className="text-xs text-[var(--text-muted)]">Tamamlanan / İptal Tur</div>
          <div className="mt-1 text-2xl font-bold text-sky-300">
            {s.completedTours ?? 0} / {s.cancelledTours ?? 0}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Toplam {s.totalTours ?? 0} tur</div>
        </div>
      </div>

      {/* Tur Bazlı Kârlılık Tablosu */}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Tur Bazlı Gelir, Gider, Komisyon & Net Kâr Karşılaştırması
        </h4>
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="border-b border-[--line] text-[var(--text-muted)]">
            <tr>
              <th className="py-2">Tur</th>
              <th className="py-2 text-right">Yolcu / Doluluk</th>
              <th className="py-2 text-right">Gelir (₺)</th>
              <th className="py-2 text-right">Maliyet + Kom. (₺)</th>
              <th className="py-2 text-right">Net Kâr (₺)</th>
              <th className="py-2 text-right">Yolcu Başı Kâr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {profRows.map((r: any) => (
              <tr key={r.tourId}>
                <td className="py-2">
                  <span className="font-mono text-[var(--brand)]">{r.tourCode}</span> — {r.tourTitle}
                </td>
                <td className="py-2 text-right font-mono">
                  {r.confirmedPassengers}/{r.capacity} (%{r.occupancyPct})
                </td>
                <td className="py-2 text-right font-mono">
                  {Number(r.grossRevenueTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2 text-right font-mono text-[var(--bad)]">
                  {Number(r.totalCostsWithCommissionTry).toLocaleString('tr-TR')}
                </td>
                <td
                  className={`py-2 text-right font-mono font-semibold ${ r.netProfitTry >= 0 ? 'text-[var(--brand)]' : 'text-[var(--bad)]' }`}
                >
                  {Number(r.netProfitTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2 text-right font-mono text-sky-300">
                  {Number(r.profitPerPassengerTry).toLocaleString('tr-TR')} ₺
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Araç Kullanım Süreleri */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Filo Araçlarının Tur Kullanım Süreleri
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
          {vehUsage.map((v: any) => (
            <div key={v.vehicleId} className="rounded-lg border border-[var(--line)] bg-[var(--muted-bg)] p-3 text-xs">
              <div className="font-mono font-bold text-[var(--brand)]">{v.plate}</div>
              <div className="text-[11px] text-[var(--text-2)]">{v.brandModel}</div>
              <div className="mt-1.5 font-mono text-[11px] text-[var(--text-muted)]">
                {v.tourCount} tur · {v.totalDays} gün · {v.totalHours} saat
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

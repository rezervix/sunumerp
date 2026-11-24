'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  QrCode,
  CheckCircle2,
  Calendar,
  Building,
  Truck,
  Plus,
  X,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { FleetPickerSelect } from '@/components/logistics/FleetPickerSelect';
import { safeText, safeNumber, safeCurrency, safeDate } from '@/lib/utils/safe-display';

interface EDocument {
  id: string;
  ettnUuid: string;
  documentNo: string;
  documentType: string;
  profileId: string;
  relatedOrderNo?: string | null;
  shipmentTripId?: string | null;
  receiverTitle: string;
  receiverVknTckn: string;
  receiverTaxOffice?: string | null;
  dispatchDate: string;
  carrierName?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  totalNetAmount: number;
  totalVatAmount: number;
  totalGrossAmount: number;
  currency: string;
  gibStatusCode: string;
  gibStatusText: string;
}

interface Props {
  eDocuments: EDocument[];
  isNewModalOpen: boolean;
  onCloseNewModal: () => void;
  onCreated: () => void;
}

export function EDocumentViewer({
  eDocuments,
  isNewModalOpen,
  onCloseNewModal,
  onCreated
}: Props) {
  const [selectedDoc, setSelectedDoc] = useState<EDocument | null>(null);
  const [docType, setDocType] = useState<'E_IRSALIYE' | 'E_FATURA'>('E_IRSALIYE');
  const [orderNo, setOrderNo] = useState('OMN-2026-9041');
  const [receiverTitle, setReceiverTitle] = useState('KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.');
  const [receiverVkn, setReceiverVkn] = useState('5770034190');
  const [carrierName, setCarrierName] = useState('Yurtiçi Kargo VIP');
  const [vehiclePlate, setVehiclePlate] = useState('34 SNR 720');
  const [driverName, setDriverName] = useState('Kemal Öztürk');
  const [totalNet, setTotalNet] = useState('18450');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue_edocument',
          documentType: docType,
          relatedOrderNo: orderNo,
          receiverTitle,
          receiverVkn,
          carrierName,
          vehiclePlate,
          driverName,
          totalNetTry: parseFloat(totalNet) || 1000
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'E-Belge düzenlenemedi');
      }

      toast.success(`${data.doc?.documentNo || ''} GİB E-Belgesi Kesildi!`, {
        description: `ETTN: ${data.doc?.ettnUuid || ''} • GİB 1300 Onaylandı.`
      });
      onCloseNewModal();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-5 rounded-[20px] shadow-sm">
        <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[--brand]" />
          GİB UBL-TR 2.1 E-İrsaliye & E-Fatura Sistemi
        </h3>
        <p className="text-xs text-[--text-muted] mt-0.5">
          Gelir İdaresi Başkanlığı onaylı karekodlu sevk e-irsaliyeleri ve ticari e-fatura kayıtları
        </p>
      </div>

      <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
        {(eDocuments || []).length === 0 ? (
          <div className="text-center py-12 text-[--text-muted] text-xs">
            Kayıtlı e-belge bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[--muted-bg]/50 border-b border-[--line] text-[--text-muted] uppercase text-[11px] tracking-wider font-medium">
                  <th className="py-3.5 px-4 font-medium">Belge No / ETTN</th>
                  <th className="py-3.5 px-3 font-medium">Alıcı Unvan / VKN</th>
                  <th className="py-3.5 px-3 font-medium">Taşıyıcı & Plaka</th>
                  <th className="py-3.5 px-3 font-medium text-center">GİB Durumu</th>
                  <th className="py-3.5 px-3 font-medium text-right">Genel Toplam</th>
                  <th className="py-3.5 px-4 font-medium text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line]">
                {eDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-[--brand-soft]/30 transition-colors text-[--text-2]"
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[--text] text-sm font-mono">
                        {safeText(doc.documentNo)}
                      </div>
                      <div className="text-[11px] text-[--text-muted] font-mono truncate max-w-[180px] mt-0.5">
                        {safeText(doc.ettnUuid)}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="font-medium text-[--text]">
                        {safeText(doc.receiverTitle)}
                      </div>
                      <div className="text-[11px] text-[--text-muted] font-mono mt-0.5">
                        VKN: {safeText(doc.receiverVknTckn)} • {safeDate(doc.dispatchDate)}
                      </div>
                    </td>

                    <td className="py-4 px-3 text-[--text-2]">
                      {doc.vehiclePlate ? (
                        <div>
                          <span className="font-mono font-medium text-[--text] bg-[--muted-bg] px-2 py-0.5 rounded border border-[--line]">
                            {safeText(doc.vehiclePlate)}
                          </span>
                          <div className="text-[11px] text-[--text-muted] mt-0.5">{safeText(doc.driverName)}</div>
                          {doc.shipmentTripId && (
                            <Link
                              href={`/dashboard/sevkiyat?tripId=${encodeURIComponent(doc.shipmentTripId)}`}
                              className="inline-flex items-center gap-1 text-[10px] text-[--brand] hover:underline mt-0.5 font-medium"
                            >
                              <Truck className="w-3 h-3" />
                              Sefer Detayı →
                            </Link>
                          )}
                        </div>
                      ) : doc.shipmentTripId ? (
                        <Link
                          href={`/dashboard/sevkiyat?tripId=${encodeURIComponent(doc.shipmentTripId)}`}
                          className="inline-flex items-center gap-1 text-xs text-[--brand] hover:underline font-medium"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Sefer Planını Gör
                        </Link>
                      ) : (
                        <span className="text-[--text-muted]">-</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/25">
                        <CheckCircle2 className="w-3 h-3 text-[--ok]" />
                        {safeText(doc.gibStatusCode)} {safeText(doc.gibStatusText)}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="text-sm font-semibold text-[--brand] font-mono tabular-nums">
                        {safeCurrency(doc.totalGrossAmount, doc.currency || 'TRY')}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] rounded-full text-xs font-medium transition cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-[--text-muted]" />
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Belge Kesme Modalı */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-lg p-6 shadow-xl relative text-[--text]">
            <div className="flex items-center justify-between pb-3 border-b border-[--line]">
              <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[--brand]" />
                GİB E-İrsaliye / E-Fatura Düzenle
              </h3>
              <button onClick={onCloseNewModal} className="text-[--text-muted] hover:text-[--text] p-1 cursor-pointer transition rounded-lg hover:bg-[--muted-bg]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Belge Türü *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  >
                    <option value="E_IRSALIYE">E-İrsaliye (Sevk İrsaliyesi)</option>
                    <option value="E_FATURA">E-Fatura (Ticari Fatura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    İlişkili Sipariş No
                  </label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                  Alıcı Firma / Müşteri Unvanı *
                </label>
                <input
                  type="text"
                  value={receiverTitle}
                  onChange={(e) => setReceiverTitle(e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    VKN / TCKN *
                  </label>
                  <input
                    type="text"
                    value={receiverVkn}
                    onChange={(e) => setReceiverVkn(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Net Tutar (₺) *
                  </label>
                  <input
                    type="number"
                    value={totalNet}
                    onChange={(e) => setTotalNet(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
              </div>

              <FleetPickerSelect
                onSelectVehicle={(v, assignedDriver) => {
                  setVehiclePlate(v.plate);
                  if (assignedDriver) setDriverName(assignedDriver.fullName);
                }}
                onSelectDriver={(d) => setDriverName(d.fullName)}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Taşıyıcı Firma
                  </label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Şoför Adı
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs bg-white border border-[--line] rounded-xl p-2.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[--line] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseNewModal}
                  className="px-4 py-2 border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] text-xs font-medium rounded-full transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold rounded-full shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Oluşturuluyor...' : 'GİB Onayına Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Belge İnceleme Çekmecesi / Modalı */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-lg p-6 shadow-xl relative space-y-4 text-[--text]">
            <div className="flex items-center justify-between pb-3 border-b border-[--line]">
              <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[--brand]" />
                {safeText(selectedDoc.documentNo)} Detayları
              </h3>
              <button onClick={() => setSelectedDoc(null)} className="text-[--text-muted] hover:text-[--text] p-1 cursor-pointer transition rounded-lg hover:bg-[--muted-bg]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[--muted-bg]/50 border border-[--line] rounded-xl space-y-1.5 text-[--text-2]">
                <div>ETTN UUID: <strong className="font-mono text-[--text]">{safeText(selectedDoc.ettnUuid)}</strong></div>
                <div>Profil: <strong className="text-[--text]">{safeText(selectedDoc.profileId)}</strong></div>
                <div>GİB Durumu: <strong className="text-[--ok]">{safeText(selectedDoc.gibStatusCode)} - {safeText(selectedDoc.gibStatusText)}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[--text-2]">
                <div>Alıcı Unvan: <strong className="text-[--text]">{safeText(selectedDoc.receiverTitle)}</strong></div>
                <div>VKN/TCKN: <strong className="font-mono text-[--text]">{safeText(selectedDoc.receiverVknTckn)}</strong></div>
                <div>Taşıyıcı: <strong className="text-[--text]">{safeText(selectedDoc.carrierName)}</strong></div>
                <div>Plaka: <strong className="font-mono text-[--text]">{safeText(selectedDoc.vehiclePlate)}</strong></div>
              </div>

              <div className="p-3.5 bg-[--brand-soft]/50 border border-[--brand-line] rounded-xl text-[--text] space-y-1.5">
                <div className="flex justify-between">
                  <span>Net Tutar:</span>
                  <span className="font-mono font-medium">{safeCurrency(selectedDoc.totalNetAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>KDV Tutarı (%20):</span>
                  <span className="font-mono font-medium">{safeCurrency(selectedDoc.totalVatAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm text-[--text] border-t border-[--brand-line] pt-1.5">
                  <span>Genel Toplam:</span>
                  <span className="text-[--brand] font-mono tabular-nums">{safeCurrency(selectedDoc.totalGrossAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[--line]">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] rounded-full text-xs font-medium transition cursor-pointer shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

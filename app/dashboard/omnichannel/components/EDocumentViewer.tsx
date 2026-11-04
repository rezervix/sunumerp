'use client';

import React, { useState } from 'react';
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

interface EDocument {
  id: string;
  ettnUuid: string;
  documentNo: string;
  documentType: string;
  profileId: string;
  relatedOrderNo?: string | null;
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          GİB UBL-TR 2.1 E-İrsaliye & E-Fatura Sistemi
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Gelir İdaresi Başkanlığı onaylı karekodlu sevk e-irsaliyeleri ve ticari e-fatura kayıtları
        </p>
      </div>

      <div className="space-y-3">
        {eDocuments.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Kayıtlı e-belge bulunamadı.
          </div>
        ) : (
          eDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {doc.documentNo}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {doc.gibStatusCode} {doc.gibStatusText}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Alıcı: <strong>{doc.receiverTitle}</strong> (VKN: {doc.receiverVknTckn})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Genel Toplam (KDV Dahil)</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      ₺{Number(doc.totalGrossAmount || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    İncele
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span>ETTN UUID: <strong className="font-mono">{doc.ettnUuid}</strong></span>
                {doc.vehiclePlate && (
                  <span>Plaka / Şoför: <strong>{doc.vehiclePlate}</strong> ({doc.driverName})</span>
                )}
                <span>Tarih: {new Date(doc.dispatchDate).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Yeni Belge Kesme Modalı */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                GİB E-İrsaliye / E-Fatura Düzenle
              </h3>
              <button onClick={onCloseNewModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Belge Türü *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="E_IRSALIYE">E-İrsaliye (Sevk İrsaliyesi)</option>
                    <option value="E_FATURA">E-Fatura (Ticari Fatura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    İlişkili Sipariş No
                  </label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Alıcı Firma / Müşteri Unvanı *
                </label>
                <input
                  type="text"
                  value={receiverTitle}
                  onChange={(e) => setReceiverTitle(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    VKN / TCKN *
                  </label>
                  <input
                    type="text"
                    value={receiverVkn}
                    onChange={(e) => setReceiverVkn(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Net Tutar (₺) *
                  </label>
                  <input
                    type="number"
                    value={totalNet}
                    onChange={(e) => setTotalNet(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Taşıyıcı Firma
                  </label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Şoför Adı
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseNewModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {selectedDoc.documentNo} Detayları
              </h3>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div>ETTN UUID: <strong className="font-mono">{selectedDoc.ettnUuid}</strong></div>
                <div>Profil: <strong>{selectedDoc.profileId}</strong></div>
                <div>GİB Durumu: <strong className="text-emerald-600">{selectedDoc.gibStatusCode} - {selectedDoc.gibStatusText}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>Alıcı Unvan: <strong>{selectedDoc.receiverTitle}</strong></div>
                <div>VKN/TCKN: <strong className="font-mono">{selectedDoc.receiverVknTckn}</strong></div>
                <div>Taşıyıcı: <strong>{selectedDoc.carrierName}</strong></div>
                <div>Plaka: <strong className="font-mono">{selectedDoc.vehiclePlate}</strong></div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="flex justify-between">
                  <span>Net Tutar:</span>
                  <span>₺{Number(selectedDoc.totalNetAmount).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>KDV Tutarı (%20):</span>
                  <span>₺{Number(selectedDoc.totalVatAmount).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-emerald-200/60 pt-1">
                  <span>Genel Toplam:</span>
                  <span>₺{Number(selectedDoc.totalGrossAmount).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
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


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
    <div className="space-y-4">
      <div className="bg-[#111513]/90 border border-white/[0.06] p-5 rounded-[20px]">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          GİB UBL-TR 2.1 E-İrsaliye & E-Fatura Sistemi
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Gelir İdaresi Başkanlığı onaylı karekodlu sevk e-irsaliyeleri ve ticari e-fatura kayıtları
        </p>
      </div>

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        {eDocuments.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            Kayıtlı e-belge bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 font-medium">Belge No / ETTN</th>
                  <th className="py-3.5 px-3 font-medium">Alıcı Unvan / VKN</th>
                  <th className="py-3.5 px-3 font-medium">Taşıyıcı & Plaka</th>
                  <th className="py-3.5 px-3 font-medium text-center">GİB Durumu</th>
                  <th className="py-3.5 px-3 font-medium text-right">Genel Toplam</th>
                  <th className="py-3.5 px-4 font-medium text-right">Detay</th>
                </tr>
              </thead>
              <tbody>
                {eDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-white text-sm">
                        {doc.documentNo}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[180px] mt-0.5">
                        {doc.ettnUuid}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="font-medium text-white">
                        {doc.receiverTitle}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        VKN: {doc.receiverVknTckn} • {new Date(doc.dispatchDate).toLocaleDateString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-4 px-3 text-zinc-300">
                      {doc.vehiclePlate ? (
                        <div>
                          <span className="font-mono font-medium text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {doc.vehiclePlate}
                          </span>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{doc.driverName}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {doc.gibStatusCode} {doc.gibStatusText}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="text-sm font-medium text-emerald-400 font-mono">
                        ₺{Number(doc.totalGrossAmount || 0).toLocaleString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-full text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-lg p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                GİB E-İrsaliye / E-Fatura Düzenle
              </h3>
              <button onClick={onCloseNewModal} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Belge Türü *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="E_IRSALIYE" className="bg-[#111513] text-white">E-İrsaliye (Sevk İrsaliyesi)</option>
                    <option value="E_FATURA" className="bg-[#111513] text-white">E-Fatura (Ticari Fatura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    İlişkili Sipariş No
                  </label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Alıcı Firma / Müşteri Unvanı *
                </label>
                <input
                  type="text"
                  value={receiverTitle}
                  onChange={(e) => setReceiverTitle(e.target.value)}
                  required
                  className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    VKN / TCKN *
                  </label>
                  <input
                    type="text"
                    value={receiverVkn}
                    onChange={(e) => setReceiverVkn(e.target.value)}
                    required
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Net Tutar (₺) *
                  </label>
                  <input
                    type="number"
                    value={totalNet}
                    onChange={(e) => setTotalNet(e.target.value)}
                    required
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Taşıyıcı Firma
                  </label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Şoför Adı
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseNewModal}
                  className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-300 text-xs font-medium rounded-full hover:bg-white/10 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-400 text-black hover:bg-emerald-300 text-xs font-semibold rounded-full transition shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-lg p-6 shadow-2xl relative space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                {selectedDoc.documentNo} Detayları
              </h3>
              <button onClick={() => setSelectedDoc(null)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1.5 text-zinc-300">
                <div>ETTN UUID: <strong className="font-mono text-white">{selectedDoc.ettnUuid}</strong></div>
                <div>Profil: <strong className="text-white">{selectedDoc.profileId}</strong></div>
                <div>GİB Durumu: <strong className="text-emerald-400">{selectedDoc.gibStatusCode} - {selectedDoc.gibStatusText}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-zinc-300">
                <div>Alıcı Unvan: <strong className="text-white">{selectedDoc.receiverTitle}</strong></div>
                <div>VKN/TCKN: <strong className="font-mono text-white">{selectedDoc.receiverVknTckn}</strong></div>
                <div>Taşıyıcı: <strong className="text-white">{selectedDoc.carrierName}</strong></div>
                <div>Plaka: <strong className="font-mono text-white">{selectedDoc.vehiclePlate}</strong></div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 space-y-1.5">
                <div className="flex justify-between">
                  <span>Net Tutar:</span>
                  <span>₺{Number(selectedDoc.totalNetAmount).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>KDV Tutarı (%20):</span>
                  <span>₺{Number(selectedDoc.totalVatAmount).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm text-white border-t border-emerald-500/20 pt-1.5">
                  <span>Genel Toplam:</span>
                  <span className="text-emerald-400">₺{Number(selectedDoc.totalGrossAmount).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-full text-xs font-medium transition"
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

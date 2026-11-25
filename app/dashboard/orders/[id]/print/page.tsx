"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { BRAND_CONFIG } from "@/lib/config/brand"
import { safeText, safeCurrency, safeDate } from "@/lib/utils/safe-display"

interface OrderDetails {
    id: string
    orderNumber: string
    orderDate: string
    title: string
    orderType: string
    priority: string
    status: string
    description?: string
    quantity?: number
    totalAmount?: number
    paymentStatus: string
    customerName?: string
    companyName?: string
    customerPhone?: string
    customer?: {
        name: string
        company?: string
        phone?: string
    }
}

export default function PrintOrderPage() {
    const params = useParams()
    const id = params.id as string
    const [order, setOrder] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return

        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setOrder(data)
                    // Wait for render then print
                    setTimeout(() => {
                        window.print()
                    }, 500)
                }
            } catch (error) {
                console.error("Error fetching order:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [id])

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-[#F6F8FB] text-[#0B1B33]">Yükleniyor...</div>
    }

    if (!order) {
        return <div className="flex justify-center items-center h-screen bg-[#F6F8FB] text-[#0B1B33]">Sipariş bulunamadı.</div>
    }

    const priorityColors: Record<string, { bg: string, text: string, label: string }> = {
        low: { bg: "bg-[#F1F4F9]", text: "text-[#5B6B82]", label: "Düşük" },
        normal: { bg: "bg-[#EEF5FF]", text: "text-[#1267E6]", label: "Normal" },
        high: { bg: "bg-[#FFF4DC]", text: "text-[#9A5B00]", label: "Yüksek" },
        urgent: { bg: "bg-[#FDECEC]", text: "text-[#C42B31]", label: "Acil" },
    }
    const pc = priorityColors[order.priority] || priorityColors.normal

    const statusColors: Record<string, { bg: string, text: string, label: string }> = {
        pending: { bg: "bg-[#F1F4F9]", text: "text-[#5B6B82]", label: "Bekliyor" },
        approved: { bg: "bg-[#E7F6EC]", text: "text-[#0B7A3E]", label: "Onaylandı" },
        "in-progress": { bg: "bg-[#EEF5FF]", text: "text-[#1267E6]", label: "İşlemde" },
        delivered: { bg: "bg-[#E7F6EC]", text: "text-[#0B7A3E]", label: "Teslim Edildi" },
        rejected: { bg: "bg-[#FDECEC]", text: "text-[#C42B31]", label: "Reddedildi" },
    }
    const sc = statusColors[order.status] || statusColors.pending

    const cName = order.customer?.name || order.customerName || "Bilinmiyor"
    const cCompany = order.customer?.company || order.companyName || "-"
    const cPhone = order.customer?.phone || order.customerPhone || "-"

    return (
        <div className="bg-[#F6F8FB] text-[#0B1B33] antialiased overflow-x-hidden min-h-screen font-sans print:bg-white print:text-black">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 12mm; size: auto; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #ffffff !important; color: #000000 !important; }
                    .print-hidden { display: none !important; }
                    .print-clean { box-shadow: none !important; border: 1px solid #d0d7de !important; background: #ffffff !important; }
                }
            `}} />
            
            <main className="py-8 px-4 flex justify-center items-center w-full min-h-screen">
                <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-sm border border-[#E3E8F0] flex flex-col overflow-hidden my-auto print-clean">
                    {/* Receipt Header */}
                    <div className="p-8 md:p-10 border-b border-[#E3E8F0] bg-[#F6F8FB] print:bg-white">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[#07254A] flex items-center justify-center text-[var(--text)] text-2xl font-bold shadow-sm">
                                    C
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-[#0B1B33] tracking-tight">Sipariş Fişi</h1>
                                    <p className="text-[#5B6B82] text-sm mt-1">{BRAND_CONFIG.companyName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[#5B6B82] uppercase tracking-wider mb-1 font-medium">Sipariş No</p>
                                <p className="text-xl font-bold text-[#1267E6] font-mono">{safeText(order.orderNumber, "-")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Body */}
                    <div className="p-8 md:p-10 flex-1 space-y-8">
                        
                        {/* Top Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Order Details */}
                            <div className="bg-[#F6F8FB] p-5 rounded-xl border border-[#E3E8F0] print:bg-white">
                                <h3 className="text-xs font-semibold text-[#5B6B82] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-[#1267E6]">info</span>
                                    Sipariş Detayları
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Tarih:</span>
                                        <span className="font-semibold text-[#0B1B33]">{safeDate(order.orderDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Tür:</span>
                                        <span className="font-semibold text-[#0B1B33]">{safeText(order.orderType, "Genel")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Öncelik:</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${pc.bg} ${pc.text}`}>{pc.label}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Durum:</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-[#F6F8FB] p-5 rounded-xl border border-[#E3E8F0] print:bg-white">
                                <h3 className="text-xs font-semibold text-[#5B6B82] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-[#1267E6]">person</span>
                                    Müşteri Bilgileri
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Müşteri:</span>
                                        <span className="font-semibold text-[#0B1B33]">{safeText(cName, "-")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Firma:</span>
                                        <span className="font-semibold text-[#0B1B33]">{safeText(cCompany, "-")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Telefon:</span>
                                        <span className="font-semibold text-[#0B1B33]">{safeText(cPhone, "-")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#5B6B82]">Ödeme:</span>
                                        <span className="font-semibold text-[#0B1B33]">
                                            {order.paymentStatus === 'paid' ? 'Ödendi' : order.paymentStatus === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Description & Quantity */}
                        <div className="border border-[#E3E8F0] rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-[#F1F4F9] border-b border-[#E3E8F0] text-[11px] uppercase tracking-wider text-[#5B6B82] font-semibold">
                                        <th className="p-4">Başlık / Kalem</th>
                                        <th className="p-4 text-center">Miktar</th>
                                        <th className="p-4 text-right">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-[#E3E8F0]">
                                        <td className="p-4">
                                            <div className="font-semibold text-[#0B1B33]">{safeText(order.title, "Sipariş Kalemi")}</div>
                                            {order.description && (
                                                <div className="text-xs text-[#5B6B82] mt-1">{order.description}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center font-medium text-[#0B1B33]">
                                            {order.quantity ? `${order.quantity} Adet` : "-"}
                                        </td>
                                        <td className="p-4 text-right font-semibold text-[#0B1B33]">
                                            {order.totalAmount ? safeCurrency(order.totalAmount) : "—"}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Total Footer */}
                        <div className="flex justify-end pt-4">
                            <div className="w-full max-w-[280px] space-y-2">
                                <div className="flex justify-between text-sm text-[#5B6B82]">
                                    <span>Ara Toplam:</span>
                                    <span className="font-medium text-[#0B1B33]">{order.totalAmount ? safeCurrency(order.totalAmount) : "—"}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-[#07254A] border-t border-[#E3E8F0] pt-2">
                                    <span>Genel Toplam:</span>
                                    <span className="text-[#1267E6]">{order.totalAmount ? safeCurrency(order.totalAmount) : "—"}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer print action bar */}
                    <div className="p-6 border-t border-[#E3E8F0] bg-[#F6F8FB] flex justify-between items-center print-hidden">
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 text-sm font-medium text-[#33445E] bg-white border border-[#E3E8F0] rounded-full hover:bg-[#F1F4F9] transition-all shadow-sm"
                        >
                            Geri Dön
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-5 py-2 text-sm font-medium text-[var(--text)] bg-gradient-to-r from-[#1267E6] to-[#1579F9] rounded-full hover:opacity-90 transition-all shadow-sm flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            Yazdır
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}

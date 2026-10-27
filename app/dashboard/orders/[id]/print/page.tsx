"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { BRAND_CONFIG } from "@/lib/config/brand"

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
        return <div className="flex justify-center items-center h-screen bg-[#f7f9fb] text-[#191c1e]">Yükleniyor...</div>
    }

    if (!order) {
        return <div className="flex justify-center items-center h-screen bg-[#f7f9fb] text-[#191c1e]">Sipariş bulunamadı.</div>
    }

    const priorityColors: Record<string, { bg: string, text: string, label: string }> = {
        low: { bg: "bg-[#f2f4f6]", text: "text-[#434655]", label: "Düşük" },
        normal: { bg: "bg-[#dbe1ff]", text: "text-[#00174b]", label: "Normal" },
        high: { bg: "bg-[#ffdad6]", text: "text-[#93000a]", label: "Yüksek" },
        urgent: { bg: "bg-[#ba1a1a]", text: "text-[#ffffff]", label: "Acil" },
    }
    const pc = priorityColors[order.priority] || priorityColors.normal

    const statusColors: Record<string, { bg: string, text: string, label: string }> = {
        pending: { bg: "bg-[#f2f4f6]", text: "text-[#434655]", label: "Bekliyor" },
        approved: { bg: "bg-[#007d55]", text: "text-[#bdffdb]", label: "Onaylandı" },
        "in-progress": { bg: "bg-[#dbe1ff]", text: "text-[#00174b]", label: "İşlemde" },
        delivered: { bg: "bg-[#006242]", text: "text-[#ffffff]", label: "Teslim Edildi" },
        rejected: { bg: "bg-[#ffdad6]", text: "text-[#93000a]", label: "Reddedildi" },
    }
    const sc = statusColors[order.status] || statusColors.pending

    const cName = order.customer?.name || order.customerName || "Bilinmiyor"
    const cCompany = order.customer?.company || order.companyName || "-"
    const cPhone = order.customer?.phone || order.customerPhone || "-"

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] antialiased overflow-x-hidden min-h-screen font-sans">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                }
            `}} />
            
            <main className="py-8 px-4 flex justify-center items-center w-full bg-[#f7f9fb] min-h-screen">
                <div className="w-full max-w-[800px] bg-[#ffffff] rounded-xl shadow-lg border border-[#e6e8ea] flex flex-col overflow-hidden my-auto">
                    {/* Receipt Header */}
                    <div className="p-8 md:p-10 border-b border-[#e6e8ea] bg-[#f7f9fb]">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-lg bg-[#2563eb] flex items-center justify-center text-[#ffffff] text-2xl font-bold shadow-sm">
                                    C
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-[#191c1e]">Sipariş Fişi</h1>
                                    <p className="text-[#434655] text-sm mt-1">{BRAND_CONFIG.companyName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[#434655] uppercase tracking-wider mb-1">Sipariş No</p>
                                <p className="text-xl font-bold text-[#004ac6]">{order.orderNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Body */}
                    <div className="p-8 md:p-10 flex-1 space-y-8">
                        
                        {/* Top Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Order Details */}
                            <div className="bg-[#f7f9fb] p-5 rounded-lg border border-[#e6e8ea]">
                                <h3 className="text-sm font-semibold text-[#434655] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    Sipariş Detayları
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Tarih:</span>
                                        <span className="text-sm font-semibold text-[#191c1e]">{new Date(order.orderDate).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Tür:</span>
                                        <span className="text-sm font-semibold text-[#191c1e]">{order.orderType}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Öncelik:</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${pc.bg} ${pc.text}`}>{pc.label}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Durum:</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-[#f7f9fb] p-5 rounded-lg border border-[#e6e8ea]">
                                <h3 className="text-sm font-semibold text-[#434655] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    Müşteri Bilgileri
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">İsim:</span>
                                        <span className="text-sm font-semibold text-[#191c1e]">{cName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Şirket:</span>
                                        <span className="text-sm font-semibold text-[#191c1e]">{cCompany}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#434655]">Telefon:</span>
                                        <span className="text-sm font-semibold text-[#191c1e]">{cPhone}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note Section */}
                        {order.description && (
                            <div>
                                <h3 className="text-sm font-semibold text-[#434655] uppercase tracking-wider mb-3">Müşteri Notu</h3>
                                <div className="bg-[#f2f4f6] p-4 rounded-lg border border-[#e6e8ea] text-sm text-[#191c1e] italic">
                                    "{order.description}"
                                </div>
                            </div>
                        )}

                        {/* Financial Table */}
                        <div>
                            <h3 className="text-sm font-semibold text-[#434655] uppercase tracking-wider mb-3">Sipariş Kalemleri</h3>
                            <div className="overflow-hidden rounded-lg border border-[#e6e8ea]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#f2f4f6] text-xs text-[#434655] uppercase tracking-wider">
                                            <th className="p-4 font-semibold w-1/2">Açıklama</th>
                                            <th className="p-4 font-semibold text-center w-1/6">Miktar</th>
                                            <th className="p-4 font-semibold text-right w-1/6">Birim Fiyat</th>
                                            <th className="p-4 font-semibold text-right w-1/6">Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e6e8ea] text-sm text-[#191c1e]">
                                        <tr>
                                            <td className="p-4 font-medium">{order.title}</td>
                                            <td className="p-4 text-center">{order.quantity ? `${order.quantity} Adet` : '-'}</td>
                                            <td className="p-4 text-right">-</td>
                                            <td className="p-4 text-right font-semibold">{order.totalAmount ? `${order.totalAmount.toLocaleString("tr-TR")} ₺` : '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals & Payment Status */}
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 p-6 bg-[#f7f9fb] rounded-lg border border-[#2563eb]/20">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${order.paymentStatus === 'paid' ? 'bg-[#007d55]/20 text-[#006242]' : 'bg-[#ffdad6]/50 text-[#93000a]'}`}>
                                    <span className="material-symbols-outlined">{order.paymentStatus === 'paid' ? 'check_circle' : 'pending'}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-[#434655] uppercase tracking-wider">Ödeme Durumu</p>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold mt-1 ${order.paymentStatus === 'paid' ? 'bg-[#007d55] text-[#bdffdb]' : order.paymentStatus === 'partial' ? 'bg-[#ffda00] text-[#000000]' : 'bg-[#ba1a1a] text-[#ffffff]'}`}>
                                        {order.paymentStatus === 'paid' ? 'Ödenmiş' : order.paymentStatus === 'partial' ? 'Kısmi Ödeme' : 'Ödenmemiş'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-[#434655] mb-1">Genel Toplam</p>
                                <p className="text-3xl font-bold text-[#004ac6]">{order.totalAmount ? `${order.totalAmount.toLocaleString("tr-TR")} ₺` : '0,00 ₺'}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-center mt-6 print-hidden">
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-[#004ac6] text-white rounded-lg font-semibold hover:bg-[#003ea8] transition-colors">
                                <span className="material-symbols-outlined">print</span>
                                Fişi Yazdır
                            </button>
                        </div>
                    </div>

                    {/* Footer (Disclaimer) */}
                    <div className="p-6 border-t border-[#e6e8ea] bg-[#f2f4f6] text-center mt-auto">
                        <p className="text-xs text-[#434655] italic">
                            Bu belge bilgilendirme amaçlıdır, resmi bir geçerliliği yoktur.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}

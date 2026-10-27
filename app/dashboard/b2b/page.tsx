"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

const reqStatusConfig = {
    pending: { label: "Bekliyor", bg: "bg-yellow-50 dark:bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-500", icon: "schedule" },
    approved: { label: "Onaylandı", bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-500", icon: "check_circle" },
    rejected: { label: "Reddedildi", bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-500", icon: "cancel" },
    delivered: { label: "Teslim Edildi", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-500", icon: "inventory_2" },
}

export default function B2BPage() {
  const { t, tText } = useLanguage()
    const { hasPermission, currentBranch, isSuperAdmin, loading: authLoading } = useAuth()
    const router = useRouter()

    const [products, setProducts] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [isProductOpen, setIsProductOpen] = useState(false)
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)
    const [productForm, setProductForm] = useState({ name: "", description: "", unit: "Adet" })
    const [requestForm, setRequestForm] = useState({ productId: "", customProduct: "", quantity: 1, notes: "" })

    const [activeTab, setActiveTab] = useState("requests")

    useEffect(() => {
        if (!authLoading && !hasPermission("magaza", "read") && !isSuperAdmin) {
            router.replace("/dashboard")
        }
    }, [authLoading, hasPermission, isSuperAdmin, router])

    useEffect(() => {
        if (isSuperAdmin !== undefined) {
            setActiveTab(isSuperAdmin ? "products" : "requests")
        }
    }, [isSuperAdmin])

    useEffect(() => { loadProducts(); loadRequests() }, [currentBranch])

    const loadProducts = async () => {
        try {
            const res = await fetch("/api/b2b/products?includeInactive=true")
            if (res.ok) setProducts(await res.json())
        } catch { }
    }

    const loadRequests = async () => {
        try {
            const url = isSuperAdmin ? "/api/b2b/requests" : `/api/b2b/requests?branchId=${currentBranch?.id}`
            const res = await fetch(url)
            if (res.ok) setRequests(await res.json())
        } catch { }
    }

    const handleSaveProduct = async () => {
        if (!productForm.name) return
        setLoading(true)
        try {
            const method = editProduct ? "PUT" : "POST"
            const body = editProduct ? { ...productForm, id: editProduct.id } : productForm
            const res = await fetch("/api/b2b/products", {
                method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            })
            if (res.ok) { await loadProducts(); setIsProductOpen(false); setEditProduct(null); setProductForm({ name: "", description: "", unit: "Adet" }) }
        } finally { setLoading(false) }
    }

    const handleCreateRequest = async () => {
        if ((!requestForm.productId && !requestForm.customProduct) || !currentBranch) return
        setLoading(true)
        try {
            const res = await fetch("/api/b2b/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId: currentBranch.id, ...requestForm }),
            })
            if (res.ok) { await loadRequests(); setIsRequestOpen(false); setRequestForm({ productId: "", customProduct: "", quantity: 1, notes: "" }) }
        } finally { setLoading(false) }
    }

    const handleApprove = async (id: string, status: string) => {
        await fetch("/api/b2b/requests", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        })
        loadRequests()
    }

    const openEditProduct = (p: any) => {
        setEditProduct(p)
        setProductForm({ name: p.name, description: p.description || "", unit: p.unit || "Adet" })
        setIsProductOpen(true)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">B2B Mağaza</h1>
                <p className="text-sm text-gray-500">Ürün yönetimi, stok talebi ve hizmetler</p>
            </div>

            {/* Custom Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                {isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("products")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "products" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                    >
                        Ürünler
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "requests" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                >
                    {isSuperAdmin ? "Tüm Talepler" : "Taleplerim"}
                </button>
                {!isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("catalog")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "catalog" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                    >
                        Ürün Kataloğu
                    </button>
                )}
                {!isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("services")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "services" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"}`}
                    >
                        Hizmetlerimiz
                    </button>
                )}
            </div>

            {/* Products Tab */}
            {isSuperAdmin && activeTab === "products" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => { setEditProduct(null); setProductForm({ name: "", description: "", unit: "Adet" }); setIsProductOpen(true) }}
                            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Yeni Ürün
                        </button>
                    </div>
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Ürün Adı</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Açıklama</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Birim</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 font-medium text-right uppercase tracking-wider">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {products.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{p.description || "-"}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.unit}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${p.isActive ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                                                    {p.isActive ? "Aktif" : "Pasif"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditProduct(p)}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Henüz ürün eklenmedi</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Requests Tab */}
            {activeTab === "requests" && (
                <div className="space-y-4">
                    {!isSuperAdmin && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsRequestOpen(true)}
                                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Stok Talebi
                            </button>
                        </div>
                    )}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Ürün</th>
                                        {isSuperAdmin && <th className="px-6 py-4 font-medium uppercase tracking-wider">Şube</th>}
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Miktar</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Notlar</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Tarih</th>
                                        {isSuperAdmin && <th className="px-6 py-4 font-medium text-right uppercase tracking-wider">İşlem</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {requests.map(r => {
                                        const cfg = reqStatusConfig[r.status as keyof typeof reqStatusConfig]
                                        return (
                                            <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {r.product?.name || r.customProduct}
                                                    {!r.product && r.customProduct && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase font-semibold">Özel İletim</span>}
                                                </td>
                                                {isSuperAdmin && <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.branch?.name}</td>}
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.quantity} {r.product?.unit || "Adet"}</td>
                                                <td className="px-6 py-4 text-gray-500">{r.notes || "-"}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</td>
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {r.status === "pending" && (
                                                            <>
                                                                <button onClick={() => handleApprove(r.id, "approved")} className="px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg text-xs font-medium transition-colors">Onayla</button>
                                                                <button onClick={() => handleApprove(r.id, "rejected")} className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors">Reddet</button>
                                                            </>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 7 : 5} className="px-6 py-8 text-center text-gray-500">Henüz talep yok</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Catalog Tab */}
            {!isSuperAdmin && activeTab === "catalog" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.filter(p => p.isActive).map(p => (
                        <div key={p.id} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-primary flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{p.name}</h3>
                                {p.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-4">Birim: {p.unit}</p>
                            </div>
                            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 rounded-b-2xl">
                                <button
                                    onClick={() => { setRequestForm({ ...requestForm, productId: p.id, customProduct: "" }); setIsRequestOpen(true) }}
                                    className="w-full py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                                    Talep Et
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Services Tab */}
            {!isSuperAdmin && activeTab === "services" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Web Design */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">language</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Web Tasarım & Yazılım</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            İşletmenize özel, modern, mobil uyumlu ve SEO dostu web siteleri tasarlıyoruz. E-ticaret, kurumsal siteler ve özel yazılım çözümleri.
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Kurumsal Web Sitesi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> E-Ticaret Sistemleri</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Özel Web Uygulamaları</li>
                        </ul>
                    </div>

                    {/* Social Media */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">campaign</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sosyal Medya Yönetimi</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Markanızın dijital dünyadaki sesini güçlendiriyoruz. Stratejik içerik planlaması, görsel tasarım ve etkileşim yönetimi.
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> İçerik Üretimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Sayfa Yönetimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Reklam Optimizasyonu</li>
                        </ul>
                    </div>

                    {/* Digital Marketing & SEO */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">trending_up</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Dijital Pazarlama & SEO</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Arama motorlarında üst sıralara çıkın. Veriye dayalı Google Ads, Meta Ads ve SEO stratejileri ile satışlarınızı artırın.
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> SEO Danışmanlığı</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Google / Meta Reklamları</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">check</span> Dönüşüm Optimizasyonu</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Product Modal (Admin only) */}
            {isProductOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editProduct ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
                            <button onClick={() => setIsProductOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ürün Adı *</label>
                                <input type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ürün adı" className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama</label>
                                <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} rows={3} placeholder="Ürün açıklaması..." className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birim</label>
                                <select value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="Adet">Adet</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Litre">Litre</option>
                                    <option value="Kutu">Kutu</option>
                                    <option value="Paket">Paket</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setIsProductOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleSaveProduct} disabled={loading || !productForm.name} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal (Branch users) */}
            {isRequestOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stok / Hizmet Talebi Oluştur</h3>
                                <p className="text-sm text-gray-500">Talep etmek istediğiniz ürün veya hizmeti seçin</p>
                            </div>
                            <button onClick={() => setIsRequestOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ürün / Hizmet *</label>
                                <select 
                                    value={requestForm.productId === "" && requestForm.customProduct ? "custom" : requestForm.productId} 
                                    onChange={e => {
                                        if (e.target.value === "custom") {
                                            setRequestForm({ ...requestForm, productId: "", customProduct: "" })
                                        } else {
                                            setRequestForm({ ...requestForm, productId: e.target.value, customProduct: "" })
                                        }
                                    }} 
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="">Seçiniz</option>
                                    <option value="custom">Diğer (Serbest Metin)</option>
                                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {requestForm.productId === "" && (requestForm.customProduct !== undefined) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Özel Ürün/Hizmet Adı *</label>
                                    <input 
                                        type="text" 
                                        value={requestForm.customProduct} 
                                        onChange={e => setRequestForm({ ...requestForm, customProduct: e.target.value })} 
                                        placeholder="Örn: Google Reklam Danışmanlığı" 
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Miktar *</label>
                                <input type="number" min={1} value={requestForm.quantity} onChange={e => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notlar</label>
                                <textarea value={requestForm.notes} onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })} rows={2} placeholder="Ek bilgi..." className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setIsRequestOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleCreateRequest} disabled={loading || (!requestForm.productId && !requestForm.customProduct)} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Gönderiliyor..." : "Talep Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

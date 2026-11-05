"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { mockDatabase } from "@/lib/data/mockDatabase"

const reqStatusConfig = {
    pending: { label: "Bekliyor", bg: "bg-amber-500/15 border border-amber-500/30", text: "text-amber-300", icon: "schedule" },
    approved: { label: "Onaylandı", bg: "bg-emerald-500/15 border border-emerald-500/30", text: "text-emerald-300", icon: "check_circle" },
    rejected: { label: "Reddedildi", bg: "bg-rose-500/15 border border-rose-500/30", text: "text-rose-300", icon: "cancel" },
    delivered: { label: "Teslim Edildi", bg: "bg-sky-500/15 border border-sky-500/30", text: "text-sky-300", icon: "inventory_2" },
}

export default function B2BPage() {
  const { t, tText } = useLanguage()
    const { hasPermission, currentBranch, isSuperAdmin, loading: authLoading } = useAuth()
    const router = useRouter()

    const [products, setProducts] = useState<any[]>(() => mockDatabase.getProducts())
    const [requests, setRequests] = useState<any[]>(() => mockDatabase.getStockRequests())
    const [isProductOpen, setIsProductOpen] = useState(false)
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)
    const [productForm, setProductForm] = useState({ name: "", description: "", unit: "Adet" })
    const [requestForm, setRequestForm] = useState({ productId: "", customProduct: "", quantity: 1, notes: "" })

    const [activeTab, setActiveTab] = useState("requests")

    useEffect(() => {
        const handleDbChange = () => {
            setProducts(mockDatabase.getProducts())
            setRequests(mockDatabase.getStockRequests())
        }
        window.addEventListener("sunum-mockdb-change", handleDbChange)
        return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
    }, [])

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
            if (res.ok) {
                const data = await res.json()
                setProducts(Array.isArray(data) && data.length > 0 ? data : mockDatabase.getProducts())
            } else {
                setProducts(mockDatabase.getProducts())
            }
        } catch {
            setProducts(mockDatabase.getProducts())
        }
    }

    const loadRequests = async () => {
        try {
            const branchParam = currentBranch?.id ? `?branchId=${currentBranch.id}` : ""
            const url = isSuperAdmin ? "/api/b2b/requests" : `/api/b2b/requests${branchParam}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setRequests(Array.isArray(data) && data.length > 0 ? data : mockDatabase.getStockRequests())
            } else {
                setRequests(mockDatabase.getStockRequests())
            }
        } catch {
            setRequests(mockDatabase.getStockRequests())
        }
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
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">B2B Mağaza</h1>
                <p className="text-sm text-white/60">Ürün yönetimi, stok talebi ve hizmetler</p>
            </div>

            {/* Custom Tabs */}
            <div className="inline-flex flex-wrap gap-1 bg-black/30 backdrop-blur-md p-1 rounded-xl border border-white/10">
                {isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("products")}
                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "products" ? "bg-white/15 text-white shadow-sm rounded-lg" : "text-white/60 hover:text-white rounded-lg"}`}
                    >
                        Ürünler
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "requests" ? "bg-white/15 text-white shadow-sm rounded-lg" : "text-white/60 hover:text-white rounded-lg"}`}
                >
                    {isSuperAdmin ? "Tüm Talepler" : "Taleplerim"}
                </button>
                {!isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("catalog")}
                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "catalog" ? "bg-white/15 text-white shadow-sm rounded-lg" : "text-white/60 hover:text-white rounded-lg"}`}
                    >
                        Ürün Kataloğu
                    </button>
                )}
                {!isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("services")}
                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "services" ? "bg-white/15 text-white shadow-sm rounded-lg" : "text-white/60 hover:text-white rounded-lg"}`}
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
                            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 border border-white/15 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Yeni Ürün
                        </button>
                    </div>
                    <div className="glass-table-container overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/[0.03] text-white/50 font-semibold border-b border-white/10 text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Ürün Adı</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Açıklama</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Birim</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 font-semibold text-right uppercase tracking-wider">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                                            <td className="px-6 py-4 text-white/60">{p.description || "-"}</td>
                                            <td className="px-6 py-4 text-white/80">{p.unit}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-slate-500/15 text-slate-300 border border-slate-500/30"}`}>
                                                    {p.isActive ? "Aktif" : "Pasif"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditProduct(p)}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/50 hover:text-sky-300 hover:bg-sky-500/15 transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-white/50">Henüz ürün eklenmedi</td>
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
                                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 border border-white/15 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Stok Talebi
                            </button>
                        </div>
                    )}
                    <div className="glass-table-container overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/[0.03] text-white/50 font-semibold border-b border-white/10 text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Ürün</th>
                                        {isSuperAdmin && <th className="px-6 py-4 font-semibold uppercase tracking-wider">Şube</th>}
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Miktar</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Notlar</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider">Tarih</th>
                                        {isSuperAdmin && <th className="px-6 py-4 font-semibold text-right uppercase tracking-wider">İşlem</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(r => {
                                        const cfg = reqStatusConfig[r.status as keyof typeof reqStatusConfig]
                                        return (
                                            <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {r.product?.name || r.customProduct}
                                                    {!r.product && r.customProduct && <span className="ml-2 text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full uppercase font-semibold">Özel İletim</span>}
                                                </td>
                                                {isSuperAdmin && <td className="px-6 py-4 text-white/80">{r.branch?.name}</td>}
                                                <td className="px-6 py-4 text-white/80">{r.quantity} {r.product?.unit || "Adet"}</td>
                                                <td className="px-6 py-4 text-white/60">{r.notes || "-"}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white/60">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</td>
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {r.status === "pending" && (
                                                            <>
                                                                <button onClick={() => handleApprove(r.id, "approved")} className="px-3 py-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg text-xs font-medium transition-colors">Onayla</button>
                                                                <button onClick={() => handleApprove(r.id, "rejected")} className="px-3 py-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 rounded-lg text-xs font-medium transition-colors">Reddet</button>
                                                            </>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 7 : 5} className="px-6 py-8 text-center text-white/50">Henüz talep yok</td>
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
                        <motion.div
                            key={p.id}
                            whileHover={{ y: -4 }}
                            className="glass-card rounded-2xl overflow-hidden group flex flex-col"
                        >
                            {/* Top Visual / Icon Header Area with Unit/Price Badge */}
                            <div className="relative h-32 bg-gradient-to-br from-indigo-500/20 via-slate-900/40 to-sky-500/15 border-b border-white/10 flex items-center justify-center overflow-hidden">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                                <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                                    {p.price ? `${Number(p.price).toLocaleString("tr-TR")} ₺ / ${p.unit}` : `Birim: ${p.unit}`}
                                </span>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">{p.name}</h3>
                                {p.description && <p className="text-sm text-white/60 mt-1.5 line-clamp-2">{p.description}</p>}
                                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-white/50">
                                    <span>Stok Birimi</span>
                                    <span className="font-semibold text-white/80">{p.unit}</span>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                                <button
                                    onClick={() => { setRequestForm({ ...requestForm, productId: p.id, customProduct: "" }); setIsRequestOpen(true) }}
                                    className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-200 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                                    Talep Et
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Services Tab */}
            {!isSuperAdmin && activeTab === "services" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Web Design */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="glass-card rounded-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">language</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Web Tasarım & Yazılım</h3>
                        <p className="text-sm text-white/60 mb-4">
                            İşletmenize özel, modern, mobil uyumlu ve SEO dostu web siteleri tasarlıyoruz. E-ticaret, kurumsal siteler ve özel yazılım çözümleri.
                        </p>
                        <ul className="text-sm text-white/80 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Kurumsal Web Sitesi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> E-Ticaret Sistemleri</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Özel Web Uygulamaları</li>
                        </ul>
                    </motion.div>

                    {/* Social Media */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="glass-card rounded-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">campaign</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Sosyal Medya Yönetimi</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Markanızın dijital dünyadaki sesini güçlendiriyoruz. Stratejik içerik planlaması, görsel tasarım ve etkileşim yönetimi.
                        </p>
                        <ul className="text-sm text-white/80 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> İçerik Üretimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Sayfa Yönetimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Reklam Optimizasyonu</li>
                        </ul>
                    </motion.div>

                    {/* Digital Marketing & SEO */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="glass-card rounded-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">trending_up</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Dijital Pazarlama & SEO</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Arama motorlarında üst sıralara çıkın. Veriye dayalı Google Ads, Meta Ads ve SEO stratejileri ile satışlarınızı artırın.
                        </p>
                        <ul className="text-sm text-white/80 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> SEO Danışmanlığı</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Google / Meta Reklamları</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Dönüşüm Optimizasyonu</li>
                        </ul>
                    </motion.div>
                </div>
            )}

            {/* Product Modal (Admin only) */}
            {isProductOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{editProduct ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
                            <button onClick={() => setIsProductOpen(false)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Ürün Adı *</label>
                                <input type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ürün adı" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Açıklama</label>
                                <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} rows={3} placeholder="Ürün açıklaması..." className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Birim</label>
                                <select value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="Adet" className="bg-slate-900 text-white">Adet</option>
                                    <option value="Kg" className="bg-slate-900 text-white">Kg</option>
                                    <option value="Litre" className="bg-slate-900 text-white">Litre</option>
                                    <option value="Kutu" className="bg-slate-900 text-white">Kutu</option>
                                    <option value="Paket" className="bg-slate-900 text-white">Paket</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
                            <button onClick={() => setIsProductOpen(false)} className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleSaveProduct} disabled={loading || !productForm.name} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal (Branch users) */}
            {isRequestOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Stok / Hizmet Talebi Oluştur</h3>
                                <p className="text-sm text-white/60">Talep etmek istediğiniz ürün veya hizmeti seçin</p>
                            </div>
                            <button onClick={() => setIsRequestOpen(false)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Ürün / Hizmet *</label>
                                <select 
                                    value={requestForm.productId === "" && requestForm.customProduct ? "custom" : requestForm.productId} 
                                    onChange={e => {
                                        if (e.target.value === "custom") {
                                            setRequestForm({ ...requestForm, productId: "", customProduct: "" })
                                        } else {
                                            setRequestForm({ ...requestForm, productId: e.target.value, customProduct: "" })
                                        }
                                    }} 
                                    className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="" className="bg-slate-900 text-white">Seçiniz</option>
                                    <option value="custom" className="bg-slate-900 text-white">Diğer (Serbest Metin)</option>
                                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>)}
                                </select>
                            </div>
                            {requestForm.productId === "" && (requestForm.customProduct !== undefined) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/80">Özel Ürün/Hizmet Adı *</label>
                                    <input 
                                        type="text" 
                                        value={requestForm.customProduct} 
                                        onChange={e => setRequestForm({ ...requestForm, customProduct: e.target.value })} 
                                        placeholder="Örn: Google Reklam Danışmanlığı" 
                                        className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" 
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Miktar *</label>
                                <input type="number" min={1} value={requestForm.quantity} onChange={e => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Notlar</label>
                                <textarea value={requestForm.notes} onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })} rows={2} placeholder="Ek bilgi..." className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
                            <button onClick={() => setIsRequestOpen(false)} className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleCreateRequest} disabled={loading || (!requestForm.productId && !requestForm.customProduct)} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Gönderiliyor..." : "Talep Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

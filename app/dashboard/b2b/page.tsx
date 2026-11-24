"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

const reqStatusConfig = {
    pending: { label: "Bekliyor", bg: "bg-zinc-500/15 border border-[--line]", text: "text-zinc-300", icon: "schedule" },
    approved: { label: "Onaylandı", bg: "bg-[--brand]/15 border border-[--brand-line]", text: "text-[--brand]", icon: "check_circle" },
    rejected: { label: "Reddedildi", bg: "bg-rose-500/15 border border-rose-500/30", text: "text-rose-300", icon: "cancel" },
    delivered: { label: "Teslim Edildi", bg: "bg-teal-500/15 border border-teal-500/30", text: "text-teal-300", icon: "inventory_2" },
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
        <StaggerContainer className="space-y-6">
            <StaggerItem>
                <h1 className="text-2xl lg:text-3xl font-semibold text-white mb-1 tracking-tight">B2B Mağaza</h1>
                <p className="text-sm text-zinc-400">Ürün yönetimi, stok talebi ve hizmetler</p>
            </StaggerItem>

            {/* Borderless KPI Strip */}
            <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-[--line]">
                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-zinc-500">inventory_2</span>
                        <span>TOPLAM ÜRÜN</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={products.length} />
                        </span>
                        <span className="bg-[--brand]/10 text-[--brand] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Katalog
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-[--brand]">check_circle</span>
                        <span>AKTİF ÜRÜN</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={products.filter(p => p.isActive).length} />
                        </span>
                        <span className="bg-[--brand]/10 text-[--brand] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Siparişe Açık
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-zinc-500">schedule</span>
                        <span>BEKLEYEN TALEP</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={requests.filter(r => r.status === "pending").length} />
                        </span>
                        <span className="bg-[--muted-bg] text-zinc-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            İnceleniyor
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-2">
                        <span className="material-symbols-outlined text-[15px] text-zinc-500">shopping_bag</span>
                        <span>TOPLAM TALEP</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light text-white tracking-tight">
                            <AnimatedNumber value={requests.length} />
                        </span>
                        <span className="bg-[--brand]/10 text-[--brand] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                            Kayıtlı
                        </span>
                    </div>
                </div>
            </StaggerItem>

            {/* Animated Tabs */}
            <StaggerItem>
                <div className="inline-flex flex-wrap gap-1 bg-[white] p-1 rounded-full border border-[--line]">
                    {isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab("products")}
                            className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "products" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                        >
                            {activeTab === "products" && (
                                <motion.span
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/10 rounded-full border border-[--line]"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">Ürünler</span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab("requests")}
                        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "requests" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                        {activeTab === "requests" && (
                            <motion.span
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/10 rounded-full border border-[--line]"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{isSuperAdmin ? "Tüm Talepler" : "Taleplerim"}</span>
                    </button>
                    {!isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab("catalog")}
                            className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "catalog" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                        >
                            {activeTab === "catalog" && (
                                <motion.span
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/10 rounded-full border border-[--line]"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">Ürün Kataloğu</span>
                        </button>
                    )}
                    {!isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab("services")}
                            className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === "services" ? "text-white" : "text-zinc-400 hover:text-white"}`}
                        >
                            {activeTab === "services" && (
                                <motion.span
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/10 rounded-full border border-[--line]"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">Hizmetlerimiz</span>
                        </button>
                    )}
                </div>
            </StaggerItem>

            {/* Products Tab */}
            {isSuperAdmin && activeTab === "products" && (
                <StaggerItem className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => { setEditProduct(null); setProductForm({ name: "", description: "", unit: "Adet" }); setIsProductOpen(true) }}
                            className="bg-[#1267E6] hover:bg-[#1267E6] text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Yeni Ürün
                        </button>
                    </div>
                    <div className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[--page] text-zinc-400 font-semibold border-b border-[--line] text-[11px]">
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
                                        <tr key={p.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-[--brand] hover:bg-white transition-all group">
                                            <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                                            <td className="px-6 py-4 text-zinc-400">{p.description || "-"}</td>
                                            <td className="px-6 py-4 text-zinc-300">{p.unit}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-[--brand]/15 text-[--brand] border border-[--brand-line]" : "bg-zinc-500/15 text-zinc-400 border border-[--line]"}`}>
                                                    {p.isActive ? "Aktif" : "Pasif"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditProduct(p)}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[--brand] hover:bg-[--brand]/15 transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Henüz ürün eklenmedi</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </StaggerItem>
            )}

            {/* Requests Tab */}
            {activeTab === "requests" && (
                <StaggerItem className="space-y-4">
                    {!isSuperAdmin && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsRequestOpen(true)}
                                className="bg-[#1267E6] hover:bg-[#1267E6] text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Stok Talebi
                            </button>
                        </div>
                    )}
                    <div className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[--page] text-zinc-400 font-semibold border-b border-[--line] text-[11px]">
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
                                            <tr key={r.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-[--brand] hover:bg-white transition-all group">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {r.product?.name || r.customProduct}
                                                    {!r.product && r.customProduct && <span className="ml-2 text-[10px] bg-[--brand]/15 text-[--brand] border border-[--brand-line] px-2 py-0.5 rounded-full uppercase font-semibold">Özel İletim</span>}
                                                </td>
                                                {isSuperAdmin && <td className="px-6 py-4 text-zinc-300">{r.branch?.name}</td>}
                                                <td className="px-6 py-4 text-zinc-300">{r.quantity} {r.product?.unit || "Adet"}</td>
                                                <td className="px-6 py-4 text-zinc-400">{r.notes || "-"}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</td>
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {r.status === "pending" && (
                                                            <>
                                                                <button onClick={() => handleApprove(r.id, "approved")} className="px-3 py-1.5 bg-[--brand]/15 text-[--brand] border border-[--brand-line] hover:bg-[--brand]/25 rounded-full text-xs font-medium transition-colors">Onayla</button>
                                                                <button onClick={() => handleApprove(r.id, "rejected")} className="px-3 py-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 rounded-full text-xs font-medium transition-colors">Reddet</button>
                                                            </>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 7 : 5} className="px-6 py-8 text-center text-zinc-500">Henüz talep yok</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </StaggerItem>
            )}

            {/* Catalog Tab */}
            {!isSuperAdmin && activeTab === "catalog" && (
                <StaggerItem className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.filter(p => p.isActive).map(p => (
                        <motion.div
                            key={p.id}
                            whileHover={{ y: -4 }}
                            className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl overflow-hidden group flex flex-col"
                        >
                            {/* Top Visual / Icon Header Area with Unit/Price Badge */}
                            <div className="relative h-32 bg-gradient-to-br from-[--brand-soft] via-[--page] to-[--brand-soft] border-b border-[--line] flex items-center justify-center overflow-hidden">
                                <div className="w-14 h-14 rounded-2xl bg-[--muted-bg] backdrop-blur-md border border-[--line] text-[--brand] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                                <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-[--brand]/15 text-[--brand] border border-[--brand-line] backdrop-blur-md">
                                    {p.price ? `${Number(p.price).toLocaleString("tr-TR")} ₺ / ${p.unit}` : `Birim: ${p.unit}`}
                                </span>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-semibold text-white group-hover:text-[--brand] transition-colors">{p.name}</h3>
                                {p.description && <p className="text-sm text-zinc-400 mt-1.5 line-clamp-2">{p.description}</p>}
                                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-zinc-500">
                                    <span>Stok Birimi</span>
                                    <span className="font-semibold text-zinc-300">{p.unit}</span>
                                </div>
                            </div>

                            <div className="p-4 border-t border-[--line] bg-white/[0.01]">
                                <button
                                    onClick={() => { setRequestForm({ ...requestForm, productId: p.id, customProduct: "" }); setIsRequestOpen(true) }}
                                    className="w-full py-2.5 bg-[--muted-bg] border border-[--line] hover:bg-[--brand]/15 hover:border-[--brand-line] hover:text-[--brand] text-white rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                                    Talep Et
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </StaggerItem>
            )}

            {/* Services Tab */}
            {!isSuperAdmin && activeTab === "services" && (
                <StaggerItem className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Web Design */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[--brand]/10 border border-[--brand-line] text-[--brand] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">language</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Web Tasarım & Yazılım</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            İşletmenize özel, modern, mobil uyumlu ve SEO dostu web siteleri tasarlıyoruz. E-ticaret, kurumsal siteler ve özel yazılım çözümleri.
                        </p>
                        <ul className="text-sm text-zinc-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Kurumsal Web Sitesi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> E-Ticaret Sistemleri</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Özel Web Uygulamaları</li>
                        </ul>
                    </motion.div>

                    {/* Social Media */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">campaign</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Sosyal Medya Yönetimi</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Markanızın dijital dünyadaki sesini güçlendiriyoruz. Stratejik içerik planlaması, görsel tasarım ve etkileşim yönetimi.
                        </p>
                        <ul className="text-sm text-zinc-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> İçerik Üretimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Sayfa Yönetimi</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Reklam Optimizasyonu</li>
                        </ul>
                    </motion.div>

                    {/* Digital Marketing & SEO */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-2xl p-6 group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[--brand]/10 border border-[--brand-line] text-[--brand] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[24px]">trending_up</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Dijital Pazarlama & SEO</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Arama motorlarında üst sıralara çıkın. Veriye dayalı Google Ads, Meta Ads ve SEO stratejileri ile satışlarınızı artırın.
                        </p>
                        <ul className="text-sm text-zinc-300 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> SEO Danışmanlığı</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Google / Meta Reklamları</li>
                            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-[--brand]">check</span> Dönüşüm Optimizasyonu</li>
                        </ul>
                    </motion.div>
                </StaggerItem>
            )}

            {/* Product Modal (Admin only) */}
            {isProductOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-[white] border border-[--line] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-[--line] bg-white/[0.01] flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">{editProduct ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
                            <button onClick={() => setIsProductOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[--muted-bg] rounded-lg transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Ürün Adı *</label>
                                <input type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ürün adı" className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Açıklama</label>
                                <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} rows={3} placeholder="Ürün açıklaması..." className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Birim</label>
                                <select value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all">
                                    <option value="Adet" className="bg-[white] text-white">Adet</option>
                                    <option value="Kg" className="bg-[white] text-white">Kg</option>
                                    <option value="Litre" className="bg-[white] text-white">Litre</option>
                                    <option value="Kutu" className="bg-[white] text-white">Kutu</option>
                                    <option value="Paket" className="bg-[white] text-white">Paket</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[--line] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsProductOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-[--muted-bg] border border-[--line] hover:bg-white/[0.08] hover:text-white rounded-full transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleSaveProduct} disabled={loading || !productForm.name} className="px-5 py-2 text-sm font-medium text-white bg-[#1267E6] hover:bg-[#1267E6] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal (Branch users) */}
            {isRequestOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="backdrop-blur-xl bg-[white] border border-[--line] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-[--line] bg-white/[0.01] flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Stok / Hizmet Talebi Oluştur</h3>
                                <p className="text-sm text-zinc-400">Talep etmek istediğiniz ürün veya hizmeti seçin</p>
                            </div>
                            <button onClick={() => setIsRequestOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[--muted-bg] rounded-lg transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Ürün / Hizmet *</label>
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
                                    <option value="" className="bg-[white] text-white">Seçiniz</option>
                                    <option value="custom" className="bg-[white] text-white">Diğer (Serbest Metin)</option>
                                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id} className="bg-[white] text-white">{p.name}</option>)}
                                </select>
                            </div>
                            {requestForm.productId === "" && (requestForm.customProduct !== undefined) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Özel Ürün/Hizmet Adı *</label>
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
                                <label className="text-sm font-medium text-zinc-300">Miktar *</label>
                                <input type="number" min={1} value={requestForm.quantity} onChange={e => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })} className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Notlar</label>
                                <textarea value={requestForm.notes} onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })} rows={2} placeholder="Ek bilgi..." className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none transition-all resize-none" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[--line] bg-white/[0.01] flex justify-end gap-3">
                            <button onClick={() => setIsRequestOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 bg-[--muted-bg] border border-[--line] hover:bg-white/[0.08] hover:text-white rounded-full transition-colors">{tText("common.cancel", "İptal")}</button>
                            <button onClick={handleCreateRequest} disabled={loading || (!requestForm.productId && !requestForm.customProduct)} className="px-5 py-2 text-sm font-medium text-white bg-[#1267E6] hover:bg-[#1267E6] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Gönderiliyor..." : "Talep Gönder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </StaggerContainer>
    )
}

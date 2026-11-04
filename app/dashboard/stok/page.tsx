"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw
} from "lucide-react"

import { InventoryModuleNav } from "./components/InventoryModuleNav"
import { ExecutiveAiBanner } from "./components/ExecutiveAiBanner"
import { StockSummaryCards } from "./components/StockSummaryCards"
import { StockTable } from "./components/StockTable"
import { CreateItemModal } from "./components/CreateItemModal"
import { QuickStockMovementModal } from "./components/QuickStockMovementModal"
import { ItemDetailDrawer } from "./components/ItemDetailDrawer"

export default function StockDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aiRefreshKey, setAiRefreshKey] = useState(0)
  const [items, setItems] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalStockValue: 0,
    criticalStockCount: 0,
    expiringCount: 0,
    activeWarehouseCount: 0,
    totalItemCount: 0
  })

  // Modals & Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isQuickMoveOpen, setIsQuickMoveOpen] = useState(false)
  const [quickMoveMode, setQuickMoveMode] = useState<"IN" | "OUT">("IN")
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Gerçek veritabanından veri çekme
  const fetchInventory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch("/api/inventory")
      const data = await res.json()
      if (data.success) {
        setItems(data.items || [])
        setWarehouses(data.warehouses || [])
        setStats(
          data.stats || {
            totalStockValue: 0,
            criticalStockCount: 0,
            expiringCount: 0,
            activeWarehouseCount: 0,
            totalItemCount: 0
          }
        )
        setAiRefreshKey(prev => prev + 1)
      } else {
        toast.error("Stok verileri alınamadı: " + (data.error || "Bilinmeyen hata"))
      }
    } catch (err: any) {
      console.error("fetchInventory error:", err)
      toast.error("Sunucu ile iletişim kurulamadı.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  // Hızlı hareket kısayolu (tablodan veya üst bardan tetiklenebilir)
  const handleOpenQuickMove = (mode: "IN" | "OUT", itemId?: string) => {
    setQuickMoveMode(mode)
    if (itemId) {
      setSelectedItemId(itemId)
    }
    setIsQuickMoveOpen(true)
  }

  // Detay çekmecesini aç
  const handleOpenDetail = (itemId: string) => {
    setSelectedItemId(itemId)
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════════
          0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON
         ══════════════════════════════════════════════════════════ */}
      <InventoryModuleNav />

      {/* ══════════════════════════════════════════════════════════
          1. GERÇEK VERİTABANI ANALİZİNDEN BESLENEN 2 CÜMLELİK
             "AKILLI YÖNETİCİ ÖZETİ VE ÖNERİ" BANDI (FAZ 4)
         ══════════════════════════════════════════════════════════ */}
      <ExecutiveAiBanner
        refreshTrigger={aiRefreshKey}
        onQuickStockEntry={itemId => handleOpenQuickMove("IN", itemId)}
      />

      {/* ══════════════════════════════════════════════════════════
          2. ÜST BAR: BAŞLIK + 3 NET ÇALIŞAN AKSİYON BUTONU
         ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Stok Kartları & Envanter Yönetimi
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInventory(true)}
              disabled={loading || refreshing}
              className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              title="Verileri Yenile"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            Gerçek zamanlı depo bakiyeleri, FIFO maliyet katmanları ve parti izlenebilirliği
          </p>
        </div>

        {/* 3 NET ÇALIŞAN AKSİYON BUTONU */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BUTON 1: + YENİ ÜRÜN TANIMLA */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs h-9 gap-1.5 shadow-sm rounded-xl cursor-pointer"
          >
            <PackagePlus className="h-4 w-4" />
            + Yeni Ürün Tanımla
          </Button>

          {/* BUTON 2: HIZLI STOK GİRİŞİ (ALIŞ/İRSALİYE) */}
          <Button
            onClick={() => handleOpenQuickMove("IN")}
            size="sm"
            variant="outline"
            className="bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200 font-medium text-xs h-9 gap-1.5 rounded-xl cursor-pointer"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Hızlı Stok Girişi (Alış/İrsaliye)
          </Button>

          {/* BUTON 3: HIZLI STOK ÇIKIŞI (SATIŞ/SARF) */}
          <Button
            onClick={() => handleOpenQuickMove("OUT")}
            size="sm"
            variant="outline"
            className="bg-sky-500/15 border-sky-400/30 text-sky-300 hover:bg-sky-500/25 hover:text-sky-200 font-medium text-xs h-9 gap-1.5 rounded-xl cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4" />
            Hızlı Stok Çıkışı (Satış/Sarf)
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. 4 NET ÖZET KART
         ══════════════════════════════════════════════════════════ */}
      <StockSummaryCards stats={stats} loading={loading} />

      {/* ══════════════════════════════════════════════════════════
          4. SADELEŞTİRİLMİŞ 6 SÜTUNLU ANA STOK TABLOSU
         ══════════════════════════════════════════════════════════ */}
      <StockTable
        items={items}
        loading={loading}
        onSelectItem={handleOpenDetail}
        onQuickMove={handleOpenQuickMove}
      />

      {/* ══════════════════════════════════════════════════════════
          5. CANLI VERİTABANI DETAY ÇEKMECESİ (DRAWER)
         ══════════════════════════════════════════════════════════ */}
      <ItemDetailDrawer
        itemId={selectedItemId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onQuickMove={(mode, itId) => {
          setIsDrawerOpen(false)
          handleOpenQuickMove(mode, itId)
        }}
      />

      {/* ══════════════════════════════════════════════════════════
          6. "+ YENİ ÜRÜN TANIMLA" MODAL (4 TEMEL ALAN + GELİŞMİŞ)
         ══════════════════════════════════════════════════════════ */}
      <CreateItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        warehouses={warehouses}
        existingItems={items}
        onSuccess={() => {
          toast.success("Yeni ürün başarıyla kaydedildi.")
          fetchInventory(true)
        }}
      />

      {/* ══════════════════════════════════════════════════════════
          7. HIZLI STOK GİRİŞİ / ÇIKIŞI MODAL
         ══════════════════════════════════════════════════════════ */}
      <QuickStockMovementModal
        isOpen={isQuickMoveOpen}
        onClose={() => setIsQuickMoveOpen(false)}
        mode={quickMoveMode}
        items={items}
        warehouses={warehouses}
        preselectedItemId={selectedItemId || undefined}
        onSuccess={() => {
          toast.success("Stok hareketi başarıyla işlendi.")
          fetchInventory(true)
        }}
      />
    </div>
  )
}

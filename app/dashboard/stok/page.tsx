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
import { mockDatabase } from "@/lib/data/mockDatabase"

export default function StockDashboardPage() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [aiRefreshKey, setAiRefreshKey] = useState(0)
  const [items, setItems] = useState<any[]>(() => mockDatabase.getInventoryItems())
  const [warehouses, setWarehouses] = useState<any[]>(() => mockDatabase.getWarehouses())
  const [stats, setStats] = useState(() => mockDatabase.getInventoryStats())

  // Modals & Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isQuickMoveOpen, setIsQuickMoveOpen] = useState(false)
  const [quickMoveMode, setQuickMoveMode] = useState<"IN" | "OUT">("IN")
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Canlı Reaktif Mock DB Dinleyicisi
  useEffect(() => {
    const handleDbChange = () => {
      setItems(mockDatabase.getInventoryItems())
      setWarehouses(mockDatabase.getWarehouses())
      setStats(mockDatabase.getInventoryStats())
    }
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  // Gerçek veritabanından veri çekme (Hata veya boş gelirse mockDatabase'e zarifçe döner)
  const fetchInventory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch("/api/inventory")
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
          setWarehouses(data.warehouses || mockDatabase.getWarehouses())
          setStats(data.stats || mockDatabase.getInventoryStats())
          setAiRefreshKey(prev => prev + 1)
          return
        }
      }
      // Demo Fallback
      setItems(mockDatabase.getInventoryItems())
      setWarehouses(mockDatabase.getWarehouses())
      setStats(mockDatabase.getInventoryStats())
    } catch (err: any) {
      console.warn("fetchInventory fallback to demo:", err)
      setItems(mockDatabase.getInventoryItems())
      setWarehouses(mockDatabase.getWarehouses())
      setStats(mockDatabase.getInventoryStats())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory(true)
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
    <div className="space-y-6">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Stok Kartları & Envanter Yönetimi
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInventory(true)}
              disabled={loading || refreshing}
              className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-full cursor-pointer"
              title="Verileri Yenile"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#34D399]" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerçek zamanlı depo bakiyeleri, FIFO maliyet katmanları ve parti izlenebilirliği
          </p>
        </div>

        {/* 3 NET ÇALIŞAN AKSİYON BUTONU */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BUTON 1: + YENİ ÜRÜN TANIMLA */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9 px-4 gap-1.5 rounded-full shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <PackagePlus className="h-4 w-4" />
            Yeni Ürün Tanımla
          </Button>

          {/* BUTON 2: HIZLI STOK GİRİŞİ (ALIŞ/İRSALİYE) */}
          <Button
            onClick={() => handleOpenQuickMove("IN")}
            size="sm"
            variant="outline"
            className="bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] hover:text-white text-xs h-9 px-3.5 gap-1.5 rounded-full cursor-pointer"
          >
            <ArrowDownLeft className="h-4 w-4 text-[#34D399]" />
            Hızlı Stok Girişi
          </Button>

          {/* BUTON 3: HIZLI STOK ÇIKIŞI (SATIŞ/SARF) */}
          <Button
            onClick={() => handleOpenQuickMove("OUT")}
            size="sm"
            variant="outline"
            className="bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] hover:text-white text-xs h-9 px-3.5 gap-1.5 rounded-full cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-400" />
            Hızlı Stok Çıkışı
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. 4 NET ÖZET KART (KUTUSUZ / BORDERLESS KPI STRIP)
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

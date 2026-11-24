"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  IconPlus,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconRefresh
} from "@/components/ui/app-icons"

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

  // Veritabanından veri çekme (Demo fallback mantığı korunur)
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

  // Hızlı hareket kısayolu
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
    <div className="space-y-8">
      {/* 0. MODÜL İÇİ NAVİGASYON (AÇIK CAM TEMA) */}
      <InventoryModuleNav />

      {/* 1. AI YÖNETİCİ ÖZETİ BARI (FAZ 4) */}
      <ExecutiveAiBanner
        refreshTrigger={aiRefreshKey}
        onQuickStockEntry={itemId => handleOpenQuickMove("IN", itemId)}
      />

      {/* 2. BAŞLIK BÖLGESİ: BAŞLIK + TEK BİRİNCİL BUTON & İKİNCİL BUTONLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[--text]">
              Stok Kartları & Envanter Yönetimi
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInventory(true)}
              disabled={loading || refreshing}
              className="h-8 w-8 p-0 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-full cursor-pointer"
              title="Verileri Yenile"
            >
              <IconRefresh size={15} className={refreshing ? "animate-spin text-[--brand]" : ""} />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-[--text-muted] mt-1">
            Gerçek zamanlı depo bakiyeleri, FIFO maliyet katmanları ve parti izlenebilirliği
          </p>
        </div>

        {/* AKSİYON BUTONLARI: SAYFA BAŞINA TEK BİRİNCİL BUTON */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* TEK BİRİNCİL BUTON */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-4 gap-1.5 rounded-xl cursor-pointer"
          >
            <IconPlus size={15} />
            Yeni Ürün Tanımla
          </Button>

          {/* İKİNCİL BUTON: HIZLI STOK GİRİŞİ */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenQuickMove("IN")}
            className="h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
          >
            <IconArrowDownLeft size={15} className="text-[--brand]" />
            Hızlı Stok Girişi
          </Button>

          {/* İKİNCİL BUTON: HIZLI STOK ÇIKIŞI */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenQuickMove("OUT")}
            className="h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
          >
            <IconArrowUpRight size={15} className="text-[--text-muted]" />
            Hızlı Stok Çıkışı
          </Button>
        </div>
      </div>

      {/* 3. KUTUSUZ 4'LÜ KPI ŞERİDİ (B4) */}
      <StockSummaryCards stats={stats} loading={loading} />

      {/* 4. SADELEŞTİRİLMİŞ 6 SÜTUNLU ANA STOK TABLOSU (FAZ 4) */}
      <StockTable
        items={items}
        loading={loading}
        onSelectItem={handleOpenDetail}
        onQuickMove={handleOpenQuickMove}
      />

      {/* 5. DETAY ÇEKMECESİ (DRAWER) */}
      <ItemDetailDrawer
        itemId={selectedItemId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onQuickMove={(mode, itId) => {
          setIsDrawerOpen(false)
          handleOpenQuickMove(mode, itId)
        }}
      />

      {/* 6. YENİ ÜRÜN TANIMLA MODAL */}
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

      {/* 7. HIZLI STOK GİRİŞİ / ÇIKIŞI MODAL */}
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

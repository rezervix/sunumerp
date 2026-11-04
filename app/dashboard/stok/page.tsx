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

import { StockSummaryCards } from "./components/StockSummaryCards"
import { StockTable } from "./components/StockTable"
import { CreateItemModal } from "./components/CreateItemModal"
import { QuickStockMovementModal } from "./components/QuickStockMovementModal"
import { ItemDetailDrawer } from "./components/ItemDetailDrawer"

export default function StockDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ══════════════════════════════════════════════════════════
          1. ÜST BAR: BAŞLIK + 3 NET ÇALIŞAN AKSİYON BUTONU
         ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Stok ve Envanter Yönetimi
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInventory(true)}
              disabled={loading || refreshing}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              title="Verileri Yenile"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerçek zamanlı depo bakiyeleri, FIFO maliyet katmanları ve parti izlenebilirliği
          </p>
        </div>

        {/* 3 NET ÇALIŞAN AKSİYON BUTONU */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BUTON 1: + YENİ ÜRÜN TANIMLA */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 gap-1.5 shadow-xs"
          >
            <PackagePlus className="h-4 w-4" />
            + Yeni Ürün Tanımla
          </Button>

          {/* BUTON 2: HIZLI STOK GİRİŞİ (ALIŞ/İRSALİYE) */}
          <Button
            onClick={() => handleOpenQuickMove("IN")}
            size="sm"
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium text-xs h-9 gap-1.5"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Hızlı Stok Girişi (Alış/İrsaliye)
          </Button>

          {/* BUTON 3: HIZLI STOK ÇIKIŞI (SATIŞ/SARF) */}
          <Button
            onClick={() => handleOpenQuickMove("OUT")}
            size="sm"
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 font-medium text-xs h-9 gap-1.5"
          >
            <ArrowUpRight className="h-4 w-4" />
            Hızlı Stok Çıkışı (Satış/Sarf)
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. 4 NET ÖZET KART
         ══════════════════════════════════════════════════════════ */}
      <StockSummaryCards stats={stats} loading={loading} />

      {/* ══════════════════════════════════════════════════════════
          3. SADELEŞTİRİLMİŞ 6 SÜTUNLU ANA STOK TABLOSU
         ══════════════════════════════════════════════════════════ */}
      <StockTable
        items={items}
        loading={loading}
        onSelectItem={handleOpenDetail}
        onQuickMove={handleOpenQuickMove}
      />

      {/* ══════════════════════════════════════════════════════════
          4. CANLI VERİTABANI DETAY ÇEKMECESİ (DRAWER)
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
          5. "+ YENİ ÜRÜN TANIMLA" MODAL (4 TEMEL ALAN + GELİŞMİŞ)
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
          6. HIZLI STOK GİRİŞİ / ÇIKIŞI MODAL
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

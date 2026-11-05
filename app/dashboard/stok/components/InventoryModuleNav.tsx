"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Boxes,
  Warehouse,
  ShoppingCart,
  Globe,
  Sparkles
} from "lucide-react"

const MODULE_TABS = [
  {
    id: "stok",
    label: "1. Stok Kartları & Envanter",
    href: "/dashboard/stok",
    icon: Boxes
  },
  {
    id: "wms",
    label: "2. Depo Operasyonları & Sayım (WMS)",
    href: "/dashboard/wms",
    icon: Warehouse
  },
  {
    id: "satinalma",
    label: "3. Satın Alma & Otomatik Sipariş",
    href: "/dashboard/satinalma",
    icon: ShoppingCart
  },
  {
    id: "omnichannel",
    label: "4. Çok Kanallı Satış & Sevkiyat",
    href: "/dashboard/omnichannel",
    icon: Globe
  },
  {
    id: "stok-ai",
    label: "5. AI Analiz & Ayarlar",
    href: "/dashboard/stok-ai",
    matchPaths: ["/dashboard/stok-ai", "/dashboard/envanter-ekosistem"],
    icon: Sparkles
  }
]

export function InventoryModuleNav() {
  const pathname = usePathname()

  return (
    <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-1.5 overflow-x-auto shadow-2xl">
      <div className="flex items-center gap-1.5 min-w-max">
        {MODULE_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.matchPaths
            ? tab.matchPaths.some(p => pathname?.startsWith(p))
            : pathname === tab.href || (tab.href !== "/dashboard/stok" && pathname?.startsWith(tab.href))

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive ? "text-white font-semibold" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="inventoryModuleNavActive"
                  className="absolute inset-0 bg-white/[0.08] border border-white/[0.12] rounded-xl shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#34D399]" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

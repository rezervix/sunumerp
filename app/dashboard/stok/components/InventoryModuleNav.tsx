"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
    <div className="glass-panel rounded-2xl p-1.5 overflow-x-auto">
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-indigo-500/10 text-white border-emerald-400/30 shadow-sm"
                  : "text-white/65 border-transparent hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-white/50"}`} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}


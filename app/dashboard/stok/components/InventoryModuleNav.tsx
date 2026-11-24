"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  IconBoxes,
  IconWarehouse,
  IconShoppingBag,
  IconGlobe,
  IconSparkles
} from "@/components/ui/app-icons"

const MODULE_TABS = [
  {
    id: "stok",
    label: "Stok & Envanter",
    href: "/dashboard/stok",
    icon: IconBoxes
  },
  {
    id: "wms",
    label: "Depo (WMS)",
    href: "/dashboard/wms",
    icon: IconWarehouse
  },
  {
    id: "satinalma",
    label: "Satın Alma",
    href: "/dashboard/satinalma",
    icon: IconShoppingBag
  },
  {
    id: "omnichannel",
    label: "Çok Kanallı Satış",
    href: "/dashboard/omnichannel",
    icon: IconGlobe
  },
  {
    id: "stok-ai",
    label: "AI Analiz",
    href: "/dashboard/stok-ai",
    matchPaths: ["/dashboard/stok-ai", "/dashboard/envanter-ekosistem"],
    icon: IconSparkles
  }
]

export function InventoryModuleNav() {
  const pathname = usePathname()

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-1.5 overflow-x-auto shadow-xs">
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
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "text-[--brand] font-semibold"
                  : "text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="inventoryModuleNavActive"
                  className="absolute inset-0 bg-[--brand-soft] border border-[--brand-line] rounded-xl shadow-xs"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} className={isActive ? "text-[--brand]" : "text-[--text-muted]"} />
                <span>{tab.label}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

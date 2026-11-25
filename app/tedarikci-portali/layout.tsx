import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tedarikçi Self-Servis Portalı | Sunum ERP",
  description: "Satın alma siparişi onayı, RFQ teklif verme, ASN ön sevkiyat bildirimi ve performans skor kartı.",
}

export default function SupplierPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F6F8FB] text-[var(--text)] min-h-0">
      {children}
    </div>
  )
}

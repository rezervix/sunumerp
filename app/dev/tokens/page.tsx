import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TokenPreviewClient } from "./TokenPreviewClient"

export const metadata: Metadata = {
  title: "Tasarım Token Önizleme (Faz 1) | Sunum ERP",
  robots: { index: false, follow: false },
}

export default function DevTokensPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <TokenPreviewClient />
}

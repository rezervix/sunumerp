"use client"

import React, { useEffect, useState } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, Loader2 } from "lucide-react"

interface Faq {
  id: string
  question: string
  answer: string
  category: string
  order: number
}

export default function SssPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const response = await fetch("/api/faqs")
        if (!response.ok) {
          throw new Error("SSS verileri alınamadı.")
        }
        const data = await response.json()
        setFaqs(data)
      } catch (err: any) {
        setError(err.message || "Bilinmeyen bir hata oluştu.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchFaqs()
  }, [])

  // Kategorilere göre gruplama
  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = []
    }
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, Faq[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">SSS Yüklenemedi</h2>
        <p className="text-muted-foreground max-w-md">
          {error} Lütfen sistem yöneticinizle iletişime geçin veya veritabanı bağlantınızı kontrol edin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Sıkça Sorulan Sorular &amp; Modül Rehberleri</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Sistem kullanımı, modül rehberleri ve kullanıcı kılavuzları.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("relaunch-onboarding", { detail: { guideId: "welcome-overview" } }))
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] hover:bg-emerald-400 text-[#061811] rounded-full text-xs font-medium shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
        >
          <HelpCircle size={15} />
          <span>Platform Rehberini Başlat</span>
        </button>
      </div>

      {Object.keys(faqsByCategory).length === 0 ? (
        <Card className="bg-[#111513]/90 border-white/[0.06] rounded-[20px] shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
            <HelpCircle className="h-12 w-12 text-zinc-600 mb-3" />
            <p className="text-base font-medium text-zinc-300">Henüz soru eklenmemiş</p>
            <p className="text-xs text-zinc-500 mt-1">Şu anda gösterilecek SSS kaydı bulunmamaktadır.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(faqsByCategory).map(([category, items]) => (
            <Card key={category} className="bg-[#111513]/90 border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/[0.06] pb-4">
                <CardTitle className="text-lg font-light text-white tracking-tight">{category}</CardTitle>
                <CardDescription className="text-xs text-zinc-400">{category} ile ilgili sıkça sorulan sorular</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Accordion type="single" collapsible className="w-full">
                  {items.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border-white/[0.06]">
                      <AccordionTrigger className="text-left font-medium text-sm text-zinc-200 hover:text-emerald-300 transition-colors">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-zinc-400 text-xs leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

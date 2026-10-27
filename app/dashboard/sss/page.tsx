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
          <h1 className="text-2xl font-bold tracking-tight">Sıkça Sorulan Sorular &amp; Modül Rehberleri</h1>
          <p className="text-muted-foreground">
            Sistem kullanımı, modül rehberleri ve kullanıcı kılavuzları.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("relaunch-onboarding", { detail: { guideId: "welcome-overview" } }))
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
        >
          <HelpCircle size={16} />
          Platform Rehberini Başlat
        </button>
      </div>

      {Object.keys(faqsByCategory).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Henüz soru eklenmemiş</p>
            <p className="text-sm text-muted-foreground">Şu anda gösterilecek SSS kaydı bulunmamaktadır.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(faqsByCategory).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>{category} ile ilgili sorular</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {items.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
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

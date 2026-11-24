"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import {
  DESIGN_COLOR_TOKENS,
  DESIGN_ELEVATION_AND_MOTION_TOKENS,
  type ColorTokenMeta,
} from "@/lib/design-tokens"
import { getContrastRatio } from "@/lib/utils/brand-engine"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Calendar } from "@/components/ui/calendar"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowUpRight,
  IconBoxes,
  IconCheck,
  IconChevronLeft,
  IconEye,
  IconMoreHorizontal,
  IconSparkles,
} from "@/components/ui/app-icons"

type SectionFilter =
  | "all"
  | "primitives"
  | "colors"
  | "typography"
  | "surfaces"
  | "charts"

const FILTER_TABS: { id: SectionFilter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "primitives", label: "Faz 2 Bileşenler" },
  { id: "colors", label: "Renk Token'ları" },
  { id: "typography", label: "Tipografi" },
  { id: "surfaces", label: "Yüzey & Tablo" },
  { id: "charts", label: "Grafik & Takvim" },
]

const CATEGORY_TITLES: Record<ColorTokenMeta["category"], string> = {
  surface: "Yüzey, Zemin ve Ayırıcılar",
  typography: "Tipografi (Metin Hiyerarşisi)",
  brand: "Kurumsal Mavi & Tek Vurgu Ailesi",
  status: "Durum Renkleri (Yalnızca Anlam İçin)",
}

function LedStockBar({
  filled,
  total = 5,
  critical = false,
}: {
  filled: number
  total?: number
  critical?: boolean
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`Stok seviyesi ${filled}/${total}`}>
      {Array.from({ length: total }).map((_, idx) => {
        const isFilled = idx < filled
        return (
          <span
            key={idx}
            className="h-2 w-3 rounded-[3px] transition-colors"
            style={{
              backgroundColor: isFilled
                ? critical
                  ? "var(--bad-fill)"
                  : "var(--brand)"
                : "var(--muted-bg)",
            }}
          />
        )
      })}
    </div>
  )
}

export function TokenPreviewClient() {
  const prefersReducedMotion = useReducedMotion()
  const [activeFilter, setActiveFilter] = useState<SectionFilter>("all")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [kpiMultiplier, setKpiMultiplier] = useState<1 | 2>(1)

  // Faz 2 Primitive states
  const [btnLoading, setBtnLoading] = useState(false)
  const [checkedState, setCheckedState] = useState(true)
  const [switchState, setSwitchState] = useState(true)
  const [selectVal, setSelectVal] = useState("FIFO")
  const [showEmptyTable, setShowEmptyTable] = useState(false)
  const [currentPage, setCurrentPage] = useState(2)
  const [menuColVisible, setMenuColVisible] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date(2026, 10, 24)
  )

  const groupedTokens = useMemo(() => {
    const groups: Record<ColorTokenMeta["category"], ColorTokenMeta[]> = {
      surface: [],
      typography: [],
      brand: [],
      status: [],
    }
    for (const token of DESIGN_COLOR_TOKENS) {
      groups[token.category].push(token)
    }
    return groups
  }, [])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedToken(text)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch {
      // ignore
    }
  }

  const showSection = (key: Exclude<SectionFilter, "all">) =>
    activeFilter === "all" || activeFilter === key

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: "var(--page)",
        backgroundImage: "var(--ambient-page)",
        color: "var(--text)",
      }}
    >
      <div className="max-w-[1380px] mx-auto px-6 py-8 md:px-10 md:py-10 space-y-8">
        {/* ══════════════════════════════════════════════════════════════════
            BÖLGE 1: BAŞLIK + KUTUSUZ KPI ŞERİDİ
            ══════════════════════════════════════════════════════════════════ */}
        <header className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/stok"
                  className="btn-brand-tertiary inline-flex items-center gap-1.5 px-3 py-1 text-xs"
                >
                  <IconChevronLeft className="size-3.5" />
                  Stok Ekranına Git
                </Link>
                <Badge variant="brand">DEV ONLY • FAZ 1–2 ÖNİZLEME</Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-navy">
                Berrak Cam &amp; Kurumsal Mavi — Token ve Bileşen Önizleme
              </h1>
              <p className="text-sm text-ink-2 max-w-2xl">
                Faz 1 tasarım token&apos;ları ve Faz 2 temel bileşenlerinin (normal, hover, focus-visible, active, disabled, loading, error) canlı doğrulama ekranı.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-ink-muted hidden sm:inline">
                24 Kas 2026 • Geliştirme Ortamı
              </span>
              <Button
                variant="primary"
                onClick={() => setKpiMultiplier((m) => (m === 1 ? 2 : 1))}
              >
                <IconSparkles className="size-4" />
                Sayaçları Test Et
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-4 border-t border-line">
            <div className="space-y-1.5">
              <p className="eyebrow-label">TANIMLI RENK TOKEN</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-light tracking-tight tabular-nums text-ink">
                  <AnimatedNumber value={DESIGN_COLOR_TOKENS.length} />
                </span>
                <Badge variant="brand">B1 Tam Eşleme</Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="eyebrow-label">TEMEL PRİMİTİVE SETİ</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-light tracking-tight tabular-nums text-ink">
                  <AnimatedNumber value={16} />
                </span>
                <Badge variant="ok">Faz 2 Hazır</Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="eyebrow-label">ÖRNEK ENVANTER DEĞERİ</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-light tracking-tight tabular-nums text-ink">
                  <AnimatedNumber value={1420850 * kpiMultiplier} prefix="₺" />
                </span>
                <Badge variant="ok">
                  <IconArrowUpRight className="size-3" />
                  +%14,2
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="eyebrow-label">MİNİMUM KONTRAST</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-light tracking-tight tabular-nums text-ink">
                  <AnimatedNumber value={4.5} decimals={1} suffix=":1" />
                </span>
                <Badge variant="neutral">WCAG AA</Badge>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════
            BÖLGE 2: SEKME FİLTRESİ
            ══════════════════════════════════════════════════════════════════ */}
        <nav
          aria-label="Önizleme bölümleri"
          className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-3"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? "text-brand" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {isActive &&
                    (prefersReducedMotion ? (
                      <span className="absolute inset-0 rounded-full bg-brand-soft border border-brand-line -z-0" />
                    ) : (
                      <motion.span
                        layoutId="dev-tokens-tab"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full bg-brand-soft border border-brand-line -z-0"
                      />
                    ))}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
          <span className="text-xs text-ink-muted">
            Klavye ile Tab gezinmesini ve odak halkasını (--brand) test edebilirsiniz
          </span>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════
            BÖLGE 3: FAZ 2 TEMEL BİLEŞENLER VİTRİNİ
            ══════════════════════════════════════════════════════════════════ */}
        {showSection("primitives") && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Faz 2 — Temel Bileşenler (Primitives &amp; Durum Testleri)
            </h2>

            {/* Butonlar, Rozetler, Tooltip, Dropdown, Modal, Drawer, Toast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Button Varyantları ve Durumları</CardTitle>
                  <CardDescription>
                    Birincil, ikincil, hayalet, tehlike, loading ve disabled durumları
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button variant="secondary" size="sm">
                      İkincil (Outline)
                    </Button>
                    <Button variant="ghost" size="sm">
                      Hayalet (Ghost)
                    </Button>
                    <Button variant="destructive" size="sm">
                      Tehlike (Danger)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={btnLoading}
                      onClick={() => {
                        setBtnLoading(true)
                        setTimeout(() => setBtnLoading(false), 1200)
                      }}
                    >
                      {btnLoading ? "İşleniyor..." : "Loading Test"}
                    </Button>
                    <Button variant="secondary" size="sm" disabled>
                      Pasif (Disabled)
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-line-soft space-y-2">
                    <span className="eyebrow-label block">
                      BADGE / ROZET (OK • WARN • BAD • NÖTR • MARKA)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="ok">Olumlu (ok)</Badge>
                      <Badge variant="warn">Bekleme (warn)</Badge>
                      <Badge variant="bad">Kritik (bad)</Badge>
                      <Badge variant="neutral">Nötr (neutral)</Badge>
                      <Badge variant="brand">Marka (brand)</Badge>
                      <Badge variant="outline">Çerçeveli</Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line-soft flex flex-wrap items-center gap-2.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="sm">
                          Cam Tooltip Üzerine Gel
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Berrak cam yüzeyli erişilebilir ipucu (Tooltip)
                      </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm">
                          Açılır Menü (Dropdown)
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Tablo İşlemleri</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                          checked={menuColVisible}
                          onCheckedChange={(v) => setMenuColVisible(Boolean(v))}
                        >
                          Birim Maliyeti Göster
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuItem onSelect={() => toast.info("Detay görünümü seçildi")}>
                          Kaydı İncele
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => toast.error("Silme onayı istendi")}
                        >
                          Kaydı Arşivle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm">
                          Modal Aç (Opak --bg)
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Opak Modal Yüzeyi (B3)</DialogTitle>
                          <DialogDescription>
                            Yoğun form ve okuma katmanlarında maksimum netlik için düz beyaz (#FFFFFF) zemin kullanılır.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="modal-demo-sku">Ürün Kodu (SKU)</Label>
                            <Input
                              id="modal-demo-sku"
                              defaultValue="SKU-2026-MAVI"
                              className="font-mono"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="secondary" size="sm">
                            Kapat
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Çekmece Aç (Drawer)
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right">
                        <SheetHeader>
                          <SheetTitle>Yan Detay Çekmecesi</SheetTitle>
                          <SheetDescription>
                            Kayıt detayları sayfa bağlamından kopmadan sağ çekmecede açılır.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="px-5 space-y-3 text-sm text-ink-2">
                          <p>ESC tuşu ve odak tuzağı (focus trap) tam erişilebilir çalışır.</p>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </CardContent>
              </Card>

              {/* Form Kontrolleri: Input, Select, Textarea, Checkbox, Switch, Error */}
              <Card>
                <CardHeader>
                  <CardTitle>Form Kontrolleri (Input, Select, Checkbox, Switch)</CardTitle>
                  <CardDescription>
                    Normal, hatalı (aria-invalid) ve pasif (disabled) durumlar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-input-normal">Normal Input</Label>
                      <Input
                        id="demo-input-normal"
                        placeholder="Ürün veya depo adı..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-input-error">Hatalı Durum (Error)</Label>
                      <Input
                        id="demo-input-error"
                        aria-invalid={true}
                        defaultValue="Geçersiz değer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Değerleme Seçimi (Select)</Label>
                      <Select value={selectVal} onValueChange={setSelectVal}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIFO">FIFO (İlk Giren İlk Çıkar)</SelectItem>
                          <SelectItem value="FEFO">FEFO (İlk Biten Önce Çıkar)</SelectItem>
                          <SelectItem value="WAVG">Ağırlıklı Ortalama</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-input-disabled">Pasif Input (Disabled)</Label>
                      <Input
                        id="demo-input-disabled"
                        disabled
                        defaultValue="Salt okunur alan"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="demo-textarea">Açıklama (Textarea)</Label>
                    <Textarea
                      id="demo-textarea"
                      rows={2}
                      placeholder="Sevkiyat veya sayım notu ekleyin..."
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="demo-checkbox"
                        checked={checkedState}
                        onCheckedChange={(v) => setCheckedState(Boolean(v))}
                      />
                      <Label htmlFor="demo-checkbox" className="cursor-pointer">
                        Parti / Lot takibi zorunlu
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="demo-switch"
                        checked={switchState}
                        onCheckedChange={setSwitchState}
                      />
                      <Label htmlFor="demo-switch" className="cursor-pointer">
                        Otomatik ROP uyarısı
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs, Alert, Toast, Skeleton, Empty, Pagination */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tabs, Alert ve Canlı Toast Bildirimleri</CardTitle>
                  <CardDescription>
                    B1 semantik durum renkleriyle eşlenmiş geri bildirim bileşenleri
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="alerts">
                    <TabsList>
                      <TabsTrigger value="alerts">Uyarı Kutuları (Alert)</TabsTrigger>
                      <TabsTrigger value="toasts">Toast Testi (Sonner)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="alerts" className="space-y-2.5 pt-2">
                      <Alert variant="brand">
                        <IconAlertCircle />
                        <AlertTitle>Kurumsal Mavi Bilgilendirme</AlertTitle>
                        <AlertDescription>
                          Yeni açık tema token sistemi tüm temel bileşenlerde aktiftir.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="warn">
                        <IconAlertTriangle />
                        <AlertTitle>SKT Yaklaşan Parti Uyarısı</AlertTitle>
                        <AlertDescription>
                          2 partinin son kullanma tarihine 15 günden az kaldı.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                    <TabsContent value="toasts" className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            toast.success("Kayıt güncellendi", {
                              description: "Stok hareketi başarıyla işlendi.",
                            })
                          }
                        >
                          Olumlu Toast (--ok)
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            toast.warning("Onay bekliyor", {
                              description: "Satın alma talebi yönetici onayında.",
                            })
                          }
                        >
                          Uyarı Toast (--warn)
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            toast.error("Kritik stok eşiği", {
                              description: "Kullanılabilir miktar ROP sınırının altında.",
                            })
                          }
                        >
                          Kritik Toast (--bad)
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skeleton, Boş Durum (Empty) &amp; Pagination</CardTitle>
                  <CardDescription>
                    Tutarlı yükleniyor iskeleti, boş liste durumu ve sayfalama
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>

                  <Empty className="p-5 md:p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <IconBoxes />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">Henüz filtreye uygun kayıt yok</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        Arama terimini değiştirerek tüm envanter listesine dönebilirsiniz.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent />
                  </Empty>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#prev"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }}
                        />
                      </PaginationItem>
                      {[1, 2, 3].map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href={`#page-${p}`}
                            isActive={currentPage === p}
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(p)
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#next"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.min(3, p + 1))
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            RENK TOKEN'LARI
            ══════════════════════════════════════════════════════════════════ */}
        {showSection("colors") && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              B1. Renk Token&apos;ları ve WCAG AA Kontrast Doğrulaması
            </h2>

            {(
              Object.keys(groupedTokens) as Array<ColorTokenMeta["category"]>
            ).map((category) => (
              <div key={category} className="surface-glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="eyebrow-label">{CATEGORY_TITLES[category]}</h3>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {groupedTokens[category].length} token
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedTokens[category].map((token) => {
                    const ratio = token.contrastAgainst
                      ? getContrastRatio(token.hex, token.contrastAgainst)
                      : null
                    const isCopied = copiedToken === token.cssVar

                    return (
                      <button
                        key={token.cssVar}
                        type="button"
                        onClick={() => handleCopy(token.cssVar)}
                        className="group text-left flex items-start gap-3.5 p-3.5 rounded-[14px] bg-surface hover:bg-brand-soft/60 border border-line hover:border-brand-line transition-colors cursor-pointer"
                      >
                        <span
                          className="size-11 rounded-[10px] shrink-0 border border-line shadow-2xs"
                          style={{ backgroundColor: `var(${token.cssVar})` }}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <code className="font-mono text-xs font-semibold text-ink truncate">
                              {token.cssVar}
                            </code>
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                              {isCopied ? (
                                <>
                                  <IconCheck className="size-3 text-ok" />
                                  <span className="text-ok font-sans font-medium">
                                    Kopyalandı
                                  </span>
                                </>
                              ) : (
                                <span>{token.hex}</span>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-ink-2 line-clamp-2">
                            {token.usage}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted-bg text-ink-2">
                              {token.tailwindText ||
                                token.tailwindBorder ||
                                token.tailwindBg}
                            </code>
                            {ratio !== null && (
                              <Badge variant={ratio >= 4.5 ? "ok" : "warn"}>
                                {ratio.toFixed(1)}:1 {ratio >= 7 ? "AAA" : "AA"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TİPOGRAFİ
            ══════════════════════════════════════════════════════════════════ */}
        {showSection("typography") && (
          <section className="surface-glass p-6 md:p-8 space-y-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              B7. Tipografi Ölçeği (Inter &amp; Yalnızca Kod Alanlarında Monospace)
            </h2>
            <div className="divide-y divide-line-soft">
              <div className="py-3.5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                <span className="eyebrow-label w-52 shrink-0">SAYFA BAŞLIĞI</span>
                <p className="text-2xl font-semibold tracking-tight text-ink flex-1">
                  Stok Kartları &amp; Envanter
                </p>
                <code className="font-mono text-xs text-ink-muted">
                  text-2xl font-semibold tracking-tight
                </code>
              </div>
              <div className="py-3.5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                <span className="eyebrow-label w-52 shrink-0">BÜYÜK RAKAM</span>
                <p className="text-3xl font-light tracking-tight tabular-nums text-ink flex-1">
                  ₺4.892.310,50
                </p>
                <code className="font-mono text-xs text-ink-muted">
                  text-3xl font-light tabular-nums
                </code>
              </div>
              <div className="py-3.5 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                <span className="eyebrow-label w-52 shrink-0">SKU / BARKOD</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  <code className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted-bg text-navy">
                    SKU-ERP-9042
                  </code>
                  <code className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted-bg text-navy">
                    8690812349012
                  </code>
                </div>
                <code className="font-mono text-xs text-ink-muted">font-mono</code>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            YÜZEY & TABLO PRIMITIVE
            ══════════════════════════════════════════════════════════════════ */}
        {showSection("surfaces") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                B3 &amp; Faz 2 — Opak Table Bileşeni (Satır Hover &amp; Boş Durum)
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEmptyTable((v) => !v)}
              >
                {showEmptyTable ? "Örnek Satırları Göster" : "Boş Durumu Test Et"}
              </Button>
            </div>

            <div className="surface-opaque overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün &amp; SKU</TableHead>
                    <TableHead>Stok (B6 LED)</TableHead>
                    <TableHead className="text-right">Satış Fiyatı</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showEmptyTable ? (
                    <TableEmpty
                      colSpan={5}
                      title="Filtreye uygun stok kartı bulunamadı"
                      description="Arama kriterlerini sıfırlayarak tüm envanteri görüntüleyebilirsiniz."
                    />
                  ) : (
                    [
                      {
                        sku: "SKU-4012-A",
                        name: "Endüstriyel Sensör Modülü",
                        cost: "₺1.250,00",
                        price: "₺1.890,00",
                        led: 4,
                        critical: false,
                        selected: true,
                      },
                      {
                        sku: "SKU-1094-C",
                        name: "RFID Kapı Anteni (UHF)",
                        cost: "₺6.900,00",
                        price: "₺9.450,00",
                        led: 1,
                        critical: true,
                        selected: false,
                      },
                    ].map((r) => (
                      <TableRow
                        key={r.sku}
                        data-state={r.selected ? "selected" : undefined}
                      >
                        <TableCell>
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className="font-mono">{r.sku}</span>
                            {menuColVisible && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                • Maliyet: {r.cost}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LedStockBar filled={r.led} critical={r.critical} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.price}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.critical ? "bad" : "ok"}>
                            {r.critical ? "Kritik" : "Yeterli"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon-sm" aria-label="İncele">
                              <IconEye className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Menü">
                              <IconMoreHorizontal className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GRAFİK & TAKVİM (ÜÇÜNCÜ PARTİ TEMA EŞLEMESİ)
            ══════════════════════════════════════════════════════════════════ */}
        {showSection("charts") && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 surface-glass p-6 space-y-4">
              <div>
                <p className="eyebrow-label">B6. GRAFİK PALETİ &amp; CAM TOOLTIP</p>
                <h3 className="text-base font-semibold text-ink">
                  1. Seri (--brand), 2. Seri (--sky), 3. Seri (--navy)
                </h3>
              </div>
              <svg
                viewBox="0 0 720 195"
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label="Kurumsal Mavi grafik serileri"
              >
                <defs>
                  <linearGradient id="brandAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[
                  { y: 20, label: "₺1,6M" },
                  { y: 70, label: "₺1,2M" },
                  { y: 120, label: "₺800B" },
                  { y: 170, label: "₺400B" },
                ].map((row) => (
                  <g key={row.label}>
                    <line
                      x1="52"
                      y1={row.y}
                      x2="705"
                      y2={row.y}
                      stroke="var(--line-soft)"
                      strokeDasharray="4 4"
                    />
                    <text x="0" y={row.y + 4} fill="var(--text-muted)" fontSize="11">
                      {row.label}
                    </text>
                  </g>
                ))}
                <path
                  d="M58,145 C150,132 210,90 300,97 C390,104 460,50 555,53 C620,55 665,34 700,28 L700,170 L58,170 Z"
                  fill="url(#brandAreaGrad2)"
                />
                <path
                  d="M58,125 C180,118 310,108 450,92 C560,80 640,72 700,68"
                  fill="none"
                  stroke="var(--navy)"
                  strokeWidth="1.75"
                  strokeDasharray="5 5"
                  opacity="0.75"
                />
                <path
                  d="M58,158 C155,144 225,116 310,120 C400,124 475,84 565,82 C630,80 670,60 700,54"
                  fill="none"
                  stroke="var(--sky)"
                  strokeWidth="2"
                />
                <path
                  d="M58,145 C150,132 210,90 300,97 C390,104 460,50 555,53 C620,55 665,34 700,28"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="555" cy="53" r="5" fill="var(--bg)" stroke="var(--brand)" strokeWidth="2.5" />
              </svg>
              <code className="font-mono text-[11px] text-ink-muted block">
                Gölge: {DESIGN_ELEVATION_AND_MOTION_TOKENS.shadows.card.value}
              </code>
            </div>

            <div className="surface-opaque p-5 flex flex-col items-center justify-center">
              <p className="eyebrow-label self-start mb-2">
                FAZ 4 TARİH SEÇİCİ (REACT-DAY-PICKER)
              </p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

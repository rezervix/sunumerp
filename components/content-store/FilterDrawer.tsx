"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface Niche {
  id: string
  name: string
}

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  niches: Niche[]
  selectedNicheIds: string[]
  setSelectedNicheIds: (ids: string[]) => void
  selectedTypes: string[]
  setSelectedTypes: (types: string[]) => void
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  minSize: string
  setMinSize: (size: string) => void
  maxSize: string
  setMaxSize: (size: string) => void
  onClear: () => void
  onApply: () => void
}

export function FilterDrawer({
  open,
  onClose,
  niches,
  selectedNicheIds,
  setSelectedNicheIds,
  selectedTypes,
  setSelectedTypes,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  minSize,
  setMinSize,
  maxSize,
  setMaxSize,
  onClear,
  onApply
}: FilterDrawerProps) {

  const handleNicheToggle = (id: string) => {
    if (selectedNicheIds.includes(id)) {
      setSelectedNicheIds(selectedNicheIds.filter((x) => x !== id))
    } else {
      setSelectedNicheIds([...selectedNicheIds, id])
    }
  }

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((x) => x !== type))
    } else {
      setSelectedTypes([...selectedTypes, type])
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-background border-l border-border p-6 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-bold">Filtrele & Sırala</SheetTitle>
          <SheetDescription>
            İçerik mağazasındaki varlıkları filtreleyin.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Nişler Multi-select */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Nişler (Sektör / Kategori)</h4>
            <div className="border border-border rounded-xl p-3 bg-muted/20 max-h-48 overflow-y-auto space-y-2">
              {niches.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Kayıtlı niş bulunamadı.</p>
              ) : (
                niches.map((n) => (
                  <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedNicheIds.includes(n.id)}
                      onChange={() => handleNicheToggle(n.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                    />
                    <span>{n.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* İçerik Tipi */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">İçerik Tipi</h4>
            <div className="flex gap-4">
              {[
                { label: "Görsel", value: "IMAGE" },
                { label: "Video", value: "VIDEO" },
                { label: "Diğer", value: "OTHER" }
              ].map((t) => (
                <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.value)}
                    onChange={() => handleTypeToggle(t.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tarih Aralığı */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Yükleme Tarihi</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Başlangıç</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Bitiş</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dosya Boyutu Limitleri */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Dosya Boyutu (MB)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min MB"
                value={minSize}
                onChange={(e) => setMinSize(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max MB"
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 mt-8 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClear} className="flex-1 text-xs">
            <Trash2 size={14} className="mr-1" />
            Filtreleri Temizle
          </Button>
          <Button onClick={() => { onApply(); onClose() }} className="flex-1 text-xs">
            Uygula
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/context"

// ─── Daron — Bakım Modu ──────────────────────────────────────────────────────
// Özellik henüz kullanıma hazır değil.
// Tam chat komponenti korunmuştur; hazır olduğunda bu dosyayı
// components/kuscu-chat.full.tsx içeriğiyle değiştirin.
// ─────────────────────────────────────────────────────────────────────────────

export function KuscuChat() {
    const { session } = useAuth()
    const [isOpen, setIsOpen] = useState(false)

    if (!session) return null

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    title="Daron Finansal Asistan"
                    className="fixed bottom-6 right-20 z-50 flex items-center justify-center gap-2.5 bg-muted text-muted-foreground border border-border p-3 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 h-12 w-12 sm:h-auto sm:w-auto"
                >
                    <span className="material-symbols-outlined text-[22px] shrink-0">smart_toy</span>
                    <span className="text-sm font-semibold max-sm:hidden">Daron</span>
                    <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-background bg-muted-foreground" />
                </button>
            )}

            {/* Bilgi Paneli */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[340px] flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted text-foreground shrink-0 border-b border-border">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-white/20">
                            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold leading-none">Daron</h3>
                            <p className="text-[11px] text-white/70 mt-0.5">Finansal Asistan · Çiçekana</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Kapat"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    {/* Bildirim İçeriği */}
                    <div className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-500 text-[32px]">construction</span>
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                Hizmet Geçici Olarak Devre Dışı
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Daron yapay zeka asistanı şu anda entegrasyon aşamasındadır.
                                Yakında kullanıma sunulacaktır.
                            </p>
                        </div>
                        <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 flex items-start gap-2.5 text-left">
                            <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 shrink-0">info</span>
                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                Çiçekana yerel model entegrasyonu tamamlandığında bu asistan
                                finansal analizlerinizde yardımcı olacaktır.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

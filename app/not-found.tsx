import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#18191a] px-4">
      <div className="text-center">
        <h1 className="text-[120px] font-bold text-gray-900 dark:text-white mb-2 leading-none tracking-tighter">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Sayfa Bulunamadı</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-black/80 dark:hover:bg-white/90 text-white dark:text-black px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}

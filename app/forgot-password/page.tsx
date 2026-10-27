"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ message: string; tempPassword?: string } | null>(null)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setResult(null)

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })

            const data = await res.json()
            if (res.ok) {
                setResult(data)
            } else {
                setError(data.error || "Bir hata oluştu")
            }
        } catch {
            setError("Sunucu bağlantı hatası")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="w-full max-w-sm">

                <div className="text-center mb-10">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="size-16 bg-primary text-white flex items-center justify-center rounded-2xl shadow-soft">
                            <span className="material-symbols-outlined text-[40px]">local_florist</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Şifremi Unuttum
                            </h1>
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1 block">Yönetim Paneli</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-soft border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-8">
                        {result ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-100">
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                        {result.message}
                                    </h3>
                                    {result.tempPassword && (
                                        <div className="mt-3 bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                                            <p className="text-xs text-gray-500 mb-1">Geçici Şifreniz:</p>
                                            <p className="font-mono font-bold text-gray-800 text-xl tracking-wider select-all">{result.tempPassword}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide">Lütfen kullanıcıya iletin.</p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => router.push("/")}
                                    className="w-full bg-primary hover:bg-gray-800 text-white py-3 rounded-xl font-medium shadow-soft transition-all active:scale-[0.98] mt-2"
                                >
                                    Giriş Sayfasına Dön
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-500">
                                        Lütfen yöneticiniz tarafından sıfırlanması için kullanıcı adınızı girin.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                            <span className="material-symbols-outlined text-[18px]">error</span>
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Kullanıcı Adı
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <span className="material-symbols-outlined text-[20px]">person</span>
                                            </div>
                                            <input
                                                id="username"
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-gray-800 text-white py-3 rounded-xl font-medium shadow-soft transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                                İşleniyor...
                                            </>
                                        ) : "Şifre Sıfırla"}
                                    </button>

                                    <div className="text-center mt-6">
                                        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                            Giriş sayfasına dön
                                        </Link>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

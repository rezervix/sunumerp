"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { useLanguage } from "@/lib/context/LanguageContext"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const { t } = useLanguage()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login(username, password)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || t.login.form.submit)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#111513]/90 backdrop-blur-2xl rounded-[24px] border border-white/10 shadow-2xl p-8 space-y-6 text-white">
      <div className="lg:hidden text-center">
        <h2 className="text-xl font-bold text-white">{t.login.form.submit}</h2>
        <p className="text-xs text-zinc-400 mt-1">{t.login.subtitle}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="py-3 bg-red-500/10 border-red-500/20 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs font-medium text-zinc-300">
            {t.login.form.username}
          </Label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <Input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="pl-10 h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 rounded-xl text-xs"
              placeholder="kullanici.adi"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-zinc-300">{t.login.form.password}</Label>
            <Link href="/forgot-password" className="text-xs text-emerald-400 hover:underline font-medium">
              {t.login.form.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="pl-10 pr-10 h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 rounded-xl text-xs"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-2 gap-2 h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all cursor-pointer disabled:opacity-50"
          size="lg"
        >
          {loading ? (
            <>
              <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              {t.login.form.loading}
            </>
          ) : (
            <>
              <LogIn size={16} />
              {t.login.form.submit}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

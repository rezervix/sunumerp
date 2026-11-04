"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="relative size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-primary transition-all flex items-center justify-center">
                <Sun size={18} />
            </button>
        )
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-primary transition-all flex items-center justify-center cursor-pointer"
            title={theme === "dark" ? "Açık Tema" : "Koyu Tema"}
        >
            {theme === "dark" ? (
                <Sun size={18} className="transition-transform duration-200 hover:rotate-12" />
            ) : (
                <Moon size={18} className="transition-transform duration-200 hover:-rotate-12" />
            )}
        </button>
    )
}

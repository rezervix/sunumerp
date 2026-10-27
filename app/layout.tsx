import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { Toaster } from "@/components/ui/toaster"
import { SonnerToaster } from "@/components/ui/sonner"
import { SystemNotificationProvider } from "@/components/providers/system-notification-provider"
import { AuthProvider } from "@/lib/auth/context"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/context/LanguageContext"
import { BRAND_CONFIG } from "@/lib/config/brand"
import { SaasManager } from "@/components/saas-manager"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} | Yönetim Paneli`,
  description: "CRM, proje yönetimi, finans ve daha fazlasını tek panelden yönetin",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} antialiased h-screen overflow-hidden flex flex-col bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <SystemNotificationProvider>
                <SaasManager />
                {children}
                <Toaster />
                <SonnerToaster />
              </SystemNotificationProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

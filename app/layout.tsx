import type React from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}

import "./globals.css"

export const metadata = {
  generator: "v0.dev",
}


import './globals.css'
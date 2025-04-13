"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeTest() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 p-2 rounded shadow text-xs">
      Current theme: {theme}
    </div>
  )
}

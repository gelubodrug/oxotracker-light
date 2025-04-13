"use client"

import { useState, useCallback, createContext, useContext, useRef, useEffect } from "react"
import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Home, Users, MapPin, Route } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { VersionChecker } from "@/components/version-checker"
import { ThemeTest } from "@/components/theme-test"
import { usePathname, useRouter } from "next/navigation"

// Create a context to share the refresh trigger with child components
export const RefreshContext = createContext<{
  refreshTrigger: number
  refreshGPSData: () => void
}>({
  refreshTrigger: 0,
  refreshGPSData: () => {},
})

// Custom hook to use the refresh context
export const useRefresh = () => useContext(RefreshContext)

interface AppShellProps {
  children: React.ReactNode
}

// Remove the blue vertical element by fixing the AppShell component
export function AppShell({ children }: AppShellProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  // Check if we're on the GPS data page
  const isGPSPage = pathname === "/gpsdata"

  const refreshGPSData = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // For long press detection
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)

  // For triple click detection
  const clickCount = useRef(0)
  const clickTimer = useRef<NodeJS.Timeout | null>(null)

  const handleRouteMouseDown = () => {
    // Start timer for long press
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      router.push("/gpsdata")
    }, 2000) // 2 seconds for long press
  }

  const handleRouteMouseUp = () => {
    // Clear the timer if mouse is released before long press threshold
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleRouteClick = (e: React.MouseEvent) => {
    // Increment click count
    clickCount.current += 1

    // Reset click count after a delay if not reaching triple click
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
    }

    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 500) // 500ms window for triple click

    // Check for triple click
    if (clickCount.current === 3) {
      e.preventDefault()
      clickCount.current = 0
      router.push("/gpsdata")
    }
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      if (clickTimer.current) {
        clearTimeout(clickTimer.current)
      }
    }
  }, [])

  return (
    <RefreshContext.Provider value={{ refreshTrigger, refreshGPSData }}>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Add VersionChecker at the top level of the component */}
        <VersionChecker />
        <ThemeTest />
        <header className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur-sm border-t border-gray-200 dark:bg-gray-800/90 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoOXO_2024-juzaFW98gn7iL4rnzj1ojBvlczmnZq.png"
                    alt="OXO Logo"
                    width={40}
                    height={40}
                    className="h-8 w-auto"
                  />
                  <span className="text-[8px] text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-1 sm:px-2 py-2 sm:py-4 min-w-[300px]">{children}</div>
        </main>

        <nav className="sticky bottom-0 z-10 bg-gray-100/90 backdrop-blur-sm border-t border-gray-200 dark:bg-gray-800/90 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex justify-around py-2">
              <Link
                href="/dashboard"
                className="flex flex-col items-center p-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <Home className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs mt-1">Dashboard</span>
              </Link>
              <Link
                href="/users"
                className="flex flex-col items-center p-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <Users className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs mt-1">Users</span>
              </Link>
              <Link
                href="/assignments"
                className="flex flex-col items-center p-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <MapPin className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs mt-1">Deplasari</span>
              </Link>
              <div
                className="flex flex-col items-center p-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white cursor-pointer"
                onMouseDown={handleRouteMouseDown}
                onMouseUp={handleRouteMouseUp}
                onMouseLeave={handleRouteMouseUp}
                onTouchStart={handleRouteMouseDown}
                onTouchEnd={handleRouteMouseUp}
                onClick={handleRouteClick}
              >
                <Link href="/test/assignment-route" onClick={(e) => isLongPress && e.preventDefault()}>
                  <Route className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs mt-1">Route</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </RefreshContext.Provider>
  )
}

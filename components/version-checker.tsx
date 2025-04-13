"use client"

import { useEffect } from "react"

export function VersionChecker() {
  useEffect(() => {
    // Skip during development to avoid constant reloads
    if (process.env.NODE_ENV === "development") return

    const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION

    // If no version is set, don't do anything
    if (!currentVersion) return

    // Get the stored version from localStorage
    const storedVersion = localStorage.getItem("app_version")

    // If versions don't match, update localStorage and reload the page
    if (storedVersion !== currentVersion) {
      console.log(`App version changed from ${storedVersion} to ${currentVersion}. Reloading...`)
      localStorage.setItem("app_version", currentVersion)

      // Don't reload immediately on first visit (when storedVersion is null)
      if (storedVersion) {
        window.location.reload()
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}

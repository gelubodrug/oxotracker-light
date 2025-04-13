"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LayoutGrid, LayoutList } from "lucide-react"

interface LayoutToggleProps {
  onLayoutChange: (layout: "grid" | "row") => void
}

export default function LayoutToggle({ onLayoutChange }: LayoutToggleProps) {
  const [currentLayout, setCurrentLayout] = useState<"grid" | "row">("grid")

  useEffect(() => {
    const savedLayout = localStorage.getItem("cardLayout") as "grid" | "row"
    setCurrentLayout(savedLayout || "grid")
  }, [])

  const toggleLayout = () => {
    const newLayout = currentLayout === "grid" ? "row" : "grid"
    setCurrentLayout(newLayout)
    onLayoutChange(newLayout)
    localStorage.setItem("cardLayout", newLayout)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleLayout}
      title={`Switch to ${currentLayout === "grid" ? "row" : "grid"} layout`}
    >
      {currentLayout === "grid" ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
    </Button>
  )
}

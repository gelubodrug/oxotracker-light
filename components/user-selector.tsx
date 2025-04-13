"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserSelector() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isPulsating, setIsPulsating] = useState(true)

  // Load user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      setCurrentUser(storedUser)
      setIsPulsating(false) // Stop pulsating if user is already selected
    }

    // Set a timeout to stop pulsating after 5 seconds even if no user is selected
    const timer = setTimeout(() => {
      setIsPulsating(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  // Handle user selection
  const handleSelectUser = (userId: string) => {
    localStorage.setItem("currentUser", userId)
    setCurrentUser(userId)
    setIsPulsating(false)
    // Reload the page to refresh data with the new user
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-8 w-8 rounded-full ${isPulsating ? "animate-pulse ring-2 ring-blue-500" : ""}`}
        >
          {currentUser ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          <span className="sr-only">Select user</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleSelectUser("user1")}>
          User 1 {currentUser === "user1" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelectUser("user2")}>
          User 2 {currentUser === "user2" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelectUser("user3")}>
          User 3 {currentUser === "user3" && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

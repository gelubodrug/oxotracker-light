"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UserCoins {
  user_id: number
  name: string
  total_hours: number
  assignment_count: number
  total_kilometers: number
}

export function BonusCoins() {
  const [users, setUsers] = useState<UserCoins[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate bonus coins with the new formula
  const calculateBonusCoins = (hours: number, assignmentCount: number, kilometers: number) => {
    // Base coin: 1 if 168+ hours, 0 if less
    const baseCoins = hours >= 168 ? 1 : 0

    // Task bonus: +0.3 if 4+ tasks
    const taskBonus = assignmentCount >= 4 ? 0.3 : 0

    // Kilometer bonus: +0.1 per 1000km
    const kmBonus = Math.floor(kilometers / 1000) * 0.1

    // Total coins
    return baseCoins + taskBonus + kmBonus
  }

  useEffect(() => {
    async function fetchUserStats() {
      try {
        setIsLoading(true)

        // Get current month date range
        const now = new Date()
        const startDate = startOfMonth(now)
        const endDate = endOfMonth(now)

        // Format dates for SQL query
        const startDateStr = format(startDate, "yyyy-MM-dd")
        const endDateStr = format(endDate, "yyyy-MM-dd")

        const response = await fetch(`/api/user-hours?startDate=${startDateStr}&endDate=${endDateStr}`)
        if (!response.ok) throw new Error("Failed to fetch user stats")

        const data = await response.json()

        // Sort users by total bonus coins in descending order
        const sortedUsers = [...data].sort((a, b) => {
          const aCoins = calculateBonusCoins(a.total_hours, a.assignment_count, a.total_kilometers)
          const bCoins = calculateBonusCoins(b.total_hours, b.assignment_count, b.total_kilometers)
          return bCoins - aCoins
        })

        setUsers(sortedUsers)
      } catch (error) {
        console.error("Error fetching user stats:", error)
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserStats()
  }, [])

  // Format the display of coins
  const formatCoins = (user: UserCoins) => {
    const totalCoins = calculateBonusCoins(user.total_hours, user.assignment_count, user.total_kilometers)
    const fullCoins = Math.floor(totalCoins)
    const fractionalCoins = totalCoins % 1

    // Format to 2 decimal places
    const fractionalDisplay = fractionalCoins.toFixed(2).substring(1) // Get ".XX" part

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              {fullCoins > 0 ? (
                <>
                  <span className="text-primary">{fullCoins}</span>
                  <span className="text-muted-foreground">{fractionalDisplay}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{totalCoins.toFixed(2)}</span>
              )}
              <span> coins</span>
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p>
              Base: {user.total_hours >= 168 ? "1.0" : "0.0"} coins ({user.total_hours}h)
            </p>
            <p>
              Tasks: {user.assignment_count >= 4 ? "+0.3" : "+0.0"} coins ({user.assignment_count} tasks)
            </p>
            <p>
              Distance: +{(Math.floor(user.total_kilometers / 1000) * 0.1).toFixed(1)} coins ({user.total_kilometers}{" "}
              km)
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No user data available for this month.</p>
      ) : (
        users.map((user) => (
          <div key={user.user_id} className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
              <Coins className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs mt-1">{formatCoins(user)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

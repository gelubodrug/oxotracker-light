"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timeline } from "@/components/dashboard/timeline"
import { UserStatsChart } from "@/components/dashboard/user-stats-chart"
import { getUserWorkLogs } from "@/app/actions/work-logs"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DashboardDetailsProps {
  userId?: number
  startDate?: Date
  endDate?: Date
}

export function DashboardDetails({ userId, startDate, endDate }: DashboardDetailsProps) {
  const [workLogs, setWorkLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [dateRange, setDateRange] = useState({
    from: startDate || startOfMonth(new Date()),
    to: endDate || endOfMonth(new Date()),
  })

  // Get available months (for the last 12 months)
  const getAvailableMonths = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      })
    }
    return months
  }

  const availableMonths = getAvailableMonths()

  // Handle month change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    const [year, month] = value.split("-").map(Number)

    // Update date range based on selected month
    const from = new Date(year, month - 1, 1) // Month is 0-indexed in Date
    const to = endOfMonth(from)

    setDateRange({ from, to })
  }

  useEffect(() => {
    async function fetchWorkLogs() {
      if (!userId) return

      setIsLoading(true)
      try {
        const logs = await getUserWorkLogs(userId)
        setWorkLogs(logs)

        // Extract user name from the first log
        if (logs.length > 0 && logs[0].user_name) {
          setUserName(logs[0].user_name)
        }
      } catch (error) {
        console.error("Error fetching work logs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkLogs()
  }, [userId, dateRange])

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a user to view details</p>
      </div>
    )
  }

  const formatDateRange = () => {
    if (
      dateRange.from.getMonth() === dateRange.to.getMonth() &&
      dateRange.from.getFullYear() === dateRange.to.getFullYear()
    ) {
      return `${format(dateRange.from, "MMMM yyyy")}`
    }
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
  }

  // Get the selected month label
  const selectedMonthLabel =
    availableMonths.find((m) => m.value === selectedMonth)?.label || format(new Date(), "MMMM yyyy")

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">{userName ? `${userName}'s Dashboard` : "User Details"}</h2>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={selectedMonthLabel} />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground">{formatDateRange()}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Work History</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline workLogs={workLogs} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <UserStatsChart workLogs={workLogs} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

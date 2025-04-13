"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { getUserStats } from "@/app/actions/user-stats"
import { Clock, MapPin, AlertCircle } from "lucide-react"

export function UserDetailsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = searchParams.get("userId") || ""
  const monthParam = searchParams.get("month") || format(new Date(), "yyyy-MM")

  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(monthParam)

  // Use a ref to track if we've already fetched data
  const fetchedRef = useRef<string | null>(null)

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

    // Update URL with new month
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", value)
    router.push(`/dashboard/details?${params.toString()}`)

    // Reset fetch state to trigger a new fetch
    fetchedRef.current = null
  }

  useEffect(() => {
    // Check if userId is provided
    if (!userId) {
      setIsLoading(false)
      setError("No user ID provided. Please select a user from the dashboard.")
      return
    }

    // Skip if we've already fetched for this user and month
    const fetchKey = `${userId}_${selectedMonth}`
    if (fetchedRef.current === fetchKey) {
      return
    }

    // Mark this user and month as fetched
    fetchedRef.current = fetchKey

    setIsLoading(true)
    setError(null)

    // Fetch real user data
    async function fetchData() {
      try {
        const data = await getUserStats(userId, selectedMonth)
        setUserData(data)
        setIsLoading(false)
      } catch (error: any) {
        console.error("Error fetching user data:", error)
        setError(error?.message || "Failed to load user data. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, selectedMonth])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          {!userId ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => {
                fetchedRef.current = null
                setIsLoading(true)
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No user data available</p>
      </div>
    )
  }

  // Calculate total hours
  const totalHours = userData.hoursByType.reduce((sum: number, item: any) => sum + Number(item.hours), 0)

  // Standard work hours per month (168 hours)
  const standardHours = 168

  // Calculate percentage of standard hours
  const percentageOfStandard = Math.min(100, (totalHours / standardHours) * 100)

  // Format number with proper separators and decimals
  const formatNumber = (value: number, decimals = 2) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Get color based on type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Interventie":
        return "#3b82f6" // blue-500
      case "Optimizare":
        return "#f97316" // orange-500
      case "Deschidere":
        return "#22c55e" // green-500
      default:
        return "#6b7280" // gray-500
    }
  }

  // Get the selected month label
  const selectedMonthLabel =
    availableMonths.find((m) => m.value === selectedMonth)?.label || format(new Date(), "MMMM yyyy")

  // Count total stores across all timeline items
  const totalStores = userData.timeline.reduce((total: number, item: any) => {
    return total + (item.storePoints?.length || 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-2xl">{userData.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Work Statistics Card - Now First */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <h3 className="text-2xl font-bold">{formatNumber(userData.totalHours, 2)} hours</h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Kilometers</p>
                <h3 className="text-2xl font-bold">{formatNumber(userData.totalKilometers, 1)} km</h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Work Logs</p>
                <h3 className="text-2xl font-bold">{userData.workLogs}</h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stores</p>
                <h3 className="text-2xl font-bold">{totalStores}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hours by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary bar comparing to standard 168 hours */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Total Hours</span>
                  <span className="text-sm font-medium">
                    {formatNumber(totalHours, 2)} / {standardHours} hours
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full flex" style={{ width: `${percentageOfStandard}%` }}>
                    {userData.hoursByType.map((item: any, index: number) => {
                      const itemPercentage = (item.hours / totalHours) * 100
                      return (
                        <div
                          key={index}
                          style={{
                            width: `${(item.hours / totalHours) * 100}%`,
                            backgroundColor: getTypeColor(item.type),
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {percentageOfStandard.toFixed(1)}% of standard hours
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(Math.max(0, standardHours - totalHours), 2)} hours remaining
                  </span>
                </div>
              </div>

              {/* Individual type bars */}
              {userData.hoursByType && userData.hoursByType.length > 0 ? (
                userData.hoursByType.map((item: any) => (
                  <div key={item.type} className="space-y-2">
                    <div className="flex justify-between">
                      <span>{item.type}</span>
                      <span>{formatNumber(Number(item.hours), 2)} hours</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(Number(item.hours) / standardHours) * 100}%`,
                          backgroundColor: getTypeColor(item.type),
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No hours data for this period</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Work History Card - Now Second */}
        <Card>
          <CardHeader>
            <CardTitle>Work History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {userData.timeline && userData.timeline.length > 0 ? (
              userData.timeline.map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div
                      className="font-medium text-lg flex items-center gap-2"
                      style={{ color: getTypeColor(item.type) }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: getTypeColor(item.type) }}
                      >
                        {item.type.charAt(0)}
                      </div>
                      {item.type}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.date}</div>
                  </div>

                  <p className="mb-3">{item.description}</p>

                  <div className="mb-3">
                    <div className="text-sm font-medium mb-2">Main Location:</div>
                    <div className="bg-muted px-3 py-1.5 rounded-md inline-block">{item.location}</div>
                  </div>

                  {item.storePoints && item.storePoints.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-2">
                        <span className="text-base">🛒</span> ({item.storePoints.length}):
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {item.storePoints.map((store: any, index: number) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold"
                          >
                            {store.id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{formatNumber(item.hours, 2)} hours</span>
                    </div>
                    {item.kilometers > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{formatNumber(item.kilometers, 1)} km</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No work history for this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

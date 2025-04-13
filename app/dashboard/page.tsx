"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { SmallCard } from "@/components/dashboard/small-card"
import { TopWorkers } from "@/components/dashboard/top-workers"
import { TopRiders } from "@/components/dashboard/top-riders"
import { WorkDistribution } from "@/components/dashboard/work-distribution"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from "date-fns"
import {
  getTopWorkersByHours,
  getTopRidersByKilometers,
  getWorkDistributionByType,
  getTotalHoursInDateRange,
  getTotalKilometersInDateRange,
  exportWorkLogs,
} from "../actions/work-logs"
import { cn } from "@/lib/utils"
import { Filter } from "@/components/icons/filter"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
    key: "this-month",
  })
  const [topWorkers, setTopWorkers] = useState([])
  const [topRiders, setTopRiders] = useState([])
  const [workDistribution, setWorkDistribution] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [totalKilometers, setTotalKilometers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [layout, setLayout] = useState<"grid" | "row">("grid")

  useEffect(() => {
    const savedLayout = localStorage.getItem("cardLayout") as "grid" | "row"
    setLayout(savedLayout || "grid")
  }, [])

  const fetchDashboardData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return

    setIsLoading(true)
    try {
      // Fetch all workers by passing -1 as the limit
      const workers = await getTopWorkersByHours(-1, dateRange.from, dateRange.to)
      setTopWorkers(workers)

      // Try to get all riders, but handle the case where the kilometers column doesn't exist yet
      try {
        const riders = await getTopRidersByKilometers(-1, dateRange.from, dateRange.to)
        setTopRiders(riders)
      } catch (error) {
        console.error("Error fetching top riders:", error)
        setTopRiders([])
      }

      const distribution = await getWorkDistributionByType(dateRange.from, dateRange.to)
      setWorkDistribution(distribution)

      const hours = await getTotalHoursInDateRange(dateRange.from, dateRange.to)
      setTotalHours(hours)

      // Try to get total kilometers, but handle the case where the kilometers column doesn't exist yet
      try {
        const kilometers = await getTotalKilometersInDateRange(dateRange.from, dateRange.to)
        setTotalKilometers(kilometers)
      } catch (error) {
        console.error("Error fetching total kilometers:", error)
        setTotalKilometers(0)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const formatDateRange = () => {
    if (
      dateRange.from.getMonth() === dateRange.to.getMonth() &&
      dateRange.from.getFullYear() === dateRange.to.getFullYear()
    ) {
      return `${format(dateRange.from, "MMMM yyyy")}`
    }
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
  }

  const handleExport = async () => {
    try {
      const csvData = await exportWorkLogs(dateRange.from, dateRange.to)
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute(
          "download",
          `work_logs_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`,
        )
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Error exporting work logs:", error)
    }
  }

  const handleDateRangeSelect = (key: string) => {
    const now = new Date()
    let from, to
    switch (key) {
      case "this-week":
        from = startOfWeek(now)
        to = endOfWeek(now)
        break
      case "this-month":
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case "last-month":
        from = startOfMonth(subMonths(now, 1))
        to = endOfMonth(subMonths(now, 1))
        break
      case "last-6-months":
        from = startOfMonth(subMonths(now, 6))
        to = endOfMonth(now)
        break
      case "last-12-months":
        from = startOfMonth(subMonths(now, 12))
        to = endOfMonth(now)
        break
      default:
        from = startOfMonth(now)
        to = endOfMonth(now)
    }
    setDateRange({ from, to, key })
  }

  const DateRangeFilters = ({ className = "" }) => (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <Filter className="h-3 w-3 text-blue-400 mr-1" />
      {[
        { key: "last-12-months", label: "Last 12 Months" },
        { key: "last-6-months", label: "Last 6 Months" },
        { key: "last-month", label: "Last Month" },
        { key: "this-month", label: "This Month" },
        { key: "this-week", label: "This Week" },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleDateRangeSelect(key)}
          className={cn(
            "px-2 py-0.5 text-[0.5em] rounded-full transition-colors",
            dateRange.key === key ? "bg-blue-100 text-blue-800" : "bg-white text-blue-600 hover:bg-blue-50",
            "border border-blue-200 shadow-sm",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )

  const handleLayoutChange = (newLayout: "grid" | "row") => {
    setLayout(newLayout)
    localStorage.setItem("cardLayout", newLayout)
  }

  return (
    <AppShell>
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center gap-2">
            <DateRangeFilters />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 max-w-3xl mx-auto gap-4">
            {/* 1. Work Distribution */}
            <SmallCard
              title="Work Distribution"
              description={`Assignment types - ${formatDateRange()}`}
              customContent={<WorkDistribution distribution={workDistribution} />}
            />

            {/* 2. Combined Top Workers and Top Riders with tabs */}
            <Card className="col-span-1 md:col-span-1">
              <CardHeader className="pb-2">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium">
                    Team Performance
                    <span className="ml-1 text-xs font-normal text-muted-foreground">- {formatDateRange()}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs defaultValue="workers" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="workers">Top Workers</TabsTrigger>
                    <TabsTrigger value="riders">Top Riders</TabsTrigger>
                  </TabsList>
                  <TabsContent value="workers" className="mt-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Top Workers by Hours</h2>
                    </div>
                    <TopWorkers workers={topWorkers} />
                  </TabsContent>
                  <TabsContent value="riders" className="mt-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Top Riders by Kilometers</h2>
                    </div>
                    <TopRiders riders={topRiders} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}

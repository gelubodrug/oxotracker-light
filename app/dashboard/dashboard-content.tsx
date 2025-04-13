"use client"

import { useState, useEffect, useCallback } from "react"
import { SmallCard } from "@/components/dashboard/small-card"
import { TopWorkers } from "@/components/dashboard/top-workers"
import { TopRiders } from "@/components/dashboard/top-riders"
import { WorkDistribution } from "@/components/dashboard/work-distribution"
import { BonusCoins } from "@/components/dashboard/bonus-coins"
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

export default function DashboardContent() {
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
      const workers = await getTopWorkersByHours(10, dateRange.from, dateRange.to)
      setTopWorkers(workers)
      console.log("Fetched top workers:", workers)

      // Try to get top riders, but handle the case where the kilometers column doesn't exist yet
      try {
        const riders = await getTopRidersByKilometers(10, dateRange.from, dateRange.to)
        setTopRiders(riders)
        console.log("Fetched top riders:", riders)
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
        { key: "this-week", label: "This Week" },
        { key: "this-month", label: "This Month" },
        { key: "last-month", label: "Last Month" },
        { key: "last-6-months", label: "Last 6 Months" },
        { key: "last-12-months", label: "Last 12 Months" },
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

  return (
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
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${layout === "row" ? "grid-cols-1" : ""}`}>
          <SmallCard
            title="Top Workers"
            description={`Top 10 workers - ${formatDateRange()}`}
            customContent={<TopWorkers workers={topWorkers} />}
          />
          <SmallCard
            title="Top Riders"
            description={`Top 10 riders - ${formatDateRange()}`}
            customContent={<TopRiders riders={topRiders} />}
          />
          <SmallCard title="Bonus Coins" description={formatDateRange()} customContent={<BonusCoins />} />
          <SmallCard
            title="Work Distribution"
            description={`Assignment types - ${formatDateRange()}`}
            customContent={<WorkDistribution distribution={workDistribution} />}
          />
          <SmallCard title="Total Hours" value={totalHours} description={formatDateRange()} onExport={handleExport} />
          <SmallCard
            title="Total Kilometers"
            value={totalKilometers.toFixed(2)}
            description={formatDateRange()}
            subValue="km traveled"
          />
        </div>
      )}
    </div>
  )
}

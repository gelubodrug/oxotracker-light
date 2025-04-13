"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthSelector } from "@/components/dashboard/month-selector"
import { TypeDetailCard } from "@/components/dashboard/type-detail-card"
import { TypeStatsChart } from "@/components/dashboard/type-stats-chart"
import { TypeAssignmentsList } from "@/components/dashboard/type-assignments-list"
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type WorkTypeData = {
  type: string
  total_hours: number
  assignment_count: number
  store_count: number
  unique_store_ids?: string[]
}

// Mock data to use when API fails or during development
const mockWorkTypes: WorkTypeData[] = [
  {
    type: "Interventie",
    total_hours: 120,
    assignment_count: 15,
    store_count: 8,
    unique_store_ids: ["1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008"],
  },
  {
    type: "Optimizare",
    total_hours: 85,
    assignment_count: 10,
    store_count: 5,
    unique_store_ids: ["2001", "2002", "2003", "2004", "2005"],
  },
  {
    type: "Deschidere",
    total_hours: 160,
    assignment_count: 4,
    store_count: 4,
    unique_store_ids: ["3001", "3002", "3003", "3004"],
  },
]

export function DashboardTypeContent({ initialType = "Interventie" }: { initialType?: string }) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState(initialType)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [workTypes, setWorkTypes] = useState<WorkTypeData[]>(mockWorkTypes)
  const [isLoading, setIsLoading] = useState(false)

  // Use a ref to track if we've already fetched data for this date range
  const fetchedRef = useRef<string | null>(null)

  // Calculate start and end of selected month
  const startDate = startOfMonth(selectedDate)
  const endDate = endOfMonth(selectedDate)

  // Create a key for the current date range
  const dateRangeKey = `${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}`

  useEffect(() => {
    // Skip if we've already fetched this date range
    if (fetchedRef.current === dateRangeKey) {
      return
    }

    // Mark this date range as fetched
    fetchedRef.current = dateRangeKey

    async function fetchData() {
      setIsLoading(true)
      try {
        // Uncomment this when ready to use real data
        // const data = await getWorkDistributionByType(startDate, endDate);
        // if (Array.isArray(data)) {
        //   setWorkTypes(data);
        // } else {
        //   console.error("Invalid data format received:", data);
        //   setWorkTypes(mockWorkTypes);
        // }

        // For now, use mock data with a delay to simulate API call
        setTimeout(() => {
          setWorkTypes(mockWorkTypes)
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error("Error fetching work type data:", error)
        setWorkTypes(mockWorkTypes)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dateRangeKey]) // Only depend on the dateRangeKey

  const handlePreviousMonth = () => {
    setSelectedDate((prevDate) => subMonths(prevDate, 1))
  }

  const handleNextMonth = () => {
    setSelectedDate((prevDate) => addMonths(prevDate, 1))
  }

  const handleSelectMonth = (date: Date) => {
    setSelectedDate(date)
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    // Use replace instead of push to avoid adding to history stack
    router.replace(`/dashboard/type?type=${type}`, { scroll: false })
  }

  // Find the selected type data
  const typeData = workTypes.find((t) => t.type === selectedType) || {
    type: selectedType,
    total_hours: 0,
    assignment_count: 0,
    store_count: 0,
    unique_store_ids: [],
  }

  // Get color based on type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Interventie":
        return "blue"
      case "Optimizare":
        return "orange"
      case "Deschidere":
        return "green"
      default:
        return "gray"
    }
  }

  const color = getTypeColor(selectedType)

  // Get border color class based on type
  const getBorderColorClass = (type: string) => {
    switch (type) {
      case "Interventie":
        return "border-l-blue-500"
      case "Optimizare":
        return "border-l-orange-500"
      case "Deschidere":
        return "border-l-green-500"
      default:
        return "border-l-gray-500"
    }
  }

  const borderColorClass = getBorderColorClass(selectedType)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-2">
          <Button
            variant={selectedType === "Interventie" ? "default" : "outline"}
            onClick={() => handleTypeChange("Interventie")}
            className={selectedType === "Interventie" ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            Interventie
          </Button>
          <Button
            variant={selectedType === "Optimizare" ? "default" : "outline"}
            onClick={() => handleTypeChange("Optimizare")}
            className={selectedType === "Optimizare" ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            Optimizare
          </Button>
          <Button
            variant={selectedType === "Deschidere" ? "default" : "outline"}
            onClick={() => handleTypeChange("Deschidere")}
            className={selectedType === "Deschidere" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            Deschidere
          </Button>
        </div>

        <MonthSelector
          selectedDate={selectedDate}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <Card className={cn("border-l-4", borderColorClass)}>
            <CardHeader>
              <CardTitle>
                {selectedType} - {format(selectedDate, "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TypeDetailCard
                  title="Total Hours"
                  value={`${Math.round(typeData.total_hours)}h`}
                  icon="clock"
                  color={color}
                />
                <TypeDetailCard
                  title="Assignments"
                  value={typeData.assignment_count.toString()}
                  icon="file-text"
                  color={color}
                />
                <TypeDetailCard title="Stores" value={typeData.store_count.toString()} icon="store" color={color} />
              </div>

              {typeData.unique_store_ids && typeData.unique_store_ids.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-1">Store Numbers:</h4>
                  <p className="text-sm text-muted-foreground">{typeData.unique_store_ids.join(", ")}</p>
                </div>
              )}

              <TypeStatsChart type={selectedType} startDate={startDate} endDate={endDate} />

              <TypeAssignmentsList type={selectedType} startDate={startDate} endDate={endDate} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

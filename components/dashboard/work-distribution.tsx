"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getWorkDistributionByType } from "@/app/actions/work-logs"
import Link from "next/link"

type WorkDistributionData = {
  type: string
  total_hours: number
  assignment_count: number
  store_count: number
  unique_store_ids: string[]
}

// Update the component props to accept distribution data
type WorkDistributionProps = {
  startDate?: Date
  endDate?: Date
  distribution?: WorkDistributionData[]
}

export function WorkDistribution({ startDate, endDate, distribution }: WorkDistributionProps) {
  const [data, setData] = useState<WorkDistributionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If distribution data is provided, use it directly
    if (distribution) {
      setData(distribution)
      setLoading(false)
      return
    }

    // Otherwise fetch data based on date range
    const fetchData = async () => {
      setLoading(true)
      try {
        const distributionData = await getWorkDistributionByType(startDate, endDate)
        console.log("Distribution data:", distributionData) // Debug log
        setData(distributionData)
      } catch (error) {
        console.error("Error fetching work distribution:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, distribution])

  const getHoursForType = (type: string): number => {
    const item = data.find((item) => item.type === type)
    return item ? Number(item.total_hours) : 0
  }

  const getAssignmentsForType = (type: string): number => {
    const item = data.find((item) => item.type === type)
    return item ? Number(item.assignment_count) : 0
  }

  const getStoresForType = (type: string): number => {
    const item = data.find((item) => item.type === type)
    return item ? Number(item.store_count) : 0
  }

  const getStoreIdsForType = (type: string): string => {
    const item = data.find((item) => item.type === type)
    if (!item || !item.unique_store_ids || !item.unique_store_ids.length) return ""
    return item.unique_store_ids.join(", ")
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-4">
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="text-xs text-muted-foreground">Loading...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <div className="text-xs text-muted-foreground">No data available</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded-lg border-0 bg-transparent">
            {/* First card - Interventie */}
            <Link
              href="/dashboard/type?type=Interventie"
              className="rounded-lg border-l-4 border-l-blue-500 border-t-0 border-r-0 border-b-0 bg-transparent p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-medium">Interventie</h3>
              <p className="text-2xl font-bold">{getHoursForType("Interventie")}h</p>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{getAssignmentsForType("Interventie")} assig</span>
                <span>{getStoresForType("Interventie")} stores</span>
              </div>
            </Link>

            {/* Second card - Optimizare - with orange border */}
            <Link
              href="/dashboard/type?type=Optimizare"
              className="rounded-lg border-l-4 border-l-orange-500 border-t-0 border-r-0 border-b-0 bg-transparent p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-medium">Optimizare</h3>
              <p className="text-2xl font-bold">{getHoursForType("Optimizare")}h</p>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{getAssignmentsForType("Optimizare")} assig</span>
                <span>{getStoresForType("Optimizare")} stores</span>
              </div>
            </Link>

            {/* Third card - Deschidere */}
            <Link
              href="/dashboard/type?type=Deschidere"
              className="rounded-lg border-l-4 border-l-green-500 border-t-0 border-r-0 border-b-0 bg-transparent p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-medium">Deschidere</h3>
              <p className="text-2xl font-bold">{getHoursForType("Deschidere")}h</p>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{getAssignmentsForType("Deschidere")} assig</span>
                <span>{getStoresForType("Deschidere")} stores</span>
              </div>
              {/* Remove the store IDs display */}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

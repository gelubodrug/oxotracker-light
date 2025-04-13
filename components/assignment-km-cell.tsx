"use client"

import { Button } from "@/components/ui/button"
import { Clock, Route, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface AssignmentKmCellProps {
  assignmentId: number
  km: number | string
  drivingTime?: number | string
  onRecalculate?: (assignmentId: number) => void
  isRecalculating?: boolean
  recalculationResult?: any
}

export function AssignmentKmCell({
  assignmentId,
  km,
  drivingTime,
  onRecalculate,
  isRecalculating = false,
  recalculationResult = null,
}: AssignmentKmCellProps) {
  const router = useRouter()

  // Convert km to a number to ensure proper comparison
  const kmValue = typeof km === "string" ? Number.parseFloat(km) : km || 0

  // Format driving time
  const formatDrivingTime = (time: number | string | undefined) => {
    if (!time) return null
    const minutes = typeof time === "string" ? Number.parseFloat(time) : time
    if (minutes < 60) {
      return `${Math.round(minutes)} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ""}`
  }

  // If recalculation result suggests using the test page
  if (recalculationResult && !recalculationResult.success && recalculationResult.useTestPage) {
    return (
      <div className="flex items-center ml-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/test/assignment-route?id=${assignmentId}`)}
          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          <Route className="h-3 w-3 mr-1" />
          Use Route Page
        </Button>
      </div>
    )
  }

  // If km is zero, show a button to calculate
  if (kmValue === 0) {
    return (
      <div className="flex items-center ml-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/test/assignment-route?id=${assignmentId}`)}
          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          <RefreshCw className="h-3 w-3 mr-1" />0 km
        </Button>
      </div>
    )
  }

  // If recalculating, show a loading spinner
  if (isRecalculating) {
    return (
      <div className="flex items-center ml-1">
        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1"></div>
        <span className="text-sm">Calculating...</span>
      </div>
    )
  }

  // Normal state - show km and driving time
  return (
    <div className="flex items-center">
      {km && drivingTime ? (
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {drivingTime >= 60
              ? `${Math.floor(Number(drivingTime) / 60)}.${Math.floor((Number(drivingTime) % 60) / 6)}h`
              : `${drivingTime}m`}
          </div>
          <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
            <Route className="h-3 w-3 mr-1" />
            {Number(km).toFixed(1)} km
          </div>
        </div>
      ) : (
        <span className="ml-1 text-xs text-amber-600 font-medium">Not calculated</span>
      )}
      {onRecalculate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRecalculate(assignmentId)}
          className="h-5 w-5 p-0 ml-1"
          title="Recalculate distance"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

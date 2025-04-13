import { cn } from "@/lib/utils"

// Assignment data type
export interface AssignmentSegment {
  id: string
  type: string
  value: number
  storeNumber?: string
}

interface SegmentedProgressProps {
  segments: AssignmentSegment[]
  total: number
  maxValue: number // Maximum value for scaling
  unit: "h" | "km"
  className?: string
}

export function SegmentedProgress({ segments, total, maxValue, unit, className }: SegmentedProgressProps) {
  // Get color based on assignment type
  const getColorForType = (type: string): string => {
    switch (type) {
      case "Interventie":
        return "bg-blue-500"
      case "Optimizare":
        return "bg-orange-500"
      case "Deschidere":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Sort segments by value in descending order
  const sortedSegments = [...segments].sort((a, b) => b.value - a.value)

  // Calculate the overall width as a percentage of the maximum value
  // Ensure a minimum width for visibility
  const overallWidthPercent = Math.max((total / maxValue) * 100, 5)

  return (
    <div className={cn("relative w-full h-2", className)}>
      {/* Background track */}
      <div className="absolute top-0 left-0 h-2 w-full rounded-full bg-gray-100"></div>

      {/* Foreground progress bar with segments */}
      <div
        className="absolute top-0 left-0 h-2 rounded-full overflow-hidden flex"
        style={{ width: `${overallWidthPercent}%` }}
      >
        {sortedSegments.map((segment, index) => {
          // Calculate the width percentage for this segment within the progress bar
          const widthPercent = Math.max((segment.value / total) * 100, 2)

          return (
            <div
              key={segment.id || index}
              className={cn(getColorForType(segment.type), "relative h-full", index > 0 ? "border-l border-white" : "")}
              style={{ width: `${widthPercent}%` }}
              title={`${segment.type}: ${segment.value}${unit} (${segment.storeNumber || "No store"})`}
            >
              <span className="sr-only">
                {segment.type}: {segment.value}
                {unit}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

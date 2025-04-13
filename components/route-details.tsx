import type { Store } from "@/types"
import { ArrowRight, Clock, MapPin, Route } from "lucide-react"

interface RouteDetailsProps {
  startLocation: string
  endLocation: string
  stops: Store[]
  distance: number
  duration: number
}

export function RouteDetails({ startLocation, endLocation, stops, distance, duration }: RouteDetailsProps) {
  // Format duration from minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (hours === 0) {
      return `${mins} min`
    }

    return `${hours} h ${mins} min`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm">
          <Route className="mr-2 h-4 w-4 text-primary" />
          <span className="font-medium">Total Distance:</span>
          <span className="ml-2">{distance.toFixed(1)} km</span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="mr-2 h-4 w-4 text-primary" />
          <span className="font-medium">Estimated Time:</span>
          <span className="ml-2">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-6 flex justify-center">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <MapPin className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium">{startLocation}</div>
            <div className="text-xs text-muted-foreground">Starting Point</div>
          </div>
        </div>

        {stops.map((stop, index) => (
          <div key={stop.id} className="flex items-start">
            <div className="flex-shrink-0 w-6 flex flex-col items-center">
              <div className="h-6 border-l border-dashed border-muted-foreground"></div>
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium">{stop.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[250px]">{stop.address}</div>
            </div>
          </div>
        ))}

        <div className="flex items-start">
          <div className="flex-shrink-0 w-6 flex flex-col items-center">
            <div className="h-6 border-l border-dashed border-muted-foreground"></div>
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <ArrowRight className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium">{endLocation}</div>
            <div className="text-xs text-muted-foreground">Return Point</div>
          </div>
        </div>
      </div>
    </div>
  )
}

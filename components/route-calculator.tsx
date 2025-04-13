"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Store } from "@/types"
import { calculateMultiPointRoute } from "@/utils/osm-distance"
import { RouteDetails } from "@/components/route-details"
import { Loader2 } from "lucide-react"

interface RouteCalculatorProps {
  stores: Store[]
  selectedStores: Store[]
  onCreateAssignment: (distance: number, duration: number) => void
}

export function RouteCalculator({ stores, selectedStores, onCreateAssignment }: RouteCalculatorProps) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)

  const handleCalculateRoute = async () => {
    if (selectedStores.length === 0) return

    setIsCalculating(true)
    setRouteInfo(null)

    try {
      // Always use Chitila as start and end point
      const startLocation = "Chitila, Romania"
      const endLocation = "Chitila, Romania"

      // Calculate route from Chitila to all selected stores and back to Chitila
      const storeLocations = selectedStores.map((store) => ({
        address: store.address,
        city: store.city,
        county: store.county,
      }))

      const result = await calculateMultiPointRoute(startLocation, endLocation, storeLocations)

      setRouteInfo({
        distance: result.distance,
        duration: result.duration,
      })
    } catch (error) {
      console.error("Error calculating route:", error)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleCreateAssignment = () => {
    if (!routeInfo) return
    onCreateAssignment(routeInfo.distance, routeInfo.duration)
    setRouteInfo(null)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Route Details</CardTitle>
        <CardDescription>Calculate and review the delivery route</CardDescription>
      </CardHeader>
      <CardContent>
        {selectedStores.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select stores to calculate a route</p>
          </div>
        ) : routeInfo ? (
          <RouteDetails
            startLocation="Chitila Warehouse"
            endLocation="Chitila Warehouse"
            stops={selectedStores}
            distance={routeInfo.distance}
            duration={routeInfo.duration}
          />
        ) : (
          <div className="text-center py-8">
            <p className="mb-4">{selectedStores.length} stores selected</p>
            <Button onClick={handleCalculateRoute} disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Calculate Route"
              )}
            </Button>
          </div>
        )}
      </CardContent>
      {routeInfo && (
        <CardFooter>
          <Button className="w-full" onClick={handleCreateAssignment}>
            Create Assignment
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

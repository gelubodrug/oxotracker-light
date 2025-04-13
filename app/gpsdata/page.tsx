"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Clock, Truck, Thermometer, User, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import GoogleMapRoute from "@/components/google-map-route"

interface DevicePosition {
  latitude: number
  longitude: number
  heading: number
  speed: number
  ignitionState: string
  temperature: string
  timestamp: string
}

interface Device {
  id: string
  name: string
  driverId?: string
  driverName?: string
  status: string
  lastUpdate: string
  position: DevicePosition
}

export default function GPSDataPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("list")
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchGPSData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/gps", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setDevices(data)
      setLastRefreshed(new Date())
      toast({
        title: "GPS Data Refreshed",
        description: `Successfully refreshed data for ${data.length} devices`,
      })
    } catch (err) {
      console.error("Error fetching GPS data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch GPS data")
      toast({
        title: "Error",
        description: "Failed to refresh GPS data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGPSData()
    // No interval for automatic refresh - we'll only refresh when the user clicks the button
  }, [])

  // Format date and time
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "N/A"

    try {
      const date = new Date(dateTimeStr)
      return new Intl.DateTimeFormat("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date)
    } catch (e) {
      return dateTimeStr
    }
  }

  // Format speed from km/h
  const formatSpeed = (speed: number) => {
    if (speed === undefined || speed === null) return "0 km/h"
    return `${speed} km/h`
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "bg-green-100 text-green-800 border-green-200"
      case "offline":
        return "bg-red-100 text-red-800 border-red-200"
      case "unknown":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  // Get ignition state indicator
  const getIgnitionIndicator = (ignitionState: string) => {
    const isOn = ignitionState === "ON"
    return (
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full mr-1 ${isOn ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className={isOn ? "text-green-600" : "text-red-600"}>{ignitionState}</span>
      </div>
    )
  }

  // Prepare map markers for all devices
  const mapMarkers = devices
    .filter((device) => device.position && device.position.latitude && device.position.longitude)
    .map((device) => ({
      id: device.id,
      name: device.name,
      driverName: device.driverName,
      latitude: device.position.latitude,
      longitude: device.position.longitude,
      speed: device.position.speed,
      heading: device.position.heading,
      lastUpdate: device.lastUpdate,
      status: device.status,
      ignitionState: device.position.ignitionState,
      temperature: device.position.temperature,
    }))

  return (
    <AppShell>
      <div className="container mx-auto py-6 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">GPS Fleet Tracking</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGPSData}
              disabled={loading}
              className="flex items-center gap-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDateTime(lastRefreshed.toISOString())}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">Error: {error}</div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No devices found</div>
            ) : (
              devices.map((device) => (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <Badge className={`${getStatusColor(device.status)} border`}>{device.status || "Unknown"}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">ID:</span>
                          <span className="ml-1 font-medium">{device.id}</span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">Last Update:</span>
                          <span className="ml-1 font-medium">{formatDateTime(device.lastUpdate)}</span>
                        </div>
                      </div>

                      {/* Add driver information */}
                      {device.driverName && (
                        <div className="flex items-center text-sm pt-2 border-t border-gray-100">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">Driver:</span>
                          <span className="ml-1 font-medium">{device.driverName}</span>
                        </div>
                      )}

                      {device.position && (
                        <>
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Location</div>
                                <div className="text-sm text-gray-600">
                                  {`${device.position.latitude.toFixed(6)}, ${device.position.longitude.toFixed(6)}`}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-gray-100">
                            <div>
                              <span className="text-gray-600">Speed:</span>
                              <span className="ml-1 font-medium">{formatSpeed(device.position.speed)}</span>
                            </div>

                            <div>
                              <span className="text-gray-600">Ignition:</span>
                              <span className="ml-1 font-medium">
                                {getIgnitionIndicator(device.position.ignitionState)}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-600">Temp:</span>
                              <span className="ml-1 font-medium flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-blue-500" />
                                {device.position.temperature}°C
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-md">
                {loading ? (
                  <div className="flex justify-center items-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : mapMarkers.length === 0 ? (
                  <div className="text-center py-24 text-gray-500">No location data available</div>
                ) : (
                  <div className="h-[600px]">
                    {/* Only render the map component when we have markers and are on the map tab */}
                    {activeTab === "map" && <GPSMap markers={mapMarkers} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

// GPS Map Component
function GPSMap({ markers }: { markers: any[] }) {
  // Create map segments for the Google Map component
  const mapSegments = markers.map((marker) => ({
    startStoreId: marker.id,
    endStoreId: marker.id,
    startName: `${marker.name}${marker.driverName ? ` (${marker.driverName})` : ""}`,
    endName: marker.name,
    startLatitude: marker.latitude,
    startLongitude: marker.longitude,
    endLatitude: marker.latitude,
    endLongitude: marker.longitude,
    distance: 0,
    duration: 0,
    isVehicle: true,
    heading: marker.heading,
    speed: marker.speed,
    status: marker.status,
    ignitionState: marker.ignitionState,
    lastUpdate: marker.lastUpdate,
    temperature: marker.temperature,
    driverName: marker.driverName,
  }))

  return <GoogleMapRoute segments={mapSegments} height="600px" isVehicleMap={true} />
}

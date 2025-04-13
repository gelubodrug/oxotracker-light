"use client"

import { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

interface MapProps {
  segments: any[]
  polyline?: string
  height?: string
  isVehicleMap?: boolean
}

export default function GoogleMapRoute({ segments, polyline, height = "400px", isVehicleMap = false }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([])
  const labelMarkersRef = useRef<google.maps.Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Clean up function to remove markers and info windows
  const cleanupMap = () => {
    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }

    // Clear existing info windows
    if (infoWindowsRef.current.length > 0) {
      infoWindowsRef.current.forEach((infoWindow) => infoWindow.close())
      infoWindowsRef.current = []
    }

    // Clear label markers
    if (labelMarkersRef.current.length > 0) {
      labelMarkersRef.current.forEach((marker) => marker.setMap(null))
      labelMarkersRef.current = []
    }
  }

  useEffect(() => {
    if (!segments || segments.length === 0) return

    const initMap = async () => {
      try {
        setLoading(true)
        setError(null)

        // If map is already initialized, just update markers
        if (mapInitialized && mapInstanceRef.current) {
          updateMapMarkers()
          return
        }

        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || "",
          version: "weekly",
          libraries: ["places", "geometry"],
        })

        // Import the Map class
        const { Map } = await loader.importLibrary("maps")

        // Get the google object
        const google = await loader.importLibrary("core")

        // Ensure mapRef.current is available
        if (!mapRef.current) {
          console.error("Map container element not found")
          setError("Map container element not found")
          setLoading(false)
          return
        }

        // Create the map with a slight delay to ensure DOM is ready
        setTimeout(() => {
          try {
            if (!mapRef.current) {
              throw new Error("Map container element not found after delay")
            }

            const mapInstance = new Map(mapRef.current, {
              center: { lat: 44.4268, lng: 26.1025 }, // Default to Bucharest
              zoom: 9,
              mapTypeId: "roadmap",
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
            })

            mapInstanceRef.current = mapInstance
            setMapInitialized(true)

            // Add markers and routes
            updateMapMarkers()
          } catch (err) {
            console.error("Error creating map:", err)
            setError(`Error creating map: ${err instanceof Error ? err.message : String(err)}`)
            setLoading(false)
          }
        }, 100)
      } catch (err) {
        console.error("Error initializing Google Maps:", err)
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    const updateMapMarkers = () => {
      if (!mapInstanceRef.current || !window.google) {
        console.error("Map not initialized or Google Maps not loaded")
        return
      }

      const mapInstance = mapInstanceRef.current
      const google = window.google

      // Clean up existing markers and info windows
      cleanupMap()

      const bounds = new google.maps.LatLngBounds()

      if (isVehicleMap) {
        // Vehicle map display logic
        segments.forEach((segment, index) => {
          const position = {
            lat: segment.startLatitude || 0,
            lng: segment.startLongitude || 0,
          }

          if (position.lat && position.lng) {
            // Create a custom vehicle icon with rotation based on heading
            const vehicleIcon = {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              fillColor: segment.ignitionState === "ON" ? "#22c55e" : "#ef4444",
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: "#FFFFFF",
              scale: 6,
              rotation: segment.heading || 0, // Use the heading for rotation
            }

            const marker = new google.maps.Marker({
              position,
              map: mapInstance,
              title: segment.startName,
              icon: vehicleIcon,
              zIndex: 2, // Higher zIndex to ensure the arrow is above the label
            })

            // Add a separate marker for the driver name label
            if (segment.driverName) {
              // Get the first name only for shorter labels
              const firstName = segment.driverName.split(" ")[0]

              // Create a label marker slightly offset from the vehicle
              const labelMarker = new google.maps.Marker({
                position,
                map: mapInstance,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 0, // Invisible marker
                },
                label: {
                  text: firstName,
                  color: segment.ignitionState === "ON" ? "#22c55e" : "#ef4444",
                  fontWeight: "bold",
                  fontSize: "12px",
                  className: "vehicle-label",
                },
                zIndex: 1,
              })

              labelMarkersRef.current.push(labelMarker)
            }

            // Format the last update time
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

            // Format speed
            const formatSpeed = (speed: number) => {
              if (speed === undefined || speed === null) return "0 km/h"
              return `${speed} km/h`
            }

            // Create info window content
            const infoContent = `
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px; font-weight: bold;">${segment.startName}</h3>
                ${segment.driverName ? `<div style="margin-bottom: 5px;"><strong>Driver:</strong> ${segment.driverName}</div>` : ""}
                <div style="margin-bottom: 5px;">
                  <strong>Status:</strong> 
                  <span style="color: ${segment.ignitionState === "ON" ? "green" : "red"};">
                    ${segment.ignitionState || "Unknown"}
                  </span>
                </div>
                <div style="margin-bottom: 5px;">
                  <strong>Speed:</strong> ${formatSpeed(segment.speed)}
                </div>
                ${
                  segment.temperature !== undefined
                    ? `<div style="margin-bottom: 5px;">
                    <strong>Temperature:</strong> ${segment.temperature}°C
                  </div>`
                    : ""
                }
                <div style="margin-bottom: 5px;">
                  <strong>Last Update:</strong> ${formatDateTime(segment.lastUpdate)}
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                  ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}
                </div>
              </div>
            `

            const infoWindow = new google.maps.InfoWindow({
              content: infoContent,
            })

            marker.addListener("click", () => {
              // Close all other info windows first
              infoWindowsRef.current.forEach((window) => window.close())
              infoWindow.open(mapInstance, marker)
            })

            markersRef.current.push(marker)
            infoWindowsRef.current.push(infoWindow)
            bounds.extend(position)
          }
        })
      } else {
        // Original route display logic for non-vehicle maps
        const directionsService = new google.maps.DirectionsService()
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true, // We'll add our own markers
          polylineOptions: {
            strokeColor: "#4285F4",
            strokeOpacity: 1.0,
            strokeWeight: 4,
          },
        })

        // Add markers for each segment
        segments.forEach((segment, index) => {
          // Start point marker (only for the first segment or if it's a new point)
          if (index === 0 || segments[index - 1].endStoreId !== segment.startStoreId) {
            const startPosition = {
              lat: segment.startLatitude || 0,
              lng: segment.startLongitude || 0,
            }

            if (startPosition.lat && startPosition.lng) {
              const marker = new google.maps.Marker({
                position: startPosition,
                map: mapInstance,
                title: segment.startName || `Point ${index}`,
                label: {
                  text: segment.isHQ && segment.startStoreId === "HQ" ? "HQ" : (index + 1).toString(),
                  color: segment.isHQ && segment.startStoreId === "HQ" ? "#FFFFFF" : "#FFFFFF",
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: segment.isHQ && segment.startStoreId === "HQ" ? "#4285F4" : "#DB4437",
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: "#FFFFFF",
                  scale: 10,
                },
              })

              // Add info window
              const infoWindow = new google.maps.InfoWindow({
                content: `<div><strong>${segment.startName || "Point"}</strong><br>${segment.startAddress || ""}</div>`,
              })

              marker.addListener("click", () => {
                infoWindow.open(mapInstance, marker)
              })

              markersRef.current.push(marker)
              infoWindowsRef.current.push(infoWindow)
              bounds.extend(startPosition)
            }
          }

          // End point marker (only for the last segment)
          if (index === segments.length - 1) {
            const endPosition = {
              lat: segment.endLatitude || 0,
              lng: segment.endLongitude || 0,
            }

            if (endPosition.lat && endPosition.lng) {
              const marker = new google.maps.Marker({
                position: endPosition,
                map: mapInstance,
                title: segment.endName || `End`,
                label: {
                  text: segment.isHQ && segment.endStoreId === "HQ" ? "HQ" : "End",
                  color: "#FFFFFF",
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: segment.isHQ && segment.endStoreId === "HQ" ? "#4285F4" : "#0F9D58",
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: "#FFFFFF",
                  scale: 10,
                },
              })

              // Add info window
              const infoWindow = new google.maps.InfoWindow({
                content: `<div><strong>${segment.endName || "End"}</strong><br>${segment.endAddress || ""}</div>`,
              })

              marker.addListener("click", () => {
                infoWindow.open(mapInstance, marker)
              })

              markersRef.current.push(marker)
              infoWindowsRef.current.push(infoWindow)
              bounds.extend(endPosition)
            }
          }
        })

        // Calculate and display routes between points using Directions API
        const calculateRoutes = async () => {
          const allRoutePromises = []

          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

            if (segment.startLatitude && segment.startLongitude && segment.endLatitude && segment.endLongitude) {
              const routePromise = new Promise<void>((resolve) => {
                directionsService.route(
                  {
                    origin: { lat: segment.startLatitude, lng: segment.startLongitude },
                    destination: { lat: segment.endLatitude, lng: segment.endLongitude },
                    travelMode: google.maps.TravelMode.DRIVING,
                  },
                  (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                      // Create a new renderer for each route
                      const segmentRenderer = new google.maps.DirectionsRenderer({
                        map: mapInstance,
                        directions: result,
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: segment.isHQ ? "#4285F4" : "#DB4437",
                          strokeOpacity: 1.0,
                          strokeWeight: 4,
                        },
                        preserveViewport: true, // Don't change the map viewport
                      })

                      // Extend bounds with all route points
                      if (result.routes && result.routes.length > 0 && result.routes[0].overview_path) {
                        result.routes[0].overview_path.forEach((point) => {
                          bounds.extend(point)
                        })
                      }
                    } else {
                      console.error(`Error calculating route for segment ${i}:`, status)

                      // Fallback to direct line if directions fail
                      const routePath = new google.maps.Polyline({
                        path: [
                          { lat: segment.startLatitude, lng: segment.startLongitude },
                          { lat: segment.endLatitude, lng: segment.endLongitude },
                        ],
                        geodesic: true,
                        strokeColor: segment.isHQ ? "#4285F4" : "#DB4437",
                        strokeOpacity: 0.7,
                        strokeWeight: 3,
                        strokePattern: [google.maps.SymbolPath.DASH, { weight: 2, length: 2 }],
                      })

                      routePath.setMap(mapInstance)
                    }
                    resolve()
                  },
                )
              })

              allRoutePromises.push(routePromise)
            }
          }

          // Wait for all routes to be calculated
          await Promise.all(allRoutePromises)

          // Now fit bounds after all routes are calculated and added to the map
          if (!bounds.isEmpty()) {
            // Add some padding to the bounds
            mapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })

            // Ensure we're not zoomed in too far if there's only one point
            const zoomListener = google.maps.event.addListenerOnce(mapInstance, "idle", () => {
              if (mapInstance.getZoom() > 15) {
                mapInstance.setZoom(15)
              }
            })
          }
        }

        calculateRoutes()
      }

      // Fit bounds to show all markers
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })

        // Ensure we're not zoomed in too far if there's only one point
        google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          if (mapInstance.getZoom() > 15) {
            mapInstance.setZoom(15)
          }
        })
      }

      setLoading(false)
    }

    initMap()

    // Cleanup function
    return () => {
      cleanupMap()
    }
  }, [segments, polyline, isVehicleMap, mapInitialized])

  return (
    <div className="relative w-full" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500 p-4 text-center">
          {error}
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-md" />
    </div>
  )
}

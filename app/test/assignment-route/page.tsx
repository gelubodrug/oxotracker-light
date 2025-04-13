"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, MapPin, Route, Clock, ArrowRight, Loader2, CheckCircle, Home, Warehouse } from "lucide-react"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { finalizeAssignmentWithTeam } from "@/app/actions/assignments"
// Add the import for the Google Maps component
import GoogleMapRoute from "@/components/google-map-route"
import { updateAssignmentDistanceAndDuration } from "./update-assignment"

// Fixed headquarters location
const HQ_LOCATION = {
  address: "Șoseaua Banatului 109a",
  city: "Chitila",
  county: "Ilfov",
  coordinates: [25.984056, 44.5062199] as [number, number],
  description: "Headquarters",
}

// Add this after the HQ_LOCATION constant:
const MATERIALS_DEPOT_LOCATION = {
  address: "Drumul Dealu Bradului, Nr. 141",
  city: "Bucuresti",
  county: "Sectorul 4",
  coordinates: [26.1153, 44.3689] as [number, number], // [longitude, latitude]
  description: "Depozit Materiale",
}

interface StorePoint {
  store_id: number
  description?: string
  address?: string
  city?: string
  county?: string
}

interface Assignment {
  id: number
  start_date: string
  due_date: string
  store_points: number[] | StorePoint[]
  km?: number
  driving_time?: number
}

interface Store {
  store_id: number
  description: string
  address: string
  city: string
  county: string
  coordinates?: [number, number]
  error?: boolean
  geocoded?: boolean
  warning?: string
}

interface RouteSegment {
  startStoreId: number | string
  endStoreId: number | string
  startName?: string
  endName?: string
  startAddress?: string
  endAddress?: string
  distance: number
  duration: number
  isHQ?: boolean
  startLatitude?: number
  startLongitude?: number
  endLatitude?: number
  endLongitude?: number
  polyline?: string
  isMaterialsDepot?: boolean
}

interface RouteResponse {
  success: boolean
  route?: {
    totalDistance: number
    totalDuration: number
    segments: RouteSegment[]
    polyline?: string
  }
  calculationMethod?: string
  error?: string
  message?: string
}

export default function TestAssignmentRoutePage() {
  const [assignmentId, setAssignmentId] = useState<string>("")
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [routeLoading, setRouteLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [routeResponse, setRouteResponse] = useState<RouteResponse | null>(null)
  const [storeDetails, setStoreDetails] = useState<Store[]>([])
  const [processingStep, setProcessingStep] = useState<string>("")
  const [includeHQ, setIncludeHQ] = useState<boolean>(true)
  const [savingToDb, setSavingToDb] = useState<boolean>(false)
  const [isFinalizingAssignment, setIsFinalizingAssignment] = useState<boolean>(false)
  const [finalizationSuccess, setFinalizationSuccess] = useState<boolean>(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [includeMaterials, setIncludeMaterials] = useState<boolean>(false)

  useEffect(() => {
    // Check if there's an ID in the URL query parameters
    const params = new URLSearchParams(window.location.search)
    const assignmentId = params.get("id")

    if (assignmentId) {
      // Set the assignment ID in the input field
      setAssignmentId(assignmentId)

      // Automatically trigger the fetch
      handleFetchAssignment(assignmentId)
    }
  }, [])

  const fetchAssignment = async () => {
    if (!assignmentId || isNaN(Number(assignmentId))) {
      setError("Please enter a valid assignment ID")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setAssignment(null)
      setRouteResponse(null)
      setStoreDetails([])
      setWarnings([])
      setProcessingStep("Fetching assignment data...")

      // Step 1: Fetch the assignment
      const res = await fetch(`/api/test/assignment/${assignmentId}`)

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            `Assignment with ID ${assignmentId} not found. Please check if this ID exists in your database.`,
          )
        } else {
          throw new Error(`Failed to fetch assignment: ${res.status} ${res.statusText}`)
        }
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch assignment")
      }

      if (!data.assignment) {
        throw new Error("Assignment not found")
      }

      console.log("Assignment data:", data.assignment)

      // Set the assignment state
      setAssignment(data.assignment)

      // Step 2: Process store points - pass the assignment data directly
      await processStorePoints(data.assignment)
    } catch (err) {
      console.error("Error fetching assignment:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
      setProcessingStep("")
    }
  }

  const handleFetchAssignment = async (idParam = null) => {
    const id = idParam || assignmentId
    if (!id) {
      toast({
        title: "Error",
        description: "Please enter an assignment ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      setError(null)
      setAssignment(null)
      setRouteResponse(null)
      setStoreDetails([])
      setWarnings([])
      setProcessingStep("Fetching assignment data...")

      // Step 1: Fetch the assignment
      const res = await fetch(`/api/test/assignment/${id}`)

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Assignment with ID ${id} not found. Please check if this ID exists in your database.`)
        } else {
          throw new Error(`Failed to fetch assignment: ${res.status} ${res.statusText}`)
        }
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch assignment")
      }

      if (!data.assignment) {
        throw new Error("Assignment not found")
      }

      console.log("Assignment data:", data.assignment)

      // Set the assignment state
      setAssignment(data.assignment)

      // Step 2: Process store points - pass the assignment data directly
      await processStorePoints(data.assignment)
    } catch (err) {
      console.error("Error fetching assignment:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
      setProcessingStep("")
    }
  }

  const processStorePoints = async (assignmentData: Assignment) => {
    try {
      setRouteLoading(true)
      setWarnings([])

      // Extract store IDs from the assignment's store_points
      let storeIds: number[] = []

      if (Array.isArray(assignmentData.store_points)) {
        // Handle both number[] and StorePoint[] formats
        storeIds = assignmentData.store_points
          .map((point) => {
            if (typeof point === "number") {
              return point
            } else if (typeof point === "object" && point !== null && "store_id" in point) {
              return point.store_id
            }
            return 0
          })
          .filter((id) => id > 0)
      }

      console.log("Extracted store IDs:", storeIds)

      // Changed from 2 to 1 to allow single store routes
      if (storeIds.length < 1) {
        throw new Error("At least 1 store point is required to calculate a route")
      }

      // Fetch all store details in a single batch
      setProcessingStep(`Fetching details for ${storeIds.length} stores...`)

      try {
        // First, fetch all store details
        const processedStores: Store[] = []
        const newWarnings: string[] = []

        for (let i = 0; i < storeIds.length; i++) {
          const storeId = storeIds[i]
          setProcessingStep(`Processing store ${i + 1}/${storeIds.length}: Store ID ${storeId}`)

          try {
            // Fetch store details from the stores table
            const storeDetails = await fetchStoreDetails(storeId)

            // Check if the store has a warning
            if (storeDetails.warning) {
              newWarnings.push(storeDetails.warning)
            }

            processedStores.push(storeDetails)
          } catch (err) {
            console.error(`Error processing store ${storeId}:`, err)

            // Create a placeholder store with error flag
            const placeholderStore: Store = {
              store_id: storeId,
              description: `Store #${storeId}`,
              address: "",
              city: "",
              county: "",
              error: true,
              warning: `Failed to fetch details for Store #${storeId}: ${err.message}`,
            }

            processedStores.push(placeholderStore)
            newWarnings.push(`Failed to fetch details for Store #${storeId}: ${err.message}`)
          }
        }

        // Update the UI with all processed stores
        setStoreDetails(processedStores)

        // Set any warnings
        if (newWarnings.length > 0) {
          setWarnings(newWarnings)
        }

        // Initialize batchData with a default value
        let batchData: any = {
          success: false,
          error: "Route calculation not started",
          calculationMethod: "none",
        }

        // For single store, we need to handle it differently
        if (storeIds.length === 1 && includeHQ) {
          // For a single store, we'll create a simple route with HQ -> Store -> HQ
          const singleStoreId = storeIds[0]
          const store = processedStores[0]

          // Create a simple route with HQ -> Store -> HQ
          const storeCoords = store.coordinates || [0, 0]

          // Calculate distances using Haversine formula
          const hqToStoreDistance = calculateHaversineDistance(
            HQ_LOCATION.coordinates[1], // latitude
            HQ_LOCATION.coordinates[0], // longitude
            storeCoords[1], // latitude
            storeCoords[0], // longitude
          )

          // Estimate travel times (60 km/h average speed)
          const hqToStoreDuration = (hqToStoreDistance / 60) * 60 // minutes

          // Create route segments
          const segments = []

          if (includeMaterials) {
            // Add HQ to Store 6666 segment
            segments.push({
              startStoreId: "HQ",
              endStoreId: 6666,
              startName: HQ_LOCATION.description,
              endName: MATERIALS_DEPOT_LOCATION.description,
              startAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
              endAddress: `${MATERIALS_DEPOT_LOCATION.address}, ${MATERIALS_DEPOT_LOCATION.city}, ${MATERIALS_DEPOT_LOCATION.county}`,
              distance: 25.5, // Updated distance from Chitila to Sectorul 4
              duration: 45, // Updated duration in minutes
              isHQ: true,
              startLatitude: HQ_LOCATION.coordinates[1],
              startLongitude: HQ_LOCATION.coordinates[0],
              endLatitude: MATERIALS_DEPOT_LOCATION.coordinates[1],
              endLongitude: MATERIALS_DEPOT_LOCATION.coordinates[0],
            })

            // Add Store 6666 to actual store segment
            segments.push({
              startStoreId: 6666,
              endStoreId: singleStoreId,
              startName: MATERIALS_DEPOT_LOCATION.description,
              startAddress: `${MATERIALS_DEPOT_LOCATION.address}, ${MATERIALS_DEPOT_LOCATION.city}, ${MATERIALS_DEPOT_LOCATION.county}`,
              endAddress: `${store.address}, ${store.city}, ${store.county}`,
              distance: Math.round(hqToStoreDistance * 10) / 10,
              duration: Math.round(hqToStoreDuration),
              isHQ: false,
              startLatitude: MATERIALS_DEPOT_LOCATION.coordinates[1],
              startLongitude: MATERIALS_DEPOT_LOCATION.coordinates[0],
              endLatitude: storeCoords[1],
              endLongitude: storeCoords[0],
            })
          } else {
            // Standard HQ to store segment
            segments.push({
              startStoreId: "HQ",
              endStoreId: singleStoreId,
              startName: HQ_LOCATION.description,
              endName: store.description || `Store #${singleStoreId}`,
              startAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
              endAddress: `${store.address}, ${store.city}, ${store.county}`,
              distance: Math.round(hqToStoreDistance * 10) / 10,
              duration: Math.round(hqToStoreDuration),
              isHQ: true,
              startLatitude: HQ_LOCATION.coordinates[1],
              startLongitude: HQ_LOCATION.coordinates[0],
              endLatitude: storeCoords[1],
              endLongitude: storeCoords[0],
            })
          }

          // Return segment (always the same)
          segments.push({
            startStoreId: singleStoreId,
            endStoreId: "HQ",
            startName: store.description || `Store #${singleStoreId}`,
            endName: HQ_LOCATION.description,
            startAddress: `${store.address}, ${store.city}, ${store.county}`,
            endAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
            distance: Math.round(hqToStoreDistance * 10) / 10,
            duration: Math.round(hqToStoreDuration),
            isHQ: true,
            startLatitude: storeCoords[1],
            startLongitude: storeCoords[0],
            endLatitude: HQ_LOCATION.coordinates[1],
            endLongitude: HQ_LOCATION.coordinates[0],
          })

          // Calculate total distance and duration
          const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0)
          const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0)

          // Create the route response
          batchData = {
            success: true,
            calculationMethod: "direct",
            route: {
              totalDistance: Math.round(totalDistance * 10) / 10,
              totalDuration: Math.round(totalDuration),
              segments: segments,
            },
          }
        } else {
          // For multiple stores, use Google Maps API
          const validStores = processedStores.filter((store) => store.address && store.city && !store.error)

          if (validStores.length === 0) {
            throw new Error("No valid stores with addresses found to calculate route")
          }

          // Handle route calculation for multiple stores
          try {
            // Prepare addresses for Google Maps API
            const origin = `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}, Romania`
            const destination = `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}, Romania`

            // Prepare waypoints based on whether materials pickup is enabled
            let waypoints = []
            if (includeMaterials) {
              // Add the materials depot as the first waypoint
              waypoints = [
                `${MATERIALS_DEPOT_LOCATION.address}, ${MATERIALS_DEPOT_LOCATION.city}, ${MATERIALS_DEPOT_LOCATION.county}, Romania`,
                ...validStores.map((store) => `${store.address}, ${store.city}, ${store.county}, Romania`),
              ]
            } else {
              // Just use the stores as waypoints
              waypoints = validStores.map((store) => `${store.address}, ${store.city}, ${store.county}, Romania`)
            }

            const routeData = {
              origin,
              destination,
              waypoints,
            }

            console.log("Calling Google Maps API:", routeData)

            try {
              const batchRes = await fetch(`/api/google-maps`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(routeData),
              })

              if (!batchRes.ok) {
                throw new Error(`Failed to calculate route: ${batchRes.status}`)
              }

              batchData = await batchRes.json()

              if (!batchData.success) {
                throw new Error(batchData.error || "Failed to calculate route")
              }

              console.log("Google Maps API response:", batchData)

              // Find the section where we process the segments for Google Maps API response
              // Around line 390-430 where we process the segments to match our expected format

              // Replace the segment processing code with this improved version that properly handles the materials depot
              if (batchData.route && batchData.route.segments) {
                const processedSegments = batchData.route.segments.map((segment, index) => {
                  // Determine if this is an HQ segment or materials depot segment
                  const isStartHQ = index === 0 && includeHQ
                  const isEndHQ = index === batchData.route.segments.length - 1 && includeHQ

                  // Special handling for materials depot (store 6666)
                  const isStartMaterialsDepot = includeMaterials && index === 1
                  const isEndMaterialsDepot = false // We don't end at materials depot

                  // Determine the correct store IDs and names based on the segment position
                  let startStoreId, endStoreId, startName, endName

                  if (isStartHQ) {
                    startStoreId = "HQ"
                    startName = HQ_LOCATION.description
                  } else if (isStartMaterialsDepot) {
                    startStoreId = 6666
                    startName = MATERIALS_DEPOT_LOCATION.description
                  } else {
                    // For regular stores, calculate the correct index in the storeIds array
                    const storeIndex = includeMaterials ? Math.max(0, index - 2) : Math.max(0, index - 1)
                    startStoreId = storeIds[storeIndex]
                    startName = segment.startName || `Store #${startStoreId}`
                  }

                  if (isEndHQ) {
                    endStoreId = "HQ"
                    endName = HQ_LOCATION.description
                  } else if (isEndMaterialsDepot) {
                    endStoreId = 6666
                    endName = MATERIALS_DEPOT_LOCATION.description
                  } else {
                    // For regular stores, calculate the correct index in the storeIds array
                    const storeIndex = includeMaterials ? Math.max(0, index - 1) : Math.max(0, index)
                    endStoreId = storeIds[Math.min(storeIndex, storeIds.length - 1)]
                    endName = segment.endName || `Store #${endStoreId}`
                  }

                  return {
                    startStoreId,
                    endStoreId,
                    startName,
                    endName,
                    startAddress: segment.startAddress,
                    endAddress: segment.endAddress,
                    distance: segment.distance,
                    duration: segment.duration,
                    isHQ: isStartHQ || isEndHQ,
                    isMaterialsDepot: isStartMaterialsDepot || isEndMaterialsDepot,
                    startLatitude: segment.startLocation?.lat || 0,
                    startLongitude: segment.startLocation?.lng || 0,
                    endLatitude: segment.endLocation?.lat || 0,
                    endLongitude: segment.endLocation?.lng || 0,
                    polyline: segment.polyline, // Include the polyline for this segment
                  }
                })

                batchData.route.segments = processedSegments
              }
            } catch (error) {
              console.error("Error with Google Maps API:", error)

              // Fall back to direct calculation if Google Maps API fails
              console.log("Falling back to direct distance calculation")

              // Create direct routes between points
              const segments = []

              if (includeHQ) {
                // Add HQ to first store segment
                const firstStore = validStores[0]
                const firstStoreCoords = firstStore.coordinates || [0, 0]

                const hqToFirstDistance = calculateHaversineDistance(
                  HQ_LOCATION.coordinates[1],
                  HQ_LOCATION.coordinates[0],
                  firstStoreCoords[1],
                  firstStoreCoords[0],
                )

                const hqToFirstDuration = (hqToFirstDistance / 60) * 60

                segments.push({
                  startStoreId: "HQ",
                  endStoreId: storeIds[0],
                  startName: HQ_LOCATION.description,
                  endName: firstStore.description || `Store #${storeIds[0]}`,
                  startAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
                  endAddress: `${firstStore.address}, ${firstStore.city}, ${firstStore.county}`,
                  distance: Math.round(hqToFirstDistance * 10) / 10,
                  duration: Math.round(hqToFirstDuration),
                  isHQ: true,
                  startLatitude: HQ_LOCATION.coordinates[1],
                  startLongitude: HQ_LOCATION.coordinates[0],
                  endLatitude: firstStoreCoords[1],
                  endLongitude: firstStoreCoords[0],
                })
              }

              // Add segments between stores
              for (let i = 0; i < validStores.length - 1; i++) {
                const startStore = validStores[i]
                const endStore = validStores[i + 1]

                const startCoords = startStore.coordinates || [0, 0]
                const endCoords = endStore.coordinates || [0, 0]

                const distance = calculateHaversineDistance(startCoords[1], startCoords[0], endCoords[1], endCoords[0])

                const duration = (distance / 60) * 60

                segments.push({
                  startStoreId: storeIds[i],
                  endStoreId: storeIds[i + 1],
                  startName: startStore.description || `Store #${storeIds[i]}`,
                  endName: endStore.description || `Store #${storeIds[i + 1]}`,
                  startAddress: `${startStore.address}, ${startStore.city}, ${startStore.county}`,
                  endAddress: `${endStore.address}, ${endStore.city}, ${endStore.county}`,
                  distance: Math.round(distance * 10) / 10,
                  duration: Math.round(duration),
                  isHQ: false,
                  startLatitude: startCoords[1],
                  startLongitude: startCoords[0],
                  endLatitude: endCoords[1],
                  endLongitude: endCoords[0],
                })
              }

              if (includeHQ) {
                // Add last store to HQ segment
                const lastStore = validStores[validStores.length - 1]
                const lastStoreCoords = lastStore.coordinates || [0, 0]

                const lastToHQDistance = calculateHaversineDistance(
                  lastStoreCoords[1],
                  lastStoreCoords[0],
                  HQ_LOCATION.coordinates[1],
                  HQ_LOCATION.coordinates[0],
                )

                const lastToHQDuration = (lastToHQDistance / 60) * 60

                segments.push({
                  startStoreId: storeIds[validStores.length - 1],
                  endStoreId: "HQ",
                  startName: lastStore.description || `Store #${storeIds[validStores.length - 1]}`,
                  endName: HQ_LOCATION.description,
                  startAddress: `${lastStore.address}, ${lastStore.city}, ${lastStore.county}`,
                  endAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
                  distance: Math.round(lastToHQDistance * 10) / 10,
                  duration: Math.round(lastToHQDuration),
                  isHQ: true,
                  startLatitude: lastStoreCoords[1],
                  startLongitude: lastStoreCoords[0],
                  endLatitude: HQ_LOCATION.coordinates[1],
                  endLongitude: HQ_LOCATION.coordinates[0],
                })
              }

              // Calculate total distance and duration
              const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0)
              const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0)

              batchData = {
                success: true,
                calculationMethod: "direct-fallback",
                route: {
                  totalDistance: Math.round(totalDistance * 10) / 10,
                  totalDuration: Math.round(totalDuration),
                  segments: segments,
                },
              }
            }
          } catch (error) {
            console.error("Error calculating route:", error)
            batchData = {
              success: false,
              error: `Route calculation failed: ${error.message}`,
              calculationMethod: "failed",
            }
          }
        }

        // Make sure batchData is defined before setting it as routeResponse
        if (batchData) {
          setRouteResponse(batchData)

          // Automatically save the route to the database if we have a successful route
          // Pass the assignment data directly instead of relying on the state
          if (batchData.success && batchData.route) {
            await saveRouteToDatabase(assignmentData.id, batchData.route.totalDistance, batchData.route.totalDuration)
          }
        } else {
          // If batchData is undefined, set an error response
          setRouteResponse({
            success: false,
            error: "Failed to calculate route - no route data returned",
          })
          console.error("Route calculation failed - batchData is undefined")
        }
      } catch (err) {
        console.error("Error processing stores:", err)
        throw err
      }
    } catch (err) {
      console.error("Error processing store points:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setRouteLoading(false)
      setProcessingStep("")
    }
  }

  // Function to add HQ as start and end points to the route
  const addHQToRoute = (route: any) => {
    if (!route || !route.segments || route.segments.length === 0) {
      return route
    }

    // Calculate distance from HQ to first store
    const firstStore = route.segments[0]
    const firstStoreId = firstStore.startStoreId
    const firstStoreDistance = calculateHaversineDistance(
      HQ_LOCATION.coordinates[1], // latitude
      HQ_LOCATION.coordinates[0], // longitude
      firstStore.startLatitude || 0, // latitude
      firstStore.startLongitude || 0, // longitude
    )

    // Calculate distance from last store to HQ
    const lastStore = route.segments[route.segments.length - 1]
    const lastStoreId = lastStore.endStoreId
    const lastStoreDistance = calculateHaversineDistance(
      lastStore.endLatitude || 0, // latitude
      lastStore.endLongitude || 0, // longitude
      HQ_LOCATION.coordinates[1], // latitude
      HQ_LOCATION.coordinates[0], // longitude
    )

    // Estimate travel times (60 km/h average speed)
    const firstStoreDuration = (firstStoreDistance / 60) * 60 // minutes
    const lastStoreDuration = (lastStoreDistance / 60) * 60 // minutes

    // Create new segments for HQ to first store and last store to HQ
    let hqToFirstSegment

    // Special handling for store ID 6666
    if (firstStoreId === "6666" || firstStoreId === 6666) {
      hqToFirstSegment = {
        startStoreId: "HQ",
        endStoreId: firstStoreId,
        startName: HQ_LOCATION.description,
        endName: "Store #6666", // Use a fixed name for this special store
        startAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
        endAddress: `${MATERIALS_DEPOT_LOCATION.address}, ${MATERIALS_DEPOT_LOCATION.city}, ${MATERIALS_DEPOT_LOCATION.county}`,
        distance: Math.round(firstStoreDistance * 10) / 10,
        duration: Math.round(firstStoreDuration),
        isHQ: true,
      }
    } else {
      hqToFirstSegment = {
        startStoreId: "HQ",
        endStoreId: firstStoreId,
        startName: HQ_LOCATION.description,
        endName: firstStore.startName,
        startAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
        endAddress: firstStore.startAddress,
        distance: Math.round(firstStoreDistance * 10) / 10,
        duration: Math.round(firstStoreDuration),
        isHQ: true,
      }
    }

    const lastToHqSegment = {
      startStoreId: lastStoreId,
      endStoreId: "HQ",
      startName: lastStore.endName,
      endName: HQ_LOCATION.description,
      startAddress: lastStore.endAddress,
      endAddress: `${HQ_LOCATION.address}, ${HQ_LOCATION.city}, ${HQ_LOCATION.county}`,
      distance: Math.round(lastStoreDistance * 10) / 10,
      duration: Math.round(lastStoreDuration),
      isHQ: true,
    }

    // Add the new segments to the beginning and end of the route
    const newSegments = [hqToFirstSegment, ...route.segments, lastToHqSegment]

    // Recalculate total distance and duration
    const totalDistance = newSegments.reduce((sum, segment) => sum + segment.distance, 0)
    const totalDuration = newSegments.reduce((sum, segment) => sum + segment.duration, 0)

    return {
      ...route,
      segments: newSegments,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
    }
  }

  // Function to calculate distance between two points using the Haversine formula
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Convert latitude and longitude from degrees to radians
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180

    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    // Earth radius in kilometers
    const R = 6371

    // Calculate the distance
    return R * c
  }

  const fetchStoreDetails = async (storeId: number): Promise<Store> => {
    try {
      if (!storeId || isNaN(storeId)) {
        throw new Error(`Invalid store ID: ${storeId}`)
      }

      console.log(`Fetching details for store ID: ${storeId}`)

      // Try the test store API first
      try {
        const res = await fetch(`/api/test/store/${storeId}`)

        if (res.ok) {
          const data = await res.json()

          if (data.success && data.store) {
            // Geocode the store address
            const geocodedStore = await geocodeStoreAddress(data.store)
            return geocodedStore
          }
        }

        // If we get here, the test store API failed but didn't throw an error
        console.warn(`Test store API failed for store ${storeId}, trying fallback...`)
      } catch (err) {
        console.warn(`Error with test store API for store ${storeId}, trying fallback...`, err)
      }

      // Try the regular store API as fallback
      try {
        const res = await fetch(`/api/stores/${storeId}`)

        if (res.ok) {
          const storeData = await res.json()

          const store: Store = {
            store_id: Number(storeData.store_id),
            description: storeData.description || `Store #${storeId}`,
            address: storeData.address || "",
            city: storeData.city || "",
            county: storeData.county || "",
            warning: "Used fallback API to fetch store details",
          }

          // Geocode the store address
          const geocodedStore = await geocodeStoreAddress(store)
          return geocodedStore
        } else {
          throw new Error(`Failed to fetch store details: ${res.status}`)
        }
      } catch (err) {
        console.error(`Error with fallback store API for store ${storeId}`, err)
        throw err
      }
    } catch (err) {
      console.error(`Error fetching store ${storeId}:`, err)
      // Return basic info even if fetch fails
      return {
        store_id: storeId,
        description: `Store #${storeId}`,
        address: "",
        city: "",
        county: "",
        error: true,
        warning: `Failed to fetch store: ${err.message}`,
      }
    }
  }

  // Update the geocodeStoreAddress function to use Google Maps API
  const geocodeStoreAddress = async (store: Store): Promise<Store> => {
    try {
      if (store.error || (!store.address && !store.city && !store.county)) {
        return store
      }

      setProcessingStep(`Geocoding address for store ${store.store_id}...`)

      // Combine address components
      const addressComponents = [store.address, store.city, store.county, "Romania"].filter(Boolean)

      if (addressComponents.length === 0) {
        return { ...store, geocoded: false }
      }

      const fullAddress = addressComponents.join(", ")
      console.log(`Geocoding address for store ${store.store_id}: ${fullAddress}`)

      // Call the Google Maps geocoding API
      try {
        const res = await fetch(`/api/google-maps?address=${encodeURIComponent(fullAddress)}`)

        if (!res.ok) {
          throw new Error(`Failed to geocode address: ${res.status}`)
        }

        const data = await res.json()

        if (!data.success) {
          throw new Error(data.error || "Failed to geocode address")
        }

        console.log(
          `Geocoded coordinates for store ${store.store_id}: [${data.coordinates.longitude}, ${data.coordinates.latitude}]`,
        )

        return {
          ...store,
          coordinates: [data.coordinates.longitude, data.coordinates.latitude],
          geocoded: true,
        }
      } catch (err) {
        console.warn(`Error geocoding store ${store.store_id}:`, err)
        // Return the store without coordinates but don't mark as error
        return {
          ...store,
          geocoded: false,
          warning: store.warning
            ? `${store.warning}. Geocoding failed: ${err.message}`
            : `Geocoding failed: ${err.message}`,
        }
      }
    } catch (err) {
      console.error(`Error in geocodeStoreAddress for store ${store.store_id}:`, err)
      return { ...store, geocoded: false }
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP")
    } catch (e) {
      return dateString
    }
  }

  // Update the getStore function to handle the materials depot
  const getStore = (storeId: number | string) => {
    if (storeId === "HQ") {
      return {
        store_id: "HQ",
        description: HQ_LOCATION.description,
        address: HQ_LOCATION.address,
        city: HQ_LOCATION.city,
        county: HQ_LOCATION.county,
        coordinates: HQ_LOCATION.coordinates,
        geocoded: true,
      }
    }

    // Add special handling for materials depot (store 6666)
    if (storeId === 6666 || storeId === "6666") {
      return {
        store_id: 6666,
        description: MATERIALS_DEPOT_LOCATION.description,
        address: MATERIALS_DEPOT_LOCATION.address,
        city: MATERIALS_DEPOT_LOCATION.city,
        county: MATERIALS_DEPOT_LOCATION.county,
        coordinates: MATERIALS_DEPOT_LOCATION.coordinates,
        geocoded: true,
      }
    }

    return storeDetails.find((store) => store.store_id === storeId)
  }

  const saveRouteToDatabase = async (assignmentId: number, totalDistance: number, totalDuration: number) => {
    setSavingToDb(true)
    try {
      // Use the update-assignment server action instead of a fetch call
      const result = await updateAssignmentDistanceAndDuration(assignmentId, totalDistance, totalDuration)

      if (result.success) {
        toast({
          title: "Success",
          description: `Assignment ${assignmentId} updated with distance: ${totalDistance} km and duration: ${totalDuration} minutes`,
        })

        // Update the assignment state with the new values
        setAssignment((prevAssignment) => {
          if (prevAssignment) {
            return {
              ...prevAssignment,
              km: totalDistance,
              driving_time: totalDuration,
            }
          }
          return prevAssignment
        })
      } else {
        throw new Error(result.error || "Failed to update assignment")
      }
    } catch (err) {
      console.error("Error saving route to database:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: `Failed to update assignment: ${err instanceof Error ? err.message : "An unknown error occurred"}`,
        variant: "destructive",
      })
    } finally {
      setSavingToDb(false)
    }
  }

  // Find the handleFinalizeAssignment function and update it to properly pass the assignment ID

  const handleFinalizeAssignment = async () => {
    setIsFinalizingAssignment(true)
    try {
      // Make sure we're using the correct assignment ID from the state
      if (!assignment || !assignment.id) {
        throw new Error("No assignment selected or assignment ID is missing")
      }

      console.log("Finalizing assignment:", assignment.id)

      // Pass the entire assignment object with the ID to the finalization function
      const result = await finalizeAssignmentWithTeam({
        id: assignment.id,
        km: routeResponse?.route?.totalDistance || assignment.km,
        driving_time: routeResponse?.route?.totalDuration || assignment.driving_time,
        completion_date: new Date().toISOString(),
      })

      console.log("Finalization result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: "Assignment finalized successfully",
        })
        setFinalizationSuccess(true)
      } else {
        throw new Error(result.error || "Failed to finalize assignment")
      }
    } catch (error) {
      console.error("Error finalizing assignment:", error)
      toast({
        title: "Error",
        description: `Failed to finalize assignment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsFinalizingAssignment(false)
    }
  }

  const RouteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L4 6V18L12 22L20 18V6L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10L16 8V14L12 16L8 14V8L12 10Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  return (
    <div className="container mx-auto py-8">
      {/* Finalization button at the top with toggles */}
      {routeResponse?.route && !finalizationSuccess && (
        <div className="mb-6 flex items-center gap-3">
          <span className="font-medium text-gray-700">Acum poti Finaliza deplasarea ta {assignment?.id}:</span>
          <Button
            onClick={handleFinalizeAssignment}
            disabled={routeLoading || savingToDb || isFinalizingAssignment}
            className="bg-blue-500 hover:bg-blue-600 text-white animate-pulse"
            style={{ animationDuration: "3s" }}
          >
            {isFinalizingAssignment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizare
              </>
            )}
          </Button>
        </div>
      )}

      {finalizationSuccess && (
        <div className="mb-6 flex items-center gap-3">
          <span className="font-medium text-gray-700">Acum poti Finaliza deplasarea ta {assignment?.id}:</span>
          <Button disabled className="bg-blue-500 text-white">
            <CheckCircle className="mr-2 h-4 w-4" />
            Finalizat cu Succes
          </Button>
        </div>
      )}

      <Card className="mb-6 border-blue-100">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-blue-700">Enter ID</CardTitle>
            </div>
            <CardDescription className="text-blue-600">📍 Route (ID {assignmentId || "[acest numar]"})</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder=""
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                disabled={loading || routeLoading}
                className="border-blue-200 focus-visible:ring-blue-400"
              />
              <Button
                onClick={fetchAssignment}
                disabled={loading || routeLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <div className="mr-2 w-5 h-5 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 2L4 6V18L12 22L20 18V6L12 2Z"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 10L16 8V14L12 16L8 14V8L12 10Z"
                          fill="white"
                          stroke="white"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    Indicații de orientare
                  </>
                )}
              </Button>
            </div>

            {/* Add the toggles here - moved from the conditional section below */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-hq"
                  checked={includeHQ}
                  onCheckedChange={setIncludeHQ}
                  disabled={loading || routeLoading}
                  className="data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="include-hq" className="text-xs text-blue-700">
                  Include Chitila ca start si end point
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-materials"
                  checked={includeMaterials}
                  onCheckedChange={setIncludeMaterials}
                  disabled={loading || routeLoading}
                  className="data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="include-materials" className="text-xs text-blue-700">
                  Ridicare materiale la plecare
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(loading || routeLoading) && processingStep && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
            <AlertTitle>Processing</AlertTitle>
            <AlertDescription>{processingStep}</AlertDescription>
          </div>
        </Alert>
      )}

      {assignment && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {routeLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Route className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Processing stores and calculating route...
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{processingStep || "This may take a few moments"}</p>
                  </div>
                </CardContent>
              </Card>
            ) : routeResponse ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RouteIcon />
                    <CardTitle>Routes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!routeResponse.success ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Route Calculation Failed</AlertTitle>
                      <AlertDescription>
                        {routeResponse.error || routeResponse.message || "Unknown error"}
                      </AlertDescription>
                    </Alert>
                  ) : routeResponse.route ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-md flex items-center">
                          <Route className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Total Distance</div>
                            <div className="font-medium text-lg">{routeResponse.route.totalDistance.toFixed(1)} km</div>
                          </div>
                        </div>
                        <div className="p-4 bg-muted rounded-md flex items-center">
                          <Clock className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Total Duration</div>
                            <div className="font-medium text-lg">
                              {Math.round(routeResponse.route.totalDuration)} minutes
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Map without title */}
                      <div>
                        <GoogleMapRoute
                          segments={routeResponse.route.segments}
                          polyline={routeResponse.route.polyline}
                          height="400px"
                        />
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-medium mb-4">Route Segments</h3>
                        <div className="space-y-3">
                          {routeResponse.route.segments.map((segment, index) => {
                            const startStore = getStore(segment.startStoreId)
                            const endStore = getStore(segment.endStoreId)
                            const isHQSegment =
                              segment.isHQ || segment.startStoreId === "HQ" || segment.endStoreId === "HQ"
                            const isMaterialsDepotSegment =
                              segment.isMaterialsDepot || segment.startStoreId === 6666 || segment.endStoreId === 6666

                            return (
                              <div
                                key={index}
                                className={`p-3 border rounded-md ${
                                  isHQSegment
                                    ? "bg-blue-50 border-blue-200"
                                    : isMaterialsDepotSegment
                                      ? "bg-amber-50 border-amber-200"
                                      : ""
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                                      ${
                                        isHQSegment
                                          ? "bg-blue-500 text-white"
                                          : isMaterialsDepotSegment
                                            ? "bg-amber-500 text-white"
                                            : "bg-primary text-primary-foreground"
                                      }`}
                                    >
                                      {index + 1}
                                    </div>
                                    <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                                    <div className="font-medium">
                                      {segment.distance.toFixed(1)} km ({Math.round(segment.duration)} min)
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div
                                    className={`p-2 rounded ${
                                      isHQSegment && segment.startStoreId === "HQ"
                                        ? "bg-blue-100"
                                        : isMaterialsDepotSegment && segment.startStoreId === 6666
                                          ? "bg-amber-100"
                                          : "bg-muted/50"
                                    }`}
                                  >
                                    <div className="text-muted-foreground">From</div>
                                    <div className="flex items-center">
                                      {segment.startStoreId === "HQ" ? (
                                        <Home className="h-4 w-4 mr-1 text-blue-500" />
                                      ) : segment.startStoreId === 6666 ? (
                                        <Warehouse className="h-4 w-4 mr-1 text-amber-500" />
                                      ) : null}
                                      {startStore?.description || segment.startName || `Store #${segment.startStoreId}`}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {segment.startAddress ||
                                        (startStore &&
                                          [startStore.address, startStore.city, startStore.county]
                                            .filter(Boolean)
                                            .join(", "))}
                                    </div>
                                  </div>
                                  <div
                                    className={`p-2 rounded ${
                                      isHQSegment && segment.endStoreId === "HQ"
                                        ? "bg-blue-100"
                                        : isMaterialsDepotSegment && segment.endStoreId === 6666
                                          ? "bg-amber-100"
                                          : "bg-muted/50"
                                    }`}
                                  >
                                    <div className="text-muted-foreground">To</div>
                                    <div className="flex items-center">
                                      {segment.endStoreId === "HQ" ? (
                                        <Home className="h-4 w-4 mr-1 text-blue-500" />
                                      ) : segment.endStoreId === 6666 ? (
                                        <Warehouse className="h-4 w-4 mr-1 text-amber-500" />
                                      ) : null}
                                      {endStore?.description || segment.endName || `Store #${segment.endStoreId}`}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {segment.endAddress ||
                                        (endStore &&
                                          [endStore.address, endStore.city, endStore.county]
                                            .filter(Boolean)
                                            .join(", "))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">No route information available</div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-md border-gray-300">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No route calculated</h3>
                  <p className="mt-1 text-sm text-gray-500">Fetch an assignment to calculate its route</p>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>🛒 Stores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {includeHQ && (
                    <div className="p-2 border rounded-md text-sm bg-blue-50 border-blue-200">
                      <div className="font-medium flex items-center">
                        <Home className="h-4 w-4 mr-1 text-blue-500" />
                        {HQ_LOCATION.description}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {[HQ_LOCATION.address, HQ_LOCATION.city, HQ_LOCATION.county].filter(Boolean).join(", ")}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Fixed coordinates ({HQ_LOCATION.coordinates[0].toFixed(5)},{" "}
                        {HQ_LOCATION.coordinates[1].toFixed(5)})
                      </div>
                    </div>
                  )}

                  {storeDetails.length > 0
                    ? storeDetails.map((store, index) => (
                        <div
                          key={index}
                          className={`p-2 border rounded-md text-sm ${store.error ? "border-amber-300 bg-amber-50" : store.warning ? "border-amber-100 bg-amber-50/50" : ""}`}
                        >
                          <div className="font-medium">{store.description || `Store #${store.store_id}`}</div>
                          {store.address && (
                            <div className="text-muted-foreground text-xs mt-1">
                              {[store.address, store.city, store.county].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {store.coordinates ? (
                            <div className="text-xs text-green-600 mt-1 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Geocoded coordinates ({store.coordinates[0].toFixed(5)}, {store.coordinates[1].toFixed(5)}
                              )
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Missing coordinates
                            </div>
                          )}
                          {store.warning && (
                            <div className="text-xs text-amber-600 mt-1">
                              <AlertCircle className="h-3 w-3 mr-1 inline-block" />
                              {store.warning}
                            </div>
                          )}
                        </div>
                      ))
                    : Array.isArray(assignment.store_points) &&
                      assignment.store_points.map((storePoint, index) => {
                        const storeId =
                          typeof storePoint === "number"
                            ? storePoint
                            : typeof storePoint === "object" && storePoint !== null && "store_id" in storePoint
                              ? storePoint.store_id
                              : null
                        return (
                          <div key={index} className="p-2 border rounded-md text-sm bg-gray-50">
                            <div className="font-medium">Store ID: {storeId}</div>
                            <div className="text-xs text-muted-foreground mt-1">Waiting to process...</div>
                          </div>
                        )
                      })}

                  {includeHQ && (
                    <div className="p-2 border rounded-md text-sm bg-blue-50 border-blue-200">
                      <div className="font-medium flex items-center">
                        <Home className="h-4 w-4 mr-1 text-blue-500" />
                        {HQ_LOCATION.description} (Return)
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {[HQ_LOCATION.address, HQ_LOCATION.city, HQ_LOCATION.county].filter(Boolean).join(", ")}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Fixed coordinates ({HQ_LOCATION.coordinates[0].toFixed(5)},{" "}
                        {HQ_LOCATION.coordinates[1].toFixed(5)})
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

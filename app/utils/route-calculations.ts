import { sql } from "@vercel/postgres"
import { revalidatePath } from "next/cache"

// Mapbox token
const MAPBOX_TOKEN = "pk.eyJ1IjoiZ2VsdWJvZHJ1ZyIsImEiOiJjbThmcG5vOXowYWl3MmpzamwyNHN0bXE1In0.JuNQI__mKPub7aFdJnwa5A"

/**
 * Get coordinates for an address using Mapbox Geocoding API
 */
export async function getCoordinates(address: string, city?: string, county?: string) {
  try {
    console.log(
      `[COORDS] Getting coordinates for address with components: address=${address}, city=${city}, county=${county}`,
    )

    // Format the address for geocoding - filter out empty components
    const addressComponents = [address || "", city || "", county || "", "Romania"].filter(Boolean)

    const searchAddress = addressComponents.join(", ")

    if (addressComponents.length <= 1) {
      console.warn(`[COORDS] Invalid address components for geocoding: ${searchAddress}`)
      return {
        lat: 44.4268, // Default Bucharest coordinates
        lng: 26.1025,
      }
    }

    console.log(`[COORDS] Getting coordinates for address: ${searchAddress}`)

    // Use the Mapbox API through our server endpoint
    try {
      const response = await fetch(`/api/mapbox?address=${encodeURIComponent(searchAddress)}`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        throw new Error(`No geocoding results found for address: ${searchAddress}`)
      }

      const coords = data.features[0].center
      console.log(`[COORDS] Geocoded "${searchAddress}" to [${coords[0]}, ${coords[1]}]`)

      return {
        lng: coords[0],
        lat: coords[1],
      }
    } catch (error) {
      console.error(`[COORDS] Error geocoding address: ${error}`)
      // Fall back to default coordinates
      return {
        lat: 44.4268, // Default Bucharest coordinates
        lng: 26.1025,
      }
    }
  } catch (error) {
    console.error("[COORDS] Error getting coordinates:", error)

    // Return default coordinates for Bucharest
    return {
      lat: 44.4268,
      lng: 26.1025,
    }
  }
}

// Function to calculate distance between two points using Mapbox
async function calculateMapboxDistance(
  startLocation: string,
  endLocation: string,
): Promise<{ distance: number; duration: number }> {
  try {
    console.log(`[MAPBOX] Calculating distance from "${startLocation}" to "${endLocation}"`)

    // Validate locations
    if (!startLocation || !endLocation) {
      console.warn("[MAPBOX] Invalid locations provided")
      return estimateDistanceByNames(startLocation || "", endLocation || "")
    }

    // Get coordinates for start and end locations
    const startCoords = await getCoordinates(startLocation)
    const endCoords = await getCoordinates(endLocation)

    if (!startCoords || !endCoords) {
      console.error("[MAPBOX] Could not get coordinates for one or both locations")
      // Fallback: Use a distance estimation based on location names
      return estimateDistanceByNames(startLocation, endLocation)
    }

    try {
      // Use our server API instead of directly calling Mapbox
      const response = await fetch(
        `/api/mapbox?start=${startCoords.lng},${startCoords.lat}&end=${endCoords.lng},${endCoords.lat}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      )

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No routes found in response")
      }

      // Distance is in meters, convert to kilometers
      const distanceInKm = data.routes[0].distance / 1000
      // Duration is in seconds, convert to minutes
      const durationInMin = data.routes[0].duration / 60

      console.log(
        `[MAPBOX] Route calculation successful: ${distanceInKm.toFixed(2)} km, ${Math.round(durationInMin)} minutes`,
      )

      return {
        distance: Math.round(distanceInKm),
        duration: Math.round(durationInMin),
      }
    } catch (error) {
      console.error("[MAPBOX] API request failed, using fallback calculation:", error)
      // If Mapbox API fails, fall back to a simple distance calculation
    }

    // Fallback: Calculate straight-line distance (as the crow flies)
    return calculateHaversineDistance(
      startCoords.lat,
      startCoords.lng, // lat, lon for start
      endCoords.lat,
      endCoords.lng, // lat, lon for end
    )
  } catch (error) {
    console.error("[MAPBOX] Error calculating Mapbox distance:", error)
    // Ultimate fallback: return an estimated distance
    return estimateDistanceByNames(startLocation, endLocation)
  }
}

// Haversine formula to calculate straight-line distance between two points
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): { distance: number; duration: number } {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km

  // Add 30% to account for roads not being straight
  const adjustedDistance = Math.round(distance * 1.3)

  // Estimate duration based on average speed of 60 km/h
  const estimatedDuration = Math.round((adjustedDistance / 60) * 60)

  return {
    distance: adjustedDistance,
    duration: estimatedDuration,
  }
}

// Fallback function to estimate distance based on location names
function estimateDistanceByNames(startLocation: string, endLocation: string): { distance: number; duration: number } {
  console.log(`[ESTIMATE] Estimating distance between "${startLocation}" and "${endLocation}" based on names`)

  // If both locations contain the same city/county, assume a shorter distance
  const startParts = startLocation
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
  const endParts = endLocation
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())

  // Check for common location parts
  const commonParts = startParts.filter((part) => endParts.includes(part))

  if (commonParts.length > 0) {
    // If they share location parts, estimate a shorter distance (10-30km)
    const distance = 10 + Math.floor(Math.random() * 20)
    const duration = Math.round(distance * 1.2) // Estimate duration based on distance
    console.log(`[ESTIMATE] Locations share common parts, estimated: ${distance} km, ${duration} minutes`)
    return { distance, duration }
  } else {
    // Otherwise, estimate a medium distance (30-100km)
    const distance = 30 + Math.floor(Math.random() * 70)
    const duration = Math.round(distance * 1.2) // Estimate duration based on distance
    console.log(`[ESTIMATE] No common parts, estimated: ${distance} km, ${duration} minutes`)
    return { distance, duration }
  }
}

// Function to format location with address, city, county
function formatLocation(address?: string, city?: string, county?: string): string {
  const parts = [address || "", city || "", county || ""].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : ""
}

// New function to calculate distance for a multi-point route
export async function calculateMultiPointRoute(
  startLocation: string,
  endLocation: string,
  storeLocations: Array<{ address?: string; city?: string; county?: string }>,
): Promise<{ distance: number; duration: number }> {
  try {
    console.log(`[MULTI] Calculating multi-point route with ${storeLocations.length} stores`)

    if (!storeLocations || storeLocations.length === 0) {
      console.log("[MULTI] No stores provided, calculating direct distance")
      const directResult = await calculateMapboxDistance(startLocation, endLocation)
      return directResult
    }

    // Filter out stores with invalid locations
    const validStores = storeLocations.filter((store) => {
      const location = formatLocation(store.address, store.city, store.county)
      return location.length > 0
    })

    if (validStores.length === 0) {
      console.log("[MULTI] No valid store locations, calculating direct distance")
      const directResult = await calculateMapboxDistance(startLocation, endLocation)
      return directResult
    }

    console.log(`[MULTI] Processing ${validStores.length} valid store locations`)

    // Format all locations
    const formattedLocations = [
      startLocation,
      ...validStores.map((store) => formatLocation(store.address, store.city, store.county)),
      endLocation,
    ].filter(Boolean)

    // Use our server API for multi-point route calculation
    try {
      const response = await fetch(`/api/calculate-multi-point-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stops: formattedLocations,
        }),
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Multi-point route API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`[MULTI] Multi-point route calculation successful: ${data.distance} km, ${data.duration} minutes`)
        return {
          distance: data.distance,
          duration: data.duration,
        }
      }

      throw new Error(data.error || "Unknown error in multi-point route calculation")
    } catch (error) {
      console.error("[MULTI] Error with multi-point API, falling back to segment calculation:", error)
      // Fall back to segment-by-segment calculation
    }

    // Fallback: Calculate segment by segment
    console.log("[MULTI] Using segment-by-segment calculation fallback")
    let totalDistance = 0
    let totalDuration = 0
    let currentLocation = startLocation

    // Calculate distance from start to each store in sequence
    for (const store of validStores) {
      // Format the store location
      const storeLocation = formatLocation(store.address, store.city, store.county)

      // If we couldn't format a location, skip this store
      if (!storeLocation) {
        continue
      }

      // Calculate distance from current location to this store
      const segmentResult = await calculateMapboxDistance(currentLocation, storeLocation)

      totalDistance += segmentResult.distance
      totalDuration += segmentResult.duration
      currentLocation = storeLocation
    }

    // Calculate distance from last store to end location
    const finalSegmentResult = await calculateMapboxDistance(currentLocation, endLocation)

    totalDistance += finalSegmentResult.distance
    totalDuration += finalSegmentResult.duration

    // Ensure we have a valid distance (minimum 1 km)
    const result = {
      distance: Math.max(1, Math.round(totalDistance)),
      duration: Math.max(1, Math.round(totalDuration)),
    }

    console.log(`[MULTI] Segment calculation complete: ${result.distance} km, ${result.duration} minutes`)
    return result
  } catch (error) {
    console.error("[MULTI] Error calculating multi-point route:", error)
    // Fallback: return a reasonable estimate based on the number of stores
    const fallbackResult = {
      distance: Math.max(1, 20 + storeLocations.length * 15),
      duration: Math.max(1, 30 + storeLocations.length * 20),
    }
    console.log(`[MULTI] Using fallback estimation: ${fallbackResult.distance} km, ${fallbackResult.duration} minutes`)
    return fallbackResult
  }
}

// Helper function to fetch store locations from database - Improved with batch processing
export async function fetchStoreLocations(storeIds: number[]) {
  try {
    console.log(`[STORES] Fetching locations for ${storeIds.length} stores`)

    if (!storeIds || storeIds.length === 0) {
      console.warn("[STORES] No store IDs provided")
      return []
    }

    // Use a batch API endpoint to get all stores at once
    try {
      const storeIdsParam = storeIds.join(",")
      const response = await fetch(`/api/stores/batch?ids=${storeIdsParam}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const stores = await response.json()
      console.log(`[STORES] Batch query returned ${stores.length} stores`)

      if (!stores || stores.length === 0) {
        console.warn(`[STORES] No stores found for IDs: ${storeIds.join(", ")}`)
        return []
      }

      // Map the results to the expected format
      return stores.map((store) => ({
        address: store.address || "",
        city: store.city || "",
        county: store.county || "",
      }))
    } catch (error) {
      console.error("[STORES] Error fetching stores from API:", error)

      // Fall back to individual queries if batch fails
      console.log("[STORES] Falling back to individual store queries")

      // Handle each store ID individually
      const storeLocations = []

      for (const storeId of storeIds) {
        try {
          // Query the database for each store's details
          const { rows } = await sql`
            SELECT store_id, address, city, county 
            FROM stores 
            WHERE store_id = ${storeId}
          `

          if (rows.length > 0) {
            storeLocations.push({
              address: rows[0].address || "",
              city: rows[0].city || "",
              county: rows[0].county || "",
            })
          } else {
            console.warn(`[STORES] Store with ID ${storeId} not found`)
            // Add empty placeholder to maintain order
            storeLocations.push({
              address: "",
              city: "",
              county: "",
            })
          }
        } catch (storeError) {
          console.error(`[STORES] Error fetching store ${storeId}:`, storeError)
          // Add empty placeholder to maintain order
          storeLocations.push({
            address: "",
            city: "",
            county: "",
          })
        }
      }

      return storeLocations
    }
  } catch (error) {
    console.error("[STORES] Error in fetchStoreLocations:", error)
    return []
  }
}

// Add this function to update the assignment route
export async function updateAssignmentRoute(assignmentId: number, storeIds: number[], distance: number) {
  try {
    console.log(`[UPDATE] Updating assignment ${assignmentId} with ${storeIds.length} stores and ${distance} km`)

    if (!assignmentId || !storeIds) {
      console.warn("[UPDATE] Invalid parameters for updateAssignmentRoute")
      return { success: false, error: "Invalid parameters" }
    }

    // Convert the array to a JSON string for storage
    const storePointsJson = JSON.stringify(storeIds)

    // Update the assignment with the new store points and distance
    await sql`
      UPDATE assignments 
      SET store_points = ${storePointsJson}, 
          km = ${distance}
      WHERE id = ${assignmentId}
    `

    console.log(`[UPDATE] Successfully updated assignment ${assignmentId}`)
    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("[UPDATE] Error updating assignment route:", error)
    return { success: false, error: (error as Error).message }
  }
}

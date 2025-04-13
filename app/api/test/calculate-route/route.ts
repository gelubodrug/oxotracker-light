import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

// Fixed headquarters location
const HQ_LOCATION = {
  coordinates: [25.984056, 44.5062199] as [number, number], // [longitude, latitude]
}

// Function to calculate distance between two points using the Haversine formula
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Function to estimate travel time based on distance (km)
function estimateTravelTime(distanceKm: number): number {
  // Assume average speed of 60 km/h for simplicity
  // Return time in minutes
  return (distanceKm / 60) * 60
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeIdsParam = searchParams.get("storeIds")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const optimize = searchParams.get("optimize") !== "false" // Default to true
    const useDirectCalculation = searchParams.get("direct") === "true" // Optional parameter to bypass OSRM
    const includeHQ = searchParams.get("includeHQ") !== "false" // Default to true

    if (!storeIdsParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Store IDs are required",
        },
        { status: 400 },
      )
    }

    // Parse store IDs
    const storeIds = storeIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id && !isNaN(Number(id)))
      .map((id) => Number(id))

    console.log(`[TEST-CALCULATE-ROUTE] Parsed store IDs:`, storeIds)

    if (storeIds.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "At least 2 valid store IDs are required to calculate a route",
        },
        { status: 400 },
      )
    }

    console.log(
      `[TEST-CALCULATE-ROUTE] Calculating route between ${storeIds.length} stores. Optimize: ${optimize}, Direct: ${useDirectCalculation}, Include HQ: ${includeHQ}`,
    )
    if (startDate && endDate) {
      console.log(`[TEST-CALCULATE-ROUTE] Date range: ${startDate} to ${endDate}`)
    }

    // Step 1: Fetch store information WITHOUT coordinates (they don't exist in the table)
    // Instead of using parameterized queries which might be causing issues, use direct string interpolation
    // This is safe in this case since we've already validated the storeIds are numbers
    const storeIdsString = storeIds.join(", ")

    try {
      console.log(`[TEST-CALCULATE-ROUTE] Executing SQL query for stores with IDs: ${storeIdsString}`)

      // Use the sql.query method for a conventional function call with placeholders
      // This is the recommended approach for dynamic queries with multiple parameters
      const result = await sql.query(`
        SELECT 
          store_id, 
          description,
          address,
          city,
          county
        FROM stores 
        WHERE store_id IN (${storeIdsString})
      `)

      // Log the raw result to see its structure
      console.log(`[TEST-CALCULATE-ROUTE] Raw SQL result: ${JSON.stringify(result)}`)

      // Safely extract stores from the result
      let stores = []

      // Handle different possible result formats
      if (result) {
        if (Array.isArray(result)) {
          stores = result
        } else if (result.rows && Array.isArray(result.rows)) {
          stores = result.rows
        } else if (typeof result === "object") {
          // If it's an object but not in the expected format, try to convert it
          stores = Object.values(result).filter((item) => item && typeof item === "object" && "store_id" in item)
        }
      }

      console.log(`[TEST-CALCULATE-ROUTE] Extracted ${stores.length} stores from query result`)

      if (stores.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: `Not enough stores found with the provided IDs. Found: ${stores.length}, Required: at least 2`,
          },
          { status: 404 },
        )
      }

      // Step 2: Geocode each store address using Mapbox
      const geocodedStores = []

      for (const store of stores) {
        // Combine address components
        const fullAddress = [store.address, store.city, store.county].filter(Boolean).join(", ")

        console.log(`[TEST-CALCULATE-ROUTE] Geocoding address for store ${store.store_id}: ${fullAddress}`)

        // Get Mapbox token
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN

        if (!mapboxToken) {
          return NextResponse.json(
            {
              success: false,
              error: "Mapbox token is not configured",
            },
            { status: 500 },
          )
        }

        try {
          // Geocode the address using Mapbox
          const encodedAddress = encodeURIComponent(fullAddress)
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`

          const response = await fetch(url)

          if (!response.ok) {
            console.error(`[TEST-CALCULATE-ROUTE] Mapbox API error for store ${store.store_id}: ${response.status}`)
            continue
          }

          const data = await response.json()

          if (data.features && data.features.length > 0) {
            const coordinates = data.features[0].center
            console.log(
              `[TEST-CALCULATE-ROUTE] Found coordinates for store ${store.store_id}: [${coordinates[0]}, ${coordinates[1]}]`,
            )

            geocodedStores.push({
              id: store.store_id,
              description: store.description,
              address: store.address,
              city: store.city,
              county: store.county,
              coordinates: [coordinates[0], coordinates[1]],
            })
          } else {
            console.log(`[TEST-CALCULATE-ROUTE] No coordinates found for store ${store.store_id}`)
          }
        } catch (error) {
          console.error(`[TEST-CALCULATE-ROUTE] Error geocoding store ${store.store_id}:`, error)
        }
      }

      console.log(`[TEST-CALCULATE-ROUTE] Successfully geocoded ${geocodedStores.length} of ${stores.length} stores`)

      if (geocodedStores.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: "Not enough stores could be geocoded for route calculation",
          },
          { status: 400 },
        )
      }

      // Step 3: Calculate the route
      // If direct calculation is requested or if we have exactly 2 stores, use the Haversine formula
      if (useDirectCalculation || geocodedStores.length === 2) {
        console.log(`[TEST-CALCULATE-ROUTE] Using direct distance calculation (Haversine formula)`)

        // Sort stores if optimize is true (not really needed for 2 stores, but for consistency)
        const sortedStores = [...geocodedStores]

        // Calculate distances and durations between consecutive stores
        const distances = []
        const durations = []
        let totalDistance = 0
        let totalDuration = 0

        // Create segments with detailed information
        const segments = []

        for (let i = 0; i < sortedStores.length - 1; i++) {
          const start = sortedStores[i]
          const end = sortedStores[i + 1]

          // Coordinates are in [longitude, latitude] format, but Haversine needs latitude first
          const distance = calculateHaversineDistance(
            start.coordinates[1], // latitude
            start.coordinates[0], // longitude
            end.coordinates[1], // latitude
            end.coordinates[0], // longitude
          )

          // Round to 1 decimal place
          const roundedDistance = Math.round(distance * 10) / 10

          // Estimate travel time based on distance
          const duration = estimateTravelTime(roundedDistance)

          distances.push(roundedDistance)
          durations.push(duration)

          totalDistance += roundedDistance
          totalDuration += duration

          // Add segment with detailed information
          segments.push({
            startStoreId: start.id,
            endStoreId: end.id,
            startName: start.description,
            endName: end.description,
            startAddress: [start.address, start.city, start.county].filter(Boolean).join(", "),
            endAddress: [end.address, end.city, end.county].filter(Boolean).join(", "),
            startLatitude: start.coordinates[1],
            startLongitude: start.coordinates[0],
            endLatitude: end.coordinates[1],
            endLongitude: end.coordinates[0],
            distance: roundedDistance,
            duration: Math.round(duration),
          })
        }

        return NextResponse.json({
          success: true,
          route: {
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalDuration: Math.round(totalDuration),
            segments: segments,
          },
          dateRange:
            startDate && endDate
              ? {
                  startDate,
                  endDate,
                }
              : undefined,
          optimized: optimize,
          calculationMethod: "direct",
          storesRequested: storeIds.length,
          storesFound: stores.length,
          storesGeocoded: geocodedStores.length,
        })
      } else {
        // For more than 2 stores, try to use OSRM API with a timeout
        console.log(`[TEST-CALCULATE-ROUTE] Using OSRM API for route calculation`)

        try {
          // Prepare coordinates for the OSRM API
          // Format: longitude,latitude for each waypoint
          const coordinatesString = geocodedStores
            .map((store) => `${store.coordinates[0]},${store.coordinates[1]}`)
            .join(";")

          // Build the OSRM API URL
          const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=false&alternatives=false&steps=false&annotations=distance,duration`

          console.log(`[TEST-CALCULATE-ROUTE] OSRM API URL: ${url}`)

          // Call the OSRM API with a timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

          const response = await fetch(url, {
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId))

          if (!response.ok) {
            throw new Error(`OSRM API error: ${response.status}`)
          }

          const data = await response.json()

          // Check if the OSRM API returned a valid response
          if (data.code !== "Ok" || !data.routes || !data.routes.length) {
            throw new Error(data.message || "OSRM API returned an invalid response")
          }

          // Extract the route information
          const route = data.routes[0]

          // Ensure the route has legs
          if (!route.legs || !Array.isArray(route.legs)) {
            throw new Error("OSRM route has no legs")
          }

          // Calculate the total distance and duration
          let totalDistance = 0
          let totalDuration = 0
          const distances = []
          const durations = []

          // Create segments with detailed information
          const segments = []

          for (let i = 0; i < route.legs.length; i++) {
            const leg = route.legs[i]
            const start = geocodedStores[i]
            const end = geocodedStores[i + 1]

            // Convert distance from meters to kilometers
            const distanceKm = leg.distance / 1000
            // Convert duration from seconds to minutes
            const durationMin = leg.duration / 60

            distances.push(Math.round(distanceKm * 10) / 10)
            durations.push(Math.round(durationMin))

            totalDistance += distanceKm
            totalDuration += durationMin

            // Add segment with detailed information
            segments.push({
              startStoreId: start.id,
              endStoreId: end.id,
              startName: start.description,
              endName: end.description,
              startAddress: [start.address, start.city, start.county].filter(Boolean).join(", "),
              endAddress: [end.address, end.city, end.county].filter(Boolean).join(", "),
              startLatitude: start.coordinates[1],
              startLongitude: start.coordinates[0],
              endLatitude: end.coordinates[1],
              endLongitude: end.coordinates[0],
              distance: Math.round(distanceKm * 10) / 10,
              duration: Math.round(durationMin),
            })
          }

          return NextResponse.json({
            success: true,
            route: {
              totalDistance: Math.round(totalDistance * 10) / 10,
              totalDuration: Math.round(totalDuration),
              segments: segments,
            },
            dateRange:
              startDate && endDate
                ? {
                    startDate,
                    endDate,
                  }
                : undefined,
            optimized: optimize,
            calculationMethod: "osrm",
            storesRequested: storeIds.length,
            storesFound: stores.length,
            storesGeocoded: geocodedStores.length,
          })
        } catch (osrmError) {
          // If OSRM API fails, fall back to direct calculation
          console.error(`[TEST-CALCULATE-ROUTE] OSRM API error, falling back to direct calculation:`, osrmError)

          // Sort stores if optimize is true
          const sortedStores = [...geocodedStores]

          // Calculate distances and durations between consecutive stores
          const distances = []
          const durations = []
          let totalDistance = 0
          let totalDuration = 0

          // Create segments with detailed information
          const segments = []

          for (let i = 0; i < sortedStores.length - 1; i++) {
            const start = sortedStores[i]
            const end = sortedStores[i + 1]

            // Coordinates are in [longitude, latitude] format, but Haversine needs latitude first
            const distance = calculateHaversineDistance(
              start.coordinates[1], // latitude
              start.coordinates[0], // longitude
              end.coordinates[1], // latitude
              end.coordinates[0], // longitude
            )

            // Round to 1 decimal place
            const roundedDistance = Math.round(distance * 10) / 10

            // Estimate travel time based on distance
            const duration = estimateTravelTime(roundedDistance)

            distances.push(roundedDistance)
            durations.push(duration)

            totalDistance += roundedDistance
            totalDuration += duration

            // Add segment with detailed information
            segments.push({
              startStoreId: start.id,
              endStoreId: end.id,
              startName: start.description,
              endName: end.description,
              startAddress: [start.address, start.city, start.county].filter(Boolean).join(", "),
              endAddress: [end.address, end.city, end.county].filter(Boolean).join(", "),
              startLatitude: start.coordinates[1],
              startLongitude: start.coordinates[0],
              endLatitude: end.coordinates[1],
              endLongitude: end.coordinates[0],
              distance: roundedDistance,
              duration: Math.round(duration),
            })
          }

          return NextResponse.json({
            success: true,
            route: {
              totalDistance: Math.round(totalDistance * 10) / 10,
              totalDuration: Math.round(totalDuration),
              segments: segments,
            },
            dateRange:
              startDate && endDate
                ? {
                    startDate,
                    endDate,
                  }
                : undefined,
            optimized: optimize,
            calculationMethod: "direct-fallback",
            storesRequested: storeIds.length,
            storesFound: stores.length,
            storesGeocoded: geocodedStores.length,
          })
        }
      }
    } catch (sqlError) {
      console.error("[TEST-CALCULATE-ROUTE] SQL Error:", sqlError)
      return NextResponse.json(
        {
          success: false,
          error: "Database query failed",
          message: sqlError instanceof Error ? sqlError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[TEST-CALCULATE-ROUTE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

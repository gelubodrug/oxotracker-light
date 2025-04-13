import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ success: false, error: "Address parameter is required" }, { status: 400 })
  }

  try {
    // Call Google Maps Geocoding API
    const apiKey = process.env.GOOGLE_MAPS_API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json({ success: false, error: `Geocoding failed: ${data.status}` }, { status: 400 })
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ success: false, error: "No results found for the address" }, { status: 404 })
    }

    const location = data.results[0].geometry.location

    return NextResponse.json({
      success: true,
      coordinates: {
        latitude: location.lat,
        longitude: location.lng,
      },
      formattedAddress: data.results[0].formatted_address,
    })
  } catch (error) {
    console.error("Error geocoding address:", error)
    return NextResponse.json({ success: false, error: "Failed to geocode address" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination, waypoints } = body

    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: "Origin and destination are required" }, { status: 400 })
    }

    // Call Google Maps Directions API
    const apiKey = process.env.GOOGLE_MAPS_API
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`

    // Add waypoints if provided
    if (waypoints && waypoints.length > 0) {
      // Google Maps API has a limit of 25 waypoints in the free tier
      const waypointsString = waypoints
        .slice(0, 23)
        .map((wp) => encodeURIComponent(wp))
        .join("|")
      url += `&waypoints=optimize:true|${waypointsString}`
    }

    url += `&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json({ success: false, error: `Directions request failed: ${data.status}` }, { status: 400 })
    }

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json({ success: false, error: "No routes found" }, { status: 404 })
    }

    const route = data.routes[0]
    const legs = route.legs

    // Process the route data
    const segments = legs.map((leg, index) => {
      return {
        startName: leg.start_address.split(",")[0],
        endName: leg.end_address.split(",")[0],
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.value / 1000, // Convert meters to kilometers
        duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
        startLocation: leg.start_location,
        endLocation: leg.end_location,
        // Include the encoded polyline for this leg
        polyline: leg.steps.map((step) => step.polyline.points).join(""),
      }
    })

    // Calculate total distance and duration
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value / 1000, 0)
    const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value / 60, 0)

    return NextResponse.json({
      success: true,
      calculationMethod: "google",
      route: {
        totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal place
        totalDuration: Math.round(totalDuration),
        segments: segments,
        // Include the overview polyline for the entire route
        polyline: route.overview_polyline.points,
      },
    })
  } catch (error) {
    console.error("Error calculating route:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate route" }, { status: 500 })
  }
}

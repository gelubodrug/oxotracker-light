import { type NextRequest, NextResponse } from "next/server"

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stops } = body

    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return NextResponse.json({ success: false, error: "At least 2 valid stops are required" }, { status: 400 })
    }

    // Extract origin, destination and waypoints
    const origin = stops[0]
    const destination = stops[stops.length - 1]
    const waypoints = stops.slice(1, stops.length - 1)

    // Build the directions API URL
    let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}`

    // Add waypoints if provided
    if (waypoints.length > 0) {
      const waypointsString = waypoints.map((wp) => encodeURIComponent(wp)).join("|")
      directionsUrl += `&waypoints=optimize:true|${waypointsString}`
    }

    // Add API key
    directionsUrl += `&key=${GOOGLE_MAPS_API_KEY}`

    const response = await fetch(directionsUrl)
    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json(
        { success: false, error: `Google Directions API error: ${data.status}` },
        { status: 400 },
      )
    }

    // Process the route data
    const route = data.routes[0]
    const legs = route.legs

    // Calculate total distance and duration
    let totalDistance = 0
    let totalDuration = 0
    const segments = []

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]
      const distanceInKm = leg.distance.value / 1000
      const durationInMin = leg.duration.value / 60

      totalDistance += distanceInKm
      totalDuration += durationInMin

      // Get the waypoint index based on the optimized order if available
      const waypointOrder = route.waypoint_order || []
      const startIndex = i === 0 ? 0 : waypointOrder[i - 1] + 1
      const endIndex = i === legs.length - 1 ? stops.length - 1 : waypointOrder[i] + 1

      segments.push({
        startStoreId: startIndex === 0 ? "HQ" : `waypoint_${startIndex}`,
        endStoreId: endIndex === stops.length - 1 ? "HQ" : `waypoint_${endIndex}`,
        startName: leg.start_address.split(",")[0],
        endName: leg.end_address.split(",")[0],
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: Math.round(distanceInKm * 10) / 10,
        duration: Math.round(durationInMin),
        startLatitude: leg.start_location.lat,
        startLongitude: leg.start_location.lng,
        endLatitude: leg.end_location.lat,
        endLongitude: leg.end_location.lng,
      })
    }

    return NextResponse.json({
      success: true,
      distance: Math.round(totalDistance * 10) / 10,
      duration: Math.round(totalDuration),
      segments: segments,
      polyline: route.overview_polyline.points,
    })
  } catch (error) {
    console.error("Error in Google Maps multi-point route calculation:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate multi-point route" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"

// Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const city = searchParams.get("city")
    const county = searchParams.get("county")

    // Validate that at least one parameter is provided
    if (!address && !city && !county) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one of address, city, or county must be provided",
        },
        { status: 400 },
      )
    }

    // Format the address for geocoding - filter out empty components
    const addressComponents = [address || "", city || "", county || "", "Romania"].filter(Boolean)
    const searchAddress = addressComponents.join(", ")

    console.log(`[TEST-GEOCODE] Geocoding address: ${searchAddress}`)

    if (!MAPBOX_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "Mapbox token is not configured",
        },
        { status: 500 },
      )
    }

    // Geocode the address using Mapbox
    const encodedAddress = encodeURIComponent(searchAddress)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No geocoding results found for address: ${searchAddress}`,
        },
        { status: 404 },
      )
    }

    const coords = data.features[0].center
    console.log(`[TEST-GEOCODE] Geocoded "${searchAddress}" to [${coords[0]}, ${coords[1]}]`)

    return NextResponse.json({
      success: true,
      coordinates: {
        longitude: coords[0],
        latitude: coords[1],
      },
      formattedAddress: data.features[0].place_name,
    })
  } catch (error) {
    console.error("[TEST-GEOCODE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

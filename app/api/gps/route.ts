import { NextResponse } from "next/server"

// API endpoints
const POSITIONS_API =
  "https://www.lupagps.net/atlas/positions.vbhtml?groupID=7332863&userName=oxo_api&password=grup2025"
const DEVICES_API = "https://www.lupagps.net/atlas/devices.vbhtml?groupID=7332863&userName=oxo_api&password=grup2025"

interface DevicePosition {
  deviceId: string
  coordinate: {
    latitude: number
    longitude: number
  }
  heading: number
  speed: number
  ignitionState: string
  temperature: string
  dateTime: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    seconds: number
    timezone: string
  }
}

interface DeviceInfo {
  deviceId: string
  deviceName: string
  driverId: string
  driverName: string
}

interface PositionResponse {
  positionList: DevicePosition[]
}

interface DeviceResponse {
  deviceList: DeviceInfo[]
}

export async function GET() {
  try {
    // Fetch positions and devices in parallel
    const [positionsResponse, devicesResponse] = await Promise.all([
      fetch(POSITIONS_API, { next: { revalidate: 60 } }), // Revalidate every minute
      fetch(DEVICES_API, { next: { revalidate: 60 } }),
    ])

    if (!positionsResponse.ok) {
      throw new Error(`Positions API error: ${positionsResponse.status}`)
    }

    if (!devicesResponse.ok) {
      throw new Error(`Devices API error: ${devicesResponse.status}`)
    }

    const positionsData: PositionResponse = await positionsResponse.json()
    const devicesData: DeviceResponse = await devicesResponse.json()

    // Extract the position list and device list
    const positions = positionsData.positionList || []
    const devices = devicesData.deviceList || []

    // Create a map of device IDs to device details
    const deviceMap = new Map<string, DeviceInfo>()
    devices.forEach((device) => {
      deviceMap.set(device.deviceId, device)
    })

    // Combine positions with device details
    const combinedData = positions.map((position) => {
      const device = deviceMap.get(position.deviceId)

      // Format the date from the position's dateTime object
      const dateTime = position.dateTime
      const formattedDate = new Date(
        Date.UTC(
          dateTime.year,
          dateTime.month - 1, // JavaScript months are 0-indexed
          dateTime.day,
          dateTime.hour,
          dateTime.minute,
          dateTime.seconds,
        ),
      ).toISOString()

      return {
        id: position.deviceId,
        name: device?.deviceName || `Device ${position.deviceId}`,
        driverId: device?.driverId,
        driverName: device?.driverName || "Unknown Driver",
        status: position.ignitionState === "ON" ? "online" : "offline",
        lastUpdate: formattedDate,
        position: {
          latitude: position.coordinate.latitude,
          longitude: position.coordinate.longitude,
          heading: position.heading,
          speed: position.speed,
          ignitionState: position.ignitionState,
          temperature: position.temperature,
          timestamp: formattedDate,
        },
      }
    })

    return NextResponse.json(combinedData)
  } catch (error) {
    console.error("Error fetching GPS data:", error)
    return NextResponse.json({ error: "Failed to fetch GPS data" }, { status: 500 })
  }
}

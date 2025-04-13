"use server"

import { query } from "@/lib/db"

interface VehicleTimestamps {
  realStartDate: string | null
  realCompletionDate: string | null
}

export async function getVehicleTimestamps(carPlate: string, assignmentCreatedAt: string): Promise<VehicleTimestamps> {
  try {
    console.log(`🚙 [VEHICLE-TIMESTAMPS] FUNCTION CALLED for car ${carPlate} after ${assignmentCreatedAt}`)
    if (!carPlate) {
      console.log("🚙 [VEHICLE-TIMESTAMPS] No car plate provided, skipping GPS check")
      return { realStartDate: null, realCompletionDate: null }
    }

    // STEP 1: First time the car LEFT Chitila (was_near_chitila = false) AFTER assignment
    const departureResult = await query(
      `
      SELECT detected_at 
      FROM vehicle_presence 
      WHERE car_plate = $1 
        AND detected_at > $2 
        AND was_near_chitila = FALSE 
      ORDER BY detected_at ASC 
      LIMIT 1
      `,
      [carPlate, assignmentCreatedAt],
    )

    if (departureResult.rows.length === 0) {
      console.log(`🚙 [VEHICLE-TIMESTAMPS] No departure found after assignment for ${carPlate}`)
      return { realStartDate: null, realCompletionDate: null }
    }

    const realStartDate = departureResult.rows[0].detected_at
    console.log(`🚙 [VEHICLE-TIMESTAMPS] Found realStartDate: ${realStartDate}`)

    // STEP 2: Last time the car RETURNED to Chitila AFTER that start
    const returnResult = await query(
      `
      SELECT detected_at 
      FROM vehicle_presence 
      WHERE car_plate = $1 
        AND was_near_chitila = TRUE 
        AND detected_at > $2 
      ORDER BY detected_at DESC 
      LIMIT 1
      `,
      [carPlate, realStartDate],
    )

    const realCompletionDate = returnResult.rows[0]?.detected_at || null
    console.log(`🚙 [VEHICLE-TIMESTAMPS] Found realCompletionDate: ${realCompletionDate || "Not returned yet"}`)

    return {
      realStartDate,
      realCompletionDate,
    }
  } catch (error) {
    console.error("🚙 [VEHICLE-TIMESTAMPS] ERROR during timestamp lookup:", error)
    return { realStartDate: null, realCompletionDate: null }
  }
}

"use server"

import { query } from "@/lib/db"

interface VehicleTimestamps {
  realStartDate: string | null
  realCompletionDate: string | null
}

/**
 * Gets the real start and completion dates for an assignment based on vehicle GPS data.
 *
 * Logic:
 * - realStartDate: first time car was detected OUTSIDE Chitila (was_near_chitila = false) AFTER assignmentCreatedAt
 * - realCompletionDate: last time car was seen BACK in Chitila (was_near_chitila = true) AFTER realStartDate
 *
 * @param carPlate License plate of the vehicle (e.g. "B 135 XOX")
 * @param assignmentCreatedAt When the assignment was created (from DB)
 */
export async function getVehicleTimestamps(carPlate: string, assignmentCreatedAt: string): Promise<VehicleTimestamps> {
  try {
    console.log(`🚙 [VEHICLE-TIMESTAMPS] FUNCTION CALLED for car ${carPlate} after ${assignmentCreatedAt}`)
    console.log(`🚙 [DEBUG] Using assignmentCreatedAt: ${assignmentCreatedAt}`)

    if (!carPlate) {
      console.log("🚙 [VEHICLE-TIMESTAMPS] No car plate provided, skipping vehicle timestamp lookup")
      return { realStartDate: null, realCompletionDate: null }
    }

    // Step 1: Find the first time the car left Chitila after assignment creation
    const departureResult = await query(
      `
      SELECT timestamp
      FROM vehicle_presence 
      WHERE car_plate = $1 
        AND timestamp > $2
        AND was_near_chitila = FALSE
      ORDER BY timestamp ASC
      LIMIT 1
      `,
      [carPlate, assignmentCreatedAt],
    )

    if (!departureResult.rows || departureResult.rows.length === 0) {
      console.log(`🚙 [VEHICLE-TIMESTAMPS] No departure found after assignment creation for car ${carPlate}`)
      return { realStartDate: null, realCompletionDate: null }
    }

    const realStartDate = departureResult.rows[0].timestamp
    console.log(`🚙 [VEHICLE-TIMESTAMPS] Found GPS Start: ${realStartDate}`)

    // Step 2: Find the last time the car was seen back in Chitila AFTER departure
    const returnResult = await query(
      `
      SELECT timestamp
      FROM vehicle_presence 
      WHERE car_plate = $1 
        AND was_near_chitila = TRUE
        AND timestamp > $2
      ORDER BY timestamp DESC
      LIMIT 1
      `,
      [carPlate, realStartDate],
    )

    const realCompletionDate = returnResult.rows?.[0]?.timestamp || null
    console.log(`🚙 [VEHICLE-TIMESTAMPS] Found GPS Return: ${realCompletionDate || "Not returned yet"}`)

    return {
      realStartDate,
      realCompletionDate,
    }
  } catch (error) {
    console.error("❌ [VEHICLE-TIMESTAMPS] Error during GPS timestamp lookup:", error)
    return { realStartDate: null, realCompletionDate: null }
  }
}

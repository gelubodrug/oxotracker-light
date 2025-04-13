"use server"

import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function updateAssignmentDistanceAndDuration(
  assignmentId: number,
  distance: number,
  duration: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!assignmentId || isNaN(assignmentId) || assignmentId <= 0) {
      return { success: false, error: "Invalid assignment ID" }
    }

    if (distance < 0 || duration < 0) {
      return { success: false, error: "Distance and duration must be positive values" }
    }

    // Round values to 2 decimal places for consistency
    const roundedDistance = Math.round(distance * 100) / 100
    const roundedDuration = Math.round(duration)

    // Update the assignment in the database using tagged template syntax
    await sql`
      UPDATE assignments 
      SET km = ${roundedDistance}, driving_time = ${roundedDuration}, updated_at = NOW() 
      WHERE id = ${assignmentId}
    `

    return { success: true }
  } catch (error) {
    console.error("Error updating assignment distance and duration:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

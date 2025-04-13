"use server"

import { sql } from "@vercel/postgres"
import { revalidatePath } from "next/cache"

// Function to finalize an assignment and calculate final distance
export async function finalizeAssignment(assignmentId: number, finalKm: number, notes: string) {
  try {
    console.log(`Finalizing assignment ${assignmentId} with ${finalKm} km and notes: ${notes}`)

    // Get assignment details
    const { rows: assignments } = await sql`
     SELECT 
       a.assignment_id, 
       a.start_location, 
       a.end_location,
       a.store_points
     FROM assignments a
     WHERE a.assignment_id = ${assignmentId}
   `

    if (assignments.length === 0) {
      console.error(`Assignment ${assignmentId} not found`)
      return { success: false, error: "Assignment not found" }
    }

    // Update the assignment with the finalized status and km
    await sql`
     UPDATE assignments
     SET 
       status = 'finalized',
       final_km = ${finalKm},
       notes = ${notes},
       finalized_at = NOW()
     WHERE assignment_id = ${assignmentId}
   `

    console.log(`Updated assignment ${assignmentId} as finalized`)

    // Revalidate relevant paths
    revalidatePath("/assignments")
    revalidatePath("/finalization")

    return {
      success: true,
      userDistance: finalKm,
    }
  } catch (error) {
    console.error("Error finalizing assignment:", error)
    return { success: false, error: String(error) }
  }
}

// Other functions in the file...

import { NextResponse } from "next/server"
import { getAssignments } from "@/app/actions/assignments"

export async function GET() {
  try {
    console.log("🚗 [API-ASSIGNMENTS] API route handler called")

    // Call the server action to get assignments
    console.log("🚗 [API-ASSIGNMENTS] Calling getAssignments server action")
    const assignments = await getAssignments()

    console.log(`🚗 [API-ASSIGNMENTS] Returning ${assignments.length} assignments from API`)

    // Return the assignments as JSON
    return NextResponse.json(assignments)
  } catch (error) {
    console.error("🚗 [API-ASSIGNMENTS] Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

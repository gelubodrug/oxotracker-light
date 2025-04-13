import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid assignment ID",
        },
        { status: 400 },
      )
    }

    console.log(`[TEST-ASSIGNMENT] Fetching assignment with ID: ${id}`)
    console.log(`[TEST-ASSIGNMENT] Querying database for assignment ID: ${id} using table: assignments`)

    // Fetch ONLY id and store_points from the assignment
    // Using tagged template syntax instead of conventional function call
    const assignmentResult = await sql`
      SELECT 
        id, 
        start_date, 
        due_date, 
        store_points,
        km
      FROM assignments 
      WHERE id = ${id}
    `

    if (assignmentResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Assignment with ID ${id} not found in database. Please verify this ID exists.`,
        },
        { status: 404 },
      )
    }

    const assignment = assignmentResult[0]

    // Ensure store_points is parsed as JSON
    let storePoints = []
    try {
      if (typeof assignment.store_points === "string") {
        storePoints = JSON.parse(assignment.store_points)
      } else {
        storePoints = assignment.store_points || []
      }

      // Log the store_points for debugging
      console.log("Raw store_points:", assignment.store_points)
      console.log("Parsed store_points:", storePoints)

      // Handle both array of objects and array of IDs
      if (Array.isArray(storePoints)) {
        // If it's already an array, keep it as is
      } else if (typeof storePoints === "object") {
        // If it's an object but not an array, convert to array
        storePoints = Object.values(storePoints)
      } else {
        // If it's something else, make it an empty array
        storePoints = []
      }
    } catch (e) {
      console.error("[TEST-ASSIGNMENT] Error parsing store_points:", e)
      storePoints = []
    }

    // Format the response
    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        start_date: assignment.start_date,
        due_date: assignment.due_date,
        store_points: storePoints,
        km: assignment.km,
      },
    })
  } catch (error) {
    console.error("[TEST-ASSIGNMENT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 })
    }

    // Get assignment by ID
    const result = await sql`
      SELECT * FROM assignments WHERE id = ${id}
    `

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 })
  }
}

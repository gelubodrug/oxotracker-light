import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || new Date().toISOString().split("T")[0]
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    // Get user hours, assignment counts, and kilometers for the specified date range
    const { rows } = await sql`
      SELECT 
        u.id as user_id,
        u.name,
        COALESCE(SUM(wl.hours), 0) as total_hours,
        COUNT(DISTINCT wl.assignment_id) as assignment_count,
        COALESCE(SUM(wl.kilometers), 0) as total_kilometers
      FROM 
        users u
      LEFT JOIN 
        work_logs wl ON u.id = wl.user_id AND wl.work_date BETWEEN ${startDate} AND ${endDate}
      GROUP BY 
        u.id, u.name
      ORDER BY 
        total_hours DESC
      LIMIT 10
    `

    // Format the response
    const formattedData = rows.map((row) => ({
      user_id: row.user_id,
      name: row.name,
      total_hours: Number.parseFloat(row.total_hours) || 0,
      assignment_count: Number.parseInt(row.assignment_count) || 0,
      total_kilometers: Number.parseFloat(row.total_kilometers) || 0,
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 })
  }
}

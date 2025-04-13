import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 })
    }

    console.log(`[STORES-DIRECT] Searching for store ID: ${id}`)

    try {
      // Search by exact store_id
      const results = await sql`
        SELECT 
          store_id, 
          description,
          address,
          city,
          county
        FROM stores 
        WHERE store_id = ${id}
      `

      console.log(`[STORES-DIRECT] Found ${results.length} results for store ID: ${id}`)

      if (!results || results.length === 0) {
        // Return empty array to indicate store not found
        return NextResponse.json([])
      }

      return NextResponse.json(results)
    } catch (sqlError) {
      console.error("[STORES-DIRECT] SQL Error:", sqlError)

      // Check if the error is related to the table not existing
      if (sqlError.message && sqlError.message.includes("relation") && sqlError.message.includes("does not exist")) {
        console.log("[STORES-DIRECT] Stores table might not exist, returning empty array")
        return NextResponse.json([])
      }

      throw sqlError
    }
  } catch (error) {
    console.error("[STORES-DIRECT] Error searching store by ID:", error)
    return NextResponse.json({ error: "Failed to search store", details: error.message }, { status: 500 })
  }
}

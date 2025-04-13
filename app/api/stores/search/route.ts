import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get("term")

    if (!term) {
      return NextResponse.json([])
    }

    console.log(`[STORES-SEARCH] Searching for term: "${term}"`)

    // Search by store_id (exact match) or description/city/county (partial match)
    const isNumeric = /^\d+$/.test(term)

    let results

    try {
      if (isNumeric) {
        // If the term is numeric, prioritize exact store_id matches
        results = await sql`
          SELECT 
            store_id, 
            description,
            address,
            city,
            county
          FROM stores 
          WHERE 
            store_id = ${term}
            OR description ILIKE ${"%" + term + "%"}
            OR city ILIKE ${"%" + term + "%"}
            OR county ILIKE ${"%" + term + "%"}
          ORDER BY 
            CASE WHEN store_id = ${term} THEN 0 ELSE 1 END,
            description
          LIMIT 20
        `
      } else {
        // If the term is not numeric, search by description, city, or county
        results = await sql`
          SELECT 
            store_id, 
            description,
            address,
            city,
            county
          FROM stores 
          WHERE 
            description ILIKE ${"%" + term + "%"}
            OR city ILIKE ${"%" + term + "%"}
            OR county ILIKE ${"%" + term + "%"}
          ORDER BY description
          LIMIT 20
        `
      }

      console.log(`[STORES-SEARCH] Found ${results.length} results for term: "${term}"`)
      return NextResponse.json(results)
    } catch (sqlError) {
      console.error("[STORES-SEARCH] SQL Error:", sqlError)

      // Check if the error is related to the table not existing
      if (sqlError.message && sqlError.message.includes("relation") && sqlError.message.includes("does not exist")) {
        console.log("[STORES-SEARCH] Stores table might not exist, returning empty array")
        return NextResponse.json([])
      }

      throw sqlError
    }
  } catch (error) {
    console.error("[STORES-SEARCH] Error searching stores:", error)
    return NextResponse.json({ error: "Failed to search stores", details: error.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("id")

    if (!storeId || isNaN(Number(storeId))) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid store ID",
        },
        { status: 400 },
      )
    }

    console.log(`[VALIDATE-STORE] Validating store ID: ${storeId}`)

    // Check if the store exists
    try {
      const result = await sql`
        SELECT 
          store_id, 
          description,
          address,
          city,
          county
        FROM stores 
        WHERE store_id = ${storeId}
      `

      if (!result || result.length === 0) {
        return NextResponse.json({
          success: false,
          exists: false,
          message: `Store with ID ${storeId} does not exist in the database`,
        })
      }

      return NextResponse.json({
        success: true,
        exists: true,
        store: result[0],
      })
    } catch (sqlError) {
      console.error("[VALIDATE-STORE] SQL Error:", sqlError)

      // Check if the error is related to the table not existing
      if (sqlError.message && sqlError.message.includes("relation") && sqlError.message.includes("does not exist")) {
        return NextResponse.json({
          success: false,
          exists: false,
          message: "Stores table does not exist in the database",
        })
      }

      throw sqlError
    }
  } catch (error) {
    console.error("[VALIDATE-STORE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

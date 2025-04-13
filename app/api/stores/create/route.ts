import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.store_id || !body.city || !body.county) {
      return NextResponse.json(
        { error: "Missing required fields: store_id, city, and county are required" },
        { status: 400 },
      )
    }

    console.log(`[STORES-CREATE] Creating/updating store with ID: ${body.store_id}`)

    // Set default values for optional fields
    const description = body.description || `Store ${body.store_id}`
    const address = body.address || `${body.city}, ${body.county}`

    try {
      // Check if the stores table exists
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'stores'
        ) as exists
      `

      const tableExists = tableCheck[0]?.exists

      // If the table doesn't exist, create it
      if (!tableExists) {
        console.log("[STORES-CREATE] Stores table doesn't exist, creating it")
        await sql`
          CREATE TABLE stores (
            store_id VARCHAR(255) PRIMARY KEY,
            description TEXT,
            address TEXT,
            city TEXT,
            county TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      }

      // Insert or update the store
      await sql`
        INSERT INTO stores (
          store_id, 
          description, 
          address, 
          city, 
          county
        ) 
        VALUES (
          ${body.store_id}, 
          ${description}, 
          ${address}, 
          ${body.city}, 
          ${body.county}
        )
        ON CONFLICT (store_id) 
        DO UPDATE SET 
          description = ${description},
          address = ${address},
          city = ${body.city},
          county = ${body.county}
      `

      console.log(`[STORES-CREATE] Successfully created/updated store with ID: ${body.store_id}`)

      return NextResponse.json({
        success: true,
        message: "Store created/updated successfully",
        store: {
          store_id: body.store_id,
          description,
          address,
          city: body.city,
          county: body.county,
        },
      })
    } catch (sqlError) {
      console.error("[STORES-CREATE] SQL Error:", sqlError)

      // If there's an error with ON CONFLICT, the table might exist but without the constraint
      if (sqlError.message && sqlError.message.includes("ON CONFLICT")) {
        console.log("[STORES-CREATE] Trying simpler upsert approach")

        // Try a simpler approach - delete and insert
        await sql`DELETE FROM stores WHERE store_id = ${body.store_id}`
        await sql`
          INSERT INTO stores (
            store_id, 
            description, 
            address, 
            city, 
            county
          ) 
          VALUES (
            ${body.store_id}, 
            ${description}, 
            ${address}, 
            ${body.city}, 
            ${body.county}
          )
        `

        console.log(
          `[STORES-CREATE] Successfully created/updated store with ID: ${body.store_id} using alternative method`,
        )

        return NextResponse.json({
          success: true,
          message: "Store created/updated successfully (alternative method)",
          store: {
            store_id: body.store_id,
            description,
            address,
            city: body.city,
            county: body.county,
          },
        })
      }

      throw sqlError
    }
  } catch (error) {
    console.error("[STORES-CREATE] Error creating/updating store:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create/update store",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

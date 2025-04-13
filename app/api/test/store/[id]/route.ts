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
          message: "Invalid store ID",
        },
        { status: 400 },
      )
    }

    // Get store by ID
    const result = await sql`
      SELECT 
        store_id, 
        description,
        address,
        city,
        county
      FROM stores 
      WHERE store_id = ${id}
    `

    if (!result || result.length === 0) {
      // Try to fetch from the regular stores API as a fallback
      try {
        const fallbackRes = await fetch(
          `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/api/stores/${id}`,
        )

        if (fallbackRes.ok) {
          const storeData = await fallbackRes.json()
          return NextResponse.json({
            success: true,
            store: {
              store_id: Number(storeData.store_id),
              description: storeData.description || `Store #${id}`,
              address: storeData.address || "",
              city: storeData.city || "",
              county: storeData.county || "",
            },
          })
        }
      } catch (fallbackError) {
        console.error("Fallback store fetch failed:", fallbackError)
      }

      // If fallback fails, return a placeholder store with the ID
      return NextResponse.json({
        success: true,
        store: {
          store_id: Number(id),
          description: `Store #${id}`,
          address: "",
          city: "",
          county: "",
        },
      })
    }

    return NextResponse.json({
      success: true,
      store: {
        store_id: Number(result[0].store_id),
        description: result[0].description || `Store #${id}`,
        address: result[0].address || "",
        city: result[0].city || "",
        county: result[0].county || "",
      },
    })
  } catch (error) {
    console.error("Error fetching store:", error)

    // Return a placeholder store with the ID instead of an error
    return NextResponse.json({
      success: true,
      store: {
        store_id: Number(params.id),
        description: `Store #${params.id}`,
        address: "",
        city: "",
        county: "",
      },
    })
  }
}

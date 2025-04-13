import { neon } from "@neondatabase/serverless"

// Create a SQL client
export const sql = neon(process.env.DATABASE_URL!)

// Execute a query with parameters
export async function executeQuery(query: string, params: any[] = []) {
  try {
    return await sql(query, params)
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

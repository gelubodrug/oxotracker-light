import { Pool } from "@neondatabase/serverless"

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
})

// Export a query function
export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now()
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: result.rowCount })
    return result
  } catch (error) {
    console.error("Error executing query:", error)
    throw error
  }
}

// Add the missing sql export - a tagged template function for SQL queries
export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  // Convert the template strings and values to a query string and parameters
  let text = strings[0]
  const params: any[] = []

  for (let i = 0; i < values.length; i++) {
    params.push(values[i])
    text += `$${params.length}${strings[i + 1] || ""}`
  }

  // Return a function that executes the query
  return {
    then: async (callback: (result: any) => void) => {
      try {
        const result = await query(text, params)
        return callback(result)
      } catch (error) {
        throw error
      }
    },
    catch: async (callback: (error: any) => void) => {
      try {
        await query(text, params)
      } catch (error) {
        return callback(error)
      }
    },
    execute: async () => {
      return await query(text, params)
    },
    // Add these properties to make it compatible with the existing code
    get rows() {
      return []
    },
    get rowCount() {
      return 0
    },
    async execute() {
      const result = await query(text, params)
      return result
    },
  }
}

// Export the pool for direct use if needed
export { pool }

"use server"

import { neon } from "@neondatabase/serverless"
import { format } from "date-fns"

export async function getUserStats(userId: string, month: string) {
  try {
    // Validate userId
    if (!userId || isNaN(Number(userId))) {
      throw new Error(`Invalid userId: ${userId}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Parse the month parameter to get year and month
    const [year, monthNum] = month.split("-").map(Number)

    // Get the first and last day of the month
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0) // Last day of the month

    const formattedStartDate = format(startDate, "yyyy-MM-dd")
    const formattedEndDate = format(endDate, "yyyy-MM-dd")

    // Get user info - use tagged template literal syntax
    const userResult = await sql`
      SELECT id, name, email
      FROM users
      WHERE id = ${userId}
    `

    if (!userResult || userResult.length === 0) {
      throw new Error(`User with ID ${userId} not found in database`)
    }

    // Get work logs for the user in the specified month
    const workLogs = await sql`
      SELECT 
        wl.id,
        wl.work_date,
        a.type,
        a.location,
        a.store_number,
        a.county,
        a.city,
        wl.hours,
        a.km,
        a.status,
        a.team_lead,
        a.store_points
      FROM work_logs wl
      JOIN assignments a ON wl.assignment_id = a.id
      WHERE wl.user_id = ${userId}
        AND wl.work_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
      ORDER BY wl.work_date DESC
    `

    // Calculate statistics
    const totalHours = workLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0)
    const totalKilometers = workLogs.reduce((sum, log) => sum + Number(log.km || 0), 0)

    // Count unique locations (considering store_points JSON array)
    const uniqueLocations = new Set()
    let totalStoreCount = 0

    workLogs.forEach((log) => {
      // Add the main location
      if (log.location) {
        uniqueLocations.add(log.location)
      }

      // Count stores from store_points if available
      if (log.store_points) {
        try {
          const storePoints = typeof log.store_points === "string" ? JSON.parse(log.store_points) : log.store_points

          if (Array.isArray(storePoints)) {
            totalStoreCount += storePoints.length
            storePoints.forEach((store) => {
              if (typeof store === "number" || typeof store === "string") {
                uniqueLocations.add(store.toString())
              }
            })
          }
        } catch (e) {
          console.error("Error parsing store_points:", e)
        }
      }
    })

    // Group hours by type
    const hoursByType = workLogs.reduce((acc, log) => {
      const type = log.type || "Unknown"
      if (!acc[type]) {
        acc[type] = 0
      }
      acc[type] += Number(log.hours || 0)
      return acc
    }, {})

    // Convert to array format
    const hoursByTypeArray = Object.entries(hoursByType).map(([type, hours]) => ({
      type,
      hours,
    }))

    // Format timeline data
    const timeline = workLogs.map((log) => {
      // Extract store points if available
      let storePoints = []
      if (log.store_points) {
        try {
          const storePointsData = typeof log.store_points === "string" ? JSON.parse(log.store_points) : log.store_points

          // Handle the case where store_points is an array of numbers or objects
          if (Array.isArray(storePointsData)) {
            storePoints = storePointsData.map((storeId) => {
              // If storeId is an object with an id property, use that
              if (typeof storeId === "object" && storeId !== null && "id" in storeId) {
                return { id: storeId.id }
              }
              // Otherwise use the storeId directly
              return { id: storeId }
            })
          }
        } catch (e) {
          console.error("Error parsing store_points:", e)
        }
      }

      return {
        id: log.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
        date: log.work_date ? format(new Date(log.work_date), "yyyy-MM-dd") : "Unknown date",
        type: log.type || "Unknown",
        location:
          `${log.city || ""}, ${log.county || ""} ${log.store_number ? `(Nr. ${log.store_number})` : ""}`.trim() ||
          "Unknown location",
        hours: Number(log.hours || 0),
        kilometers: Number(log.km || 0),
        description: `${log.status || "Worked"} ${log.team_lead ? `(${log.team_lead})` : ""}`,
        storePoints: storePoints,
        county: log.county,
        city: log.city,
        storeNumber: log.store_number,
      }
    })

    return {
      id: userResult[0].id,
      name: userResult[0].name,
      email: userResult[0].email,
      totalKilometers,
      totalHours,
      workLogs: workLogs.length,
      locations: uniqueLocations.size || totalStoreCount || workLogs.length,
      hoursByType: hoursByTypeArray,
      timeline,
    }
  } catch (error) {
    console.error("Error in getUserStats:", error)
    throw error // Re-throw the error to be handled by the component
  }
}

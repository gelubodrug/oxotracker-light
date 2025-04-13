import { sql } from "@vercel/postgres"
import type { Assignment } from "@/types"
import { calculateMultiPointRoute } from "@/utils/osm-distance"

export async function getAssignments(): Promise<Assignment[]> {
  try {
    const { rows } = await sql`
      SELECT 
        a.id, 
        a.title, 
        a.date, 
        a.km as distance,
        a.driving_time as duration, 
        a.stops, 
        a.status,
        d.name as driver_name
      FROM 
        assignments a
      LEFT JOIN 
        drivers d ON a.driver_id = d.id
      ORDER BY 
        a.date DESC
    `

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      distance: row.distance,
      duration: row.duration || 0, // Handle null duration for backward compatibility
      stops: row.stops,
      driver: row.driver_name || undefined,
      status: row.status,
    }))
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return []
  }
}

export async function createAssignment(assignment: Partial<Assignment>): Promise<Assignment | null> {
  try {
    // Insert the assignment
    const { rows } = await sql`
      INSERT INTO assignments (
        title, 
        date, 
        km,
        driving_time, 
        stops, 
        status
      ) 
      VALUES (
        ${assignment.title}, 
        ${assignment.date}, 
        ${assignment.distance},
        ${assignment.duration || 0}, 
        ${assignment.stops}, 
        ${assignment.status || "pending"}
      )
      RETURNING id
    `

    const assignmentId = rows[0].id

    // Insert the stores for this assignment
    if (assignment.stores && assignment.stores.length > 0) {
      for (const store of assignment.stores) {
        await sql`
          INSERT INTO assignment_stores (
            assignment_id, 
            store_id
          ) 
          VALUES (
            ${assignmentId}, 
            ${store.id}
          )
        `
      }
    }

    return {
      id: assignmentId,
      title: assignment.title || "",
      date: assignment.date || new Date().toISOString(),
      distance: assignment.distance || 0,
      duration: assignment.duration || 0,
      stops: assignment.stops || 0,
      status: (assignment.status as any) || "pending",
    }
  } catch (error) {
    console.error("Error creating assignment:", error)
    return null
  }
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  try {
    // Get the assignment
    const { rows: assignmentRows } = await sql`
      SELECT 
        a.id, 
        a.title, 
        a.date, 
        a.km as distance,
        a.driving_time as duration, 
        a.stops, 
        a.status,
        a.driver_id,
        d.name as driver_name
      FROM 
        assignments a
      LEFT JOIN 
        drivers d ON a.driver_id = d.id
      WHERE 
        a.id = ${id}
    `

    if (assignmentRows.length === 0) {
      return null
    }

    const assignment = assignmentRows[0]

    // Get the stores for this assignment
    const { rows: storeRows } = await sql`
      SELECT 
        s.id, 
        s.name, 
        s.address, 
        s.city,
        s.county,
        s.phone
      FROM 
        stores s
      JOIN 
        assignment_stores as_join ON s.id = as_join.store_id
      WHERE 
        as_join.assignment_id = ${id}
    `

    const stores = storeRows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      county: row.county,
      phone: row.phone,
    }))

    return {
      id: assignment.id,
      title: assignment.title,
      date: assignment.date,
      distance: assignment.distance,
      duration: assignment.duration || 0, // Handle null duration for backward compatibility
      stops: assignment.stops,
      driver: assignment.driver_name || undefined,
      driverId: assignment.driver_id || undefined,
      status: assignment.status,
      stores,
    }
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return null
  }
}

export async function assignDriver(assignmentId: string, driverId: string): Promise<boolean> {
  try {
    await sql`
      UPDATE assignments
      SET 
        driver_id = ${driverId},
        status = 'assigned'
      WHERE 
        id = ${assignmentId}
    `
    return true
  } catch (error) {
    console.error("Error assigning driver:", error)
    return false
  }
}

export async function recalculateAssignmentRoute(
  assignmentId: string,
): Promise<{ distance: number; duration: number } | null> {
  try {
    // Get the assignment with its stores
    const assignment = await getAssignmentById(assignmentId)

    if (!assignment || !assignment.stores || assignment.stores.length === 0) {
      return null
    }

    // Format stores for the route calculation
    const storeLocations = assignment.stores.map((store) => ({
      address: store.address,
      city: store.city,
      county: store.county,
    }))

    // Calculate the route - now returns both distance and duration
    const result = await calculateMultiPointRoute("Chitila", "Chitila", storeLocations)

    // Update the assignment with the new distance and duration in the correct columns
    await sql`
      UPDATE assignments
      SET 
        km = ${result.distance},
        driving_time = ${result.duration}
      WHERE 
        id = ${assignmentId}
    `

    console.log(`Updated assignment ${assignmentId} with: ${result.distance} km, ${result.duration} min driving time`)

    return result
  } catch (error) {
    console.error("Error recalculating assignment route:", error)
    return null
  }
}

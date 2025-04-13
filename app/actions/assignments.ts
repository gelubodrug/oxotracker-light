"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { neon } from "@neondatabase/serverless"
import { updateUserStatus } from "./users"
import { query } from "@/lib/db"
import { getVehicleTimestamps } from "./vehicle-tracking"

// Default address to use when none is provided
const DEFAULT_ADDRESS = "sos. Banatului 109A, Chitila, Romania"
const CHITILA_ADDRESS = "Chitila, Romania"

// Updated schema to handle string values for numeric fields
const assignmentSchema = z.object({
  id: z.number().optional(),
  type: z.string(),
  location: z.string(),
  team_lead: z.string(),
  members: z.array(z.string()).or(
    z.string().transform((str) => {
      try {
        return JSON.parse(str)
      } catch {
        return str ? [str] : []
      }
    }),
  ),
  // Accept Date object or string for dates
  start_date: z.string().or(z.date().transform((date) => date.toISOString())),
  due_date: z.string().nullable().optional(),
  completion_date: z.string().nullable().optional(),
  status: z.string(),
  // Handle string values for numeric fields
  hours: z.union([z.number(), z.string().transform((val) => (val === "" ? 0 : Number(val)))]).default(0),
  store_number: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  magazin: z.string().nullable().optional(),
  county_code: z.string().nullable().optional(),
  start_location: z.string().nullable().optional(),
  end_location: z.string().nullable().optional(),
  // Handle string values for km
  km: z
    .union([z.number(), z.string().transform((val) => (val === "" ? 0 : Number(val)))])
    .optional()
    .default(0),
  // Add store_points to schema validation
  store_points: z.array(z.number()).optional(),
  // Add car_plate to schema validation
  car_plate: z.string().nullable().optional(),
})

export type Assignment = {
  id: number
  type: string
  start_date: string
  due_date: string | null
  completion_date: string | null
  location: string
  team_lead: string
  members: string[]
  status: string
  hours: number
  start_location: string | null
  end_location: string | null
  start_city_county: string | null
  end_city_county: string | null
  mid_point: string | null
  "add-checkpoint-columns": string | null
  km: string
  magazin: string | null
  county_code: string | null
  store_number: string | null
  county: string | null
  city: string | null
  updated_at: string | null
  driving_time: string | null
  store_points?: number[]
  route_updated?: boolean
  car_plate?: string | null
  created_at?: string
  gps_start_date?: string | null
}

// Function to check if a string looks like coordinates
function looksLikeCoordinates(str: string): boolean {
  return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(str)
}

// Update any database queries to use the new query function
// Example:
export async function getAssignmentById(id: number) {
  try {
    const result = await query(`SELECT * FROM assignments WHERE id = $1`, [id])

    return result.rows[0] || null
  } catch (error) {
    console.error("Error getting assignment:", error)
    return null
  }
}

export async function getAssignments(startDate?: Date, endDate?: Date) {
  try {
    console.log("🚗 [VEHICLE-TRACKING] Starting getAssignments function")

    let queryText = `SELECT * FROM assignments`
    let values: any[] = []

    if (startDate && endDate) {
      queryText = `SELECT * FROM assignments WHERE start_date >= $1 AND start_date <= $2`
      values = [startDate.toISOString(), endDate.toISOString()]
    }

    console.log(`🚗 [VEHICLE-TRACKING] Executing query: ${queryText}`)
    const result = await query(queryText, values)
    const assignments = result.rows
    console.log(`🚗 [VEHICLE-TRACKING] Found ${assignments.length} total assignments`)

    // Process all active assignments to update start_date based on GPS data
    const assignmentsToUpdate = assignments.filter((a) => a.status === "In Deplasare" && a.car_plate)

    console.log(`🚗 [VEHICLE-TRACKING] Found ${assignmentsToUpdate.length} active assignments with car_plate`)

    if (assignmentsToUpdate.length > 0) {
      console.log(
        `🚗 [VEHICLE-TRACKING] Assignment IDs to check for GPS data: ${assignmentsToUpdate.map((a) => a.id).join(", ")}`,
      )

      // Use a Map to cache vehicle timestamp results to avoid duplicate calls
      const timestampCache = new Map<string, { realStartDate: string | null; realCompletionDate: string | null }>()

      // Process each active assignment
      for (const assignment of assignmentsToUpdate) {
        try {
          console.log(
            `🚗 [VEHICLE-TRACKING] Processing assignment ID ${assignment.id} with car_plate ${assignment.car_plate}`,
          )

          // Store the original user-defined start date
          const userStartDate = assignment.start_date

          const cacheKey = `${assignment.car_plate}_${assignment.created_at || assignment.start_date}`
          let timestamps

          // Check cache first
          if (timestampCache.has(cacheKey)) {
            timestamps = timestampCache.get(cacheKey)
            console.log(`🚗 [VEHICLE-TRACKING] Using cached timestamps for ${cacheKey}`)
          } else {
            // Call the helper function to get real timestamps
            console.log(`🚗 [VEHICLE-TRACKING] Calling getVehicleTimestamps for car ${assignment.car_plate}`)
            timestamps = await getVehicleTimestamps(
              assignment.car_plate,
              assignment.created_at || assignment.start_date,
            )
            console.log(`🚗 [VEHICLE-TRACKING] Vehicle timestamps result:`, timestamps)

            // Cache the result
            timestampCache.set(cacheKey, timestamps)
          }

          // If we found a real start date, update the assignment
          if (timestamps?.realStartDate) {
            console.log(
              `🚗 [VEHICLE-TRACKING] ✅ Updating assignment ${assignment.id} with real start date: ${timestamps.realStartDate}`,
            )

            // Update the database with the GPS start date
            await query(
              `
              UPDATE assignments 
              SET gps_start_date = $1 
              WHERE id = $2
            `,
              [timestamps.realStartDate, assignment.id],
            )

            // Update the assignment in our local array too
            assignment.gps_start_date = timestamps.realStartDate
            console.log(`🚗 [VEHICLE-TRACKING] Assignment ${assignment.id} updated with GPS start date`)
          } else {
            console.log(`🚗 [VEHICLE-TRACKING] ❌ No GPS start date found for assignment ${assignment.id}`)
          }
        } catch (updateError) {
          console.error(
            `🚗 [VEHICLE-TRACKING] Error updating GPS start date for assignment ${assignment.id}:`,
            updateError,
          )
          // Continue with other assignments even if one fails
        }
      }

      console.log(`🚗 [VEHICLE-TRACKING] Finished processing ${assignmentsToUpdate.length} active assignments`)
    } else {
      console.log(`🚗 [VEHICLE-TRACKING] No active assignments with car_plate found`)
    }

    return assignments
  } catch (error) {
    console.error("🚗 [VEHICLE-TRACKING] Error fetching assignments:", error)
    return []
  }
}

// Helper function to update user statuses for an assignment
async function updateTeamMemberStatuses(teamLead: string, members: string[], assignmentId: number, status: string) {
  try {
    // First, get the user IDs for the team lead and members
    const teamLeadQuery = await query(`SELECT id FROM users WHERE name = $1`, [teamLead])

    if (teamLeadQuery.rows.length > 0) {
      const teamLeadId = teamLeadQuery.rows[0].id
      // Update team lead status
      await updateUserStatus(teamLeadId, status, assignmentId)
    }

    // Update team members' statuses
    for (const member of members) {
      const memberQuery = await query(`SELECT id FROM users WHERE name = $1`, [member])
      if (memberQuery.rows.length > 0) {
        const memberId = memberQuery.rows[0].id
        await updateUserStatus(memberId, status, assignmentId)
      }
    }

    return true
  } catch (error) {
    console.error("Error updating team member statuses:", error)
    return false
  }
}

export async function createAssignment(data: any) {
  try {
    console.log("Creating assignment with data:", data)

    // Ensure members is an array
    if (typeof data.members === "string") {
      try {
        data.members = JSON.parse(data.members)
      } catch (e) {
        data.members = data.members ? [data.members] : []
      }
    }

    // Ensure dates are properly formatted
    if (data.start_date instanceof Date) {
      data.start_date = data.start_date.toISOString()
    }

    // Convert numeric string values to numbers
    const hours = typeof data.hours === "string" ? Number(data.hours) || 0 : data.hours || 0
    const km = typeof data.km === "string" ? Number(data.km) || 0 : data.km || 0

    // Set default values for optional fields
    const assignmentData = {
      ...data,
      due_date: data.due_date || null,
      completion_date: data.completion_date || null,
      store_number: data.store_number || null,
      county: data.county || null,
      city: data.city || null,
      magazin: data.magazin || null,
      county_code: data.county_code || null,
      hours: hours,
      km: km,
      // Ensure store_points is included
      store_points: data.store_points || [],
      // Set end_location to Chitila
      end_location: data.end_location || CHITILA_ADDRESS,
    }

    const result = assignmentSchema.safeParse(assignmentData)

    if (!result.success) {
      console.error("Validation error:", result.error)
      return { success: false, error: "Validation error", details: result.error.format() }
    }

    const {
      type,
      location,
      team_lead,
      members,
      start_date,
      due_date,
      completion_date,
      status,
      hours: validatedHours,
      store_number,
      county,
      city,
      magazin,
      county_code,
      start_location,
      end_location,
      km: validatedKm,
      store_points,
      car_plate,
    } = result.data

    const membersJson = Array.isArray(members) ? JSON.stringify(members) : "[]"

    // Convert store_points to JSON string for storage
    const storePointsJson = Array.isArray(store_points) && store_points.length > 0 ? JSON.stringify(store_points) : null

    console.log("Store points for insertion:", storePointsJson)

    // Check if we need to create a new store entry
    if (store_number && county && city) {
      try {
        // Check if store already exists
        const storeCheck = await query(`SELECT store_id FROM stores WHERE store_id = $1`, [store_number])

        // If store doesn't exist, create it
        if (storeCheck.rowCount === 0) {
          // Generate a default description using the available information
          const storeDescription = `Magazin ${store_number} - ${city}, ${county}`
          const defaultAddress = `${city}, ${county}`

          await query(
            `INSERT INTO stores (store_id, city, county, description, address)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (store_id) DO UPDATE SET
             description = $4,
             city = $2,
             county = $3,
             address = $5`,
            [store_number, city, county, storeDescription, defaultAddress],
          )
          console.log(`Created new store: ${store_number}`)
        }
      } catch (storeError) {
        console.error("Error checking/creating store:", storeError)
        // Continue with assignment creation even if store creation fails
      }
    }

    // Insert the assignment with store_points
    const insertResult = await query(
      `INSERT INTO assignments (
       type, location, team_lead, members, start_date, due_date, completion_date, 
       status, hours, store_number, county, city, magazin, county_code, 
       start_location, end_location, km, store_points, car_plate, created_at
     )
     VALUES (
       $1, $2, $3, $4, $5, 
       $6, $7, $8, $9, $10, 
       $11, $12, $13, $14, $15, 
       $16, $17, $18::jsonb, $19, NOW()
     )
     RETURNING id`,
      [
        type,
        location,
        team_lead,
        membersJson,
        start_date,
        due_date,
        completion_date,
        status,
        validatedHours,
        store_number,
        county,
        city,
        magazin,
        county_code,
        start_location,
        end_location,
        validatedKm,
        storePointsJson,
        car_plate || null,
      ],
    )

    const assignmentId = insertResult.rows[0]?.id || 0

    // Update user statuses if the assignment is "In Deplasare"
    if (status === "In Deplasare" && assignmentId) {
      await updateTeamMemberStatuses(team_lead, Array.isArray(members) ? members : [], assignmentId, "In Deplasare")
    }

    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error creating assignment:", error)
    return { success: false, error: "Failed to create assignment", details: error }
  }
}

// Update the recalculateDistance function
export async function recalculateDistance(assignmentId: number) {
  try {
    console.log(`[DEBUG] Recalculating distance for assignment ${assignmentId}`)

    // Get the assignment data
    const result = await query(`SELECT id, store_points FROM assignments WHERE id = $1`, [assignmentId])

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Assignment with ID ${assignmentId} not found`)
    }

    // Since we're removing the osm-distance dependency, we'll return a message
    // directing users to use the test/assignment-route page instead
    return {
      success: false,
      error:
        "Distance calculation has been moved to the test/assignment-route page. Please use that page to calculate distances.",
    }
  } catch (error) {
    console.error("[DEBUG] Error recalculating distance:", error)
    return { success: false, error: String(error) }
  }
}
export async function updateAssignment(data: any) {
  // Add this code at the beginning of the function to handle date conversion
  if (data.due_date instanceof Date) {
    data.due_date = data.due_date.toISOString()
  }

  try {
    console.log("Updating assignment with data:", data)

    // Ensure members is an array
    if (typeof data.members === "string") {
      try {
        data.members = JSON.parse(data.members)
      } catch (e) {
        data.members = data.members ? [data.members] : []
      }
    }

    // Ensure dates are properly formatted
    if (data.start_date instanceof Date) {
      data.start_date = data.start_date.toISOString()
    }

    // Convert numeric string values to numbers
    const hours = typeof data.hours === "string" ? Number(data.hours) || 0 : data.hours || 0
    const km = typeof data.km === "string" ? Number(data.km) || 0 : data.km || 0

    // Set default values for optional fields
    const assignmentData = {
      ...data,
      due_date: data.due_date || null,
      completion_date: data.completion_date || null,
      store_number: data.store_number || null,
      county: data.county || null,
      city: data.city || null,
      magazin: data.magazin || null,
      county_code: data.county_code || null,
      hours: hours,
      km: km,
      // Ensure store_points is included
      store_points: data.store_points || [],
      // Set end_location to Chitila
      end_location: data.end_location || CHITILA_ADDRESS,
    }

    console.log("Processed assignment data:", assignmentData)

    const result = assignmentSchema.safeParse(assignmentData)

    if (!result.success) {
      console.error("Validation error:", result.error)
      return { success: false, error: "Validation error", details: result.error.format() }
    }

    const {
      id,
      type,
      location,
      team_lead,
      members,
      start_date,
      due_date,
      completion_date,
      status,
      hours: validatedHours,
      store_number,
      county,
      city,
      magazin,
      county_code,
      start_location,
      end_location,
      km: validatedKm,
      store_points,
      car_plate,
    } = result.data

    const membersJson = Array.isArray(members) ? JSON.stringify(members) : "[]"

    // Convert store_points to JSON string for storage
    const storePointsJson = Array.isArray(store_points) && store_points.length > 0 ? JSON.stringify(store_points) : null

    console.log("Store points for update:", storePointsJson)

    // Check if we need to create a new store entry
    if (store_number && county && city) {
      try {
        // Check if store already exists
        const storeCheck = await query(`SELECT store_id FROM stores WHERE store_id = $1`, [store_number])

        // If store doesn't exist, create it
        if (storeCheck.rowCount === 0) {
          // Generate a default description using the available information
          const storeDescription = `Magazin ${store_number} - ${city}, ${county}`
          const defaultAddress = `${city}, ${county}`

          await query(
            `INSERT INTO stores (store_id, city, county, description, address)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (store_id) DO UPDATE SET
             description = $4,
             city = $2,
             county = $3,
             address = $5`,
            [store_number, city, county, storeDescription, defaultAddress],
          )
          console.log(`Created new store: ${store_number}`)
        }
      } catch (storeError) {
        console.error("Error checking/creating store:", storeError)
        // Continue with assignment update even if store creation fails
      }
    }

    // Update the assignment with store_points
    await query(
      `UPDATE assignments
     SET 
       type = $1, 
       location = $2, 
       team_lead = $3, 
       members = $4, 
       start_date = $5, 
       due_date = $6, 
       completion_date = $7, 
       status = $8, 
       hours = $9, 
       store_number = $10, 
       county = $11, 
       city = $12, 
       magazin = $13, 
       county_code = $14, 
       start_location = $15, 
       end_location = $16, 
       km = $17,
       store_points = $18::jsonb,
       car_plate = $20
     WHERE id = $19`,
      [
        type,
        location,
        team_lead,
        membersJson,
        start_date,
        due_date,
        completion_date,
        status,
        validatedHours,
        store_number,
        county,
        city,
        magazin,
        county_code,
        start_location,
        end_location,
        validatedKm,
        storePointsJson,
        id,
        car_plate || null,
      ],
    )

    // Update user statuses based on assignment status
    if (id) {
      if (status === "In Deplasare") {
        await updateTeamMemberStatuses(team_lead, Array.isArray(members) ? members : [], id, "In Deplasare")
      } else if (status === "Finalizat") {
        await updateTeamMemberStatuses(team_lead, Array.isArray(members) ? members : [], id, "Liber")
      }
    }

    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error updating assignment:", error)
    return { success: false, error: "Failed to update assignment", details: error }
  }
}

export async function deleteAssignment(id: number) {
  try {
    // First, delete the work logs associated with the assignment
    await query(`DELETE FROM work_logs WHERE assignment_id = $1`, [id])

    // Then, get the assignment details to update user statuses
    const result = await query(`SELECT team_lead, members FROM assignments WHERE id = $1`, [id])

    const rows = result.rows

    if (rows.length > 0) {
      const assignment = rows[0]
      const teamLead = assignment.team_lead
      const members = Array.isArray(assignment.members)
        ? assignment.members
        : typeof assignment.members === "string"
          ? JSON.parse(assignment.members)
          : []

      // Reset all team members' statuses to "Liber"
      await updateTeamMemberStatuses(teamLead, members, null, "Liber")
    }

    // Then delete the assignment
    await query(`DELETE FROM assignments WHERE id = $1`, [id])
    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return { success: false, error: "Failed to delete assignment" }
  }
}

export async function finalizeAssignmentWithTeam(assignment: any) {
  try {
    // Add better validation and logging for the assignment ID
    if (!assignment || !assignment.id) {
      console.error(`[DEBUG] Invalid assignment object or missing ID:`, JSON.stringify(assignment, null, 2))
      throw new Error(`Assignment ID is missing or invalid: ${assignment?.id}`)
    }

    console.log(`[DEBUG] Finalizing assignment ID: ${assignment.id}`)
    console.log(`[DEBUG] Assignment data:`, JSON.stringify(assignment, null, 2))

    // Step 1: Check if the assignment is already finalized
    const statusCheckResult = await query(`SELECT status FROM assignments WHERE id = $1`, [assignment.id])

    if (
      statusCheckResult.rows &&
      statusCheckResult.rows.length > 0 &&
      statusCheckResult.rows[0].status === "Finalizat"
    ) {
      console.log(`[DEBUG] Assignment ${assignment.id} is already finalized, skipping`)
      return { success: true, message: "Assignment already finalized" }
    }

    // Step 2: Get the full assignment data from the database
    const assignmentResult = await query(`SELECT * FROM assignments WHERE id = $1`, [assignment.id])

    if (!assignmentResult.rows || assignmentResult.rows.length === 0) {
      throw new Error(`Assignment with ID ${assignment.id} not found in database`)
    }

    const assignmentData = assignmentResult.rows[0]
    console.log(`[DEBUG] Assignment data from DB:`, JSON.stringify(assignmentData, null, 2))

    // Step 3: Get real timestamps from vehicle GPS data if car_plate is available
    let realStartDate = null
    let realCompletionDate = null

    if (assignmentData.car_plate) {
      console.log(`[DEBUG] Getting real timestamps for car ${assignmentData.car_plate}`)

      // Use the created_at field if available, otherwise fall back to start_date
      const assignmentCreatedAt = assignmentData.created_at || assignmentData.start_date

      const vehicleTimestamps = await getVehicleTimestamps(assignmentData.car_plate, assignmentCreatedAt)

      realStartDate = vehicleTimestamps.realStartDate
      realCompletionDate = vehicleTimestamps.realCompletionDate

      console.log(`[DEBUG] Real timestamps from vehicle data:`)
      console.log(`[DEBUG] - Start date: ${realStartDate || "Not found"}`)
      console.log(`[DEBUG] - Completion date: ${realCompletionDate || "Not found"}`)
    } else {
      console.log(`[DEBUG] No car_plate assigned, skipping vehicle timestamp lookup`)
    }

    // Step 4: Check if ANY work logs already exist for this assignment
    const existingLogsResult = await query(`SELECT COUNT(*) as count FROM work_logs WHERE assignment_id = $1`, [
      assignment.id,
    ])

    const existingLogsCount = Number.parseInt(existingLogsResult.rows[0].count, 10)

    if (existingLogsCount > 0) {
      console.log(
        `[DEBUG] Found ${existingLogsCount} existing work logs for assignment ${assignment.id}, skipping work log creation`,
      )

      // Just update the assignment status and dates if needed
      await query(
        `UPDATE assignments
       SET status = 'Finalizat', 
           start_date = COALESCE($1, start_date),
           completion_date = COALESCE($2, $3)
       WHERE id = $4 AND status != 'Finalizat'`,
        [realStartDate, realCompletionDate, assignment.completion_date || new Date().toISOString(), assignment.id],
      )

      console.log(`[DEBUG] Assignment status updated to "Finalizat" with real timestamps`)

      // Update team members' statuses to "Liber"
      const teamLead = assignmentData.team_lead
      let members = []

      // Parse members from JSON string if needed
      if (typeof assignmentData.members === "string") {
        try {
          members = JSON.parse(assignmentData.members)
        } catch (e) {
          console.error(`[DEBUG] Error parsing members JSON:`, e)
          members = []
        }
      } else if (Array.isArray(assignmentData.members)) {
        members = assignmentData.members
      }

      if (teamLead) {
        await updateTeamMemberStatuses(teamLead, members || [], null, "Liber")
        console.log(`[DEBUG] Team member statuses updated to "Liber"`)
      }

      revalidatePath("/assignments")
      return {
        success: true,
        message: "Assignment already had work logs, status updated with real timestamps",
      }
    }

    // Step 5: Extract team members from the database record
    const teamLead = assignmentData.team_lead || assignment.team_lead
    let members = []

    // Parse members from JSON string if needed
    if (typeof assignmentData.members === "string") {
      try {
        members = JSON.parse(assignmentData.members)
      } catch (e) {
        console.error(`[DEBUG] Error parsing members JSON:`, e)
        members = []
      }
    } else if (Array.isArray(assignmentData.members)) {
      members = assignmentData.members
    }

    // If members array is still empty, check if there are members in the assignment object
    if ((!members || members.length === 0) && Array.isArray(assignment.members)) {
      members = assignment.members
    }

    console.log(`[DEBUG] Team lead:`, teamLead)
    console.log(`[DEBUG] Team members:`, members)

    // Step 6: Get the km and driving time values
    let km = 0
    let drivingTime = 0

    // Always prioritize database values for finalization
    if (assignmentData) {
      // Get km value
      km = typeof assignmentData.km === "string" ? Number(assignmentData.km) : assignmentData.km || 0

      // Get driving time value
      drivingTime =
        typeof assignmentData.driving_time === "string"
          ? Number(assignmentData.driving_time)
          : assignmentData.driving_time || 0

      console.log(`[DEBUG] Using values from database: ${km} km, ${drivingTime} min`)
    } else {
      // Fallback to assignment values if no database record found (shouldn't happen)
      km = typeof assignment.km === "string" ? Number(assignment.km) || 0 : assignment.km || 0
      drivingTime =
        typeof assignment.driving_time === "string"
          ? Number(assignment.driving_time) || 0
          : assignment.driving_time || 0

      console.log(`[DEBUG] No database record found, using assignment values: ${km} km, ${drivingTime} min`)
    }

    // Step 7: Determine hours value
    let hours = 0

    // If we have real start and completion dates, calculate hours based on those
    if (realStartDate && realCompletionDate) {
      const startTime = new Date(realStartDate).getTime()
      const endTime = new Date(realCompletionDate).getTime()
      const durationInHours = (endTime - startTime) / (1000 * 60 * 60)
      hours = Math.max(1, Math.ceil(durationInHours))
      console.log(`[DEBUG] Calculated ${hours} hours from real timestamps`)
    }
    // If driving time is available, calculate hours based on that
    else if (drivingTime && drivingTime > 0) {
      // Convert driving time (minutes) to hours, with a minimum of 1 hour
      hours = Math.max(1, Math.ceil(drivingTime / 60))
      console.log(`[DEBUG] Calculated hours from driving time: ${hours}`)
    }
    // Otherwise use the provided hours with proper fallbacks
    else {
      // Try to get hours from assignment or assignmentData
      let providedHours = 0

      if (typeof assignment.hours === "string" && assignment.hours.trim() !== "") {
        providedHours = Number(assignment.hours)
      } else if (typeof assignment.hours === "number") {
        providedHours = assignment.hours
      } else if (assignmentData && typeof assignmentData.hours === "string" && assignmentData.hours.trim() !== "") {
        providedHours = Number(assignmentData.hours)
      } else if (assignmentData && typeof assignmentData.hours === "number") {
        providedHours = assignmentData.hours
      }

      // Ensure we have at least 1 hour
      hours = Math.max(1, providedHours)
      console.log(`[DEBUG] Using provided hours with validation: ${hours}`)
    }

    // Add a final validation to ensure hours is a valid number
    if (isNaN(hours) || hours <= 0) {
      hours = 1 // Default to 1 hour if all else fails
      console.log(`[DEBUG] Defaulting to 1 hour due to invalid value`)
    }

    console.log(`[DEBUG] Final hours value to be saved: ${hours}`)

    // Step 8: Update assignment status and dates
    // Use real timestamps if available, otherwise fall back to provided values
    const finalStartDate = realStartDate || assignmentData.start_date
    const finalCompletionDate = realCompletionDate || assignment.completion_date || new Date().toISOString()

    console.log(
      `[DEBUG] Updating assignment with final values: status=Finalizat, hours=${hours}, km=${km}, driving_time=${drivingTime}`,
    )

    await query(
      `UPDATE assignments
     SET status = $1, 
         start_date = $2,
         completion_date = $3, 
         end_location = $4, 
         hours = $5, 
         km = $6,
         driving_time = $7
     WHERE id = $8`,
      [
        "Finalizat", // Always set to "Finalizat"
        finalStartDate,
        finalCompletionDate,
        assignment.end_location || assignmentData.end_location || "Chitila, Romania",
        hours,
        km,
        drivingTime,
        assignment.id,
      ],
    )
    console.log(`[DEBUG] Assignment updated successfully with real timestamps`)

    // Step 9: Create work logs for team lead and members
    // First, ensure we have valid team members
    if (!teamLead) {
      console.error(`[DEBUG] No team lead found for assignment ${assignment.id}`)
    } else {
      // Create work log for team lead
      console.log(`[DEBUG] Creating work log for team lead: ${teamLead}`)

      const teamLeadResult = await query(`SELECT id FROM users WHERE name = $1`, [teamLead])

      if (teamLeadResult.rows && teamLeadResult.rows.length > 0) {
        const teamLeadId = teamLeadResult.rows[0].id

        await query(
          `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [teamLeadId, assignment.id, finalCompletionDate, hours, km, "Finalizare deplasare (team lead)"],
        )
        console.log(`[DEBUG] Work log created for team lead ${teamLead} (ID: ${teamLeadId})`)
      } else {
        console.error(`[DEBUG] Team lead ${teamLead} not found in users table`)
      }
    }

    // Create work logs for team members
    if (members && members.length > 0) {
      for (const member of members) {
        if (!member) continue

        console.log(`[DEBUG] Creating work log for team member: ${member}`)

        const memberResult = await query(`SELECT id FROM users WHERE name = $1`, [member])

        if (memberResult.rows && memberResult.rows.length > 0) {
          const memberId = memberResult.rows[0].id

          await query(
            `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
            [memberId, assignment.id, finalCompletionDate, hours, km, "Finalizare deplasare (team member)"],
          )
          console.log(`[DEBUG] Work log created for team member ${member} (ID: ${memberId})`)
        } else {
          console.error(`[DEBUG] Team member ${member} not found in users table`)
        }
      }
    } else {
      console.log(`[DEBUG] No team members found for assignment ${assignment.id}`)
    }

    // Step 10: Update all team members' statuses to "Liber"
    if (teamLead) {
      // Even if members array is empty, we still need to update the team lead's status
      await updateTeamMemberStatuses(teamLead, members || [], null, "Liber")
      console.log(`[DEBUG] Team member statuses updated to "Liber"`)
    }

    revalidatePath("/assignments")
    console.log(`[DEBUG] Finalization completed successfully with real timestamps`)

    return {
      success: true,
      km,
      drivingTime,
      driving_time: drivingTime, // Return the numeric value, formatting will happen in the UI
      realStartDate: realStartDate ? new Date(realStartDate).toLocaleString() : null,
      realCompletionDate: realCompletionDate ? new Date(realCompletionDate).toLocaleString() : null,
    }
  } catch (error) {
    console.error("[DEBUG] Error finalizing assignment with team:", error)
    return { success: false, error: String(error) }
  }
}

// This function is called when you hit "Start" and is responsible for
// populating the store_points column with the store_id as JSONB
export async function updateAssignmentRoute(assignmentId: number, storeIds: number[]) {
  try {
    const db = neon(process.env.DATABASE_URL!)

    // Convert the array to a JSON string for storage
    const storePointsJson = JSON.stringify(storeIds)

    console.log(`[DEBUG] Updating assignment ${assignmentId} with store points: ${storePointsJson}`)

    // Update the assignment with the new store points and mark it for KM recalculation
    // The ::jsonb type cast ensures the JSON string is properly converted to JSONB
    await db`
     UPDATE assignments 
     SET store_points = ${storePointsJson}::jsonb, 
         route_updated = true,
         km = 0,
         driving_time = 0,
         start_location = ${"Chitila, Romania"},
         end_location = ${"Chitila, Romania"}
     WHERE id = ${assignmentId}
   `

    console.log(`[DEBUG] Successfully updated assignment ${assignmentId} with store points`)

    // Removed the automatic recalculation that was here
    // Now the calculation will only happen when the user clicks the orange button

    return { success: true }
  } catch (error) {
    console.error("Error updating assignment route:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Add the missing manuallyCalculateRoute function
export async function manuallyCalculateRoute(assignmentId: number, storeIds: number[] = []) {
  try {
    console.log(`[DEBUG] Manually calculating route for assignment ${assignmentId} with stores: ${storeIds.join(", ")}`)

    // First update the assignment with the store points
    await updateAssignmentRoute(assignmentId, storeIds)

    // Return a message directing users to the test/assignment-route page
    return {
      success: false,
      error:
        "Route calculation has been moved to the test/assignment-route page. Please use that page to calculate routes.",
    }
  } catch (error) {
    console.error("[DEBUG] Error manually calculating route:", error)
    return { success: false, error: String(error) }
  }
}

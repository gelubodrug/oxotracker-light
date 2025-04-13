"use server"

import { revalidatePath } from "next/cache"
import { query } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function getAssignments(startDate: Date, endDate: Date) {
  try {
    const assignments = await query("SELECT * FROM assignments WHERE start_date >= $1 AND start_date <= $2", [
      startDate,
      endDate,
    ])
    return assignments
  } catch (error) {
    console.error("Error fetching assignments:", error)
    throw error
  }
}

export async function createAssignment(data: any) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  try {
    const result = await query(
      `INSERT INTO assignments (
        type, 
        status, 
        city, 
        county, 
        county_code, 
        start_date, 
        team_lead, 
        members, 
        start_location,
        store_number,
        magazin,
        location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        data.type,
        "In Deplasare",
        data.city,
        data.county,
        data.county_code,
        new Date(),
        session.user.name,
        data.members || [],
        data.start_location,
        data.store_number,
        data.magazin,
        data.location,
      ],
    )

    const assignmentId = result[0].id

    // Add team members to assignment_members table
    if (data.members && data.members.length > 0) {
      for (const memberName of data.members) {
        // Get user ID for the member
        const userResult = await query("SELECT id FROM users WHERE name = $1", [memberName])

        if (userResult && userResult.length > 0) {
          const userId = userResult[0].id

          // Insert into assignment_members
          await query("INSERT INTO assignment_members (assignment_id, user_id) VALUES ($1, $2)", [assignmentId, userId])
        }
      }
    }

    // Also add the team lead as a member if they're not already in the members list
    if (!data.members || !data.members.includes(session.user.name)) {
      // Get user ID for the team lead
      const userResult = await query("SELECT id FROM users WHERE name = $1", [session.user.name])

      if (userResult && userResult.length > 0) {
        const userId = userResult[0].id

        // Insert into assignment_members
        await query("INSERT INTO assignment_members (assignment_id, user_id) VALUES ($1, $2)", [assignmentId, userId])
      }
    }

    revalidatePath("/assignments")
    return { id: assignmentId }
  } catch (error) {
    console.error("Error creating assignment:", error)
    throw error
  }
}

export async function updateAssignment(data: any) {
  try {
    await query(
      `UPDATE assignments 
      SET type = $1, 
          city = $2, 
          county = $3, 
          county_code = $4, 
          team_lead = $5, 
          members = $6,
          store_number = $7,
          magazin = $8,
          location = $9,
          ekm = $10
      WHERE id = $11`,
      [
        data.type,
        data.city,
        data.county,
        data.county_code,
        data.team_lead,
        data.members || [],
        data.store_number,
        data.magazin,
        data.location,
        data.ekm || 0,
        data.id,
      ],
    )
    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error updating assignment:", error)
    throw error
  }
}

export async function deleteAssignment(id: number) {
  try {
    await query("DELETE FROM assignments WHERE id = $1", [id])
    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error deleting assignment:", error)
    throw error
  }
}

// Other actions...

export async function finalizeAssignment(assignmentId: number) {
  console.log("[DEBUG] Finalizing assignment ID:", assignmentId)

  const session = await auth()
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  try {
    // Get the current km and driving_time values from the database
    const result = await query<{ km: number; driving_time: number }>(
      "SELECT km, driving_time FROM assignments WHERE id = $1",
      [assignmentId],
    )

    const km = result[0]?.km || 0
    const drivingTime = result[0]?.driving_time || 0

    // Calculate hours based on driving time (minutes to hours, rounded up)
    const hours = Math.max(1, Math.ceil(drivingTime / 60))

    console.log("[DEBUG] Using values from database:", km, "km,", drivingTime, "min")
    console.log("[DEBUG] Using final values:", km, "km,", drivingTime, "min, and", hours, "hours")

    // Update the assignment status to finalized
    await query(
      `UPDATE assignments
      SET status = $1, 
          completion_date = $2, 
          end_location = $3, 
          hours = $4, 
          km = $5,
          driving_time = $6
      WHERE id = $7`,
      ["finalized", new Date(), "Headquarters", hours, km, drivingTime, assignmentId],
    )

    // Get the user ID first
    const userResult = await query<{ id: number }>("SELECT id FROM users WHERE name = $1", [session.user.name])

    if (!userResult || userResult.length === 0) {
      throw new Error("User not found")
    }

    const userId = userResult[0].id

    // Create work log for the current user with the correct user ID
    await query(
      `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, assignmentId, new Date(), hours, km, "Finalizare deplasare"],
    )

    // Get all team members for this assignment
    const teamMembers = await query<{ user_id: number }>(
      `SELECT user_id FROM assignment_members 
       WHERE assignment_id = $1 AND user_id != $2`,
      [assignmentId, userId],
    )

    console.log("[DEBUG] Found team members:", teamMembers.length)

    // Insert work logs for each team member
    for (const member of teamMembers) {
      await query(
        `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [member.user_id, assignmentId, new Date(), hours, km, "Finalizare deplasare (membru echipă)"],
      )
      console.log("[DEBUG] Created work log for team member:", member.user_id)
    }

    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error finalizing assignment:", error)
    throw error
  }
}

export async function finalizeAssignmentWithTeam(assignment: any) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  try {
    // Update the assignment status
    await query(
      `UPDATE assignments
      SET status = $1, 
          completion_date = $2, 
          end_location = $3, 
          hours = $4, 
          km = $5
      WHERE id = $6`,
      [
        assignment.status,
        assignment.completion_date,
        assignment.end_location,
        assignment.hours,
        assignment.km,
        assignment.id,
      ],
    )

    // Get the user ID
    const userResult = await query<{ id: number }>("SELECT id FROM users WHERE name = $1", [session.user.name])

    if (!userResult || userResult.length === 0) {
      throw new Error("User not found")
    }

    const userId = userResult[0].id

    // Create work log for the current user
    await query(
      `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, assignment.id, new Date(), assignment.hours, assignment.km, "Finalizare deplasare"],
    )

    // Get all team members for this assignment
    const teamMembers = await query<{ user_id: number }>(
      `SELECT user_id FROM assignment_members 
       WHERE assignment_id = $1 AND user_id != $2`,
      [assignment.id, userId],
    )

    // Insert work logs for each team member
    for (const member of teamMembers) {
      await query(
        `INSERT INTO work_logs (user_id, assignment_id, work_date, hours, kilometers, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          member.user_id,
          assignment.id,
          new Date(),
          assignment.hours,
          assignment.km,
          "Finalizare deplasare (membru echipă)",
        ],
      )
    }

    revalidatePath("/assignments")
    return { success: true }
  } catch (error) {
    console.error("Error finalizing assignment with team:", error)
    throw error
  }
}

export async function recalculateDistance(assignmentId: number, city: string, county: string) {
  try {
    // Call the route calculation API
    const response = await fetch(
      `/api/calculate-route?city=${encodeURIComponent(city)}&county=${encodeURIComponent(county)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Failed to calculate distance",
      }
    }

    const data = await response.json()

    // Update the assignment with the calculated distance
    await query(
      `UPDATE assignments
       SET km = $1, driving_time = $2
       WHERE id = $3`,
      [data.distance, data.duration, assignmentId],
    )

    return {
      success: true,
      km: data.distance,
      driving_time: data.duration,
    }
  } catch (error) {
    console.error("Error recalculating distance:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

export async function updateAssignmentRoute(assignmentId: number, storeIds: string[]) {
  try {
    // Update the assignment with the new store points
    await query(
      `UPDATE assignments
       SET store_points = $1, route_updated = true, km = 0
       WHERE id = $2`,
      [JSON.stringify(storeIds), assignmentId],
    )

    return { success: true }
  } catch (error) {
    console.error("Error updating assignment route:", error)
    throw error
  }
}

export async function updateAssignmentKilometers(assignmentId: number, kilometers: number, drivingTime: number) {
  try {
    // Update the assignment with the calculated kilometers
    await query(
      `UPDATE assignments
       SET km = $1, driving_time = $2, route_updated = false
       WHERE id = $3`,
      [kilometers, drivingTime, assignmentId],
    )

    return { success: true }
  } catch (error) {
    console.error("Error updating assignment kilometers:", error)
    throw error
  }
}

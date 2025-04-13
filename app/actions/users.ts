"use server"

import { sql } from "@vercel/postgres"
import { startOfMonth, endOfMonth, format } from "date-fns"

export type User = {
  id: number
  name: string
  email: string
  role: string
  status?: string
  total_hours?: number
  assignment_count?: number
  store_count?: number
  profile_photo?: string
  last_completion_date?: string
  current_assignment_start?: string
  liber_hours?: number
  in_deplasare_hours?: number
}

// Update the getUsers function to properly calculate hours based on timestamps
export async function getUsers() {
  try {
    // Get current month date range
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)
    const startDateStr = format(startDate, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")

    // Modified query to calculate hours based on timestamps with proper casting
    const { rows } = await sql`
   WITH user_assignments AS (
     SELECT 
       u.id as user_id,
       a.id as assignment_id,
       a.status,
       CASE 
         WHEN a.completion_date IS NOT NULL AND a.start_date IS NOT NULL THEN
           EXTRACT(EPOCH FROM (
             CAST(a.completion_date AS timestamp) - CAST(a.start_date AS timestamp)
           )) / 3600
         ELSE a.hours
       END as calculated_hours,
       a.start_date,
       a.completion_date
     FROM 
       users u
     LEFT JOIN 
       assignments a ON (
         (a.team_lead = u.name OR 
         (a.members::jsonb @> to_jsonb(u.name::text) OR 
          a.members::text LIKE '%' || u.name || '%'))
         AND a.start_date >= ${startDateStr}
         AND a.start_date <= ${endDateStr}
       )
   )
   
   SELECT 
     u.id, 
     u.name, 
     u.email, 
     u.role, 
     u.status,
     u.profile_photo,
     COALESCE(SUM(ua.calculated_hours), 0) as total_hours,
     COUNT(DISTINCT ua.assignment_id) as assignment_count,
     COUNT(DISTINCT a.store_number) as store_count,
     MAX(a.completion_date) as last_completion_date,
     (SELECT MIN(start_date) FROM assignments 
      WHERE (team_lead = u.name OR 
             (members::jsonb @> to_jsonb(u.name::text) OR 
              members::text LIKE '%' || u.name || '%'))
      AND status = 'In Deplasare') as current_assignment_start,
     COALESCE(SUM(CASE WHEN a.status = 'Finalizat' THEN ua.calculated_hours ELSE 0 END), 0) as liber_hours,
     COALESCE(SUM(CASE WHEN a.status = 'In Deplasare' THEN 
       CASE 
         WHEN a.start_date IS NOT NULL THEN
           EXTRACT(EPOCH FROM (
             CURRENT_TIMESTAMP - CAST(a.start_date AS timestamp)
           )) / 3600
         ELSE 0
       END
     ELSE 0 END), 0) as in_deplasare_hours
   FROM 
     users u
   LEFT JOIN 
     user_assignments ua ON u.id = ua.user_id
   LEFT JOIN
     assignments a ON ua.assignment_id = a.id
   GROUP BY 
     u.id, u.name, u.email, u.role, u.status, u.profile_photo
   ORDER BY 
     total_hours DESC
 `
    return rows
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

export async function getAvailableUsers() {
  try {
    const { rows } = await sql<User>`
    SELECT * FROM users 
    WHERE status = 'Liber' OR status IS NULL
    ORDER BY name ASC
  `
    return rows
  } catch (error) {
    console.error("Error fetching available users:", error)
    return []
  }
}

export async function checkUserAvailability(userName: string) {
  try {
    const { rows } = await sql`
    SELECT status FROM users 
    WHERE name = ${userName}
  `

    if (rows.length === 0) {
      return true // If user not found, assume available
    }

    return rows[0].status !== "In Deplasare"
  } catch (error) {
    console.error("Error checking user availability:", error)
    return true // In case of error, allow the operation to proceed
  }
}

export async function updateUserStatus(userId: number, status: string, assignmentId: number | null = null) {
  try {
    // Convert assignmentId to string since current_assignment is VARCHAR
    const assignmentIdStr = assignmentId ? assignmentId.toString() : null

    await sql`
   UPDATE users 
   SET status = ${status}, 
       current_assignment = ${assignmentIdStr}
   WHERE id = ${userId}
 `
    return true
  } catch (error) {
    console.error("Error updating user status:", error)
    return false
  }
}

"use server"

import { sql } from "@vercel/postgres"
import { formatDateForSQL } from "@/lib/utils"

export async function getWorkTypeDetails(type: string, startDate: Date, endDate: Date) {
  try {
    const formattedStartDate = formatDateForSQL(startDate)
    const formattedEndDate = formatDateForSQL(endDate)

    const result = await sql`
      WITH assignment_stores AS (
        SELECT 
          id,
          CASE 
            WHEN store_points IS NULL OR store_points = '[]' THEN 0
            WHEN JSONB_TYPEOF(store_points::JSONB) = 'array' THEN JSONB_ARRAY_LENGTH(store_points::JSONB)
            ELSE 1
          END as store_count
        FROM assignments
      )
      SELECT 
        a.id,
        a.title,
        a.location,
        a.created_at as date,
        SUM(wl.hours) as total_hours,
        ast.store_count
      FROM assignments a
      JOIN work_logs wl ON a.id = wl.assignment_id
      JOIN assignment_stores ast ON a.id = ast.id
      WHERE 
        a.type = ${type}
        AND wl.work_date >= ${formattedStartDate.replace(/'/g, "")} 
        AND wl.work_date <= ${formattedEndDate.replace(/'/g, "")}
      GROUP BY 
        a.id, a.title, a.location, a.created_at, ast.store_count
      ORDER BY 
        a.created_at DESC
    `

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      date: row.date,
      hours: Number(row.total_hours),
      stores: Number(row.store_count),
    }))
  } catch (error) {
    console.error(`Error fetching ${type} details:`, error)
    return []
  }
}

export async function getDailyHoursByType(type: string, startDate: Date, endDate: Date) {
  try {
    const formattedStartDate = formatDateForSQL(startDate)
    const formattedEndDate = formatDateForSQL(endDate)

    const result = await sql`
      SELECT 
        DATE(wl.work_date) as date,
        SUM(wl.hours) as hours
      FROM 
        work_logs wl
      JOIN
        assignments a ON wl.assignment_id = a.id
      WHERE 
        a.type = ${type}
        AND wl.work_date >= ${formattedStartDate.replace(/'/g, "")} 
        AND wl.work_date <= ${formattedEndDate.replace(/'/g, "")}
      GROUP BY 
        DATE(wl.work_date)
      ORDER BY 
        date
    `

    return result.map((row) => ({
      date: row.date,
      hours: Number(row.hours),
    }))
  } catch (error) {
    console.error(`Error fetching daily hours for ${type}:`, error)
    return []
  }
}

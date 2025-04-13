"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

// Define the type for our data
export type Assignment = {
  id: string
  type: string
  location: string
  teamLead: string
  members: string
  startDate: string
  completionDate: string
  status: string
  hours: number
  km: number
  storeNumber: string
}

// Helper function to format date strings
const formatDateString = (dateStr: string) => {
  if (!dateStr) return "-"
  try {
    // Check if the date is in ISO format or another format
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr
    }
    return format(date, "dd MMM yyyy")
  } catch (error) {
    return dateStr
  }
}

// Define the columns for the data table
export const columns: ColumnDef<Assignment>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "storeNumber",
    header: "Store",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "teamLead",
    header: "Team Lead",
  },
  {
    accessorKey: "members",
    header: "Members",
    cell: ({ row }) => {
      const members = row.getValue("members") as string
      if (!members) return "-"

      // If there are many members, truncate the display
      if (members.length > 50) {
        return <span title={members}>{members.substring(0, 50)}...</span>
      }
      return members
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      return formatDateString(row.getValue("startDate"))
    },
  },
  {
    accessorKey: "completionDate",
    header: "Completion Date",
    cell: ({ row }) => {
      return formatDateString(row.getValue("completionDate"))
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string

      // Define badge colors based on status
      let badgeVariant = "default"
      if (status === "Finalizat") badgeVariant = "success"
      if (status === "În progres") badgeVariant = "warning"
      if (status === "Anulat") badgeVariant = "destructive"

      return <Badge variant={badgeVariant as any}>{status}</Badge>
    },
  },
  {
    accessorKey: "hours",
    header: "Hours",
    cell: ({ row }) => {
      const hours = row.getValue("hours") as number
      return hours.toString()
    },
  },
  {
    accessorKey: "km",
    header: "KM",
    cell: ({ row }) => {
      const km = row.getValue("km") as number
      return km.toString()
    },
  },
]

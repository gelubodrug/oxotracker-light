import { notFound } from "next/navigation"
import { format } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"
import { getAssignmentsByTypeAndDateRange } from "@/app/actions/work-logs"

// Loading component for Suspense
function LoadingTable() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
      <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
      <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
      <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
      <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
    </div>
  )
}

export default async function TypeDashboardPage({ params }: { params: { type: string } }) {
  const { type } = params
  const decodedType = decodeURIComponent(type)

  // Validate the type parameter
  const validTypes = ["Interventie", "Optimizare", "Deschidere"]
  if (!validTypes.includes(decodedType)) {
    notFound()
  }

  // Get current month's start and end dates
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Fetch assignments for this type
  const assignments = await getAssignmentsByTypeAndDateRange(decodedType, startDate, endDate)

  // Format the data for the table
  const formattedAssignments = assignments.map((assignment) => {
    // Parse members from JSONB if it's a string
    let members = []
    try {
      if (typeof assignment.members === "string") {
        members = JSON.parse(assignment.members)
      } else if (Array.isArray(assignment.members)) {
        members = assignment.members
      }
    } catch (error) {
      console.error("Error parsing members:", error)
    }

    return {
      id: assignment.id,
      type: assignment.type,
      location: assignment.location || "",
      teamLead: assignment.team_lead || "",
      members: Array.isArray(members) ? members.join(", ") : "",
      startDate: assignment.start_date || "",
      completionDate: assignment.completion_date || "",
      status: assignment.status || "",
      hours: assignment.hours || 0,
      km: assignment.km || 0,
      storeNumber: assignment.store_number || "",
    }
  })

  return (
    <AppShell>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">{decodedType} Dashboard</h1>
        <p className="text-muted-foreground mb-8">Showing assignments for {format(startDate, "MMMM yyyy")}</p>
        <div>{formattedAssignments.length}</div>
      </div>
    </AppShell>
  )
}

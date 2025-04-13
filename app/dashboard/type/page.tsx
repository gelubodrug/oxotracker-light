"use client"

import React, { Suspense, useState } from "react"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"
import { getAssignmentsByTypeAndDateRange } from "@/app/actions/work-logs"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, MapPinIcon, UserIcon, UsersIcon, ClockIcon, CarIcon, StoreIcon, Loader2 } from "lucide-react"
import { query } from "@/lib/db"
import { useRouter, useSearchParams } from "next/navigation"

// Month selector component
function MonthSelector({ currentMonth, type }: { currentMonth: string; type: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Generate last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    }
  })

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsLoading(true)
    const month = e.target.value

    // Create new URL with updated parameters
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", month)
    params.set("type", type)

    // Navigate to the new URL
    router.push(`/dashboard/type?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        name="month"
        defaultValue={currentMonth}
        className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        onChange={handleMonthChange}
        disabled={isLoading}
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  )
}

// Loading skeleton for the page
function PageSkeleton() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      <Skeleton className="h-6 w-full max-w-md mb-8" />

      <div className="space-y-8 mt-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex">
            <div className="flex flex-col items-center mr-4">
              <div className="rounded-full bg-muted w-10 h-10"></div>
              <div className="h-full w-0.5 bg-muted mt-2"></div>
            </div>
            <div className="flex-1">
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading component for Suspense
function LoadingTimeline() {
  return (
    <div className="space-y-8 mt-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex">
          <div className="flex flex-col items-center mr-4">
            <div className="rounded-full bg-muted w-10 h-10"></div>
            <div className="h-full w-0.5 bg-muted mt-2"></div>
          </div>
          <div className="flex-1">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full max-w-[250px]" />
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-4 w-full max-w-[220px]" />
                  <Skeleton className="h-4 w-full max-w-[180px]" />
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  )
}

// Function to get store details from store IDs
async function getStoreDetails(storeIds: string[]) {
  if (!storeIds || storeIds.length === 0) return []

  try {
    // Convert string IDs to integers where possible
    const numericStoreIds = storeIds
      .map((id) => {
        // Try to parse as integer
        const numId = Number.parseInt(id, 10)
        // Return the numeric value if valid, otherwise null
        return !isNaN(numId) ? numId : null
      })
      .filter((id) => id !== null) // Filter out any null values

    if (numericStoreIds.length === 0) return []

    const result = await query(
      `
      SELECT 
        store_id,
        description,
        city,
        county,
        address
      FROM stores
      WHERE store_id = ANY($1::int[])
    `,
      [numericStoreIds],
    )

    return result.rows
  } catch (error) {
    console.error("Error fetching store details:", error)
    return []
  }
}

export default function TypeDashboardPage({ searchParams }: { searchParams: { type?: string; month?: string } }) {
  const [isLoading, setIsLoading] = useState(true)
  const [assignments, setAssignments] = useState<any[]>([])
  const [storeDetails, setStoreDetails] = useState<any[]>([])
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(),
    endDate: new Date(),
  })
  const [isValidType, setIsValidType] = useState(true)

  const type = searchParams.type || "Interventie"
  const monthParam = searchParams.month

  // Validate the type parameter
  const validTypes = ["Interventie", "Optimizare", "Deschidere"]

  React.useEffect(() => {
    setIsValidType(validTypes.includes(type))
  }, [type])

  // Effect to load data when parameters change
  React.useEffect(() => {
    if (!isValidType) return

    async function loadData() {
      setIsLoading(true)

      try {
        // Get date range based on month parameter or use current month
        const now = new Date()
        let startDate: Date
        let endDate: Date

        if (monthParam) {
          try {
            // Parse month parameter (format: "YYYY-MM")
            const [year, month] = monthParam.split("-").map((num) => Number.parseInt(num, 10))
            if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
              // Create date for first day of month
              startDate = new Date(year, month - 1, 1) // Month is 0-indexed in JS Date
              // Create date for last day of month
              endDate = new Date(year, month, 0) // Last day of the month

              // Set time to beginning and end of day
              startDate.setHours(0, 0, 0, 0)
              endDate.setHours(23, 59, 59, 999)

              console.log(`Using date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
            } else {
              console.log("Invalid month format, using current month")
              startDate = startOfMonth(now)
              endDate = endOfMonth(now)
            }
          } catch (error) {
            console.error("Error parsing month parameter:", error)
            startDate = startOfMonth(now)
            endDate = endOfMonth(now)
          }
        } else {
          // Default to current month
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
        }

        setDateRange({ startDate, endDate })

        // Fetch assignments for this type
        const assignmentsData = await getAssignmentsByTypeAndDateRange(type, startDate, endDate)
        setAssignments(assignmentsData)

        // Process assignments to extract store IDs from store_points
        const allStoreIds: string[] = []

        assignmentsData.forEach((assignment) => {
          // Add the main store number if it exists
          if (assignment.store_number) {
            allStoreIds.push(assignment.store_number)
          }

          // Extract store IDs from store_points JSONB field
          if (assignment.store_points) {
            try {
              let storePoints
              if (typeof assignment.store_points === "string") {
                storePoints = JSON.parse(assignment.store_points)
              } else {
                storePoints = assignment.store_points
              }

              if (Array.isArray(storePoints)) {
                storePoints.forEach((storeId) => {
                  if (storeId && !allStoreIds.includes(storeId.toString())) {
                    allStoreIds.push(storeId.toString())
                  }
                })
              }
            } catch (error) {
              console.error("Error parsing store_points:", error)
            }
          }
        })

        // Fetch store details for all store IDs
        const storeDetailsData = await getStoreDetails(allStoreIds)
        setStoreDetails(storeDetailsData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [type, monthParam, isValidType])

  // Create a map of store IDs to store details for easy lookup
  const storeMap = new Map()
  storeDetails.forEach((store) => {
    storeMap.set(store.store_id.toString(), store)
  })

  // Get color based on type
  const getColorForType = (type: string): string => {
    switch (type) {
      case "Interventie":
        return "bg-blue-500 text-white"
      case "Optimizare":
        return "bg-orange-500 text-white"
      case "Deschidere":
        return "bg-green-500 text-white"
      default:
        return "bg-purple-500 text-white"
    }
  }

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Finalizat":
        return "bg-green-100 text-green-800"
      case "În progres":
        return "bg-yellow-100 text-yellow-800"
      case "Anulat":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Format date string
  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      const date = parseISO(dateStr)
      if (isNaN(date.getTime())) {
        return dateStr
      }
      return format(date, "dd MMM yyyy")
    } catch (error) {
      return dateStr
    }
  }

  // Get store details for display
  const getStoreInfo = (storeId: string) => {
    const store = storeMap.get(storeId.toString())
    if (!store) return { description: `Store ${storeId}`, location: "" }

    return {
      description: store.description || `Store ${storeId}`,
      location: [store.city, store.county].filter(Boolean).join(", "),
    }
  }

  if (!isValidType) {
    return (
      <AppShell>
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Invalid Type</h1>
          <p className="text-muted-foreground mb-8">Please select a valid assignment type.</p>
        </div>
      </AppShell>
    )
  }

  // If loading, show skeleton
  if (isLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    )
  }

  // For Deschidere type, group assignments by store
  if (type === "Deschidere") {
    // Group assignments by store_number
    const assignmentsByStore: Record<string, any[]> = {}

    assignments.forEach((assignment) => {
      const storeKey = assignment.store_number || "unknown"
      if (!assignmentsByStore[storeKey]) {
        assignmentsByStore[storeKey] = []
      }
      assignmentsByStore[storeKey].push(assignment)
    })

    // Sort stores by their ID
    const sortedStoreKeys = Object.keys(assignmentsByStore).sort((a, b) => {
      // Try to parse as numbers for numeric comparison
      const numA = Number.parseInt(a, 10)
      const numB = Number.parseInt(b, 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      // Fall back to string comparison
      return a.localeCompare(b)
    })

    return (
      <AppShell>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">{type} Assignments</h1>
            <div className="flex items-center gap-4">
              <MonthSelector currentMonth={format(dateRange.startDate, "yyyy-MM")} type={type} />
              <Badge className={getColorForType(type)}>{assignments.length} assignments</Badge>
            </div>
          </div>

          <p className="text-muted-foreground mb-8">
            Showing {type.toLowerCase()} assignments for {format(dateRange.startDate, "MMMM yyyy")}
          </p>

          <Suspense fallback={<LoadingTimeline />}>
            <div className="space-y-12 mt-8">
              {sortedStoreKeys.length > 0 ? (
                sortedStoreKeys.map((storeId) => {
                  const storeAssignments = assignmentsByStore[storeId]
                  const storeInfo = getStoreInfo(storeId)

                  return (
                    <div key={storeId} className="border rounded-lg overflow-hidden">
                      <div className={`${getColorForType(type)} p-4`}>
                        <h2 className="text-xl font-bold text-white flex items-center">
                          <StoreIcon className="mr-2 h-5 w-5" />
                          {storeInfo.description}
                        </h2>
                        {storeInfo.location && <p className="text-white/80 text-sm">{storeInfo.location}</p>}
                      </div>

                      <div className="p-4">
                        <div className="text-sm text-muted-foreground mb-4">
                          {storeAssignments.length} assignment{storeAssignments.length !== 1 ? "s" : ""} for this store
                        </div>

                        <div className="space-y-6">
                          {storeAssignments.map((assignment, index) => {
                            // Parse members from JSONB if it's a string
                            let members: string[] = []
                            try {
                              if (typeof assignment.members === "string") {
                                members = JSON.parse(assignment.members)
                              } else if (Array.isArray(assignment.members)) {
                                members = assignment.members
                              }
                            } catch (error) {
                              console.error("Error parsing members:", error)
                            }

                            return (
                              <div key={assignment.id} className="flex">
                                {/* Timeline dot and line */}
                                <div className="flex flex-col items-center mr-4">
                                  <div className={`rounded-full bg-gray-200 w-8 h-8 flex items-center justify-center`}>
                                    {index + 1}
                                  </div>
                                  {index < storeAssignments.length - 1 && (
                                    <div className="h-full w-0.5 bg-gray-200 mt-2"></div>
                                  )}
                                </div>

                                {/* Assignment card */}
                                <div className="flex-1 mb-4">
                                  <Card className="overflow-hidden">
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <h3 className="font-medium">
                                            Assignment on {formatDateString(assignment.start_date)}
                                          </h3>
                                        </div>
                                        <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                                      </div>

                                      <div className="space-y-2 text-sm">
                                        {assignment.completion_date && (
                                          <div className="flex items-center">
                                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Completed: {formatDateString(assignment.completion_date)}</span>
                                          </div>
                                        )}

                                        <div className="flex items-center">
                                          <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                          <span>Lead: {assignment.team_lead || "Not assigned"}</span>
                                        </div>

                                        {members.length > 0 && (
                                          <div className="flex items-center">
                                            <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span className="truncate" title={members.join(", ")}>
                                              Team: {members.slice(0, 2).join(", ")}
                                              {members.length > 2 ? ` +${members.length - 2} more` : ""}
                                            </span>
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                                          <div className="flex items-center">
                                            <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>{assignment.hours}h</span>
                                          </div>

                                          <div className="flex items-center">
                                            <CarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>{assignment.km}km</span>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-lg">
                  <p className="text-muted-foreground">No {type.toLowerCase()} assignments found for this period.</p>
                </div>
              )}
            </div>
          </Suspense>
        </div>
      </AppShell>
    )
  }

  // For other types, use the original timeline view
  return (
    <AppShell>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{type} Assignments</h1>
          <div className="flex items-center gap-4">
            <MonthSelector currentMonth={format(dateRange.startDate, "yyyy-MM")} type={type} />
            <Badge className={getColorForType(type)}>{assignments.length} assignments</Badge>
          </div>
        </div>

        <p className="text-muted-foreground mb-8">
          Showing {type.toLowerCase()} assignments for {format(dateRange.startDate, "MMMM yyyy")}
        </p>

        <Suspense fallback={<LoadingTimeline />}>
          <div className="space-y-8 mt-8">
            {assignments.length > 0 ? (
              assignments.map((assignment, index) => {
                // Parse members from JSONB if it's a string
                let members: string[] = []
                try {
                  if (typeof assignment.members === "string") {
                    members = JSON.parse(assignment.members)
                  } else if (Array.isArray(assignment.members)) {
                    members = assignment.members
                  }
                } catch (error) {
                  console.error("Error parsing members:", error)
                }

                // Parse store_points from JSONB if it's a string
                let storePoints: string[] = []
                try {
                  if (assignment.store_points) {
                    if (typeof assignment.store_points === "string") {
                      storePoints = JSON.parse(assignment.store_points)
                    } else if (Array.isArray(assignment.store_points)) {
                      storePoints = assignment.store_points.map((id) => id.toString())
                    }
                  }
                } catch (error) {
                  console.error("Error parsing store_points:", error)
                }

                // Get main store info
                const mainStoreInfo = assignment.store_number
                  ? getStoreInfo(assignment.store_number)
                  : { description: "No store assigned", location: "" }

                return (
                  <div key={assignment.id} className="flex">
                    {/* Timeline dot and line */}
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`rounded-full ${getColorForType(assignment.type)} w-10 h-10 flex items-center justify-center`}
                      >
                        {index + 1}
                      </div>
                      {index < assignments.length - 1 && <div className="h-full w-0.5 bg-gray-200 mt-2"></div>}
                    </div>

                    {/* Assignment card */}
                    <div className="flex-1 mb-8">
                      <Card className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{mainStoreInfo.description}</h3>
                              <p className="text-sm text-muted-foreground">
                                {mainStoreInfo.location || assignment.location}
                              </p>
                            </div>
                            <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Start: {formatDateString(assignment.start_date)}</span>
                            </div>

                            {assignment.completion_date && (
                              <div className="flex items-center text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Completed: {formatDateString(assignment.completion_date)}</span>
                              </div>
                            )}

                            <div className="flex items-center text-sm">
                              <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>
                                {assignment.county || ""} {assignment.city ? `- ${assignment.city}` : ""}
                              </span>
                            </div>

                            <div className="flex items-center text-sm">
                              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Lead: {assignment.team_lead || "Not assigned"}</span>
                            </div>

                            {members.length > 0 && (
                              <div className="flex items-center text-sm">
                                <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="truncate" title={members.join(", ")}>
                                  Team: {members.slice(0, 2).join(", ")}
                                  {members.length > 2 ? ` +${members.length - 2} more` : ""}
                                </span>
                              </div>
                            )}

                            {/* Additional stores from store_points */}
                            {storePoints.length > 0 && (
                              <div className="mt-4 border-t pt-3">
                                <h4 className="text-sm font-medium mb-2">Additional Stores:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {storePoints.map((storeId) => {
                                    const storeInfo = getStoreInfo(storeId)
                                    return (
                                      <div key={storeId} className="flex items-center text-sm">
                                        <StoreIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <div>{storeInfo.description}</div>
                                          {storeInfo.location && (
                                            <div className="text-xs text-muted-foreground">{storeInfo.location}</div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center text-sm">
                                <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{assignment.hours}h</span>
                              </div>

                              <div className="flex items-center text-sm">
                                <CarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{assignment.km}km</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">No {type.toLowerCase()} assignments found for this period.</p>
              </div>
            )}
          </div>
        </Suspense>
      </div>
    </AppShell>
  )
}

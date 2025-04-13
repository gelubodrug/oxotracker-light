"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConfirmFinalizeDialog } from "@/components/confirm-finalize-dialog"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO, differenceInHours, differenceInMinutes } from "date-fns"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Route,
  Search,
  Trash2,
  User,
  Users,
  Car,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  deleteAssignment,
  finalizeAssignmentWithTeam,
  recalculateDistance,
  updateAssignmentRoute,
} from "@/app/actions/assignments"
import { useUser } from "@/context/UserContext"
import { cn } from "@/lib/utils"
import { AssignmentKmCell } from "@/components/assignment-km-cell"
import { RoutePointsDisplay } from "@/components/route-points-display"

// License Plate component
const LicensePlate = ({ plate }: { plate: string }) => {
  if (!plate || plate === "NA") {
    return (
      <div className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
        NA
      </div>
    )
  }

  return (
    <div className="inline-flex items-center justify-center px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-200 relative overflow-hidden">
      <div className="flex items-center">
        <div className="bg-blue-500 h-full w-1 absolute left-0 top-0"></div>
        <span className="ml-1.5">{plate}</span>
      </div>
    </div>
  )
}

export default function AssignmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [assignments, setAssignments] = useState([])
  const [filteredAssignments, setFilteredAssignments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [typeFilter, setTypeFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const [isFloatingVisible, setIsFloatingVisible] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [recalculationResult, setRecalculationResult] = useState(null)
  const [realStartDate, setRealStartDate] = useState(null)
  const [realCompletionDate, setRealCompletionDate] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Check if we should switch to the completed tab
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "completed") {
      setActiveTab("completed")
    }
    // We no longer set to "active" here, because default is already "active"
  }, []) // 👈 Only run once on mount

  // Handle tab change with proper URL updates
  const handleTabChange = (value) => {
    setActiveTab(value)
    // Update URL without adding to history stack
    const newUrl = new URL(window.location.href)
    if (value === "completed") {
      newUrl.searchParams.set("tab", "completed")
    } else {
      newUrl.searchParams.delete("tab")
    }
    router.replace(newUrl.pathname + newUrl.search, { scroll: false })
  }

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Fetch assignments on component mount
  useEffect(() => {
    fetchAssignments()
  }, [activeTab])

  // Add scroll listener for floating button
  useEffect(() => {
    const handleScroll = () => {
      const st = window.pageYOffset || document.documentElement.scrollTop
      if (st > 100) {
        setIsFloatingVisible(true)
      } else {
        setIsFloatingVisible(false)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Apply filters when assignments, filters, or search term change
  useEffect(() => {
    applyFilters()
  }, [assignments, typeFilter, searchTerm, activeTab])

  // Also modify the fetchAssignments function to log the response
  const fetchAssignments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("Fetching assignments for tab:", activeTab)
      const response = await fetch("/api/assignments", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Error fetching assignments: ${response.status}`)
      }
      const data = await response.json()
      console.log("Fetched assignments:", data.length, "assignments")
      console.log("Sample assignment:", data[0])
      setAssignments(data)
    } catch (err) {
      console.error("Error fetching assignments:", err)
      setError("Failed to load assignments. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add console logs to debug the filtering process
  const applyFilters = () => {
    let filtered = [...assignments]

    console.log("Filtering assignments:", assignments.length, "total assignments")
    console.log("Active tab:", activeTab)

    // Filter by active/completed tab
    if (activeTab === "active") {
      filtered = filtered.filter((a) => a.status !== "Finalizat")
      console.log("After active filter:", filtered.length, "assignments")
    } else if (activeTab === "completed") {
      console.log(
        "Status values in data:",
        assignments.map((a) => a.status),
      )
      filtered = filtered.filter((a) => a.status === "Finalizat")
      console.log("After completed filter:", filtered.length, "assignments")
    }

    // Apply type filter if not "All"
    if (typeFilter !== "All") {
      filtered = filtered.filter((a) => a.type === typeFilter)
    }

    // Apply search term if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((a) => {
        // Check basic fields
        if (
          a.location?.toLowerCase().includes(term) ||
          a.team_lead?.toLowerCase().includes(term) ||
          a.type?.toLowerCase().includes(term) ||
          a.store_number?.toString().includes(term) ||
          a.id?.toString().includes(term)
        ) {
          return true
        }

        // Check team members
        let members = []
        try {
          if (typeof a.members === "string") {
            members = JSON.parse(a.members)
          } else if (Array.isArray(a.members)) {
            members = a.members
          }

          // Check if any team member matches the search term
          if (members.some((member) => member.toLowerCase().includes(term))) {
            return true
          }
        } catch (e) {
          console.error("Error parsing members:", e)
        }

        return false
      })
    }

    // Sort by start_date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date) : new Date(0)
      const dateB = b.start_date ? new Date(b.start_date) : new Date(0)
      return dateB - dateA
    })

    setFilteredAssignments(filtered)
  }

  const handleDeleteAssignment = async () => {
    if (!selectedAssignmentId) return

    setIsSubmitting(true)
    try {
      const result = await deleteAssignment(selectedAssignmentId)
      if (result.success) {
        toast({
          title: "Success",
          description: "Assignment deleted successfully",
        })
        // Remove the deleted assignment from the state
        setAssignments((prev) => prev.filter((a) => a.id !== selectedAssignmentId))
      } else {
        throw new Error(result.error || "Failed to delete assignment")
      }
    } catch (error) {
      console.error("Error deleting assignment:", error)
      toast({
        title: "Error",
        description: `Failed to delete assignment: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
      setSelectedAssignmentId(null)
    }
  }

  const handleFinalizeAssignment = async () => {
    if (!selectedAssignmentId) return

    setIsSubmitting(true)
    try {
      // Find the assignment to finalize
      const assignment = assignments.find((a) => a.id === selectedAssignmentId)
      if (!assignment) {
        throw new Error("Assignment not found")
      }

      console.log("Finalizing assignment:", assignment.id)

      // Call the server action to finalize the assignment
      const result = await finalizeAssignmentWithTeam(assignment)

      console.log("Finalization result:", result)

      if (result.success) {
        // Update the assignment in the local state
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === selectedAssignmentId
              ? {
                  ...a,
                  status: "Finalizat",
                  completion_date: new Date().toISOString(),
                  km: result.km || a.km,
                  driving_time: result.driving_time || a.driving_time,
                }
              : a,
          ),
        )

        // Set real timestamps if available
        setRealStartDate(result.realStartDate)
        setRealCompletionDate(result.realCompletionDate)

        toast({
          title: "Success",
          description: "Assignment finalized successfully",
        })

        // Close dialog and redirect to completed tab
        setIsFinalizeDialogOpen(false)
        setActiveTab("completed")
        // Use replace instead of push to avoid navigation history issues
        router.replace("/assignments?tab=completed", { scroll: false })
      } else {
        throw new Error(result.error || "Failed to finalize assignment")
      }
    } catch (error) {
      console.error("Error finalizing assignment:", error)
      toast({
        title: "Error",
        description: `Failed to finalize assignment: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecalculateDistance = async (assignmentId) => {
    if (!assignmentId) return

    setIsRecalculating(true)
    setRecalculationResult(null)
    try {
      // Find the assignment to recalculate
      const assignment = assignments.find((a) => a.id === selectedAssignmentId)
      if (!assignment) {
        throw new Error("Assignment not found")
      }

      // Get the city and county from the assignment
      const city = assignment.city
      const county = assignment.county

      if (!city || !county) {
        throw new Error("Assignment is missing city or county information")
      }

      // Call the server action to recalculate the distance
      const result = await recalculateDistance(assignmentId, city, county)

      if (result.success) {
        // Update the assignment in the local state
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  km: result.km,
                  driving_time: result.driving_time,
                }
              : a,
          ),
        )

        setRecalculationResult({
          success: true,
          km: result.km,
          driving_time: result.driving_time,
        })

        toast({
          title: "Success",
          description: `Distance recalculated: ${result.km} km (${result.driving_time} min)`,
        })
      } else {
        // If we get a specific error about using the test/assignment-route page
        if (result.error && result.error.includes("test/assignment-route")) {
          setRecalculationResult({
            success: false,
            error: result.error,
            useTestPage: true,
          })
        } else {
          throw new Error(result.error || "Failed to recalculate distance")
        }
      }
    } catch (error) {
      console.error("Error recalculating distance:", error)
      setRecalculationResult({
        success: false,
        error: error.message,
      })
      toast({
        title: "Error",
        description: `Failed to recalculate distance: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  // Add a new function to handle route changes
  const handleRouteChange = async (storeIds: number[], assignmentId: number) => {
    try {
      // Call the server action to update the route
      const result = await updateAssignmentRoute(assignmentId, storeIds)

      if (result.success) {
        // Update the assignment in the local state to reset km and driving_time
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  store_points: storeIds,
                  km: 0,
                  driving_time: 0,
                  route_updated: true,
                }
              : a,
          ),
        )

        toast({
          title: "Route Updated",
          description: "Route points updated. Distance needs to be recalculated.",
          variant: "warning",
        })
      } else {
        throw new Error(result.error || "Failed to update route")
      }
    } catch (error) {
      console.error("Error updating route:", error)
      toast({
        title: "Error",
        description: `Failed to update route: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-"
    try {
      return format(parseISO(dateString), "dd MMM yyyy")
    } catch (e) {
      return dateString
    }
  }

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "-"
    try {
      return format(parseISO(dateString), "h:mma, d MMM")
    } catch (e) {
      return dateString
    }
  }

  // Calculate duration from start_date until now
  const calculateDuration = (startDateString) => {
    if (!startDateString) return "Not set"

    try {
      const startDate = parseISO(startDateString)
      const now = currentTime

      const hours = differenceInHours(now, startDate)
      const minutes = differenceInMinutes(now, startDate) % 60

      if (hours === 0) {
        return `${minutes}m`
      } else {
        return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
      }
    } catch (e) {
      return "Invalid date"
    }
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Finalizat":
        return "bg-green-100 text-green-800 border-green-200"
      case "In Deplasare":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Anulat":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get type badge color
  const getTypeColor = (type) => {
    switch (type) {
      case "Interventie":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Optimizare":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Deschidere":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-purple-100 text-purple-800 border-purple-200"
    }
  }

  // Parse members array from string or array
  const parseMembers = (membersData) => {
    if (!membersData) return []
    if (Array.isArray(membersData)) return membersData
    try {
      return JSON.parse(membersData)
    } catch (e) {
      return []
    }
  }

  // Format km value to ensure it's a number and has 1 decimal place
  const formatKm = (km) => {
    if (km === null || km === undefined) return "0.0"
    const numKm = typeof km === "string" ? Number.parseFloat(km) : km
    return isNaN(numKm) ? "0.0" : numKm.toFixed(1)
  }

  // Format driving time to hours with decimal
  const formatDrivingTimeToHours = (minutes) => {
    if (!minutes) return "0.0h"
    const numMinutes = typeof minutes === "string" ? Number.parseFloat(minutes) : minutes
    if (isNaN(numMinutes)) return "0.0h"

    if (numMinutes < 60) {
      return `${numMinutes}m`
    }

    const hours = Math.floor(minutes / 60)
    const decimalPart = Math.floor((numMinutes % 60) / 6) // Convert remaining minutes to tenths of an hour
    return `${hours}.${decimalPart}h`
  }

  // Filter components
  const TypeFilters = ({ className = "" }) => (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <Filter className="h-3 w-3 text-blue-400 mr-1" />
      {["All", "Interventie", "Optimizare", "Deschidere"].map((type) => (
        <button
          key={type}
          onClick={() => setTypeFilter(type)}
          className={cn(
            "px-2 py-0.5 text-[0.5em] rounded-full transition-colors",
            typeFilter === type ? "bg-blue-100 text-blue-800" : "bg-white text-blue-600 hover:bg-blue-50",
            "border border-blue-200 shadow-sm",
          )}
        >
          {type}
        </button>
      ))}
    </div>
  )

  return (
    <AppShell>
      <div className="container mx-auto py-6 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Deplasări
          </h1>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => router.push("/deplasareform")}>
            <Plus className="h-5 w-5 mr-2" />
            Adaugă Deplasare
          </Button>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <TypeFilters />
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Caută după locație, team lead, membri, tip, sau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid grid-cols-2 gap-2">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Finalizate</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active assignments found</p>
                <p className="text-xs md:text-sm mt-2">Try changing your filters or create a new assignment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => {
                  // Parse members array
                  const members = parseMembers(assignment.members)

                  // Get store points for route display
                  let storePoints = []
                  try {
                    if (assignment.store_points) {
                      if (typeof assignment.store_points === "string") {
                        storePoints = JSON.parse(assignment.store_points)
                      } else if (Array.isArray(assignment.store_points)) {
                        storePoints = assignment.store_points
                      }
                    } else if (assignment.store_number) {
                      storePoints = [Number(assignment.store_number)]
                    }
                  } catch (e) {
                    console.error("Error parsing store points:", e)
                  }

                  return (
                    <Card
                      key={assignment.id}
                      className="overflow-hidden shadow-sm border border-gray-100 rounded-lg px-3 py-2 mb-4 w-full"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm">
                                {assignment.city} - {assignment.store_number}
                              </CardTitle>
                              <Badge className={`${getTypeColor(assignment.type)} text-xs py-0.5 px-1.5`}>
                                {assignment.type}
                              </Badge>
                              <Badge className={`${getStatusColor(assignment.status)} text-xs py-0.5 px-1.5`}>
                                {assignment.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">ID: {assignment.id}</div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs font-medium">{assignment.team_lead}</span>
                              </div>

                              {members.length > 0 && (
                                <div className="flex items-start">
                                  <Users className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                  <div className="text-xs">
                                    {members.map((member, index) => (
                                      <span key={index}>
                                        {member}
                                        {index < members.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs">
                                  {assignment.gps_start_date
                                    ? formatTime(assignment.gps_start_date)
                                    : assignment.start_date
                                      ? formatTime(assignment.start_date)
                                      : "Not set"}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs">{calculateDuration(assignment.start_date)}</span>
                              </div>

                              <div className="flex items-center">
                                <Car className="h-4 w-4 mr-2 text-gray-400" />
                                <LicensePlate plate={assignment.car_plate || "NA"} />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {assignment.km && assignment.driving_time && (
                                <>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDrivingTimeToHours(assignment.driving_time)}
                                  </div>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
                                    <Route className="h-3 w-3 mr-1" />
                                    {formatKm(assignment.km)} km
                                  </div>
                                </>
                              )}
                              {(!assignment.km || !assignment.driving_time) && (
                                <AssignmentKmCell
                                  assignmentId={assignment.id}
                                  km={assignment.km}
                                  drivingTime={assignment.driving_time}
                                  onRecalculate={handleRecalculateDistance}
                                  isRecalculating={isRecalculating && selectedAssignmentId === assignment.id}
                                  recalculationResult={
                                    selectedAssignmentId === assignment.id ? recalculationResult : null
                                  }
                                />
                              )}
                            </div>

                            <div className="flex gap-2 items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAssignmentId(assignment.id)
                                  setIsFinalizeDialogOpen(true)
                                }}
                                className="h-7 text-xs px-2"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Finalize
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/deplasareform?id=${assignment.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/test/assignment-route?id=${assignment.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <Route className="h-4 w-4 mr-2" />
                                    Calculate Route
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAssignmentId(assignment.id)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Route points display */}
                          {storePoints.length > 0 && (
                            <RoutePointsDisplay
                              startCity="Chitila"
                              endCity="Chitila"
                              assignment={assignment}
                              onRouteChange={handleRouteChange}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No completed assignments found</p>
                <p className="text-xs md:text-sm mt-2">Assignments will appear here after they are finalized</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => {
                  // Parse members array
                  const members = parseMembers(assignment.members)

                  // Get store points for route display
                  let storePoints = []
                  try {
                    if (assignment.store_points) {
                      if (typeof assignment.store_points === "string") {
                        storePoints = JSON.parse(assignment.store_points)
                      } else if (Array.isArray(assignment.store_points)) {
                        storePoints = assignment.store_points
                      }
                    } else if (assignment.store_number) {
                      storePoints = [Number(assignment.store_number)]
                    }
                  } catch (e) {
                    console.error("Error parsing store points:", e)
                  }

                  return (
                    <Card
                      key={assignment.id}
                      className="overflow-hidden shadow-sm border border-gray-100 rounded-lg px-3 py-2 mb-4 w-full"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm">
                                {assignment.city} - {assignment.store_number}
                              </CardTitle>
                              <Badge className={`${getTypeColor(assignment.type)} text-xs py-0.5 px-1.5`}>
                                {assignment.type}
                              </Badge>
                              <Badge className={`${getStatusColor(assignment.status)} text-xs py-0.5 px-1.5`}>
                                {assignment.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">ID: {assignment.id}</div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs font-medium">{assignment.team_lead}</span>
                              </div>

                              {members.length > 0 && (
                                <div className="flex items-start">
                                  <Users className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                  <div className="text-xs">
                                    {members.map((member, index) => (
                                      <span key={index}>
                                        {member}
                                        {index < members.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs">{formatTime(assignment.start_date)}</span>
                              </div>

                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-xs">
                                  {assignment.completion_date
                                    ? formatTime(assignment.completion_date)
                                    : "Not completed"}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <Car className="h-4 w-4 mr-2 text-gray-400" />
                                <LicensePlate plate={assignment.car_plate || "NA"} />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {assignment.km && assignment.driving_time && (
                                <>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDrivingTimeToHours(assignment.driving_time)}
                                  </div>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center text-xs">
                                    <Route className="h-3 w-3 mr-1" />
                                    {formatKm(assignment.km)} km
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex gap-2 items-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/test/assignment-route?id=${assignment.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <Route className="h-4 w-4 mr-2" />
                                    View Route
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAssignmentId(assignment.id)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Route points display */}
                          {storePoints.length > 0 && (
                            <RoutePointsDisplay
                              startCity="Chitila"
                              endCity="Chitila"
                              assignment={assignment}
                              onRouteChange={handleRouteChange}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating action button */}
      <div
        className={cn(
          "fixed bottom-16 right-4 transition-all duration-300 ease-in-out",
          isFloatingVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
        )}
      >
        <Button
          className="rounded-full h-12 w-12 bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
          onClick={() => router.push("/deplasareform")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Floating refresh button */}
      <div
        className={cn(
          "fixed bottom-16 left-4 transition-all duration-300 ease-in-out",
          isFloatingVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
        )}
      >
        <Button
          className="rounded-full h-12 w-12 bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-lg"
          onClick={fetchAssignments}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
        </Button>
      </div>

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        description="Are you sure you want to delete this assignment? This action cannot be undone."
        requirePassword={false}
      />

      <ConfirmFinalizeDialog
        open={isFinalizeDialogOpen}
        onOpenChange={setIsFinalizeDialogOpen}
        onConfirm={handleFinalizeAssignment}
        isSubmitting={isSubmitting}
        title="Finalize Assignment"
        description="Are you sure you want to finalize this assignment? This will mark it as completed and update team member statuses."
        assignmentId={selectedAssignmentId}
        km={assignments.find((a) => a.id === selectedAssignmentId)?.km || 0}
        realStartDate={realStartDate}
        realCompletionDate={realCompletionDate}
      />
    </AppShell>
  )
}

"use client"

import { useState, useEffect } from "react"
import { getUsers } from "../actions/users"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/UserContext"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Filter, ClockIcon, Calendar, User2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("All")
  const { user: currentUser } = useUser()
  const [isFloatingVisible, setIsFloatingVisible] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

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

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const fetchedUsers = await getUsers()
      console.log("Fetched users:", fetchedUsers)
      setUsers(fetchedUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredUsers = users.filter((user) => {
    if (statusFilter !== "All" && user.status !== statusFilter) return false
    return true
  })

  const StatusFilters = ({ className = "" }) => (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <Filter className="h-3 w-3 text-blue-400 mr-1" />
      {["All", "Liber", "In Deplasare"].map((status) => (
        <button
          key={status}
          onClick={() => setStatusFilter(status)}
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.5em] font-medium transition-colors",
            statusFilter === status ? "bg-blue-100 text-blue-800" : "bg-white text-blue-600 hover:bg-blue-50",
            "border border-blue-200 shadow-sm",
          )}
        >
          {status}
        </button>
      ))}
    </div>
  )

  const isAdmin = currentUser && currentUser.role === "Admin"

  // Function to format hours breakdown
  const formatHoursBreakdown = (user) => {
    const liberHours = typeof user.liber_hours === "number" ? user.liber_hours : 0
    const inDeplasareHours = typeof user.in_deplasare_hours === "number" ? user.in_deplasare_hours : 0

    // Only show the breakdown if at least one value is non-zero
    if (liberHours === 0 && inDeplasareHours === 0) {
      return null
    }

    // Format with 1 decimal place and ensure we display at least 0.1 for non-zero values less than 0.1
    const formatHours = (hours) => {
      if (hours === 0) return "0.0"
      return hours < 0.1 ? "0.1" : hours.toFixed(1)
    }

    return (
      <div className="flex items-center text-xs text-gray-500">
        <span className="text-green-600">{formatHours(liberHours)}h</span>
        <span className="mx-1">/</span>
        <span className="text-blue-600">{formatHours(inDeplasareHours)}h</span>
      </div>
    )
  }

  // Function to get status-based styling for user name
  const getUserNameStyle = (status) => {
    switch (status) {
      case "In Deplasare":
        return "text-blue-700 font-semibold"
      case "Liber":
        return "text-green-700 font-semibold"
      default:
        return "text-gray-900"
    }
  }

  // Function to get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "In Deplasare":
        return (
          <span className="rounded-full px-2 py-0.5 text-xs font-normal bg-blue-50 text-blue-700">In Deplasare</span>
        )
      case "Liber":
        return <span className="rounded-full px-2 py-0.5 text-xs font-normal bg-green-50 text-green-700">Liber</span>
      default:
        return (
          <span className="rounded-full px-2 py-0.5 text-xs font-normal bg-gray-50 text-gray-700">
            {status || "Unknown"}
          </span>
        )
    }
  }

  // Function to get time information based on status
  const getTimeInfo = (user) => {
    if (user.status === "In Deplasare" && user.current_assignment_start) {
      try {
        const startDate = new Date(user.current_assignment_start)
        return (
          <span className="ml-2 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1 text-blue-500" />
            Started: {formatDistanceToNow(startDate, { addSuffix: true })}
          </span>
        )
      } catch (error) {
        console.error("Error calculating time since start:", error)
      }
    } else if (user.status === "Liber" && user.last_completion_date) {
      try {
        const lastCompletionDate = new Date(user.last_completion_date)
        return (
          <span className="ml-2 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1 text-green-500" />
            Liber Since: {formatDistanceToNow(lastCompletionDate, { addSuffix: true })}
          </span>
        )
      } catch (error) {
        console.error("Error calculating time since last completion:", error)
      }
    }

    return null
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center">
            <User2 className="h-5 w-5 mr-2" />
            Users
          </h1>
          {isAdmin && (
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {}}>
              <Plus className="h-5 w-5 mr-2" />
              Add User
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <StatusFilters />
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{format(new Date(), "MMMM yyyy")} data</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center py-3 px-3 border-b border-gray-100 ${
                  user.status === "In Deplasare" ? "bg-blue-50" : user.status === "Liber" ? "bg-green-50" : ""
                }`}
              >
                <Avatar className="h-10 w-10 mr-4">
                  <AvatarFallback className="bg-gray-200 text-gray-700">{getInitials(user.name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm ${getUserNameStyle(user.status)}`}>{user.name}</h3>
                      </div>
                      <div className="flex flex-col text-xs text-gray-500 mt-1">
                        <span>
                          {user.assignment_count || 0} assignments • {user.store_count || 0} stores
                        </span>
                        {getTimeInfo(user)}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-base font-semibold">
                        {user.total_hours ? `${Number(user.total_hours).toFixed(1)}h` : "0.0h"}
                      </p>
                      {formatHoursBreakdown(user)}
                      <span className="text-xs text-gray-500 mt-1">{getStatusBadge(user.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating filters and button */}
      <div
        className={cn(
          "fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 transition-all duration-300 ease-in-out",
          isFloatingVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusFilters />
          </div>
          {isAdmin && (
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {}}>
              <Plus className="h-5 w-5 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}

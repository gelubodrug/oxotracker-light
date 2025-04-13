"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type User = {
  id: number
  name: string
  email: string
  role: string
  profile_photo?: string
  is_logged_in: boolean
  last_login: string
  app_version: string
}

type UserContextType = {
  user: User | null
  isLoading: boolean
  selectUser: (userId: number) => Promise<void>
  deselectUser: () => void
  getAvailableUsers: () => Promise<User[]>
}

// Provide default values to avoid the "must be used within a Provider" error
const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  selectUser: async () => {},
  deselectUser: () => {},
  getAvailableUsers: async () => [],
})

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkLoginStatus = async () => {
      setIsLoading(true)
      const storedUser = localStorage.getItem("selectedUser")

      if (!storedUser) {
        setIsLoading(false)
        return
      }

      try {
        // Parse the stored user
        const parsedUser = JSON.parse(storedUser)

        // Use a try-catch for the fetch operation
        try {
          console.log("Checking login status for user ID:", parsedUser.id)

          // Add a timestamp to prevent caching
          const timestamp = new Date().getTime()

          // Use GET with URL parameters instead of POST with body to avoid body stream issues
          const response = await fetch(`/api/users/check-login/${parsedUser.id}?t=${timestamp}`, {
            method: "GET",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          })

          console.log("Response status:", response.status)

          // If the response is not OK, log the error and keep the user logged in
          if (!response.ok) {
            console.error(`Server error: ${response.status} ${response.statusText}`)
            setUser(parsedUser)
            setIsLoading(false)
            return
          }

          // Check if the response is JSON
          const contentType = response.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            console.error("Non-JSON response received:", contentType)
            // Try to get the response text for debugging
            const text = await response.text()
            console.error("Response text:", text.substring(0, 200) + "...")
            setUser(parsedUser)
            setIsLoading(false)
            return
          }

          // Parse the JSON response
          const data = await response.json()
          console.log("Login check response:", data)

          if (data.isLoggedIn) {
            // Update the stored user with the latest data
            localStorage.setItem("selectedUser", JSON.stringify(data.user))
            setUser(data.user)
          } else if (data.reason === "login_expired") {
            // Only log out for expired sessions
            console.log("Your session has expired. Please log in again.")
            localStorage.removeItem("selectedUser")
            setUser(null)
          } else {
            // For any other reason, keep the user logged in with existing data
            console.log("User not logged in, reason:", data.reason)
            setUser(parsedUser)
          }
        } catch (fetchError) {
          console.error("Error fetching login status:", fetchError)
          // If there's a fetch error, keep the user logged in
          setUser(parsedUser)
        }
      } catch (parseError) {
        console.error("Error parsing stored user:", parseError)
        // If there's an error parsing the stored user, remove it
        localStorage.removeItem("selectedUser")
      }

      setIsLoading(false)
    }

    checkLoginStatus()
  }, [])

  const selectUser = async (userId: number) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}/select`, {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to select user: ${response.status} ${response.statusText}`)
      }

      const selectedUser = await response.json()
      setUser(selectedUser)
      localStorage.setItem("selectedUser", JSON.stringify(selectedUser))
    } catch (error) {
      console.error("Error selecting user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const deselectUser = () => {
    if (user) {
      setIsLoading(true)
      fetch(`/api/users/${user.id}/deselect`, {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
        .then(() => {
          setUser(null)
          localStorage.removeItem("selectedUser")
        })
        .catch((error) => console.error("Error deselecting user:", error))
        .finally(() => setIsLoading(false))
    }
  }

  const getAvailableUsers = async (): Promise<User[]> => {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/users/available?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch available users: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching available users:", error)
      return []
    }
  }

  return (
    <UserContext.Provider value={{ user, isLoading, selectUser, deselectUser, getAvailableUsers }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  return useContext(UserContext)
}

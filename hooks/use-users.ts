"use client"

import { useState, useEffect } from "react"
import { getUsers } from "@/app/actions/users"

export const useUsers = () => {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const fetchedUsers = await getUsers()
        setUsers(fetchedUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, isLoading }
}

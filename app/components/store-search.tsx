"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"

interface StoreSearchProps {
  onStoreSelect: (store: any) => void
  initialValue?: string
}

export function StoreSearch({ onStoreSelect, initialValue = "" }: StoreSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter a search term")
      return
    }

    setIsLoading(true)
    setError("")
    setSearchResults([])

    try {
      const response = await fetch(`/api/stores/search?term=${encodeURIComponent(searchTerm)}`)

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`)
      }

      const data = await response.json()
      setSearchResults(data)

      if (data.length === 0) {
        setError("No stores found matching your search")
      }
    } catch (err) {
      console.error("Error searching stores:", err)
      setError("Failed to search stores. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by ID, name, city, or county"
          className="flex-1"
          disabled={isLoading}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {searchResults.length > 0 && (
        <div className="max-h-60 overflow-y-auto border rounded-md">
          {searchResults.map((store) => (
            <div
              key={store.store_id}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => onStoreSelect(store)}
            >
              <div className="font-medium">{store.description || `Store #${store.store_id}`}</div>
              <div className="text-sm text-gray-600">
                {store.city}, {store.county} (ID: {store.store_id})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

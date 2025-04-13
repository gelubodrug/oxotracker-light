"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Search, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Store {
  store_id: number | string
  description: string
  address?: string
  city?: string
  county?: string
}

interface StoreSelectorProps {
  onStoreSelect: (storeId: number | null, storeData?: Store) => void
}

export function StoreSelector({ onStoreSelect }: StoreSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Store[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Function to search for stores
  const searchStores = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setError("Introduceți cel puțin 2 caractere pentru căutare")
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      // First try to search by store ID if the search term is a 4-digit number
      if (/^\d{4}$/.test(searchTerm)) {
        const storeId = searchTerm
        try {
          const storeResponse = await fetch(`/api/stores/direct-search?id=${storeId}`)

          if (storeResponse.ok) {
            const storeData = await storeResponse.json()
            if (storeData && storeData.length > 0) {
              // Automatically select the store if found by exact ID
              const store = storeData[0]
              setSelectedStore(store)
              onStoreSelect(Number(store.store_id), store)
              setSearchResults([])

              toast({
                title: "Magazin selectat automat",
                description: `Magazinul ${store.description} a fost găsit și selectat.`,
              })

              setIsSearching(false)
              return
            }
          } else {
            console.error(`Store ID search failed with status: ${storeResponse.status}`)
          }
        } catch (idError) {
          console.error("Error searching by store ID:", idError)
          // Continue to general search if ID search fails
        }
      }

      // If not found by ID or not a 4-digit number, search by description/location
      const response = await fetch(`/api/stores/search?term=${encodeURIComponent(searchTerm)}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Search failed with status: ${response.status}, response: ${errorText}`)
        throw new Error(`Search failed with status: ${response.status}`)
      }

      const data = await response.json()

      if (data && Array.isArray(data)) {
        // If only one result is found, automatically select it
        if (data.length === 1) {
          const store = data[0]
          setSelectedStore(store)
          onStoreSelect(Number(store.store_id), store)
          setSearchResults([])

          toast({
            title: "Magazin selectat automat",
            description: `Magazinul ${store.description} a fost găsit și selectat.`,
          })
        } else {
          // Otherwise, show the results for manual selection
          setSearchResults(data)
          if (data.length === 0) {
            setError("Nu s-au găsit magazine care să corespundă căutării")
          }
        }
      } else {
        console.error("Invalid response format:", data)
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Error searching stores:", error)
      setError("A apărut o eroare la căutarea magazinelor. Încercați din nou.")

      // For development only - remove in production
      if (process.env.NODE_ENV === "development") {
        console.log("Creating mock results for development testing")
        const mockResults = [
          {
            store_id: 1001,
            description: "Profi Deva Constructorilor",
            city: "Deva",
            county: "Hunedoara",
            address: "Str. Constructorilor 14",
          },
          {
            store_id: 1002,
            description: "Profi Timisoara Dacia",
            city: "Timisoara",
            county: "Timis",
            address: "Bulevardul Dacia 22",
          },
        ]

        // If only one mock result, auto-select it
        if (mockResults.length === 1) {
          const store = mockResults[0]
          setSelectedStore(store)
          onStoreSelect(Number(store.store_id), store)
        } else {
          setSearchResults(mockResults)
        }
      }
    } finally {
      setIsSearching(false)
    }
  }

  // Handle store selection
  const handleSelectStore = (store: Store) => {
    setSelectedStore(store)
    onStoreSelect(Number(store.store_id), store)

    // Clear search results
    setSearchResults([])
    setSearchTerm("")

    toast({
      title: "Magazin selectat",
      description: `Magazinul ${store.description} a fost selectat.`,
    })
  }

  // Handle search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      searchStores()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="storeSearch">Caută magazin după ID sau denumire</Label>
        <div className="flex mt-1">
          <div className="relative flex-1">
            <Input
              id="storeSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ID magazin (4 cifre) sau denumire"
              className="pr-8"
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button onClick={searchStores} disabled={isSearching || searchTerm.length < 2} className="ml-2">
            <Search className="h-4 w-4 mr-1" />
            Caută
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {searchResults.length > 0 && (
        <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">
            {searchResults.length} rezultate găsite. Selectați un magazin:
          </p>
          <div className="space-y-2">
            {searchResults.map((store) => (
              <Card
                key={store.store_id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelectStore(store)}
              >
                <CardContent className="p-3">
                  <div className="font-medium">{store.description}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {store.store_id} | {store.city}, {store.county}
                  </div>
                  {store.address && <div className="text-xs text-muted-foreground mt-1">{store.address}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedStore && (
        <div className="border rounded-md p-3 bg-green-50 border-green-200">
          <p className="text-sm font-medium">Magazin selectat:</p>
          <div className="text-sm mt-1">
            <span className="font-medium">{selectedStore.description}</span>
            <div className="text-xs text-muted-foreground mt-1">
              ID: {selectedStore.store_id} | {selectedStore.city}, {selectedStore.county}
            </div>
            {selectedStore.address && <div className="text-xs text-muted-foreground">{selectedStore.address}</div>}
          </div>
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStore(null)
                onStoreSelect(null)
              }}
              className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Deselectează
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

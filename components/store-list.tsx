"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Store {
  store_id: number
  name: string
  address: string
  city: string
  county: string
  description?: string
  status?: string
}

interface StoreListProps {
  stores?: Store[]
  onStoreSelect?: (store: Store) => void
  selectedStores?: number[]
  loading?: boolean
  title?: string
}

export function StoreList({
  stores = [],
  onStoreSelect,
  selectedStores = [],
  loading = false,
  title = "Stores",
}: StoreListProps) {
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!stores) {
      setFilteredStores([])
      return
    }

    if (!searchTerm) {
      setFilteredStores(stores)
      return
    }

    const lowerSearchTerm = searchTerm.toLowerCase()
    const filtered = stores.filter(
      (store) =>
        store.name?.toLowerCase().includes(lowerSearchTerm) ||
        store.address?.toLowerCase().includes(lowerSearchTerm) ||
        store.city?.toLowerCase().includes(lowerSearchTerm) ||
        store.county?.toLowerCase().includes(lowerSearchTerm) ||
        store.description?.toLowerCase().includes(lowerSearchTerm),
    )

    setFilteredStores(filtered)
  }, [stores, searchTerm])

  const isSelected = (storeId: number) => selectedStores.includes(storeId)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="relative">
          <input
            type="text"
            placeholder="Search stores..."
            className="w-full p-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            {searchTerm ? "No stores match your search" : "No stores available"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStores.map((store) => (
              <div
                key={store.store_id}
                className={`p-3 border rounded flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSelected(store.store_id) ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => onStoreSelect && onStoreSelect(store)}
              >
                <div>
                  <div className="font-medium">{store.name}</div>
                  <div className="text-sm text-gray-500">
                    {store.address}, {store.city}, {store.county}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {store.status && (
                    <Badge variant={store.status === "active" ? "default" : "secondary"}>{store.status}</Badge>
                  )}
                  {isSelected(store.store_id) && <Badge variant="default">Selected</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

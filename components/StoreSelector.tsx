"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { StoreSearch } from "./store-search"

interface StoreSelectorProps {
  onStoreSelect: (storeId: number | null, storeData?: any) => void
  initialStoreId?: number | null
}

export function StoreSelector({ onStoreSelect, initialStoreId }: StoreSelectorProps) {
  const [selectedStore, setSelectedStore] = useState<any>(null)

  // Fetch initial store data if initialStoreId is provided
  useEffect(() => {
    if (initialStoreId) {
      fetchStoreById(initialStoreId)
    }
  }, [initialStoreId])

  const fetchStoreById = async (storeId: number) => {
    try {
      const response = await fetch(`/api/stores/${storeId}`)
      if (response.ok) {
        const store = await response.json()
        setSelectedStore(store)
      }
    } catch (error) {
      console.error("Error fetching initial store:", error)
    }
  }

  const handleStoreSelect = (store: any) => {
    setSelectedStore(store)
    onStoreSelect(store ? store.store_id : null, store)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="store-search">Magazin</Label>
        <StoreSearch onStoreSelect={handleStoreSelect} />
      </div>

      {selectedStore && (
        <div className="p-3 bg-gray-50 rounded-md">
          <h4 className="font-medium text-sm">Detalii Magazin:</h4>
          <p className="text-sm">{selectedStore.description}</p>
          <p className="text-sm text-gray-600">
            {selectedStore.address}, {selectedStore.city}, {selectedStore.county}
          </p>
        </div>
      )}
    </div>
  )
}

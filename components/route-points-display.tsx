"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  MapPin,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Home,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface RoutePointsDisplayProps {
  startCity: string
  endCity: string
  assignment: any
  onRouteChange: (storeIds: number[], assignmentId?: number) => void
}

export function RoutePointsDisplay({ startCity, endCity, assignment, onRouteChange }: RoutePointsDisplayProps) {
  // Set expanded state to false by default
  const [isExpanded, setIsExpanded] = useState(false)
  // Initialize store points from assignment or empty array
  const [storePoints, setStorePoints] = useState<number[]>([])
  const [forceUpdate, setForceUpdate] = useState(0) // Add force update state
  const [isLoading, setIsLoading] = useState(false)

  // State for store ID input
  const [storeIdInput, setStoreIdInput] = useState("")
  const [activeInsertIndex, setActiveInsertIndex] = useState<number | null>(null)
  const [inputError, setInputError] = useState("")

  // Add these state variables after the existing state declarations
  const [selectedStoreIndex, setSelectedStoreIndex] = useState<number | null>(null)
  const [draggedStoreIndex, setDraggedStoreIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Create refs for the selected store and its controls
  const selectedStoreRef = useRef<HTMLDivElement>(null)

  // Use a ref to track if we've initialized from the assignment
  const initializedRef = useRef(false)

  // Add click outside handler to exit edit mode
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectedStoreIndex !== null &&
        selectedStoreRef.current &&
        !selectedStoreRef.current.contains(event.target as Node)
      ) {
        setSelectedStoreIndex(null)
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside)

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [selectedStoreIndex])

  // Initialize with the store ID from the assignment if available
  useEffect(() => {
    try {
      // Only initialize once when the component mounts or when assignment changes
      if (!initializedRef.current || assignment.route_updated) {
        let newStorePoints: number[] = []

        // Check for store_points first (from database)
        if (assignment.store_points) {
          try {
            const parsedPoints =
              typeof assignment.store_points === "string"
                ? JSON.parse(assignment.store_points)
                : assignment.store_points

            if (Array.isArray(parsedPoints) && parsedPoints.length > 0) {
              newStorePoints = parsedPoints
              console.log("Initialized from store_points:", newStorePoints)
            }
          } catch (e) {
            console.error("Error parsing store_points:", e)
          }
        }

        // If no store_points, check for store_number
        if (
          newStorePoints.length === 0 &&
          assignment.store_number &&
          !isNaN(Number.parseInt(assignment.store_number))
        ) {
          newStorePoints = [Number.parseInt(assignment.store_number)]
          console.log("Initialized from store_number:", newStorePoints)
        }
        // Then check for store_id
        else if (newStorePoints.length === 0 && assignment.store_id && !isNaN(Number.parseInt(assignment.store_id))) {
          newStorePoints = [Number.parseInt(assignment.store_id)]
          console.log("Initialized from store_id:", newStorePoints)
        }

        setStorePoints(newStorePoints)
        initializedRef.current = true
      }
    } catch (error) {
      console.error("Error initializing store points:", error)
    }
  }, [assignment])

  // Get all points in order (start, stores, end)
  const getAllPoints = () => {
    return [
      { id: "start", name: startCity, type: "endpoint" },
      ...storePoints.map((id) => ({
        id,
        name: `${id}`,
        type: "store",
      })),
      { id: "end", name: endCity, type: "endpoint" },
    ]
  }

  // Add a function to handle store selection:
  const handleStoreClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    setSelectedStoreIndex(selectedStoreIndex === index ? null : index)
  }

  // Add drag and drop handler functions:
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStoreIndex(index)
    // Set data for drag operation
    e.dataTransfer.setData("text/plain", index.toString())
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4"
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedStoreIndex(null)
    setDragOverIndex(null)
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() // Necessary to allow dropping
    setDragOverIndex(index)
  }

  // Update the handleDrop function to pass the assignment ID to onRouteChange
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    const dragIndex = Number.parseInt(e.dataTransfer.getData("text/plain"))

    if (dragIndex === dropIndex) return

    // Create a new array with the dragged store moved to the new position
    const newStorePoints = [...storePoints]
    const [movedStore] = newStorePoints.splice(dragIndex, 1)
    newStorePoints.splice(dropIndex > dragIndex ? dropIndex - 1 : dropIndex, 0, movedStore)

    // Update state and notify parent
    setStorePoints(newStorePoints)
    setForceUpdate((prev) => prev + 1)
    onRouteChange(newStorePoints, assignment.id)

    // Reset states
    setDraggedStoreIndex(null)
    setDragOverIndex(null)
    setSelectedStoreIndex(null)
  }

  // Update the moveStoreLeft function to pass the assignment ID to onRouteChange
  const moveStoreLeft = (index: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (index <= 0) return // Can't move the first store left

    const newStorePoints = [...storePoints]
    const temp = newStorePoints[index]
    newStorePoints[index] = newStorePoints[index - 1]
    newStorePoints[index - 1] = temp

    setStorePoints(newStorePoints)
    setForceUpdate((prev) => prev + 1)
    setSelectedStoreIndex(index - 1) // Update selection to follow the moved store
    onRouteChange(newStorePoints, assignment.id)
  }

  // Update the moveStoreRight function to pass the assignment ID to onRouteChange
  const moveStoreRight = (index: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (index >= storePoints.length - 1) return // Can't move the last store right

    const newStorePoints = [...storePoints]
    const temp = newStorePoints[index]
    newStorePoints[index] = newStorePoints[index + 1]
    newStorePoints[index + 1] = temp

    setStorePoints(newStorePoints)
    setForceUpdate((prev) => prev + 1)
    setSelectedStoreIndex(index + 1) // Update selection to follow the moved store
    onRouteChange(newStorePoints, assignment.id)
  }

  // Update the handleAddStore function to pass the assignment ID to onRouteChange
  const handleAddStore = (storeId: number, insertIndex: number) => {
    try {
      // Create a new array with the added store
      const newStorePoints = [...storePoints]
      newStorePoints.splice(insertIndex, 0, storeId)

      console.log("Adding store:", storeId, "at index:", insertIndex)
      console.log("New store points:", newStorePoints)

      // Update the local state
      setStorePoints(newStorePoints)

      // Force a re-render
      setForceUpdate((prev) => prev + 1)

      // Notify parent component with assignment ID
      onRouteChange(newStorePoints, assignment.id)

      // Reset form state
      setActiveInsertIndex(null)
      setStoreIdInput("")
      setInputError("")
    } catch (error) {
      console.error("Error adding store:", error)
    }
  }

  // Update the handleRemoveStore function to pass the assignment ID to onRouteChange
  const handleRemoveStore = (index: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    try {
      const newStorePoints = [...storePoints]
      newStorePoints.splice(index, 1)

      // Update the local state
      setStorePoints(newStorePoints)

      // Force a re-render
      setForceUpdate((prev) => prev + 1)

      // Notify parent component with assignment ID
      onRouteChange(newStorePoints, assignment.id)

      // Reset selected store
      setSelectedStoreIndex(null)
    } catch (error) {
      console.error("Error removing store:", error)
    }
  }

  // Toggle ID input at a specific insert point
  const toggleInsertPoint = (index: number) => {
    if (activeInsertIndex === index) {
      setActiveInsertIndex(null)
      setStoreIdInput("")
      setInputError("")
    } else {
      setActiveInsertIndex(index)
      setStoreIdInput("")
      setInputError("")
    }
  }

  // Handle store ID input
  const handleStoreIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow digits and limit to 4 characters
    if (/^\d{0,4}$/.test(value)) {
      setStoreIdInput(value)
      setInputError("")
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, insertIndex: number) => {
    e.preventDefault()

    // Validate input is a 4-digit number
    if (!/^\d{4}$/.test(storeIdInput)) {
      setInputError("Enter a 4-digit store ID")
      return
    }

    const storeId = Number.parseInt(storeIdInput)

    // Validate that the store exists in the database
    try {
      setIsLoading(true)
      const response = await fetch(`/api/stores/direct-search?id=${storeId}`)

      if (!response.ok) {
        setInputError(`Error checking store: ${response.status}`)
        setIsLoading(false)
        return
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        setInputError(`Store #${storeId} does not exist in database`)
        setIsLoading(false)
        return
      }

      // Store exists, proceed with adding it
      handleAddStore(storeId, insertIndex)
      setIsLoading(false)
    } catch (error) {
      console.error("Error validating store:", error)
      setInputError(`Failed to validate store: ${error.message}`)
      setIsLoading(false)
    }
  }

  // Get points with the force update dependency to ensure re-render
  const points = getAllPoints()

  // Calculate the index for the add button - it should be at the end of the stores, before the end point
  const addButtonIndex = points.length - 2

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center text-[0.65rem] text-blue-600 hover:text-blue-700 mb-1"
      >
        <MapPin className="h-3 w-3 mr-1" />
        <span>
          📍 Route (ID {assignment.id} - {storePoints.length} stores)
        </span>
        {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </button>

      {isExpanded && (
        <div className="mt-1">
          {/* Linear route representation */}
          <div className="flex flex-wrap items-center text-[0.75rem]">
            {points.map((point, index) => {
              const isStore = point.type === "store"
              const storeIndex = isStore ? index - 1 : null
              const isSelected = isStore && storeIndex === selectedStoreIndex
              const isDragged = isStore && storeIndex === draggedStoreIndex
              const isDragOver = isStore && storeIndex === dragOverIndex
              const isLastStore = index === points.length - 2

              return (
                <div
                  key={`point-${index}-${point.id}-${forceUpdate}`}
                  className="flex items-center mb-3 mx-0.5"
                  ref={isSelected ? selectedStoreRef : null}
                >
                  {/* Left arrow for selected stores */}
                  {isStore && isSelected && (
                    <button
                      onClick={(e) => moveStoreLeft(storeIndex, e)}
                      disabled={storeIndex <= 0}
                      className={`bg-gray-200 hover:bg-gray-300 rounded-full h-5 w-5 flex items-center justify-center mr-1 ${storeIndex <= 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                      title="Move left"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                  )}

                  {/* Point visualization */}
                  <div
                    className={`flex items-center ${isStore ? "cursor-pointer" : ""} ${isDragOver ? "border-2 border-dashed border-blue-400 rounded-full" : ""}`}
                    onClick={isStore ? (e) => handleStoreClick(storeIndex, e) : undefined}
                    draggable={isStore}
                    onDragStart={isStore ? (e) => handleDragStart(e, storeIndex) : undefined}
                    onDragEnd={isStore ? handleDragEnd : undefined}
                    onDragOver={isStore ? (e) => handleDragOver(e, storeIndex) : undefined}
                    onDrop={isStore ? (e) => handleDrop(e, storeIndex) : undefined}
                  >
                    {point.type === "endpoint" ? (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                        <Home className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          Number(point.id) === 6666 ? "bg-blue-100 text-blue-800" : "bg-red-600 text-white"
                        } ${isDragged ? "opacity-40" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                      >
                        {Number(point.id) === 6666 ? (
                          <Warehouse className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[0.65rem] font-medium leading-none tracking-tighter">
                            {`${point.id}`.substring(0, 4)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right arrow for selected stores */}
                  {isStore && isSelected && (
                    <button
                      onClick={(e) => moveStoreRight(storeIndex, e)}
                      disabled={storeIndex >= storePoints.length - 1}
                      className={`bg-gray-200 hover:bg-gray-300 rounded-full h-5 w-5 flex items-center justify-center ml-1 ${storeIndex >= storePoints.length - 1 ? "opacity-30 cursor-not-allowed" : ""}`}
                      title="Move right"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {/* X button for selected stores */}
                  {isStore && isSelected && (
                    <button
                      onClick={(e) => handleRemoveStore(storeIndex, e)}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full h-5 w-5 flex items-center justify-center text-red-500 hover:text-red-700 ml-1"
                      title="Remove store"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {/* Only show add button before the last point (end point) */}
                  {index === addButtonIndex && (
                    <div
                      className={`mx-1 ${dragOverIndex === -index - 1 ? "border-2 border-dashed border-blue-400 rounded-full" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOverIndex(-index - 1) // Use negative numbers to distinguish from store indices
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const dragIndex = Number.parseInt(e.dataTransfer.getData("text/plain"))

                        // Create a new array with the dragged store moved to the new position
                        const newStorePoints = [...storePoints]
                        const [movedStore] = newStorePoints.splice(dragIndex, 1)
                        newStorePoints.splice(index > dragIndex + 1 ? index - 1 : index, 0, movedStore)

                        // Update state and notify parent
                        setStorePoints(newStorePoints)
                        setForceUpdate((prev) => prev + 1)
                        onRouteChange(newStorePoints, assignment.id)

                        // Reset states
                        setDraggedStoreIndex(null)
                        setDragOverIndex(null)
                        setSelectedStoreIndex(null)
                      }}
                    >
                      {activeInsertIndex === index ? (
                        <form onSubmit={(e) => handleSubmit(e, index)} className="inline-flex items-center">
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="4-digit ID"
                              value={storeIdInput}
                              onChange={handleStoreIdInput}
                              className="h-6 text-xs w-24 pl-2"
                              autoFocus
                              disabled={isLoading}
                            />
                            {inputError && (
                              <div className="absolute text-xs text-red-500 mt-1 whitespace-nowrap">{inputError}</div>
                            )}
                          </div>
                          {/* Replace text button with icon button */}
                          <button
                            type="submit"
                            className="bg-gray-200 hover:bg-gray-300 rounded-full h-5 w-5 flex items-center justify-center text-green-500 hover:text-green-700 ml-1"
                            title="Add store"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="bg-gray-200 hover:bg-gray-300 rounded-full h-5 w-5 flex items-center justify-center text-red-500 hover:text-red-700 ml-1"
                            onClick={() => toggleInsertPoint(index)}
                            title="Cancel"
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => toggleInsertPoint(index)}
                          className="bg-gray-200 hover:bg-gray-300 rounded-full h-4 w-4 flex items-center justify-center"
                          title="Add store"
                        >
                          <Plus className="h-2 w-2" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

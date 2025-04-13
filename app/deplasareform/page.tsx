"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, MapPin, Route, Loader2, PlayCircle, Check, X, Edit } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { createAssignment, updateAssignment } from "@/app/actions/assignments"
import { getAvailableUsers, checkUserAvailability } from "@/app/actions/users"
import { useUser } from "@/context/UserContext"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/layout/app-shell"
import { StoreSelector } from "@/app/components/StoreSelector"

// Fixed headquarters location
const HQ_LOCATION = {
  address: "Șoseaua Banatului 109a",
  city: "Chitila",
  county: "Ilfov",
  coordinates: [25.984056, 44.5062199] as [number, number],
  description: "Headquarters",
}

export default function DeplasareFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()

  // Get assignment ID from URL if present (for edit mode)
  const assignmentId = searchParams.get("id")
  const isEditMode = !!assignmentId

  // Form state
  const [type, setType] = useState("")
  const [teamLead, setTeamLead] = useState("")
  const [members, setMembers] = useState<string[]>(["", "", "", ""])
  const [storeNumber, setStoreNumber] = useState("")
  const [selectedCounty, setSelectedCounty] = useState("")
  const [cityName, setCityName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeAddress, setStoreAddress] = useState("")
  const [availableUsers, setAvailableUsers] = useState([])
  const [activeTab, setActiveTab] = useState("details")
  const [activeStoreTab, setActiveStoreTab] = useState("existing")
  const [hasVisitedTeamTab, setHasVisitedTeamTab] = useState(false)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [isCreatingNewStore, setIsCreatingNewStore] = useState(false)
  const [originalAssignment, setOriginalAssignment] = useState<any>(null)
  const [carPlate, setCarPlate] = useState("")

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [processingStep, setProcessingStep] = useState("")
  const [loading, setLoading] = useState(false)

  // Fetch assignment data if in edit mode
  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!assignmentId) return

      setLoading(true)
      try {
        // Fetch the assignment data
        const response = await fetch(`/api/assignments/${assignmentId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch assignment: ${response.status}`)
        }

        const assignment = await response.json()
        setOriginalAssignment(assignment)

        // Populate form fields
        setType(assignment.type || "")
        setTeamLead(assignment.team_lead || "")

        // Parse members array
        let membersList: string[] = []
        try {
          if (typeof assignment.members === "string") {
            membersList = JSON.parse(assignment.members)
          } else if (Array.isArray(assignment.members)) {
            membersList = assignment.members
          }
        } catch (e) {
          console.error("Error parsing members:", e)
        }

        // Ensure we have exactly 4 members (fill with empty strings if needed)
        const paddedMembers = [...membersList, "", "", "", ""].slice(0, 4)
        setMembers(paddedMembers)

        // Set store information
        setStoreNumber(assignment.store_number || "")
        setSelectedCounty(assignment.county || "")
        setCityName(assignment.city || "")
        setCarPlate(assignment.car_plate || "")

        // If we have a store number, try to fetch store details
        if (assignment.store_number) {
          try {
            const storeResponse = await fetch(`/api/stores/${assignment.store_number}`)
            if (storeResponse.ok) {
              const storeData = await storeResponse.json()
              setSelectedStore(storeData)
              setActiveStoreTab("existing")
            }
          } catch (storeError) {
            console.error("Error fetching store:", storeError)
          }
        }

        // Mark team tab as visited to enable form submission
        setHasVisitedTeamTab(true)
      } catch (error) {
        console.error("Error fetching assignment:", error)
        setError(`Failed to load assignment: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignmentData()
  }, [assignmentId])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getAvailableUsers()
        setAvailableUsers(users)
      } catch (error) {
        console.error("Error fetching users:", error)
        setAvailableUsers([])
      }
    }
    fetchUsers()

    // Set team lead to current user if not in edit mode
    if (!isEditMode && user) {
      setTeamLead(user.name)
    }
  }, [isEditMode, user])

  // Function to validate store number format
  const validateStoreNumber = (storeNum: string): boolean => {
    return storeNum.length === 4 && /^\d+$/.test(storeNum)
  }

  const handleStoreSelect = (storeId: number | null, storeData?: any) => {
    setSelectedStore(storeData)
    setIsCreatingNewStore(false)

    if (storeData) {
      setStoreNumber(storeData.store_id?.toString() || "")
      setCityName(storeData.city || "")
      setSelectedCounty(storeData.county || "")
      setStoreName("")
      setStoreAddress("")

      toast({
        title: "Magazin selectat",
        description: `Magazinul ${storeData.store_id} a fost selectat și detaliile au fost completate automat.`,
      })
    } else {
      setStoreNumber("")
      setCityName("")
      setSelectedCounty("")
      setStoreName("")
      setStoreAddress("")
    }
  }

  const handleCreateNewStore = () => {
    setActiveStoreTab("new")
    setSelectedStore(null)
    setIsCreatingNewStore(true)
    setStoreNumber("")
    setCityName("")
    setSelectedCounty("")
    setStoreName("")
    setStoreAddress("")
  }

  const validateUserAvailability = async (userName: string) => {
    if (!userName || userName === "None") return true

    // If we're in edit mode and this user was already assigned to this assignment,
    // we don't need to check availability
    if (isEditMode && originalAssignment) {
      if (userName === originalAssignment.team_lead) return true

      // Check if user was in the original members list
      let originalMembers: string[] = []
      try {
        if (typeof originalAssignment.members === "string") {
          originalMembers = JSON.parse(originalAssignment.members)
        } else if (Array.isArray(originalAssignment.members)) {
          originalMembers = originalAssignment.members
        }
      } catch (e) {
        console.error("Error parsing original members:", e)
      }

      if (originalMembers.includes(userName)) return true
    }

    try {
      return await checkUserAvailability(userName)
    } catch (error) {
      console.error("Error checking user availability:", error)
      return true // Allow the operation to proceed if the check fails
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    setProcessingStep("Validating form...")

    try {
      // Validate required fields
      if (!type) {
        setError("Tipul deplasării este obligatoriu")
        setIsSubmitting(false)
        return
      }

      if (!teamLead) {
        setError("Driver este obligatoriu")
        setIsSubmitting(false)
        return
      }

      if (!carPlate) {
        setError("Mașina este obligatorie")
        setIsSubmitting(false)
        return
      }

      // Validate store selection or creation
      if (!selectedStore && !isCreatingNewStore) {
        setError("Trebuie să selectați un magazin existent sau să creați unul nou")
        setIsSubmitting(false)
        return
      }

      // If creating a new store, validate required fields
      if (isCreatingNewStore) {
        if (!storeNumber) {
          setError("Numarul magazinului este obligatoriu pentru un magazin nou")
          setIsSubmitting(false)
          return
        }

        if (!validateStoreNumber(storeNumber)) {
          setError("Numarul magazinului format din 4 cifre")
          setIsSubmitting(false)
          return
        }

        if (!storeName) {
          setError("Denumirea magazinului este obligatorie pentru un magazin nou")
          setIsSubmitting(false)
          return
        }

        if (!selectedCounty) {
          setError("Județul este obligatoriu pentru un magazin nou")
          setIsSubmitting(false)
          return
        }

        if (!cityName) {
          setError("Localitatea este obligatorie pentru un magazin nou")
          setIsSubmitting(false)
          return
        }

        if (!storeAddress) {
          setError("Adresa: strada, numar este obligatorie pentru un magazin nou")
          setIsSubmitting(false)
          return
        }
      }

      setProcessingStep("Checking user availability...")
      try {
        if (teamLead && !(await validateUserAvailability(teamLead))) {
          setError(`${teamLead} is already assigned to another active assignment`)
          setIsSubmitting(false)
          return
        }

        const validMembers = members.filter((m) => m !== "None" && m !== "")
        for (const member of validMembers) {
          if (!(await validateUserAvailability(member))) {
            setError(`${member} is already assigned to another active assignment`)
            setIsSubmitting(false)
            return
          }
        }
      } catch (error) {
        console.error("Error validating user availability:", error)
        // Continue with the submission even if validation fails
      }

      // Get location data from selected store or new store fields
      const countyValue = selectedStore ? selectedStore.county : selectedCounty
      const cityValue = selectedStore ? selectedStore.city : cityName
      const storeNumberValue = selectedStore ? selectedStore.store_id : storeNumber

      // Construct the location string
      const formattedLocation = `${cityValue}, ${countyValue}${storeNumberValue ? ` (Nr. ${storeNumberValue})` : ""}`

      // Use hardcoded Chitila coordinates
      const startLocationValue = "44.509892,25.9845856" // Hardcoded Chitila coordinates

      // If we're creating a new store
      if (isCreatingNewStore && validateStoreNumber(storeNumber)) {
        setProcessingStep("Creating/updating store in database...")
        try {
          // Create a default address from county and city
          const defaultAddress = `${cityName}, ${selectedCounty}`

          // Add the store to the database
          const response = await fetch("/api/stores/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              store_id: storeNumber,
              description: storeName,
              city: cityName,
              county: selectedCounty,
              address: defaultAddress, // Use county and city for address instead of storeAddress
            }),
          })

          if (!response.ok) {
            console.warn("Failed to create store, but continuing with assignment creation")
          } else {
            console.log("Successfully created/updated store:", storeNumber)
          }
        } catch (error) {
          console.error("Error creating store:", error)
          // Continue with assignment creation even if store creation fails
        }
      }

      setProcessingStep(isEditMode ? "Updating assignment..." : "Creating assignment...")

      // Create dates and convert them to ISO strings
      const currentDate = new Date()
      const currentDateISOString = currentDate.toISOString()

      const data = {
        id: isEditMode ? Number(assignmentId) : undefined,
        type,
        location: formattedLocation,
        team_lead: teamLead,
        due_date: currentDateISOString, // Convert to ISO string
        members: members.filter((m) => m !== "None" && m !== ""),
        start_date: isEditMode ? originalAssignment?.start_date : currentDateISOString,
        status: isEditMode ? originalAssignment?.status : "In Deplasare",
        hours: isEditMode ? originalAssignment?.hours : 0,
        completion_date: isEditMode ? originalAssignment?.completion_date : null,
        // Store details
        store_number: storeNumberValue?.toString() || "",
        county: countyValue || "",
        city: cityValue || "",
        // Location coordinates
        start_location: startLocationValue,
        end_location: "Chitila, Romania", // Always set end location to Chitila
        // Add store_points array with the storeId if available
        store_points: storeNumberValue ? [Number(storeNumberValue)] : [],
        // Preserve existing km and driving_time if in edit mode
        km: isEditMode ? originalAssignment?.km : 0,
        driving_time: isEditMode ? originalAssignment?.driving_time : 0,
        // Add car_plate field
        car_plate: carPlate,
      }

      const location = { latitude: 44.509892, longitude: 25.9845856 }
      const newData = {
        ...data,
        start_location: `${location.latitude},${location.longitude}`,
        end_location: isEditMode ? originalAssignment?.end_location : null,
      }

      let result
      if (isEditMode) {
        result = await updateAssignment(newData)
      } else {
        result = await createAssignment(newData)
      }

      if (!result.success) {
        throw new Error(result.error || `Failed to ${isEditMode ? "update" : "create"} assignment`)
      }

      toast({
        title: "Success",
        description: isEditMode ? "Assignment has been updated successfully." : "New assignment has been created.",
      })

      // Redirect back to assignments page
      router.push("/assignments")
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "submitting"} form:`, error)
      setError(`An error occurred: ${error.message || "Please try again."}`)
    } finally {
      setIsSubmitting(false)
      setProcessingStep("")
    }
  }

  // Check if at least team lead or one member is selected
  const hasTeamMember = teamLead !== "" || members.some((member) => member !== "" && member !== "None")

  const isFormValid =
    !isSubmitting &&
    hasTeamMember &&
    carPlate &&
    (selectedStore ||
      (isCreatingNewStore &&
        storeNumber &&
        validateStoreNumber(storeNumber) &&
        storeName &&
        selectedCounty &&
        cityName &&
        storeAddress))

  return (
    <AppShell>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">{isEditMode ? "Modificare Deplasare" : "Creare Deplasare Nouă"}</h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {processingStep && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>{processingStep}</AlertDescription>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading assignment data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Informații Deplasare</CardTitle>
                  <CardDescription>
                    {isEditMode ? "Modificați detaliile deplasării" : "Completați detaliile deplasării"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="deplasareForm" onSubmit={handleSubmit}>
                    <Tabs
                      value={activeTab}
                      onValueChange={(value) => {
                        setActiveTab(value)
                        if (value === "team") {
                          setHasVisitedTeamTab(true)
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">📌 Detalii</TabsTrigger>
                        <TabsTrigger value="team">🧑‍🤝‍🧑 Echipă</TabsTrigger>
                      </TabsList>
                      <TabsContent value="details">
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="type">
                              Tip Deplasare <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {["Interventie", "Deschidere", "Optimizare"].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setType(option)}
                                  disabled={isSubmitting}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full transition-colors text-xs font-medium", // Made 20% smaller
                                    type === option
                                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                                    isSubmitting && "opacity-50 cursor-not-allowed",
                                  )}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4">
                            <Tabs
                              value={activeStoreTab}
                              onValueChange={(value) => {
                                setActiveStoreTab(value)
                                if (value === "new") {
                                  handleCreateNewStore()
                                } else {
                                  setIsCreatingNewStore(false)
                                }
                              }}
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-2 p-0 bg-transparent">
                                <TabsTrigger
                                  value="existing"
                                  className={`${activeStoreTab === "existing" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"} rounded-l-md border border-gray-200`}
                                >
                                  Magazin Existent
                                </TabsTrigger>
                                <TabsTrigger
                                  value="new"
                                  className={`${activeStoreTab === "new" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"} rounded-r-md border border-gray-200`}
                                >
                                  Magazin Nou
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="existing">
                                <div className="space-y-2 mt-4">
                                  <StoreSelector
                                    onStoreSelect={handleStoreSelect}
                                    initialStoreId={selectedStore?.store_id || null}
                                  />
                                  {!selectedStore && storeNumber && (
                                    <Alert className="bg-yellow-50 border-yellow-200 p-2 mt-2">
                                      <div className="flex items-center">
                                        <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                                        <AlertDescription className="text-yellow-700 text-xs">
                                          Magazin negăsit. Apasati Magazin Nou si completați datele cerute.
                                        </AlertDescription>
                                      </div>
                                    </Alert>
                                  )}
                                  {selectedStore && (
                                    <Alert className="bg-green-50 border-green-200 p-2">
                                      <div className="flex items-center">
                                        <Check className="h-4 w-4 text-green-600 mr-2" />
                                        <AlertDescription className="text-green-600 text-xs">
                                          Magazin selectat: {selectedStore.description} - {selectedStore.city},{" "}
                                          {selectedStore.county}
                                        </AlertDescription>
                                      </div>
                                    </Alert>
                                  )}
                                </div>
                              </TabsContent>

                              <TabsContent value="new">
                                <div className="space-y-4 mt-4 border p-3 rounded-md bg-blue-50 border-blue-200">
                                  <div>
                                    <Label htmlFor="storeNumber" className="text-blue-700">
                                      Nr. Magazin <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="storeNumber"
                                      value={storeNumber}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        // Only allow digits and limit to 4 characters
                                        if (/^\d*$/.test(value) && value.length <= 4) {
                                          setStoreNumber(value)
                                        }
                                      }}
                                      disabled={isSubmitting}
                                      className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                                      placeholder="4 cifre (ex: 3868)"
                                      maxLength={4}
                                    />
                                    <div className="text-xs text-blue-600 mt-1">
                                      Introduceți numarul magazinului (4 cifre)
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor="storeName" className="text-blue-700">
                                      Denumire Magazin <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="storeName"
                                      value={storeName}
                                      onChange={(e) => setStoreName(e.target.value)}
                                      disabled={isSubmitting}
                                      className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                                      placeholder="Ex: Profi Deva Constructorilor"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="county" className="text-blue-700">
                                      Județ <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="county"
                                      value={selectedCounty}
                                      onChange={(e) => {
                                        setSelectedCounty(e.target.value)
                                        // When county changes, reset city
                                        if (e.target.value !== selectedCounty) {
                                          setCityName("")
                                        }
                                      }}
                                      disabled={isSubmitting}
                                      className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                                      placeholder="Introduceți județul"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="city" className="text-blue-700">
                                      Oraș/Comună <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="city"
                                      value={cityName}
                                      onChange={(e) => setCityName(e.target.value)}
                                      disabled={isSubmitting || !selectedCounty}
                                      className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                                      placeholder={
                                        selectedCounty ? "Introduceți localitatea" : "Selectați mai întâi județul"
                                      }
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="storeAddress" className="text-blue-700">
                                      Adresa (strada, număr) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="storeAddress"
                                      value={storeAddress}
                                      onChange={(e) => setStoreAddress(e.target.value)}
                                      disabled={isSubmitting}
                                      className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                                      placeholder="Ex: Strada Principală, nr. 10"
                                    />
                                  </div>

                                  <div className="flex justify-end space-x-2 mt-4">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setActiveStoreTab("existing")
                                        setIsCreatingNewStore(false)
                                      }}
                                      className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Anulează
                                    </Button>
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="team">
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="teamLead">
                              Driver <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              onValueChange={(value) => setTeamLead(value)}
                              value={teamLead}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger id="teamLead" className="mt-1">
                                <SelectValue placeholder="Selectează șef de echipă" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.name}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="carPlate">
                              Masina <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              onValueChange={(value) => setCarPlate(value)}
                              value={carPlate}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger id="carPlate" className="mt-1">
                                <SelectValue placeholder="Selectează mașina" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="B 116 XOX">B 116 XOX</SelectItem>
                                <SelectItem value="B 118 XOX">B 118 XOX</SelectItem>
                                <SelectItem value="B 126 XOX">B 126 XOX</SelectItem>
                                <SelectItem value="B 127 XOX">B 127 XOX</SelectItem>
                                <SelectItem value="B 129 XOX">B 129 XOX</SelectItem>
                                <SelectItem value="B 135 XOX">B 135 XOX</SelectItem>
                                <SelectItem value="B 15 XOX">B 15 XOX</SelectItem>
                                <SelectItem value="IF 01 XOX">IF 01 XOX</SelectItem>
                                <SelectItem value="IF 09 XOX">IF 09 XOX</SelectItem>
                                <SelectItem value="IF 12 XOX">IF 12 XOX</SelectItem>
                                <SelectItem value="IF 14 XOX">IF 14 XOX</SelectItem>
                                <SelectItem value="IF 24 XOX">IF 24 XOX</SelectItem>
                                <SelectItem value="IF 30 XOX">IF 30 XOX</SelectItem>
                                <SelectItem value="IF 32 XOX">IF 32 XOX</SelectItem>
                                <SelectItem value="IF 46 XOX">IF 46 XOX</SelectItem>
                                <SelectItem value="IF 65 XOX">IF 65 XOX</SelectItem>
                                <SelectItem value="alta_masina">Altă mașină</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {[1, 2, 3, 4].map((num, index) => (
                            <div key={num}>
                              <Label htmlFor={`member${num}`}>Membru {num}</Label>
                              <Select
                                onValueChange={(value) => {
                                  const newMembers = [...members]
                                  newMembers[index] = value
                                  setMembers(newMembers)
                                }}
                                value={members[index]}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger id={`member${num}`} className="mt-1">
                                  <SelectValue placeholder={`Selectează membru ${num}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="None">None</SelectItem>
                                  {availableUsers
                                    .filter((u) => u.name !== teamLead)
                                    .map((user) => (
                                      <SelectItem key={user.id} value={user.name}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/assignments")}
                    disabled={isSubmitting}
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Anulează
                  </Button>
                  <Button
                    type="submit"
                    form="deplasareForm"
                    disabled={!isFormValid}
                    className={`${isFormValid ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? "Se actualizează..." : "Se procesează..."}
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            ACTUALIZEAZĂ
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            START
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informații Rută</CardTitle>
                  <CardDescription>Detalii despre ruta deplasării</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Locație de Pornire</div>
                        <div className="font-medium">
                          {HQ_LOCATION.description} ({HQ_LOCATION.address}, {HQ_LOCATION.city})
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Destinație</div>
                        <div className="font-medium">
                          {selectedStore
                            ? `${selectedStore.description} - ${selectedStore.city}, ${selectedStore.county}`
                            : isCreatingNewStore && storeName && cityName && selectedCounty
                              ? `${storeName} - ${cityName}, ${selectedCounty}`
                              : "Selectați un magazin existent sau creați unul nou"}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center">
                      <Route className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Rută</div>
                        <div className="font-medium">
                          {selectedStore
                            ? `Chitila → ${selectedStore.city} → Chitila`
                            : isCreatingNewStore && cityName
                              ? `Chitila → ${cityName} → Chitila`
                              : "Ruta va fi calculată automat"}
                        </div>
                      </div>
                    </div>

                    {isEditMode && originalAssignment && (
                      <>
                        <Separator />
                        <div className="flex items-center">
                          <Route className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm text-muted-foreground">Distanță calculată</div>
                            <div className="font-medium flex items-center">
                              {originalAssignment.km > 0 ? (
                                <span>{originalAssignment.km} km</span>
                              ) : (
                                <span className="text-orange-600">
                                  Distanța nu a fost calculată încă. Salvați modificările și apoi calculați distanța.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

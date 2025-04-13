export type Assignment = {
  id: string
  user_id: number
  date: string | null
  type: string
  status: string
  location: string
  kilometers: number
  hours: number
  created_at: string
  updated_at: string
  team_lead: string
  members: string[]
  start_date: string
  due_date: string | null
  completion_date: string | null
  start_location: string | null
  end_location: string | null
  store_number?: string | null
  county?: string | null
  city?: string | null
  magazin?: string | null
  county_code?: string | null
  car_plate?: string | null
}

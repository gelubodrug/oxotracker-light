export type Assignment = {
  id: number
  type: string
  start_date: string
  due_date: string | null
  completion_date: string | null
  location: string
  team_lead: string
  members: string[]
  status: string
  hours: number
  start_location: string | null
  end_location: string | null
  start_city_county: string | null
  end_city_county: string | null
  mid_point: string | null
  "add-checkpoint-columns": string | null
  km: string
  magazin: string | null
  county_code: string | null
  store_number: string | null
  county: string | null
  city: string | null
  updated_at: string | null
  driving_time: string | null
  store_points?: number[]
  route_updated?: boolean
  store?: {
    id: number
    store_id: string
    name: string
    address: string
    city: string
    county: string
    description?: string
    status?: string
  }
  car_plate?: string | null
}

export type Store = {
  store_id: number
  name: string
  address: string
  city: string
  county: string
  description?: string
  status?: string
}

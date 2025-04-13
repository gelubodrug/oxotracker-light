import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTopWorkersByHours, getTopRidersByKilometers } from "@/app/actions/work-logs"
import { TopWorkers } from "@/components/dashboard/top-workers"
import { TopRiders } from "@/components/dashboard/top-riders"

export default async function UsersPage() {
  // Fetch all workers and riders (no limit)
  const workers = await getTopWorkersByHours(0)
  const riders = await getTopRidersByKilometers(0)

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Team Performance</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Workers - Hours</CardTitle>
            <CardDescription>Team members ranked - total hours worked</CardDescription>
          </CardHeader>
          <CardContent>
            <TopWorkers workers={workers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Riders - Kilometers</CardTitle>
            <CardDescription>Team members ranked - total kilometers traveled</CardDescription>
          </CardHeader>
          <CardContent>
            <TopRiders riders={riders} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

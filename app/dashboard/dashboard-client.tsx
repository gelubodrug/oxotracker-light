import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopWorkers } from "@/components/dashboard/top-workers"
import { TopRiders } from "@/components/dashboard/top-riders"
import { WorkDistribution } from "@/components/dashboard/work-distribution"
import { getTopWorkersByHours, getTopWorkersByKilometers, getWorkDistributionByType } from "@/app/actions/work-logs"

export default async function DashboardClient({
  selectedMonth,
  selectedYear,
}: {
  selectedMonth: number
  selectedYear: number
}) {
  const topWorkers = await getTopWorkersByHours(selectedMonth, selectedYear)
  const topRiders = await getTopWorkersByKilometers(selectedMonth, selectedYear)
  const workDistribution = await getWorkDistributionByType(selectedMonth, selectedYear)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Top Workers</CardTitle>
            <CardDescription>By hours worked</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <TopWorkers workers={topWorkers} />
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Top Riders</CardTitle>
            <CardDescription>By kilometers traveled</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <TopRiders riders={topRiders} />
        </CardContent>
      </Card>
      <Card className="col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Work Distribution</CardTitle>
            <CardDescription>By type</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <WorkDistribution distribution={workDistribution} />
        </CardContent>
      </Card>
    </div>
  )
}

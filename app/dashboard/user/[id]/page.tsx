import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getTopWorkerById } from "@/app/actions/work-logs"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default async function UserDashboardPage({ params }: { params: { id: string } }) {
  const userId = params.id
  const userData = await getTopWorkerById(userId)

  if (!userData) {
    notFound()
  }

  // Ensure assignments is an array
  const assignments = userData.assignments || []

  return (
    <div className="container py-6 space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
      </Link>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={userData.profile_photo} alt={userData.name} />
          <AvatarFallback className="text-2xl">{userData.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{userData.name}</h1>
          <p className="text-muted-foreground">Team Member</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Current month performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Hours</dt>
                <dd className="text-2xl font-bold">{Number(userData.total_hours).toFixed(1)}h</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">KM</dt>
                <dd className="text-2xl font-bold">{Number(userData.total_kilometers || 0).toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Assignments</dt>
                <dd className="text-2xl font-bold">{userData.assignment_count || 0}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Stores</dt>
                <dd className="text-2xl font-bold">{userData.store_count || 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Assignment details card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Assignments</CardTitle>
            <CardDescription>All assignments for current month</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments && assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment: any, index: number) => (
                  <div key={index} className="border-b pb-3 last:border-none last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              assignment.type === "Interventie"
                                ? "bg-blue-500"
                                : assignment.type === "Optimizare"
                                  ? "bg-orange-500"
                                  : assignment.type === "Deschidere"
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                            }`}
                          ></div>
                          <h3 className="font-medium">{assignment.type || "Unknown"}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.location || "No location"} - Store #{assignment.store_number || "N/A"}
                        </p>
                        {assignment.start_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(assignment.start_date), "MMM d, yyyy")}
                              {assignment.completion_date &&
                                ` - ${format(new Date(assignment.completion_date), "MMM d, yyyy")}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{assignment.hours}h</p>
                        <p className="text-sm text-muted-foreground">{assignment.km}km</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No assignments found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import type { User } from "@/lib/db/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Coins } from "lucide-react"

interface WorkerStatsProps {
  users: User[]
  limit?: number
}

export function WorkerStats({ users, limit = 10 }: WorkerStatsProps) {
  // Sort users by status (active first) and then by name
  const sortedUsers = [...users]
    .sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1
      if (a.status !== "active" && b.status === "active") return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Worker Stats</CardTitle>
        <CardDescription>Status for top {limit} workers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedUsers.map((user) => (
            <div key={user.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {user.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.status || "unknown"}</p>
              </div>
              <div className="ml-auto font-medium">
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-gray-400" />
                  <span>0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

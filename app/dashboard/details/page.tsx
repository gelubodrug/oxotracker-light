import { AppShell } from "@/components/layout/app-shell"
import { UserDetailsContent } from "./user-details-content"

export default function UserDetailsPage() {
  return (
    <AppShell>
      <div className="container mx-auto py-6">
        <UserDetailsContent />
      </div>
    </AppShell>
  )
}

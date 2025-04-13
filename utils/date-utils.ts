export function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A"

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}

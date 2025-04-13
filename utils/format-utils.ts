/**
 * Formats a distance in kilometers to a human-readable string
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  return `${distance.toFixed(1)} km`
}

/**
 * Formats a duration in minutes to a human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return "Less than a minute"
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)

  if (hours === 0) {
    return `${remainingMinutes} min`
  } else if (remainingMinutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`
  } else {
    return `${hours} hr ${remainingMinutes} min`
  }
}

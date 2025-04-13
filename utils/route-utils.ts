/**
 * Redirects to the route calculation page for a specific assignment
 * @param assignmentId The ID of the assignment to calculate the route for
 */
export function navigateToRouteCalculation(assignmentId: number): void {
  if (!assignmentId) {
    console.error("Invalid assignment ID provided for route calculation")
    return
  }

  // Navigate to the route calculation page with the assignment ID
  window.location.href = `/test/assignment-route?id=${assignmentId}`
}

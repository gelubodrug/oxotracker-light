import { AssignmentKmCell } from "@/components/assignment-km-cell"

// Example usage in an assignment list
export function AssignmentList({ assignments }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {assignments.map((assignment) => (
          <tr key={assignment.id}>
            <td className="px-4 py-2">{assignment.id}</td>
            <td className="px-4 py-2">{assignment.type}</td>
            <td className="px-4 py-2">{assignment.location}</td>
            {/* Use the ClickableKm component for the distance cell */}
            <AssignmentKmCell assignmentId={assignment.id} km={assignment.km} drivingTime={assignment.driving_time} />
            <td className="px-4 py-2">{/* Actions */}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

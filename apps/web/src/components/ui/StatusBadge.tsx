interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    'In_Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    'Pending': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    'Planning': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    'Active': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    'Monitoring': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    'On Track': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'At Risk': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    'Critical': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    'High': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    'Medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    'Low': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Approved': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Rejected': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    'Blocked': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    'Mitigated': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

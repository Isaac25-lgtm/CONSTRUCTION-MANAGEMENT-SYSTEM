import { FileQuestion } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
                {icon || <FileQuestion className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-sm">{description}</p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}

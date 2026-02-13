import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
    const sizeMap = {
        sm: { spinner: 16, text: 'text-sm', padding: 'p-4' },
        md: { spinner: 24, text: 'text-base', padding: 'py-12' },
        lg: { spinner: 32, text: 'text-lg', padding: 'py-20' },
    };

    const s = sizeMap[size];

    return (
        <div className={`flex flex-col items-center justify-center ${s.padding}`}>
            <Loader2 size={s.spinner} className="animate-spin text-primary-600 mb-3" />
            <p className={`${s.text} text-gray-500 dark:text-gray-400`}>{message}</p>
        </div>
    );
}

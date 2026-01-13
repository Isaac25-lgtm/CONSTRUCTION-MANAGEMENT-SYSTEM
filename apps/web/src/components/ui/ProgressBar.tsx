interface ProgressBarProps {
  progress: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
}

export default function ProgressBar({ progress, color = 'blue', showLabel = false }: ProgressBarProps) {
  const colorClasses: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-dark-700 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%`, backgroundColor: colorClasses[color] }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-500 dark:text-gray-400 w-10">{progress}%</span>
      )}
    </div>
  );
}

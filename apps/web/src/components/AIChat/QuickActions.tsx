import React from 'react';
import { TrendingUp, DollarSign, Clock, Lightbulb } from 'lucide-react';

interface QuickActionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const quickActions = [
  {
    icon: TrendingUp,
    label: 'Analyze risks',
    question: 'Analyze my project risks and suggest mitigation strategies'
  },
  {
    icon: DollarSign,
    label: 'Budget check',
    question: "How's my budget looking? Any concerns about overspending?"
  },
  {
    icon: Clock,
    label: 'Task delays',
    question: 'What tasks are at risk of delay? How can I get back on track?'
  },
  {
    icon: Lightbulb,
    label: 'Optimize',
    question: 'Suggest optimizations to improve project efficiency'
  },
];

export default function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-gray-200 dark:border-dark-600">
      {quickActions.map((action, index) => (
        <button
          key={index}
          onClick={() => onSelect(action.question)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <action.icon size={12} />
          {action.label}
        </button>
      ))}
    </div>
  );
}

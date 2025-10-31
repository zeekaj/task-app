// UI Primitives - Badge Component
import React from 'react';

type BadgeColor = 
  | 'gray' | 'blue' | 'cyan' | 'purple' | 'pink' 
  | 'green' | 'yellow' | 'orange' | 'red';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'subtle';
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function Badge({ 
  children, 
  color = 'blue', 
  size = 'md',
  variant = 'solid',
  className = '',
  onClick,
  title
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const colorClasses = {
    solid: {
      gray: 'bg-gray-600 text-white border-gray-500',
      blue: 'bg-blue-600 text-white border-blue-500',
      cyan: 'bg-cyan-600 text-white border-cyan-500',
      purple: 'bg-purple-600 text-white border-purple-500',
      pink: 'bg-pink-600 text-white border-pink-500',
      green: 'bg-green-600 text-white border-green-500',
      yellow: 'bg-yellow-600 text-white border-yellow-500',
      orange: 'bg-orange-600 text-white border-orange-500',
      red: 'bg-red-600 text-white border-red-500'
    },
    outline: {
      gray: 'bg-transparent text-gray-300 border-gray-500',
      blue: 'bg-transparent text-blue-300 border-blue-500',
      cyan: 'bg-transparent text-cyan-300 border-cyan-500',
      purple: 'bg-transparent text-purple-300 border-purple-500',
      pink: 'bg-transparent text-pink-300 border-pink-500',
      green: 'bg-transparent text-green-300 border-green-500',
      yellow: 'bg-transparent text-yellow-300 border-yellow-500',
      orange: 'bg-transparent text-orange-300 border-orange-500',
      red: 'bg-transparent text-red-300 border-red-500'
    },
    subtle: {
      gray: 'bg-gray-600/20 text-gray-300 border-gray-500/30',
      blue: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      cyan: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30',
      purple: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
      pink: 'bg-pink-600/20 text-pink-300 border-pink-500/30',
      green: 'bg-green-600/20 text-green-300 border-green-500/30',
      yellow: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
      orange: 'bg-orange-600/20 text-orange-300 border-orange-500/30',
      red: 'bg-red-600/20 text-red-300 border-red-500/30'
    }
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full
        border
        font-medium
        transition-all duration-200
        ${sizeClasses[size]}
        ${colorClasses[variant][color]}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      onClick={onClick}
      title={title}
    >
      {children}
    </span>
  );
}

// Specialized badge variants

interface StatusBadgeProps {
  status: 'not_started' | 'planning' | 'executing' | 'in_progress' | 'post_event' | 'completed' | 'blocked' | 'review' | 'backlog' | 'archived';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    not_started: { label: 'Not Started', color: 'gray' as BadgeColor },
    planning: { label: 'Planning', color: 'purple' as BadgeColor },
    executing: { label: 'Executing', color: 'blue' as BadgeColor },
    in_progress: { label: 'In Progress', color: 'blue' as BadgeColor },
    post_event: { label: 'Post-Event', color: 'orange' as BadgeColor },
    completed: { label: 'Completed', color: 'green' as BadgeColor },
    blocked: { label: 'Blocked', color: 'red' as BadgeColor },
    review: { label: 'Review', color: 'purple' as BadgeColor },
    backlog: { label: 'Backlog', color: 'gray' as BadgeColor },
    archived: { label: 'Archived', color: 'gray' as BadgeColor }
  };

  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <Badge color={config.color} size={size} variant="solid">
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const priorityConfig = {
    low: { label: 'Low', color: 'blue' as BadgeColor },
    medium: { label: 'Medium', color: 'yellow' as BadgeColor },
    high: { label: 'High', color: 'orange' as BadgeColor },
    critical: { label: 'Critical', color: 'red' as BadgeColor }
  };

  const config = priorityConfig[priority];

  return (
    <Badge color={config.color} size={size} variant="solid">
      {config.label}
    </Badge>
  );
}

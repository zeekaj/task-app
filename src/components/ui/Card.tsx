// UI Primitives - Card Component
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'cyan' | 'purple' | 'blue' | 'green' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({ 
  children, 
  className = '', 
  hover = false,
  glow = 'none',
  padding = 'md',
  onClick 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const glowClasses = {
    none: '',
    cyan: 'shadow-[0_0_20px_rgba(0,217,255,0.2)] border-cyan-500/30',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.2)] border-purple-500/30',
    blue: 'shadow-[0_0_20px_rgba(59,130,246,0.2)] border-blue-500/30',
    green: 'shadow-[0_0_20px_rgba(16,185,129,0.2)] border-green-500/30'
  };

  return (
    <div
      className={`
        bg-[rgba(20,20,30,0.6)] 
        backdrop-blur-sm 
        border border-white/10 
        rounded-xl
        ${paddingClasses[padding]}
        ${hover ? 'hover:bg-[rgba(30,30,40,0.7)] hover:border-white/20 transition-all duration-200 cursor-pointer' : ''}
        ${glowClasses[glow]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface KPITileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'cyan' | 'purple' | 'blue' | 'green' | 'orange' | 'red';
}

export function KPITile({ icon, label, value, subtitle, trend, color = 'blue' }: KPITileProps) {
  const colorClasses = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400'
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  };

  return (
    <Card padding="md" hover={false}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span className={colorClasses[color]}>{icon}</span>
            <span>{label}</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          {subtitle && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {trend && trendIcons[trend]}
              <span>{subtitle}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ChartPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ChartPanel({ title, icon, children, actions }: ChartPanelProps) {
  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-purple-400">{icon}</span>}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </Card>
  );
}

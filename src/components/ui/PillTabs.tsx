// UI Primitives - PillTabs Component
import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface PillTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}

export function PillTabs({ 
  tabs, 
  activeTab, 
  onChange, 
  size = 'md',
  variant = 'primary'
}: PillTabsProps) {
  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-5 py-2 text-base'
  };

  const getTabClasses = (tabId: string) => {
    const isActive = tabId === activeTab;
    
    if (variant === 'primary') {
      return isActive
        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-transparent shadow-[0_0_20px_rgba(0,217,255,0.4)]'
        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300';
    }
    
    // Secondary variant with different colors per tab
    const colors = ['cyan', 'purple', 'blue', 'green', 'orange', 'pink'];
    const colorIndex = tabs.findIndex(t => t.id === tabId) % colors.length;
    const color = colors[colorIndex];
    
    const colorClasses = {
      cyan: 'from-cyan-500 to-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
      purple: 'from-purple-500 to-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
      blue: 'from-blue-500 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)]',
      green: 'from-green-500 to-green-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
      orange: 'from-orange-500 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.4)]',
      pink: 'from-pink-500 to-pink-600 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
    };
    
    return isActive
      ? `bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} text-white border-transparent`
      : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            inline-flex items-center gap-2
            rounded-full
            border
            font-medium
            transition-all duration-200
            ${sizeClasses[size]}
            ${getTabClasses(tab.id)}
          `}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={`
              px-1.5 py-0.5 
              rounded-full 
              text-xs 
              font-semibold
              ${tab.id === activeTab ? 'bg-white/20' : 'bg-gray-700'}
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Top navigation variant (for main app tabs)
interface TopNavTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function TopNavTabs({ tabs, activeTab, onChange }: TopNavTabsProps) {
  return (
    <nav className="flex items-center gap-1 bg-[rgba(20,20,30,0.6)] rounded-full p-1 border border-white/10">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              inline-flex items-center gap-2
              px-4 py-2
              rounded-full
              text-xs md:text-sm font-inter font-semibold uppercase tracking-wide
              transition-all duration-200
              ${isActive 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(0,217,255,0.3)]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }
            `}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

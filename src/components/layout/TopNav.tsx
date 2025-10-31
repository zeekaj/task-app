// Top Navigation Component
import { useState } from 'react';
import { TopNavTabs } from '../ui/PillTabs';
import { Badge } from '../ui/Badge';
import logo from '../../assets/Logo Only-cropped.png';

interface TopNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  account?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    title?: string;
  };
  onSignOut?: () => void | Promise<void>;
}

export function TopNav({ activeTab, onTabChange, account, onSignOut }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'team',
      label: 'Team',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'style-guide',
      label: 'Style Guide',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
        <div className="flex items-center gap-0.5 group cursor-pointer transition-all duration-300 hover:opacity-80">
          <img src={logo} alt="Momentum Logo" className="h-12 sm:h-14 transition-transform duration-300 group-hover:scale-105" />
          <span className="text-xl sm:text-2xl font-inter font-bold tracking-tight text-gray-300 transition-colors duration-300 group-hover:text-gray-100">
            Momentum
          </span>
        </div>          {/* Navigation Tabs */}
          <TopNavTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={onTabChange} 
          />

          {/* Settings and Account */}
          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => onTabChange('settings')}
              className={`
                p-2 rounded-lg transition-colors duration-200
                ${activeTab === 'settings'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756.426-1.756 2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Account menu */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="ml-1 flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/5 text-gray-200"
              title={account?.email || 'Account'}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center font-semibold">
                {(account?.name || account?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm text-white">{account?.name || account?.email || 'Unknown'}</span>
                {account?.role && (
                  <div className="mt-0.5">
                    {(() => {
                      const r = (account.role || '').toLowerCase();
                      const map: Record<string, { label: string; color: any }> = {
                        owner: { label: 'Owner', color: 'purple' },
                        admin: { label: 'Admin', color: 'red' },
                        technician: { label: 'Technician', color: 'blue' },
                        member: { label: 'Technician', color: 'blue' },
                        freelance: { label: 'Freelance', color: 'cyan' },
                        viewer: { label: 'Viewer', color: 'gray' },
                      };
                      const cfg = map[r] || { label: account.role, color: 'gray' };
                      return <Badge size="sm" color={cfg.color as any}>{cfg.label}</Badge>;
                    })()}
                  </div>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.207l3.71-3.976a.75.75 0 111.08 1.04l-4.24 4.54a.75.75 0 01-1.08 0l-4.24-4.54a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 min-w-[200px] bg-gray-900 border border-white/10 rounded-xl shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-white/10">
                  <div className="text-white text-sm">{account?.name || account?.email || 'Signed in'}</div>
                  {account?.email && <div className="text-gray-400 text-xs">{account.email}</div>}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); onTabChange('settings'); }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-200"
                >
                  Edit Profile
                </button>
                <button
                  onClick={async () => { setMenuOpen(false); if (onSignOut) await onSignOut(); }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-200"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// AppLayout - Main application layout with top navigation
import React from 'react';
import { TopNav } from './TopNav';
import type { Notification, TeamMember } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  account?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    title?: string;
  };
  uid: string;
  organizationId: string | null;
  teamMember?: (TeamMember & { id: string }) | null;
  onNotificationClick?: (notification: Notification & { id: string }) => void;
  onSignOut?: () => void | Promise<void>;
  onProfileUpdate?: (updates: Partial<TeamMember>) => Promise<void>;
}

export function AppLayout({ children, activeTab, onTabChange, account, uid, organizationId, teamMember, onNotificationClick, onSignOut, onProfileUpdate }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      <TopNav 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        account={account}
        uid={uid}
        organizationId={organizationId}
        teamMember={teamMember}
        onNotificationClick={onNotificationClick}
        onSignOut={onSignOut}
        onProfileUpdate={onProfileUpdate}
      />
      
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

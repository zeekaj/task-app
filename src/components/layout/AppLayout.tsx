// AppLayout - Main application layout with top navigation
import React from 'react';
import { TopNav } from './TopNav';

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
  onSignOut?: () => void | Promise<void>;
}

export function AppLayout({ children, activeTab, onTabChange, account, onSignOut }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      <TopNav activeTab={activeTab} onTabChange={onTabChange} account={account} onSignOut={onSignOut} />
      
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

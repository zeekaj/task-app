// src/components/DevRoleSwitcher.tsx
/**
 * Development-only component for testing role-based features
 * Allows switching between team members without logging out
 * 
 * Usage:
 * - Press Ctrl+Shift+D (or Cmd+Shift+D on Mac) to toggle
 * - Select a team member to impersonate
 * - The app will behave as if you're logged in as that user
 */

import { useState, useEffect } from 'react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useOrganizationId } from '../hooks/useOrganization';
import type { TeamMember, WithId, TeamMemberRole } from '../types';

interface DevRoleSwitcherProps {
  currentUserId: string;
  currentMember: (TeamMember & { id: string }) | null;
  onSwitchUser: (member: WithId<TeamMember>) => void;
  onResetToReal: () => void;
}

// Check if we're in development mode
const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;

export function DevRoleSwitcher({ 
  currentUserId, 
  currentMember, 
  onSwitchUser, 
  onResetToReal 
}: DevRoleSwitcherProps) {
  const { orgId } = useOrganizationId();
  const [isOpen, setIsOpen] = useState(false);
  const [impersonatedMember, setImpersonatedMember] = useState<WithId<TeamMember> | null>(null);
  const teamMembers = useTeamMembers(orgId || '');

  // Don't render in production
  if (!isDev) return null;

  // Keyboard shortcut: Ctrl+Shift+D or Cmd+Shift+D
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen]);

  const handleSwitchToMember = (member: WithId<TeamMember>) => {
    setImpersonatedMember(member);
    onSwitchUser(member);
    setIsOpen(false);
  };

  const handleResetToReal = () => {
    setImpersonatedMember(null);
    onResetToReal();
    setIsOpen(false);
  };

  const getRoleBadgeColor = (role: TeamMemberRole): string => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'technician': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'freelance': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'viewer': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen && !impersonatedMember) return null;

  return (
    <>
      {/* Floating dev mode indicator */}
      {impersonatedMember && (
        <div className="fixed top-4 right-4 z-[9999] bg-yellow-500/10 backdrop-blur-sm border-2 border-yellow-500/50 rounded-lg px-4 py-2 shadow-lg shadow-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-300 text-sm font-medium">DEV MODE</span>
            </div>
            <div className="h-4 w-px bg-yellow-500/30" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {getInitials(impersonatedMember.name)}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">{impersonatedMember.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeColor(impersonatedMember.role)} inline-block w-fit`}>
                  {impersonatedMember.role}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="ml-2 text-yellow-300 hover:text-yellow-200 transition-colors"
              title="Change user (Ctrl+Shift+D)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  <h2 className="text-xl font-bold text-white">Development Role Switcher</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Switch between team members to test role-based features
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Current real user */}
              <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {currentMember ? getInitials(currentMember.name) : '?'}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {currentMember?.name || 'Unknown User'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Real authenticated user
                      </div>
                    </div>
                  </div>
                  {impersonatedMember && (
                    <button
                      onClick={handleResetToReal}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Reset to Real User
                    </button>
                  )}
                </div>
              </div>

              {/* Team members list */}
              <div>
                <h3 className="text-white font-medium mb-3">Switch to Team Member:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {teamMembers?.map(member => {
                    const isCurrentReal = member.userId === currentUserId;
                    const isCurrent = impersonatedMember?.id === member.id;

                    return (
                      <button
                        key={member.id}
                        onClick={() => handleSwitchToMember(member)}
                        disabled={isCurrentReal && !impersonatedMember}
                        className={`
                          w-full p-4 rounded-lg border transition-all text-left
                          ${isCurrent 
                            ? 'bg-yellow-500/20 border-yellow-500/50' 
                            : isCurrentReal && !impersonatedMember
                            ? 'bg-gray-700/30 border-gray-600 opacity-50 cursor-default'
                            : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
                              ${isCurrent 
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                                : 'bg-gradient-to-br from-gray-600 to-gray-700'
                              }
                            `}>
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{member.name}</span>
                                {isCurrentReal && (
                                  <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                                    You
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeColor(member.role)}`}>
                                  {member.role}
                                </span>
                                {member.email && (
                                  <span className="text-gray-400 text-xs">{member.email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isCurrentReal || impersonatedMember ? (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-700/30 border-t border-gray-600 px-6 py-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Press <kbd className="px-2 py-0.5 bg-gray-600 rounded text-xs">Ctrl+Shift+D</kbd> to toggle this panel</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// src/hooks/useUserContext.ts
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getTeamMemberByUserId } from '../services/auth';
import type { TeamMemberRole } from '../types';

interface UserContextData {
  userId: string | null; // Firebase Auth UID
  teamMemberId: string | null; // Team member document ID
  organizationId: string | null;
  role: TeamMemberRole | null;
  impersonatedMemberId?: string | null;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextData>({
  userId: null,
  teamMemberId: null,
  organizationId: null,
  role: null,
  loading: true,
  error: null,
});

export function useUserContext() {
  return useContext(UserContext);
}

interface UserContextProviderProps {
  children: ReactNode;
}

export function UserContextProvider({ children }: UserContextProviderProps) {
  const user = useAuth();
  const [contextData, setContextData] = useState<UserContextData>({
    userId: null,
    teamMemberId: null,
    organizationId: null,
    role: null,
    impersonatedMemberId: null,
    loading: true,
    error: null,
  });
  
  // Track when to reload (force refresh on impersonation changes)
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUserContext() {
      try {
        if (user === undefined) return; // Auth still initializing
        
        if (!user) {
          // No user logged in
          if (mounted) {
            setContextData({
              userId: null,
              teamMemberId: null,
              organizationId: null,
              role: null,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // User is logged in, fetch their team member record
        const member = await getTeamMemberByUserId(user.uid);

        // Development-only: override with impersonated member if present
        let organizationId = member?.organizationId || user.uid;
        let role: TeamMemberRole = (member?.role as TeamMemberRole) || 'owner';
        let teamMemberId: string | null = member?.id || null;
        let impersonatedMemberId: string | null = null;
        try {
          const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;
          if (isDev) {
            const savedId = localStorage.getItem('devRoleSwitcher.impersonatedId');
            if (savedId) {
              const { getTeamMemberById } = await import('../services/teamMembers');
              const impersonated = await getTeamMemberById(savedId);
              if (impersonated && impersonated.active !== false) {
                organizationId = impersonated.organizationId || organizationId;
                role = impersonated.role as TeamMemberRole;
                teamMemberId = savedId; // Use impersonated member ID
                impersonatedMemberId = savedId;
              } else {
                localStorage.removeItem('devRoleSwitcher.impersonatedId');
              }
            }
          }
        } catch (_e) {
          // ignore storage/import issues in dev
        }

        if (mounted) {
          setContextData({
            userId: user.uid,
            teamMemberId,
            organizationId,
            role,
            impersonatedMemberId,
            loading: false,
            error: null,
          });
        }
      } catch (e: any) {
        if (mounted) {
          setContextData({
            userId: user?.uid || null,
            teamMemberId: null,
            organizationId: user?.uid || null, // Fallback
            role: 'owner', // Safe fallback
            impersonatedMemberId: null,
            loading: false,
            error: e?.message || 'Failed to load user context',
          });
        }
      }
    }

    loadUserContext();

    return () => {
      mounted = false;
    };
  }, [user, reloadTrigger]);

  // Listen for impersonation changes in development mode
  useEffect(() => {
    const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;
    if (!isDev) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'devRoleSwitcher.impersonatedId') {
        // Trigger a reload of user context
        setReloadTrigger(prev => prev + 1);
      }
    };

    // Also listen for custom event (for same-window changes)
    const handleCustomEvent = () => {
      setReloadTrigger(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('devRoleSwitcher:change', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('devRoleSwitcher:change', handleCustomEvent);
    };
  }, []);

  return (
    <UserContext.Provider value={contextData}>
      {children}
    </UserContext.Provider>
  );
}

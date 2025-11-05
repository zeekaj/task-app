// src/hooks/useUserContext.ts
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getTeamMemberByUserId } from '../services/auth';
import type { TeamMemberRole } from '../types';

interface UserContextData {
  userId: string | null;
  organizationId: string | null;
  role: TeamMemberRole | null;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextData>({
  userId: null,
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
    organizationId: null,
    role: null,
    loading: true,
    error: null,
  });

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
        
        if (mounted) {
          setContextData({
            userId: user.uid,
            organizationId: member?.organizationId || user.uid, // Owner fallback
            role: (member?.role as TeamMemberRole) || 'owner', // Owner fallback
            loading: false,
            error: null,
          });
        }
      } catch (e: any) {
        if (mounted) {
          setContextData({
            userId: user?.uid || null,
            organizationId: user?.uid || null, // Fallback
            role: 'owner', // Safe fallback
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
  }, [user]);

  return (
    <UserContext.Provider value={contextData}>
      {children}
    </UserContext.Provider>
  );
}

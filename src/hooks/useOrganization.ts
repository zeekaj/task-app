// src/hooks/useOrganization.ts
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getTeamMemberByUserId } from '../services/auth';

/**
 * Resolves the organization id (orgId) for the current user.
 * - For owners, orgId === user.uid
 * - For members, orgId === teamMember.organizationId
 */
export function useOrganizationId() {
  const user = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function resolveOrg() {
      try {
        if (user === undefined) return; // still initializing auth
        if (!user) {
          if (mounted) {
            setOrgId(null);
            setLoading(false);
          }
          return;
        }
        // Look up team member record by userId
        const member = await getTeamMemberByUserId(user.uid);
        const candidate = member?.organizationId || user.uid; // owner default
        if (mounted) {
          setOrgId(candidate);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Failed to resolve organization');
          // Fall back to user uid to avoid blocking
          setOrgId(user && 'uid' in user ? (user as any).uid : null);
          setLoading(false);
        }
      }
    }
    resolveOrg();
    return () => {
      mounted = false;
    };
  }, [user]);

  return { orgId, loading, error } as const;
}

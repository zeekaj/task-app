// src/hooks/useRoleBasedProjects.ts
import { useMemo } from 'react';
import { useProjects, type ProjectsQueryOptions } from './useProjects';
import { useUserContext } from './useUserContext';
import { useTeamMembers } from './useTeamMembers';
import { filterProjectsByPermission } from '../utils/permissions';

/**
 * Hook that wraps useProjects with role-based filtering
 * Automatically filters projects based on user's role and permissions
 * 
 * @param organizationId - The organization ID
 * @param options - Query options for filtering projects
 * @param skipRoleFilter - Skip role-based filtering (for admin toggles)
 */
export function useRoleBasedProjects(
  organizationId?: string, 
  options?: ProjectsQueryOptions,
  skipRoleFilter: boolean = false
) {
  const { teamMemberId, role } = useUserContext();
  const teamMembers = useTeamMembers(organizationId);
  const teamMemberName = teamMemberId ? teamMembers?.find(m => m.id === teamMemberId)?.name : undefined;
  const allProjects = useProjects(organizationId, options);

  // Apply role-based filtering
  const filteredProjects = useMemo(() => {
    if (skipRoleFilter || !role || !teamMemberId) {
      return allProjects;
    }
    return filterProjectsByPermission(allProjects, role, teamMemberId, teamMemberName);
  }, [allProjects, role, teamMemberId, teamMemberName, skipRoleFilter]);

  return filteredProjects;
}

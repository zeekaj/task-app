// src/hooks/useRoleBasedTasks.ts
import { useMemo } from 'react';
import { useTasks, type TasksQueryOptions } from './useTasks';
import { useUserContext } from './useUserContext';
import { useRoleBasedProjects } from './useRoleBasedProjects';
import { useTeamMembers } from './useTeamMembers';
import { filterTasksByPermission } from '../utils/permissions';

/**
 * Hook that wraps useTasks with role-based filtering
 * Automatically filters tasks based on user's role and permissions
 * 
 * @param organizationId - The organization ID
 * @param options - Query options for filtering tasks
 * @param skipRoleFilter - Skip role-based filtering (for admin toggles)
 */
export function useRoleBasedTasks(
  organizationId?: string, 
  options?: TasksQueryOptions,
  skipRoleFilter: boolean = false
) {
  const { teamMemberId, role } = useUserContext();
  const allTasks = useTasks(organizationId, options);
  const userProjects = useRoleBasedProjects(organizationId);
  const teamMembers = useTeamMembers(organizationId);
  const teamMemberName = teamMemberId ? teamMembers?.find(m => m.id === teamMemberId)?.name : undefined;

  // Apply role-based filtering
  const filteredTasks = useMemo(() => {
    if (skipRoleFilter || !role || !teamMemberId) {
      return allTasks;
    }
    
    // Get project IDs the user is assigned to
    const userProjectIds = userProjects.map(p => p.id).filter(Boolean) as string[];
    
    // Dev debug logging: output concise visibility info when running locally
    try {
      const isDev = typeof import.meta !== 'undefined' ? (import.meta.env?.DEV || import.meta.env?.MODE === 'development') : false;
      if (isDev) {
        // Keep logs small and actionable
        // eslint-disable-next-line no-console
        console.debug('[useRoleBasedTasks] teamMemberId=', teamMemberId, 'teamMemberName=', teamMemberName, 'userProjectIds=', userProjectIds.length, 'allTasks=', allTasks.length);
      }
    } catch (_) {}

    const filtered = filterTasksByPermission(allTasks, role, teamMemberId, userProjectIds, teamMemberName);
    try {
      const isDev = typeof import.meta !== 'undefined' ? (import.meta.env?.DEV || import.meta.env?.MODE === 'development') : false;
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug('[useRoleBasedTasks] filteredTasks=', filtered.length);
      }
    } catch (_) {}
    return filtered;
  }, [allTasks, role, teamMemberId, teamMemberName, skipRoleFilter, userProjects]);

  return filteredTasks;
}

// src/hooks/useRoleBasedTasks.ts
import { useMemo } from 'react';
import { useTasks, type TasksQueryOptions } from './useTasks';
import { useUserContext } from './useUserContext';
import { useRoleBasedProjects } from './useRoleBasedProjects';
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

  // Apply role-based filtering
  const filteredTasks = useMemo(() => {
    if (skipRoleFilter || !role || !teamMemberId) {
      return allTasks;
    }
    
    // Get project IDs the user is assigned to
    const userProjectIds = userProjects.map(p => p.id).filter(Boolean) as string[];
    
    return filterTasksByPermission(allTasks, role, teamMemberId, userProjectIds);
  }, [allTasks, role, teamMemberId, skipRoleFilter, userProjects]);

  return filteredTasks;
}

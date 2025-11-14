// src/utils/permissions.ts

import type { TeamMemberRole, Task, Project } from '../types';

/**
 * Normalize legacy 'member' role to 'technician'
 * @param role The role to normalize
 */
function normalizeRole(role: TeamMemberRole | string): TeamMemberRole {
  // Legacy 'member' records were intended to be technicians — normalize accordingly
  return role === 'member' ? 'technician' : role as TeamMemberRole;
}

/**
 * Role-based permission system for organization data visibility
 * 
 * Roles (from highest to lowest access):
 * - owner: Full access to everything
 * - admin: Same as owner (full access)
 * - technician: Can see all, edit own items
 * - freelance: Can only see and edit items assigned to them
 * - viewer: Read-only access to all
 */

/**
 * Check if a role can view all tasks in the organization
 * Note: Technicians, admins, and owners can see all tasks
 * Freelancers can only see their own tasks and tasks assigned to them
 */
export function canViewAllTasks(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  // Only owners and admins can view all tasks across the org; technicians see only their own
  return normalized === 'owner' || normalized === 'admin';
}

/**
 * Check if a role can view all projects in the organization
 */
export function canViewAllProjects(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  // Only owners and admins can view all projects across the org
  return normalized === 'owner' || normalized === 'admin';
}

/**
 * Check if a role can view all team members in the organization
 */
export function canViewAllTeamMembers(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician' || normalized === 'viewer';
}

/**
 * Check if a role can view all shifts in the organization
 */
export function canViewAllShifts(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician' || normalized === 'viewer';
}

/**
 * Check if a user can edit a specific task
 * @param role User's role
 * @param task Task to check
 * @param userId Current user's ID
 */
export function canEditTask(role: TeamMemberRole | string, task: Task, userId: string): boolean {
  const normalized = normalizeRole(role);
  // Owner and admin can edit anything
  if (normalized === 'owner' || normalized === 'admin') return true;
  
  // Technicians can edit anything
  if (normalized === 'technician') return true;
  
  // Freelancers can only edit tasks assigned to them
  if (normalized === 'freelance') {
    return task.assignee === userId;
  }
  
  // Viewers cannot edit
  return false;
}

/**
 * Check if a user can delete a task
 * @param role User's role
 * @param task Task to check
 * @param userId Current user's ID (task creator)
 */
export function canDeleteTask(role: TeamMemberRole | string, task: Task, userId: string): boolean {
  const normalized = normalizeRole(role);
  // Owner and admin can delete anything
  if (normalized === 'owner' || normalized === 'admin') return true;
  
  // Technicians can delete their own tasks
  if (normalized === 'technician') {
    // Assume task has a createdBy field, or check assignee
    return task.assignee === userId;
  }
  
  // Freelancers and viewers cannot delete
  return false;
}

/**
 * Check if a user can edit a specific project
 * @param role User's role
 * @param project Project to check
 * @param userId Current user's ID
 */
export function canEditProject(role: TeamMemberRole | string, project: Project, userId: string): boolean {
  const normalized = normalizeRole(role);
  // Owner and admin can edit anything
  if (normalized === 'owner' || normalized === 'admin') return true;
  
  // Technicians can edit anything
  if (normalized === 'technician') return true;
  
  // Project manager can edit their projects
  if (project.projectManager === userId) return true;
  
  // Owner can edit their projects
  if (project.owner === userId) return true;
  
  // Check if user is in assignees array
  if (project.assignees?.includes(userId)) return true;
  
  // Freelancers cannot edit projects they're not assigned to
  return false;
}

/**
 * Check if a user can delete a project
 * @param role User's role
 */
export function canDeleteProject(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  // Only owner and admin can delete projects
  return normalized === 'owner' || normalized === 'admin';
}

/**
 * Check if a user can assign tasks/projects to other team members
 */
export function canAssignToOthers(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can create new tasks
 */
export function canCreateTask(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can create new projects
 */
export function canCreateProject(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can manage team members (create, edit, archive)
 */
export function canManageTeamMembers(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin';
}

/**
 * Check if a user can manage shifts (create, edit, delete)
 */
export function canManageShifts(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can view a specific shift
 * @param role User's role
 * @param shiftEmployeeIds Array of employee IDs assigned to the shift
 * @param userId Current user's ID
 */
export function canViewShift(role: TeamMemberRole | string, shiftEmployeeIds: string[], userId: string): boolean {
  // Owner, admin, technician, and viewer can see all shifts
  if (canViewAllShifts(role)) return true;
  
  // Freelancers can only see shifts they're assigned to
  const normalized = normalizeRole(role);
  if (normalized === 'freelance') {
    return shiftEmployeeIds.includes(userId);
  }
  
  return false;
}

/**
 * Check if a user can manage clients and venues
 */
export function canManageClientsAndVenues(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can block/unblock tasks or projects
 */
export function canManageBlockers(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician';
}

/**
 * Check if a user can view activity history
 */
export function canViewActivityHistory(role: TeamMemberRole | string): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'technician' || normalized === 'viewer';
}

/**
 * Filter tasks based on user's role and permissions
 * @param tasks Array of tasks
 * @param _role User's role (kept for API consistency, currently all roles use same filtering)
 * @param userId Current user's ID (team member ID, not Firebase Auth UID)
 * @param userProjects Optional array of project IDs the user is assigned to
 */
export function filterTasksByPermission<T extends Task>(
  tasks: T[], 
  _role: TeamMemberRole,
  userId: string,
  userProjects?: string[],
  userName?: string
): T[] {
  // Everyone sees only:
  // 1. Tasks they created
  // 2. Tasks assigned to them
  // 3. Tasks in projects they're assigned to
  return tasks.filter(task => {
    // Can see tasks they created
    if (task.createdBy === userId) return true;
    
    // Can see tasks assigned to them
    // Support legacy data where assignee may be stored as a display name
    if (task.assignee === userId) return true;
    if (typeof task.assignee === 'string' && userName && task.assignee === userName) return true;
    
    // Can see tasks in projects they're assigned to
    if (task.projectId && userProjects?.includes(task.projectId)) return true;
    
    return false;
  });
}

/**
 * Filter projects based on user's role and permissions
 * @param projects Array of projects
 * @param role User's role
 * @param userId Current user's ID
 */
export function filterProjectsByPermission<T extends Project>(projects: T[], role: TeamMemberRole, userId: string, userName?: string): T[] {
  // If user can view all projects, return everything
  if (canViewAllProjects(role)) {
    return projects;
  }
  
  // Freelancers can only see projects they're assigned to
  if (role === 'freelance') {
    return projects.filter(project => {
      // Match by id or (legacy) display name
      const pmMatch = project.projectManager === userId || (userName && project.projectManager === userName);
      const ownerMatch = project.owner === userId || (userName && project.owner === userName);
      const assigneeMatch = (project.assignees && project.assignees.includes(userId)) || (userName && project.assignees && project.assignees.includes(userName));
      return pmMatch || ownerMatch || assigneeMatch;
    });
  }
  
  return [];
}

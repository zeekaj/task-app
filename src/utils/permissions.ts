// src/utils/permissions.ts

import type { TeamMemberRole, Task, Project } from '../types';

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
 */
export function canViewAllTasks(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician' || role === 'viewer';
}

/**
 * Check if a role can view all projects in the organization
 */
export function canViewAllProjects(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician' || role === 'viewer';
}

/**
 * Check if a role can view all team members in the organization
 */
export function canViewAllTeamMembers(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician' || role === 'viewer';
}

/**
 * Check if a role can view all shifts in the organization
 */
export function canViewAllShifts(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician' || role === 'viewer';
}

/**
 * Check if a user can edit a specific task
 * @param role User's role
 * @param task Task to check
 * @param userId Current user's ID
 */
export function canEditTask(role: TeamMemberRole, task: Task, userId: string): boolean {
  // Owner and admin can edit anything
  if (role === 'owner' || role === 'admin') return true;
  
  // Technicians can edit anything
  if (role === 'technician') return true;
  
  // Freelancers can only edit tasks assigned to them
  if (role === 'freelance') {
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
export function canDeleteTask(role: TeamMemberRole, task: Task, userId: string): boolean {
  // Owner and admin can delete anything
  if (role === 'owner' || role === 'admin') return true;
  
  // Technicians can delete their own tasks
  if (role === 'technician') {
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
export function canEditProject(role: TeamMemberRole, project: Project, userId: string): boolean {
  // Owner and admin can edit anything
  if (role === 'owner' || role === 'admin') return true;
  
  // Technicians can edit anything
  if (role === 'technician') return true;
  
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
export function canDeleteProject(role: TeamMemberRole): boolean {
  // Only owner and admin can delete projects
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a user can assign tasks/projects to other team members
 */
export function canAssignToOthers(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can create new tasks
 */
export function canCreateTask(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can create new projects
 */
export function canCreateProject(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can manage team members (create, edit, archive)
 */
export function canManageTeamMembers(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a user can manage shifts (create, edit, delete)
 */
export function canManageShifts(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can view a specific shift
 * @param role User's role
 * @param shiftEmployeeIds Array of employee IDs assigned to the shift
 * @param userId Current user's ID
 */
export function canViewShift(role: TeamMemberRole, shiftEmployeeIds: string[], userId: string): boolean {
  // Owner, admin, technician, and viewer can see all shifts
  if (canViewAllShifts(role)) return true;
  
  // Freelancers can only see shifts they're assigned to
  if (role === 'freelance') {
    return shiftEmployeeIds.includes(userId);
  }
  
  return false;
}

/**
 * Check if a user can manage clients and venues
 */
export function canManageClientsAndVenues(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can block/unblock tasks or projects
 */
export function canManageBlockers(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician';
}

/**
 * Check if a user can view activity history
 */
export function canViewActivityHistory(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'technician' || role === 'viewer';
}

/**
 * Filter tasks based on user's role and permissions
 * @param tasks Array of tasks
 * @param role User's role
 * @param userId Current user's ID
 */
export function filterTasksByPermission(tasks: Task[], role: TeamMemberRole, userId: string): Task[] {
  // If user can view all tasks, return everything
  if (canViewAllTasks(role)) {
    return tasks;
  }
  
  // Freelancers can only see tasks assigned to them
  if (role === 'freelance') {
    return tasks.filter(task => task.assignee === userId);
  }
  
  return [];
}

/**
 * Filter projects based on user's role and permissions
 * @param projects Array of projects
 * @param role User's role
 * @param userId Current user's ID
 */
export function filterProjectsByPermission(projects: Project[], role: TeamMemberRole, userId: string): Project[] {
  // If user can view all projects, return everything
  if (canViewAllProjects(role)) {
    return projects;
  }
  
  // Freelancers can only see projects they're assigned to
  if (role === 'freelance') {
    return projects.filter(project => {
      return project.projectManager === userId ||
             project.owner === userId ||
             project.assignees?.includes(userId);
    });
  }
  
  return [];
}

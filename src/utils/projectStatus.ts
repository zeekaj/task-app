// src/utils/projectStatus.ts
// Project Status Engine: Automatic status based on timeline milestones

import { Timestamp } from 'firebase/firestore';
import type { Project, ProjectStatus } from '../types';

/**
 * Convert various date formats to Date object
 */
function toDate(date: Timestamp | Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if ('toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  return null;
}

/**
 * Compute the auto status based on dates
 * 
 * New automatic logic:
 * - Before prepDate: Manual selection of "not_started" or "planning"
 * - At/after prepDate: Automatic status based on timeline
 * - After returnDate: "post_event" (manual completion button appears)
 */
function computeAutoStatus(project: Project, now: Date = new Date()): ProjectStatus {
  const {
    prepDate,
    returnDate,
  } = project;

  // Convert dates
  const prep = toDate(prepDate);
  const ret = toDate(returnDate);

  // Before prep date: return not_started (will be manually toggled to planning if needed)
  if (prep && now < prep) {
    return 'not_started';
  }

  // After return date: post_event
  if (ret && now >= ret) {
    return 'post_event';
  }

  // Between prep and return: we're executing
  if (prep && now >= prep) {
    return 'executing';
  }

  // Default: not_started
  return 'not_started';
}

/**
 * Determine the effective status for a project
 * 
 * Terminal states (always manual):
 * - 'completed': Only PM can mark as completed (after post_event)
 * - 'blocked': Requires blocker
 * - 'archived': Manual archive action
 * 
 * Automatic states:
 * - Before prepDate: 'not_started' or 'planning' (manual toggle)
 * - prepDate to returnDate: 'executing' (auto)
 * - After returnDate: 'post_event' (auto, can mark complete)
 */
export function computeProjectStatus(project: Project): ProjectStatus {
  const {
    status,
    prepDate,
  } = project;

  // Terminal states are always respected (manual overrides)
  if (status === 'completed' || status === 'blocked' || status === 'archived') {
    return status;
  }

  const prep = toDate(prepDate);
  const now = new Date();

  // Before prepDate, allow manual toggle between not_started and planning
  if (prep && now < prep) {
    if (status === 'not_started' || status === 'planning') {
      return status;
    }
    return 'not_started';
  }

  // After prepDate, use automatic status computation
  return computeAutoStatus(project, now);
}

/**
 * Check if project is in post-event and can be marked complete
 */
export function canMarkComplete(project: Project): boolean {
  const effectiveStatus = computeProjectStatus(project);
  return effectiveStatus === 'post_event';
}

/**
 * Get allowed status transitions for a project
 * Only applies before prepDate (not_started <-> planning)
 */
export function getAllowedStatusTransitions(project: Project): ProjectStatus[] {
  const { prepDate, status } = project;
  const prep = toDate(prepDate);
  const now = new Date();

  // Before prepDate: can toggle between not_started and planning
  if (prep && now < prep) {
    return ['not_started', 'planning'];
  }

  // After prepDate: no manual status changes (auto-computed), return current only
  return [status];
}

/**
 * Check if a project can have its status manually changed
 */
export function canManuallyChangeStatus(project: Project): boolean {
  const { prepDate } = project;
  const prep = toDate(prepDate);
  const now = new Date();

  // Can only manually change before prep date
  return !prep || now < prep;
}

/**
 * Get the current milestone label based on dates
 */
export function getCurrentMilestone(project: Project): string | null {
  const {
    prepDate,
    shipDate,
    loadInDate,
    eventBeginDate,
    eventEndDate,
    strikeDate,
    pickupDate,
    returnDate,
  } = project;

  const now = new Date();
  const prep = toDate(prepDate);
  const ship = toDate(shipDate);
  const loadIn = toDate(loadInDate);
  const eventBegin = toDate(eventBeginDate);
  const eventEnd = toDate(eventEndDate);
  const strike = toDate(strikeDate);
  const pickup = toDate(pickupDate);
  const ret = toDate(returnDate);

  // Find the current milestone by checking which date we've passed most recently
  if (ret && now >= ret) return 'Return Complete';
  if (pickup && now >= pickup) return 'Pickup';
  if (strike && now >= strike) return 'Strike';
  if (eventEnd && now >= eventEnd) return 'Event Ended';
  if (eventBegin && now >= eventBegin) return 'Event In Progress';
  if (loadIn && now >= loadIn) return 'Load-In';
  if (ship && now >= ship) return 'Shipped';
  if (prep && now >= prep) return 'Prep Started';

  return null;
}

/**
 * Reevaluate project status based on blockers and tasks
 * This is called after blocker changes or task updates
 */
export async function reevaluateProjectBlockedState(
  uid: string,
  projectId: string,
  // You'd import these from your services
  getBlockers: (uid: string, entityId: string) => Promise<any[]>,
  getTasks: (uid: string) => Promise<any[]>,
  updateProject: (uid: string, projectId: string, updates: any) => Promise<void>
): Promise<void> {
  // Get blockers for this project
  const projectBlockers = await getBlockers(uid, projectId);
  const hasActiveBlocker = projectBlockers.some((b) => !b.resolvedAt);

  // Get tasks for this project
  const tasks = await getTasks(uid);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const hasBlockedTask = projectTasks.some((t) => t.status === 'blocked');

  // If project has active blocker or blocked task, mark as blocked
  // Otherwise, restore to appropriate status based on dates
  if (hasActiveBlocker || hasBlockedTask) {
    await updateProject(uid, projectId, { status: 'blocked' });
  } else {
    // Let the automatic system determine the right status
    // This would typically trigger a re-computation
    await updateProject(uid, projectId, { status: 'not_started' }); // Will be recomputed
  }
}

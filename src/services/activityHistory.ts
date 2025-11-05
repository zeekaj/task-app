import { addDoc, query, where, orderBy, limit, getDocs, Timestamp, writeBatch } from "firebase/firestore";
import { getFirebase } from '../firebase';
import type { Activity, ActivityEntityType, ActivityType } from '../types';

/**
 * Helper function to remove undefined values from an object before storing to Firestore
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedValues);
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedValues(value);
    }
  }
  return cleaned;
}

/**
 * Cleanup old activities to keep only the most recent ones
 * Keeps the latest 100 activities and deletes older ones
 * Only runs occasionally (randomly 5% of the time) to avoid performance issues
 */
async function cleanupOldActivities(organizationId: string): Promise<void> {
  try {
    // Only run cleanup 5% of the time to avoid performance issues
    if (Math.random() > 0.05) {
      return;
    }
    
  const fb = await getFirebase();
  const activitiesRef = fb.orgCol(organizationId, 'activities');
    
    // Get all activities ordered by createdAt descending
    const q = query(activitiesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    // Keep only the first 100, delete the rest
    const docsToDelete = snapshot.docs.slice(100);
    
    if (docsToDelete.length > 0) {
      console.log(`Cleaning up ${docsToDelete.length} old activities`);
      
      // Use batch delete for efficiency
      const batch = writeBatch(fb.db);
      docsToDelete.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  } catch (error: any) {
    console.error('Error cleaning up old activities:', error?.message ?? error);
    // Don't throw - cleanup is not critical
  }
}

/**
 * Log an activity/audit trail entry
 */
export async function logActivity(
  organizationId: string,
  entityType: ActivityEntityType,
  entityId: string,
  entityTitle: string,
  action: ActivityType,
  options?: {
    changes?: Record<string, { from: any; to: any }>;
    description?: string;
    userName?: string;
  }
): Promise<void> {
  try {
    // Try to get the user's display name from Firebase Auth
    let userName = options?.userName;
    if (!userName) {
      try {
        const fb = await getFirebase();
        if (fb.auth && fb.auth.currentUser) {
          userName = fb.auth.currentUser.displayName || fb.auth.currentUser.email || "Unknown User";
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Use client timestamp for immediate query visibility
    const now = new Date();
    const timestamp = Timestamp.fromDate(now);
    console.log('Creating activity with timestamp:', {
      date: now.toISOString(),
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds
    });
    
    const fb = await getFirebase();
    const userId = fb.auth?.currentUser?.uid || 'unknown';

    const activityData: Omit<Activity, 'id'> = {
      entityType,
      entityId,
      entityTitle,
      action,
      userId,
      createdAt: timestamp, // Client timestamp for immediate query visibility
      ...(options?.changes && { changes: options.changes }),
      ...(options?.description && { description: options.description }),
      ...(userName && { userName }),
    };

    // Clean any undefined values before storing to Firebase
    const cleanedActivityData = removeUndefinedValues(activityData);

  const activitiesRef = fb.orgCol(organizationId, `activities`);
    await addDoc(activitiesRef, cleanedActivityData);
    console.log('Activity document written to Firestore with client timestamp:', { entityId, entityTitle, action });
    
    // Clean up old activities in the background (keep only last 100)
    cleanupOldActivities(organizationId).catch(err => {
      console.warn('Failed to cleanup old activities:', err);
    });
  } catch (error: any) {
    const { logError } = await import('../utils/logger');
    logError("Error logging activity:", error?.message ?? error);
    // Don't throw - activity logging should not break the main operation
  }
}

/**
 * Get activity history for a specific entity
 */
export async function getEntityActivityHistory(
  organizationId: string,
  entityType: ActivityEntityType,
  entityId: string,
  limitCount: number = 50
): Promise<Activity[]> {
  try {
    const fb = await getFirebase();
    const activitiesRef = fb.orgCol(organizationId, `activities`);

    const q = query(
      activitiesRef,
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as any)
    } as Activity));

    // Sort manually - newest first
    return activities.sort((a: Activity, b: Activity) => {
      const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
        ? a.createdAt.toDate().getTime() 
        : (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
            ? (a.createdAt as any).seconds * 1000 
            : 0);
            
      const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
        ? b.createdAt.toDate().getTime() 
        : (b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
            ? (b.createdAt as any).seconds * 1000 
            : 0);
            
      return bTime - aTime; // Most recent first
    });
  } catch (error: any) {
    const { logError } = await import('../utils/logger');
    logError("Error fetching activity history:", error?.message ?? error);
    return [];
  }
}

/**
 * Get recent activity across all entities
 */
export async function getRecentActivity(
  organizationId: string,
  limitCount: number = 100
): Promise<Activity[]> {
  try {
    const fb = await getFirebase();
    const activitiesRef = fb.orgCol(organizationId, `activities`);
    const q = query(
      activitiesRef,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) } as Activity));
  } catch (error: any) {
    const { logError } = await import('../utils/logger');
    logError("Error fetching recent activity:", error?.message ?? error);
    return [];
  }
}

/**
 * Generate human-readable description for activity
 */
export function generateActivityDescription(activity: Activity, contextEntityId?: string): string {
  const { action, entityType, entityTitle, changes, userName, entityId } = activity;
  const user = userName || "Someone";
  const entity = entityType === "task" ? "task" : (entityType === "team" ? "team" : "project");
  
  // If we're viewing activity within the context of a specific entity, don't repeat the entity name
  const isInContext = contextEntityId && entityId === contextEntityId;
  const entityRef = isInContext ? "" : ` ${entity} "${entityTitle}"`;

  switch (action) {
    case "created":
  return isInContext ? `${user} created this ${entity}` : `${user} created ${entity} "${entityTitle}"`;
    case "updated":
      if (changes) {
        const fieldChanges = Object.keys(changes).map(field => {
          const change = changes[field];
          // Special handling for array fields
          if (field === 'subtasks') {
            const fromCount = Array.isArray(change.from) ? change.from.length : 0;
            const toCount = Array.isArray(change.to) ? change.to.length : 0;
            return `${field}: ${fromCount} → ${toCount}`;
          }
          if (field === 'dependencies') {
            const fromCount = Array.isArray(change.from) ? change.from.length : 0;
            const toCount = Array.isArray(change.to) ? change.to.length : 0;
            return `${field}: ${fromCount} → ${toCount}`;
          }
          if (field === 'attachments') {
            const fromCount = Array.isArray(change.from) ? change.from.length : 0;
            const toCount = Array.isArray(change.to) ? change.to.length : 0;
            if (toCount > fromCount) {
              // Added attachment
              const added = Array.isArray(change.to) ? change.to[change.to.length - 1] : null;
              return added ? `added ${added.type === 'file' ? 'file' : 'link'}: "${added.name}"` : `attachments: ${fromCount} → ${toCount}`;
            } else if (toCount < fromCount) {
              // Removed attachment
              const removed = Array.isArray(change.from) ? change.from.find((a: any) => !change.to?.some((b: any) => b.id === a.id)) : null;
              return removed ? `removed ${removed.type === 'file' ? 'file' : 'link'}: "${removed.name}"` : `attachments: ${fromCount} → ${toCount}`;
            }
            return `attachments: ${fromCount} → ${toCount}`;
          }
          if (change.type === 'string') {
            const fromStr = change.from === undefined ? '(empty)' : `"${change.from}"`;
            const toStr = change.to === undefined ? '(empty)' : `"${change.to}"`;
            return `${field}: ${fromStr} → ${toStr}`;
          }
          return `${field}: ${change.from} → ${change.to}`;
        }).join(", ");
        return `${user} updated${entityRef}${isInContext ? '' : ':'} ${fieldChanges}`;
      }
  return `${user} updated${entityRef}`;
    case "status_changed":
      if (changes?.status) {
        return `${user} changed${entityRef} status from "${changes.status.from}" to "${changes.status.to}"`;
      }
      return `${user} changed${entityRef} status`;
    case "assigned":
      if (changes?.assignee || changes?.assignees) {
        const assigneeChange = changes.assignee || changes.assignees;
        return `${user} assigned${entityRef} to "${assigneeChange.to}"`;
      }
      return `${user} assigned${entityRef}`;
    case "blocked":
      return `${user} blocked${entityRef}`;
    case "unblocked":
      return `${user} unblocked${entityRef}`;
    case "archived":
      return `${user} archived${entityRef}`;
    case "deleted":
      return `${user} deleted${entityRef}`;
    default:
      return `${user} performed ${action} on${entityRef}`;
  }
}
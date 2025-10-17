import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { auth, db } from '../firebase';
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
 * Log an activity/audit trail entry
 */
export async function logActivity(
  uid: string,
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
    if (!userName && auth.currentUser) {
      userName = auth.currentUser.displayName || auth.currentUser.email || "Unknown User";
    }
    
    const activityData: Omit<Activity, 'id'> = {
      entityType,
      entityId,
      entityTitle,
      action,
      userId: uid,
      createdAt: Timestamp.fromDate(new Date()), // Use client timestamp for immediate readability
      ...(options?.changes && { changes: options.changes }),
      ...(options?.description && { description: options.description }),
      ...(userName && { userName }),
    };

    // Clean any undefined values before storing to Firebase
    const cleanedActivityData = removeUndefinedValues(activityData);

    const activitiesRef = collection(db, `users/${uid}/activities`);
    await addDoc(activitiesRef, cleanedActivityData);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - activity logging should not break the main operation
  }
}

/**
 * Get activity history for a specific entity
 */
export async function getEntityActivityHistory(
  uid: string,
  entityType: ActivityEntityType,
  entityId: string,
  limitCount: number = 50
): Promise<Activity[]> {
  try {
    const activitiesRef = collection(db, `users/${uid}/activities`);
    
    // Revert to simple query without orderBy to avoid index issues
    const q = query(
      activitiesRef,
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));

    // Sort manually - newest first
    return activities.sort((a, b) => {
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
  } catch (error) {
    console.error("Error fetching activity history:", error);
    return [];
  }
}

/**
 * Get recent activity across all entities
 */
export async function getRecentActivity(
  uid: string,
  limitCount: number = 100
): Promise<Activity[]> {
  try {
    const activitiesRef = collection(db, `users/${uid}/activities`);
    const q = query(
      activitiesRef,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}

/**
 * Generate human-readable description for activity
 */
export function generateActivityDescription(activity: Activity, contextEntityId?: string): string {
  const { action, entityType, entityTitle, changes, userName, entityId } = activity;
  const user = userName || "Someone";
  const entity = entityType === "task" ? "task" : "project";
  
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
          return `${field}: "${change.from}" → "${change.to}"`;
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
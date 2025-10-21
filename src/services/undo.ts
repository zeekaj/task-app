import { 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { getFirebase } from '../firebase';
import type { Activity, Task, Project, WithId } from '../types';
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { updateTask } from './tasks';
import { updateProject } from './projects';

/**
 * Get the most recent activity for an entity
 */
async function getLastActivity(
  uid: string,
  entityType: "task" | "project",
  entityId: string
): Promise<Activity | null> {
  const fb = await getFirebase();
  const activitiesRef = fb.col(uid, 'activities');
  
  // First get activities for this entity
  const q = query(
    activitiesRef,
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc"),
    limit(20) // Increase limit since we'll filter some out
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log('No activities found');
    return null;
  }

  // Convert docs to properly typed activities with timestamps
  type ActivityWithTimestamp = WithId<Activity> & { parsedCreatedAt: Date };

  // Convert snapshot to typed activities with parsed timestamps
  const activities = querySnapshot.docs.map((doc: { id: string, data: () => any }): ActivityWithTimestamp => {
    const data = doc.data();
    const createdAt = data.createdAt;
    let parsedCreatedAt: Date;
    
    if (createdAt instanceof Timestamp) {
      parsedCreatedAt = createdAt.toDate();
    } else if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
      // Handle Firestore Timestamp that hasn't been converted
      parsedCreatedAt = new Date(createdAt.seconds * 1000);
    } else {
      console.warn('Invalid timestamp format:', createdAt);
      parsedCreatedAt = new Date();
    }
    return {
      ...data,
      id: doc.id,
      parsedCreatedAt
    } as ActivityWithTimestamp;
  });

  // Filter to only include activities with relevant changes
  const activitiesWithChanges = activities
    .filter((activity: ActivityWithTimestamp) => {
      // First check if it's an update activity
      if (!["updated", "status_changed"].includes(activity.action)) {
        console.log('Skipping non-update activity:', activity.action);
        return false;
      }

      // Make sure we have changes object
      if (!activity.changes) {
        console.log('Skipping activity without changes object');
        return false;
      }

      // Log all changes for debugging
      console.log('Activity changes:', {
        id: activity.id,
        action: activity.action,
        description: activity.description,
        changes: activity.changes,
        timestamp: activity.parsedCreatedAt
      });

      // Check if we have any valid changes to undo
      const hasValidChanges = Object.entries(activity.changes).some(([field, change]) => {
        const isValidChange = change && ('from' in change) && ('to' in change);
        console.log(`Field ${field}:`, { isValid: isValidChange, change });
        return isValidChange;
      });

      if (!hasValidChanges) {
        console.log('Skipping activity without valid changes');
        return false;
      }

      return true;
    })
    .sort((a: ActivityWithTimestamp, b: ActivityWithTimestamp) => {
      const diff = b.parsedCreatedAt.getTime() - a.parsedCreatedAt.getTime();
      console.log('Comparing activities:', {
        a: { id: a.id, time: a.parsedCreatedAt.toISOString() },
        b: { id: b.id, time: b.parsedCreatedAt.toISOString() },
        diff
      });
      return diff;
    });

  if (activitiesWithChanges.length === 0) {
    console.log('No activities with changes found');
    return null;
  }

  const mostRecent = activitiesWithChanges[0];
  console.log('Most recent activity to undo:', {
    id: mostRecent.id,
    action: mostRecent.action,
    changes: mostRecent.changes,
    createdAt: mostRecent.parsedCreatedAt
  });

  return mostRecent;
}

/**
 * Undo the last change to a task or project
 */
export async function undoLastChange(
  uid: string,
  entityType: "task" | "project",
  entityId: string
): Promise<boolean> {
  try {
    const lastActivity = await getLastActivity(uid, entityType, entityId);
    console.log('Last activity found:', lastActivity);
    if (!lastActivity?.changes) {
      console.log('No changes found in activity');
      return false;
    }

    // Make sure we have changes to apply
    if (Object.keys(lastActivity.changes).length === 0) {
      console.log('Activity has empty changes object');
      return false;
    }

    console.log('Changes to undo:', lastActivity.changes);
    // Reverse the changes
    const undoChanges: Record<string, any> = {};
    Object.entries(lastActivity.changes).forEach(([field, change]) => {
      console.log(`Processing field ${field}:`, {
        field,
        change,
        changeType: change.type,
        fromType: typeof change.from,
        fromValue: change.from
      });
      // Handle typed fields, preserving their original value types
      if (change.type === 'string') {
        // For string fields, null/undefined/empty string handling
        if (change.from === undefined || change.from === null) {
          undoChanges[field] = null;
        } else if (change.from === '') {
          undoChanges[field] = '';
        } else {
          undoChanges[field] = String(change.from);
        }
        console.log(`String field ${field} set to:`, undoChanges[field], 
          `(type: ${typeof undoChanges[field]}, value: ${JSON.stringify(undoChanges[field])})`);
      } else {
        // For other fields, use the original value
        undoChanges[field] = change.from;
        console.log(`Regular field ${field} set to:`, undoChanges[field], 
          `(type: ${typeof undoChanges[field]})`);
      }
    });
    
    console.log('Final undo changes:', undoChanges);
    // Apply the reversed changes
    if (entityType === "task") {
      console.log('Applying undo to task:', {
        uid,
        entityId,
        changes: undoChanges
      });
      await updateTask(uid, entityId, undoChanges as Partial<Task>);
    } else {
      await updateProject(uid, entityId, undoChanges as Partial<Project>);
    }

    console.log('Undo operation completed successfully');
    return true;
  } catch (error) {
    console.error("Error undoing last change:", error);
    return false;
  }
}
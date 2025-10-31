// src/services/scheduling.ts
import { getFirebase } from "../firebase";
import type { Project, ScheduleEvent, ScheduleStatus } from "../types";
import { logActivity } from "./activityHistory";

/**
 * Create a new schedule event
 */
export async function createScheduleEvent(
  orgId: string,
  createdBy: string,
  data: Omit<ScheduleEvent, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt">
) {
  try {
    const { addDoc: _addDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const collectionRef = fb.col(orgId, "scheduleEvents");
    
    const docData: any = {
      ...data,
      organizationId: orgId,
      createdBy,
      createdAt: _serverTimestamp(),
      updatedAt: _serverTimestamp(),
    };
    
    const ref = await _addDoc(collectionRef, docData);
    
    await logActivity(orgId, "schedule", ref.id, data.title, "created", {
      description: `Created schedule event: ${data.title}`,
    });
    
    return ref.id;
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("createScheduleEvent error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Update a schedule event
 */
export async function updateScheduleEvent(
  orgId: string,
  eventId: string,
  updates: Partial<Omit<ScheduleEvent, "id" | "organizationId" | "createdBy" | "createdAt">>
) {
  try {
    const { updateDoc: _updateDoc, doc: _doc, getDoc: _getDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const eventRef = _doc(fb.db, `users/${orgId}/scheduleEvents/${eventId}`);
    
    // Get current event for change tracking
    const eventSnap = await _getDoc(eventRef);
    const currentEvent = eventSnap.exists() ? eventSnap.data() as ScheduleEvent : null;
    
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: _serverTimestamp()
    };
    
    await _updateDoc(eventRef, payload);
    
    const changes: Record<string, { from: any; to: any }> = {};
    if (updates.title && currentEvent?.title !== updates.title) {
      changes.title = { from: currentEvent?.title, to: updates.title };
    }
    if (updates.assignedMemberIds && JSON.stringify(currentEvent?.assignedMemberIds) !== JSON.stringify(updates.assignedMemberIds)) {
      changes.assignedMemberIds = { from: currentEvent?.assignedMemberIds || [], to: updates.assignedMemberIds };
    }
    if (typeof updates.status !== 'undefined' && currentEvent?.status !== updates.status) {
      changes.status = { from: (currentEvent as any)?.status ?? null, to: updates.status };
    }
    
    if (Object.keys(changes).length > 0) {
      const eventTitle = updates.title || currentEvent?.title || "Unknown Event";
      await logActivity(orgId, "schedule", eventId, eventTitle, "updated", {
        changes,
        description: `Updated schedule event: ${Object.keys(changes).join(', ')}`
      });
    }
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("updateScheduleEvent error:", (err as any)?.message ?? err);
    throw err;
  }
}

/** Bulk set schedule status by iterating updateScheduleEvent for activity logging. */
export async function bulkSetScheduleStatus(
  orgId: string,
  eventIds: string[],
  newStatus: ScheduleStatus
) {
  let count = 0;
  for (const id of eventIds) {
    try {
      await updateScheduleEvent(orgId, id, { status: newStatus });
      count++;
    } catch (e) {
      const { logError } = await import('../utils/logger');
      logError('bulkSetScheduleStatus error for id ' + id, e as any);
    }
  }
  return count;
}

/**
 * Delete a schedule event
 */
export async function deleteScheduleEvent(orgId: string, eventId: string) {
  try {
    const { doc: _doc, getDoc: _getDoc } = await import('firebase/firestore');
    const fb = await getFirebase();
    const eventRef = _doc(fb.db, `users/${orgId}/scheduleEvents/${eventId}`);
    
    // Get event title for activity log
    let eventTitle = "Unknown Event";
    try {
      const eventSnap = await _getDoc(eventRef);
      if (eventSnap.exists()) {
        const eventData = eventSnap.data() as ScheduleEvent;
        eventTitle = eventData.title || "Unknown Event";
      }
    } catch (e) {
      // Continue with deletion even if fetch fails
    }
    
    // Use batch delete instead
    const { writeBatch: _writeBatch } = await import('firebase/firestore');
    const batch = _writeBatch(fb.db);
    batch.delete(eventRef);
    await batch.commit();
    
    await logActivity(orgId, "schedule", eventId, eventTitle, "deleted", {
      description: `Deleted schedule event: ${eventTitle}`,
    });
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("deleteScheduleEvent error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Create a tentative "Project Hold" event spanning known project dates.
 * Safe behavior: only creates if we can determine a reasonable window (requires at least one date).
 */
export async function createProjectHoldEvent(
  orgId: string,
  createdBy: string,
  project: Pick<Project, "id" | "title" | "prepDate" | "installDate" | "eventBeginDate" | "eventEndDate" | "strikeDate" | "returnDate">
) {
  const { Timestamp } = await import("firebase/firestore");
  const toDate = (d: any | undefined): Date | null => {
    if (!d) return null;
    if ((d as any).toDate) return (d as any).toDate();
    const dt = new Date(d as any);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const candStarts = [project.prepDate, project.installDate, project.eventBeginDate].map(toDate).filter(Boolean) as Date[];
  const candEnds = [project.returnDate, project.eventEndDate, project.strikeDate].map(toDate).filter(Boolean) as Date[];

  if (candStarts.length === 0 && candEnds.length === 0) {
    // Not enough info to create a meaningful hold window
    return null;
  }

  const startDate = candStarts.length > 0 ? new Date(Math.min(...candStarts.map(d => d.getTime()))) : (candEnds.length > 0 ? new Date(candEnds[0].getTime() - 24 * 60 * 60 * 1000) : new Date());
  const endDate = candEnds.length > 0 ? new Date(Math.max(...candEnds.map(d => d.getTime()))) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  const title = `${project.title} — Hold`;

  const eventData: Omit<ScheduleEvent, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt"> = {
    title,
    type: "event",
    start: Timestamp.fromDate(startDate),
    end: Timestamp.fromDate(endDate),
    status: "hold" as ScheduleStatus,
    source: "auto",
    projectId: project.id || null,
    taskId: null,
    assignedMemberIds: [],
    notes: "Auto-generated project hold window. Adjust dates as details firm up.",
  };

  return createScheduleEvent(orgId, createdBy, eventData);
}

/**
 * Generate a few tentative shifts from common milestones if dates exist.
 * This is a minimal scaffold; refine with templates per project type later.
 */
export async function generateTentativeShiftsForProject(
  orgId: string,
  createdBy: string,
  project: Pick<Project, "id" | "title" | "installDate" | "eventBeginDate" | "eventEndDate" | "strikeDate">
) {
  const { Timestamp } = await import("firebase/firestore");
  const toDate = (d: any | undefined): Date | null => {
    if (!d) return null;
    if ((d as any).toDate) return (d as any).toDate();
    const dt = new Date(d as any);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const events: Parameters<typeof createScheduleEvent>[2][] = [];

  const pushShift = (label: string, day: Date) => {
    // Default 10:00–18:00 tentative shift (adjustable later)
    const start = new Date(day);
    start.setHours(10, 0, 0, 0);
    const end = new Date(day);
    end.setHours(18, 0, 0, 0);
    events.push({
      title: `${project.title} — ${label}`,
      type: "shift",
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      status: "tentative",
      source: "auto",
      projectId: project.id || null,
      taskId: null,
      assignedMemberIds: [],
      notes: "Auto-generated tentative shift.",
    } as any);
  };

  const install = toDate(project.installDate);
  if (install) pushShift("Install", install);

  const eventBegin = toDate(project.eventBeginDate);
  if (eventBegin) pushShift("Event Day", eventBegin);

  const strike = toDate(project.strikeDate);
  if (strike) pushShift("Strike", strike);

  // If multi-day event, add a second day for event end if distinct
  const eventEnd = toDate(project.eventEndDate);
  if (eventBegin && eventEnd) {
    const beginYmd = eventBegin.toDateString();
    if (eventEnd.toDateString() !== beginYmd) {
      pushShift("Event Day", eventEnd);
    }
  }

  const createdIds: string[] = [];
  for (const ev of events) {
    const id = await createScheduleEvent(orgId, createdBy, ev);
    createdIds.push(id);
  }
  return createdIds;
}

/**
 * Query options for listing schedule events
 */
export interface ScheduleEventQueryOptions {
  startDate?: Date;
  endDate?: Date;
  projectId?: string;
  memberId?: string;
  type?: string;
  limit?: number;
}

/**
 * List schedule events with optional filters
 */
export async function listScheduleEvents(
  orgId: string,
  options?: ScheduleEventQueryOptions
) {
  try {
    const { query: _query, where: _where, orderBy: _orderBy, limit: _limit, getDocs: _getDocs, Timestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const collectionRef = fb.col(orgId, "scheduleEvents");
    
    const constraints: any[] = [];
    
    // Date range filter
    if (options?.startDate) {
      const startTimestamp = Timestamp.fromDate(options.startDate);
      constraints.push(_where("start", ">=", startTimestamp));
    }
    if (options?.endDate) {
      const endTimestamp = Timestamp.fromDate(options.endDate);
      // Use the same field (start) for range constraints to avoid composite index requirement
      // This returns events that start on/before the end date; further overlap logic can be handled client-side if needed
      constraints.push(_where("start", "<=", endTimestamp));
    }
    
    // Other filters
    if (options?.projectId) {
      constraints.push(_where("projectId", "==", options.projectId));
    }
    if (options?.memberId) {
      constraints.push(_where("assignedMemberIds", "array-contains", options.memberId));
    }
    if (options?.type) {
      constraints.push(_where("type", "==", options.type));
    }
    
    // Default ordering by start date
    constraints.push(_orderBy("start", "asc"));
    
    if (options?.limit) {
      constraints.push(_limit(options.limit));
    }
    
    const q = constraints.length > 0 ? _query(collectionRef, ...constraints) : collectionRef;
    const snapshot = await _getDocs(q);

    let results = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as (ScheduleEvent & { id: string })[];

    // Optional client-side refinement: if both start and end are provided, ensure events start within the window
    // If you need true overlap (events crossing boundaries), adjust logic accordingly
    if (options?.startDate && options?.endDate) {
      const startMs = options.startDate.getTime();
      const endMs = options.endDate.getTime();
      results = results.filter(ev => {
        const s = (ev as any).start?.toMillis ? (ev as any).start.toMillis() : new Date((ev as any).start).getTime();
        return s >= startMs && s <= endMs;
      });
    }

    return results;
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("listScheduleEvents error:", (err as any)?.message ?? err);
    throw err;
  }
}

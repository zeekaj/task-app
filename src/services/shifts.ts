// src/services/shifts.ts
import { getFirebase } from "../firebase";
import type { Shift, ShiftStatus, ShiftTemplate } from "../types";
import { logActivity } from "./activityHistory";

/**
 * Create a new shift
 */
export async function createShift(
  orgId: string,
  createdBy: string,
  data: Omit<Shift, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const collectionRef = fb.col(orgId, "shifts");
    
    // Filter out undefined values - Firestore doesn't accept undefined
    const cleanData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    const docData: any = {
      ...cleanData,
      organizationId: orgId,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const ref = await addDoc(collectionRef, docData);
    
    await logActivity(orgId, "schedule", ref.id, data.title, "created", {
      description: `Created shift: ${data.title} on ${data.date} ${data.startTime}-${data.endTime}`,
    });
    
    return ref.id;
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("createShift error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Update an existing shift
 */
export async function updateShift(
  orgId: string,
  shiftId: string,
  updates: Partial<Omit<Shift, "id" | "organizationId" | "createdBy" | "createdAt">>
): Promise<void> {
  try {
    const { updateDoc, doc, getDoc, serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const shiftRef = doc(fb.db, `organizations/${orgId}/shifts/${shiftId}`);
    
    // Get current shift for change tracking
    const shiftSnap = await getDoc(shiftRef);
    const currentShift = shiftSnap.exists() ? shiftSnap.data() as Shift : null;
    
    // Filter out undefined values - Firestore doesn't accept undefined
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    
    const payload: Record<string, unknown> = {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(shiftRef, payload);
    
    // Track changes for activity log
    const changes: Record<string, { from: any; to: any }> = {};
    if (updates.title && currentShift?.title !== updates.title) {
      changes.title = { from: currentShift?.title, to: updates.title };
    }
    if (updates.assignedMemberId !== undefined && currentShift?.assignedMemberId !== updates.assignedMemberId) {
      changes.assignedMemberId = { from: currentShift?.assignedMemberId || null, to: updates.assignedMemberId || null };
    }
    if (updates.status && currentShift?.status !== updates.status) {
      changes.status = { from: currentShift?.status, to: updates.status };
    }
    if (updates.date && currentShift?.date !== updates.date) {
      changes.date = { from: currentShift?.date, to: updates.date };
    }
    if (updates.startTime && currentShift?.startTime !== updates.startTime) {
      changes.startTime = { from: currentShift?.startTime, to: updates.startTime };
    }
    if (updates.endTime && currentShift?.endTime !== updates.endTime) {
      changes.endTime = { from: currentShift?.endTime, to: updates.endTime };
    }
    
    if (Object.keys(changes).length > 0) {
      const shiftTitle = updates.title || currentShift?.title || "Unknown Shift";
      await logActivity(orgId, "schedule", shiftId, shiftTitle, "updated", {
        changes,
        description: `Updated shift: ${Object.keys(changes).join(', ')}`
      });
    }
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("updateShift error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Delete a shift
 */
export async function deleteShift(orgId: string, shiftId: string): Promise<void> {
  try {
    const { doc, getDoc, writeBatch } = await import('firebase/firestore');
    const fb = await getFirebase();
    const shiftRef = doc(fb.db, `organizations/${orgId}/shifts/${shiftId}`);
    
    // Get shift title for activity log
    let shiftTitle = "Unknown Shift";
    try {
      const shiftSnap = await getDoc(shiftRef);
      if (shiftSnap.exists()) {
        const shiftData = shiftSnap.data() as Shift;
        shiftTitle = shiftData.title || "Unknown Shift";
      }
    } catch (e) {
      // Continue with deletion even if fetch fails
    }
    
    const batch = writeBatch(fb.db);
    batch.delete(shiftRef);
    await batch.commit();
    
    await logActivity(orgId, "schedule", shiftId, shiftTitle, "deleted", {
      description: `Deleted shift: ${shiftTitle}`,
    });
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("deleteShift error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Assign a team member to a shift
 */
export async function assignMemberToShift(
  orgId: string,
  shiftId: string,
  memberId: string | null
): Promise<void> {
  await updateShift(orgId, shiftId, { assignedMemberId: memberId || undefined });
}

/**
 * Update shift status
 */
export async function updateShiftStatus(
  orgId: string,
  shiftId: string,
  newStatus: ShiftStatus
): Promise<void> {
  const updates: Partial<Shift> = { status: newStatus };
  
  const { serverTimestamp } = await import('firebase/firestore');
  if (newStatus === 'confirmed') {
    updates.confirmedAt = serverTimestamp();
  } else if (newStatus === 'completed') {
    updates.completedAt = serverTimestamp();
  }
  
  await updateShift(orgId, shiftId, updates);
}

/**
 * Bulk create shifts (useful for creating multiple shifts at once from templates)
 */
export async function bulkCreateShifts(
  orgId: string,
  createdBy: string,
  shifts: Omit<Shift, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt">[]
): Promise<string[]> {
  const ids: string[] = [];
  
  for (const shiftData of shifts) {
    try {
      const id = await createShift(orgId, createdBy, shiftData);
      ids.push(id);
    } catch (e) {
      const { logError } = await import('../utils/logger');
      logError('bulkCreateShifts error for shift:', e as any);
    }
  }
  
  return ids;
}

/**
 * Create shifts from a project's milestones
 * Generates common shifts like Load-In, Event Day, Strike based on project dates
 */
export async function createShiftsFromProject(
  orgId: string,
  createdBy: string,
  project: {
    id: string;
    title: string;
    loadInDate?: any;
    eventBeginDate?: any;
    eventEndDate?: any;
    strikeDate?: any;
    venueId?: string;
  }
): Promise<string[]> {
  const shifts: Omit<Shift, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt">[] = [];
  
  const toDateString = (d: any): string | null => {
    if (!d) return null;
    if ((d as any).toDate) {
      const dt = (d as any).toDate();
      return dt.toISOString().split('T')[0];
    }
    if (d instanceof Date) {
      return d.toISOString().split('T')[0];
    }
    if (typeof d === 'string') {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
    }
    return null;
  };
  
  // Load-In shift
  if (project.loadInDate) {
    const date = toDateString(project.loadInDate);
    if (date) {
      shifts.push({
        title: `${project.title} - Load-In`,
        projectId: project.id,
        date,
        startTime: '08:00',
        endTime: '17:00',
        venueId: project.venueId,
        status: 'draft',
        estimatedHours: 9,
        notes: 'Load-in crew for equipment setup',
      });
    }
  }
  
  // Event Day shift(s)
  if (project.eventBeginDate) {
    const startDate = toDateString(project.eventBeginDate);
    
    if (startDate) {
      shifts.push({
        title: `${project.title} - Event Day`,
        projectId: project.id,
        date: startDate,
        startTime: '09:00',
        endTime: '18:00',
        venueId: project.venueId,
        status: 'draft',
        estimatedHours: 9,
        notes: 'Event day operations',
      });
    }
  }
  
  // Strike shift
  if (project.strikeDate) {
    const date = toDateString(project.strikeDate);
    if (date) {
      shifts.push({
        title: `${project.title} - Strike`,
        projectId: project.id,
        date,
        startTime: '06:00',
        endTime: '14:00',
        venueId: project.venueId,
        status: 'draft',
        estimatedHours: 8,
        notes: 'Strike and load-out',
      });
    }
  }
  
  return bulkCreateShifts(orgId, createdBy, shifts);
}

/* ========== SHIFT TEMPLATES ========== */

/**
 * Create a shift template
 */
export async function createShiftTemplate(
  orgId: string,
  data: Omit<ShiftTemplate, "id" | "organizationId" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const collectionRef = fb.col(orgId, "shiftTemplates");
    
    const docData: any = {
      ...data,
      organizationId: orgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const ref = await addDoc(collectionRef, docData);
    return ref.id;
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("createShiftTemplate error:", (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Create a shift from a template
 */
export async function createShiftFromTemplate(
  orgId: string,
  createdBy: string,
  templateId: string,
  overrides: Partial<Pick<Shift, "date" | "startTime" | "endTime" | "projectId" | "location" | "venueId" | "assignedMemberId">>
): Promise<string> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const fb = await getFirebase();
    const templateRef = doc(fb.db, `organizations/${orgId}/shiftTemplates/${templateId}`);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      throw new Error('Shift template not found');
    }
    
    const template = templateSnap.data() as ShiftTemplate;
    
    // Calculate end time based on default duration if not provided
    const startTime = overrides.startTime || '09:00';
    let endTime = overrides.endTime;
    
    if (!endTime && template.defaultDuration) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const endHour = startHour + Math.floor(template.defaultDuration);
      const endMin = startMin + ((template.defaultDuration % 1) * 60);
      endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    }
    
    const shiftData: Omit<Shift, "id" | "organizationId" | "createdBy" | "createdAt" | "updatedAt"> = {
      title: overrides.projectId ? `${template.name}` : template.name,
      projectId: overrides.projectId || null,
      date: overrides.date || new Date().toISOString().split('T')[0],
      startTime,
      endTime: endTime || '17:00',
      location: overrides.location,
      venueId: overrides.venueId,
      assignedMemberId: overrides.assignedMemberId,
      jobTitle: template.defaultJobTitle,
      requiredSkills: template.requiredSkills,
      estimatedHours: template.defaultDuration,
      breaks: template.defaultBreaks,
      instructions: template.instructions,
      status: 'draft',
    };
    
    return createShift(orgId, createdBy, shiftData);
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError("createShiftFromTemplate error:", (err as any)?.message ?? err);
    throw err;
  }
}

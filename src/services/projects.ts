// src/services/projects.ts
import { getFirebase } from "../firebase";
import type { Project } from "../types";
import { logActivity } from "./activityHistory";
import { generateRandomProjectColor } from "../utils/colors";

/** Create a new project. */
export async function createProject(organizationId: string, title: string, assignees?: string | string[]) {
  try {
    const { addDoc: _addDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const fb = await getFirebase();
  const collectionRef = fb.orgCol(organizationId, "projects");
    const docData: any = {
      organizationId,
      title,
      status: "not_started" as ProjectStatus,
      statusMode: "auto",
      color: generateRandomProjectColor(),
      createdAt: _serverTimestamp(),
      updatedAt: _serverTimestamp(),
    };
    
    // Handle both single assignee (legacy) and multiple assignees
    if (assignees) {
      if (typeof assignees === 'string') {
        // Legacy single assignee
        docData.assignee = assignees;
      } else if (Array.isArray(assignees) && assignees.length > 0) {
        // Multiple assignees
        docData.assignees = assignees;
        // Also set first assignee as legacy single assignee for backwards compatibility
        docData.assignee = assignees[0];
      }
    }
    
  const ref = await _addDoc(collectionRef, docData);
    await logActivity(organizationId, "project", ref.id, title, "created", {
      description: `Created project: ${title}`,
    });
    return ref.id;
  } catch (err) {
  const { logError } = await import('../utils/logger');
  logError("createProject error:", (err as any)?.message ?? err);
    throw err;
  }
}

/** Update project title/status/assignees/owner (safely builds payload). */
export async function updateProject(
  organizationId: string,
  projectId: string,
  data: Partial<
    Pick<
      Project,
      | "title"
      | "status"
      | "statusMode"
      | "assignee"
      | "assignees"
      | "owner"
      | "projectManager"
      | "r2Number"
      | "installDate"
      | "prepDate"
      | "shipDate"
      | "loadInDate"
      | "eventBeginDate"
      | "eventEndDate"
      | "strikeDate"
      | "pickupDate"
      | "returnDate"
      | "postEventReport"
      | "clientId"
      | "venueId"
      | "color"
    >
  >
) {
  // Get current project for change tracking
  const { getDoc: _getDoc, doc: _doc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const fb2 = await getFirebase();
  const projectDoc = await _getDoc(_doc(fb2.db, `organizations/${organizationId}/projects/${projectId}`));
  const currentProject = projectDoc.exists() ? projectDoc.data() as Project : null;
  
  const payload: Record<string, unknown> = { updatedAt: _serverTimestamp() };
  const changes: Record<string, { from: any; to: any }> = {};
  
  if (typeof data.title !== "undefined") {
    payload.title = data.title;
    if (currentProject?.title !== data.title) {
      changes.title = { from: currentProject?.title, to: data.title };
    }
  }
  if (typeof data.status !== "undefined") {
    payload.status = data.status;
    if (currentProject?.status !== data.status) {
      changes.status = { from: currentProject?.status, to: data.status };
    }
  }
  if (typeof data.statusMode !== "undefined") {
    payload.statusMode = data.statusMode;
    if (currentProject?.statusMode !== data.statusMode) {
      changes.statusMode = { from: currentProject?.statusMode, to: data.statusMode };
    }
  }
  if (typeof data.assignee !== "undefined") {
    payload.assignee = data.assignee;
    if (currentProject?.assignee !== data.assignee) {
      changes.assignee = { 
        from: currentProject?.assignee || null, 
        to: data.assignee || null 
      };
    }
  }
  if (typeof data.assignees !== "undefined") {
    payload.assignees = data.assignees;
    if (JSON.stringify(currentProject?.assignees) !== JSON.stringify(data.assignees)) {
      changes.assignees = { 
        from: currentProject?.assignees || [], 
        to: data.assignees || [] 
      };
    }
  }
  if (typeof data.owner !== "undefined") {
    payload.owner = data.owner;
    if (currentProject?.owner !== data.owner) {
      changes.owner = { 
        from: currentProject?.owner || null, 
        to: data.owner || null 
      };
    }
  }
  if (typeof data.projectManager !== "undefined") {
    payload.projectManager = data.projectManager;
    if (currentProject?.projectManager !== data.projectManager) {
      changes.projectManager = { 
        from: currentProject?.projectManager || null, 
        to: data.projectManager || null 
      };
    }
  }
  if (typeof data.r2Number !== "undefined") {
    payload.r2Number = data.r2Number;
    if (currentProject?.r2Number !== data.r2Number) {
      changes.r2Number = { 
        from: currentProject?.r2Number || null, 
        to: data.r2Number || null 
      };
    }
  }
  if (typeof data.installDate !== "undefined") {
    payload.installDate = data.installDate;
    // Convert dates to comparable format for change tracking
    const normalizeDate = (date: any): Date | null => {
      if (!date) return null;
      if (date.toDate) return date.toDate();
      return new Date(date);
    };
    
    const currentInstallDate = normalizeDate(currentProject?.installDate);
    const newInstallDate = normalizeDate(data.installDate);
    
    if (currentInstallDate?.getTime() !== newInstallDate?.getTime()) {
      changes.installDate = { 
        from: currentInstallDate ? currentInstallDate.toISOString() : null, 
        to: newInstallDate ? newInstallDate.toISOString() : null 
      };
    }
  }
  if (typeof data.prepDate !== "undefined") {
    payload.prepDate = data.prepDate;
    const normalizeDate = (date: any): Date | null => {
      if (!date) return null;
      if (date.toDate) return date.toDate();
      return new Date(date);
    };
    
    const currentPrepDate = normalizeDate(currentProject?.prepDate);
    const newPrepDate = normalizeDate(data.prepDate);
    
    if (currentPrepDate?.getTime() !== newPrepDate?.getTime()) {
      changes.prepDate = { 
        from: currentPrepDate ? currentPrepDate.toISOString() : null, 
        to: newPrepDate ? newPrepDate.toISOString() : null 
      };
    }
  }

  // Additional milestone dates
  const normalizeDate = (date: any): Date | null => {
    if (!date) return null;
    if ((date as any)?.toDate) return (date as any).toDate();
    return new Date(date);
  };

  if (typeof (data as any).shipDate !== "undefined") {
    (payload as any).shipDate = (data as any).shipDate;
    const currentVal = normalizeDate((currentProject as any)?.shipDate);
    const newVal = normalizeDate((data as any).shipDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).shipDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof (data as any).loadInDate !== "undefined") {
    (payload as any).loadInDate = (data as any).loadInDate;
    const currentVal = normalizeDate((currentProject as any)?.loadInDate);
    const newVal = normalizeDate((data as any).loadInDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).loadInDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof (data as any).eventBeginDate !== "undefined") {
    (payload as any).eventBeginDate = (data as any).eventBeginDate;
    const currentVal = normalizeDate((currentProject as any)?.eventBeginDate);
    const newVal = normalizeDate((data as any).eventBeginDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).eventBeginDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof (data as any).eventEndDate !== "undefined") {
    (payload as any).eventEndDate = (data as any).eventEndDate;
    const currentVal = normalizeDate((currentProject as any)?.eventEndDate);
    const newVal = normalizeDate((data as any).eventEndDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).eventEndDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof (data as any).strikeDate !== "undefined") {
    (payload as any).strikeDate = (data as any).strikeDate;
    const currentVal = normalizeDate((currentProject as any)?.strikeDate);
    const newVal = normalizeDate((data as any).strikeDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).strikeDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof (data as any).pickupDate !== "undefined") {
    (payload as any).pickupDate = (data as any).pickupDate;
    const currentVal = normalizeDate((currentProject as any)?.pickupDate);
    const newVal = normalizeDate((data as any).pickupDate);
    if (currentVal?.getTime() !== newVal?.getTime()) {
      (changes as any).pickupDate = { from: currentVal ? currentVal.toISOString() : null, to: newVal ? newVal.toISOString() : null };
    }
  }
  if (typeof data.returnDate !== "undefined") {
    payload.returnDate = data.returnDate;
    const normalizeDate = (date: any): Date | null => {
      if (!date) return null;
      if (date.toDate) return date.toDate();
      return new Date(date);
    };
    
    const currentReturnDate = normalizeDate(currentProject?.returnDate);
    const newReturnDate = normalizeDate(data.returnDate);
    
    if (currentReturnDate?.getTime() !== newReturnDate?.getTime()) {
      changes.returnDate = { 
        from: currentReturnDate ? currentReturnDate.toISOString() : null, 
        to: newReturnDate ? newReturnDate.toISOString() : null 
      };
    }
  }

  if (typeof (data as any).postEventReport !== "undefined") {
    (payload as any).postEventReport = (data as any).postEventReport;
    const hadPrev = !!(currentProject as any)?.postEventReport;
    changes.postEventReport = { from: hadPrev ? '[existing]' : null, to: '[report]' } as any;
  }
  
  if (typeof data.clientId !== "undefined") {
    payload.clientId = data.clientId;
    if (currentProject?.clientId !== data.clientId) {
      changes.clientId = { 
        from: currentProject?.clientId || null, 
        to: data.clientId || null 
      };
    }
  }
  
  if (typeof data.venueId !== "undefined") {
    payload.venueId = data.venueId;
    if (currentProject?.venueId !== data.venueId) {
      changes.venueId = { 
        from: currentProject?.venueId || null, 
        to: data.venueId || null 
      };
    }
  }
  
  if (typeof data.color !== "undefined") {
    payload.color = data.color;
    if (currentProject?.color !== data.color) {
      changes.color = { 
        from: currentProject?.color || null, 
        to: data.color || null 
      };
    }
  }

  const { updateDoc: _updateDoc, doc: _doc2 } = await import('firebase/firestore');
  const fb3 = await getFirebase();
  await _updateDoc(_doc2(fb3.db, `organizations/${organizationId}/projects/${projectId}`), payload);

  // Log activity with proper parameters
  const action = Object.keys(changes).includes('status') ? "status_changed" : "updated";
  const projectTitle = data.title || currentProject?.title || "Unknown Project";
  
  await logActivity(organizationId, "project", projectId, projectTitle, action, {
    changes,
    description: `Updated project: ${Object.keys(changes).join(', ')}`
  });
}

/**
 * Delete a project and cascade-delete its tasks and any blockers tied
 * to the project or those tasks.
 */
export async function deleteProject(organizationId: string, projectId: string) {
  const { writeBatch: _writeBatch, query: _query, where: _where, getDocs: _getDocs, doc: _doc3 } = await import('firebase/firestore');
  const fb4 = await getFirebase();
  const batch = _writeBatch(fb4.db);

  // Delete project tasks
  const tasksQ = _query(fb4.orgCol(organizationId, "tasks"), _where("projectId", "==", projectId));
  const tasksSnap = await _getDocs(tasksQ);
  const taskIds = tasksSnap.docs.map((d: any) => d.id);
    for (const d of tasksSnap.docs) {
    batch.delete(_doc3(fb4.db, `organizations/${organizationId}/tasks/${(d as any).id}`));
  }

  // Delete blockers directly on the project
  const projectBlockersQ = _query(fb4.orgCol(organizationId, "blockers"), _where("entityId", "==", projectId), _where("entityType", "==", "project"));
  const projectBlockersSnap = await _getDocs(projectBlockersQ);
  projectBlockersSnap.forEach((b: any) => batch.delete(b.ref));

  // Delete blockers on each task in chunks of 10 (Firestore 'in' limit)
  const chunkSize = 10;
  for (let i = 0; i < taskIds.length; i += chunkSize) {
    const chunk = taskIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const taskBlockersQ = _query(fb4.orgCol(organizationId, "blockers"), _where("entityId", "in", chunk), _where("entityType", "==", "task"));
  const taskBlockersSnap = await _getDocs(taskBlockersQ);
  taskBlockersSnap.forEach((b: any) => batch.delete(b.ref));
  }

  // Finally delete the project doc
  batch.delete(_doc3(fb4.db, `organizations/${organizationId}/projects/${projectId}`));

  await batch.commit();
  await logActivity(organizationId, "project", projectId, "Deleted Project", "deleted", {
    description: "Deleted project and its tasks/blockers"
  });
}

/**
 * Re-evaluate whether a project should be 'blocked' based on:
 *  - any blocked tasks in the project
 *  - any active blockers on the project
 * If unblocking, leave 'completed'/'archived' sticky.
 */
export async function reevaluateProjectBlockedState(organizationId: string, projectId: string) {
  const fb5 = await getFirebase();
  const { getDocs: _getDocs2, query: _query2, where: _where2, getDoc: _getDoc2, doc: _doc2 } = await import('firebase/firestore');
  const projectRef = _doc2(fb5.db, `organizations/${organizationId}/projects/${projectId}`);
  const [blockedTasksSnap, activeProjectBlockersSnap, projectSnap] = await Promise.all([
    _getDocs2(_query2(fb5.orgCol(organizationId, "tasks"), _where2("projectId", "==", projectId), _where2("status", "==", "blocked"))),
    _getDocs2(_query2(fb5.orgCol(organizationId, "blockers"), _where2("entityType", "==", "project"), _where2("entityId", "==", projectId), _where2("status", "==", "active"))),
    _getDoc2(projectRef),
  ]);

  if (!projectSnap.exists()) return;

  const hasBlockedTasks = !blockedTasksSnap.empty;
  const hasActiveProjectBlockers = !activeProjectBlockersSnap.empty;
  const shouldBeBlocked = hasBlockedTasks || hasActiveProjectBlockers;

  const currentStatus = (projectSnap.data() as Project).status;

  let targetStatus: ProjectStatus | null = null;
  if (shouldBeBlocked) {
    targetStatus = "blocked";
  } else {
    // keep completed/archived sticky
    if (currentStatus === "completed" || currentStatus === "archived") {
      targetStatus = null;
    } else {
      // Default to 'executing' if unblocking (was previously blocked)
      targetStatus = "executing";
    }
  }

  if (targetStatus && targetStatus !== currentStatus) {
    await updateProject(organizationId, projectId, { status: targetStatus });
    const projectTitle = (projectSnap.data() as Project).title || "Unknown Project";
    await logActivity(organizationId, "project", projectId, projectTitle, "status_changed", {
      description: `Project status auto-set to ${targetStatus}`,
      changes: { status: { from: currentStatus, to: targetStatus } }
    });
  }
}
// src/services/projects.ts
// ...existing imports and functions remain unchanged...

import type { ProjectStatus } from "../types";

export const archiveProject = (organizationId: string, projectId: string) =>
  updateProject(organizationId, projectId, { status: "archived" as ProjectStatus });

export const unarchiveProject = (organizationId: string, projectId: string) =>
  updateProject(organizationId, projectId, { status: "not_started" as ProjectStatus });

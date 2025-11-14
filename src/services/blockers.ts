// src/services/blockers.ts
import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "../firebase";
import type {
  Blocker,
  BlockerEntityType,
  TaskStatus,
  ProjectStatus,
} from "../types";
import { updateTask } from "./tasks";
import { updateProject, reevaluateProjectBlockedState } from "./projects";

/**
 * Create a blocker for a task or project.
 * - Captures previous status (prevStatus) if the entity is not already blocked.
 * - Sets the entity's status to "blocked".
 */
export async function createBlocker(
  organizationId: string,
  entity: { id: string; type: BlockerEntityType }, // "task" | "project"
  data: { reason: string; waitingOn?: string; expectedDate?: string | null }
) {
  // Determine if we should capture the previous status
  let currentStatus: TaskStatus | ProjectStatus | null = null;

  if (entity.type === "task") {
    const fb = await getFirebase();
    const snap = await getDoc(doc(fb.db, `organizations/${organizationId}/tasks/${entity.id}`));
    currentStatus = snap.exists() ? ((snap.data() as any).status ?? null) : null;
  } else {
    const fb = await getFirebase();
    const snap = await getDoc(doc(fb.db, `organizations/${organizationId}/projects/${entity.id}`));
    currentStatus = snap.exists() ? ((snap.data() as any).status ?? null) : null;
  }

  const shouldCapturePrev =
    currentStatus != null && currentStatus !== "blocked" && currentStatus !== "archived";

  const fb2 = await getFirebase();
  await addDoc(fb2.orgCol(organizationId, "blockers"), {
    reason: data.reason,
    waitingOn: data.waitingOn ?? "",
    expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
    entityId: entity.id,
    entityType: entity.type,
    status: "active",
    createdAt: serverTimestamp(),
    prevStatus: shouldCapturePrev ? currentStatus : null,
    capturesPrev: !!shouldCapturePrev,
  } as Omit<Blocker, "id">);

  // Block the entity
  if (entity.type === "task") {
    await updateTask(organizationId, entity.id, { status: "blocked" });

    // If task belongs to a project, re-evaluate project state
    try {
      const fb3 = await getFirebase();
      const tSnap = await getDoc(doc(fb3.db, `organizations/${organizationId}/tasks/${entity.id}`));
      const projectId = tSnap.exists() ? (tSnap.data() as any).projectId : null;
      if (projectId) await reevaluateProjectBlockedState(organizationId, projectId);
    } catch (e: any) {
      const { logError } = await import('../utils/logger');
      logError("reevaluate after task blocked failed:", e?.message ?? e);
    }
  } else {
    await updateProject(organizationId, entity.id, { status: "blocked" as ProjectStatus });
  }

  // Activity logging handled by calling functions
}

/**
 * Update an existing blocker’s details (reason / waitingOn / expectedDate).
 */
export async function updateBlocker(
  organizationId: string,
  blockerId: string,
  data: Partial<{ reason: string; waitingOn: string; expectedDate: string | null }>
) {
  const payload: Record<string, unknown> = {};
  if (typeof data.reason !== "undefined") payload.reason = data.reason;
  if (typeof data.waitingOn !== "undefined") payload.waitingOn = data.waitingOn;
  if (typeof data.expectedDate !== "undefined") {
    payload.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
  }

  if (Object.keys(payload).length > 0) {
    const fb4 = await getFirebase();
    await updateDoc(doc(fb4.db, `organizations/${organizationId}/blockers/${blockerId}`), payload);
    // Activity logging handled by calling functions
  }
}

/**
 * Resolve (clear) a blocker.
 * - Allows an empty resolution note (stored as null).
 * - If no other active blockers remain for the entity, restores the entity status.
 *   - Tasks: back to prevStatus if captured, else "in_progress"; also re-eval parent project.
 *   - Projects: re-eval project (and check there are no blocked tasks).
 */
export async function resolveBlocker(
  organizationId: string,
  blockerToResolve: {
    id: string;
    reason: string;
    entityId: string;
    entityType: BlockerEntityType;
  } & Partial<Blocker>,
  clearedReason: string,
  clearedByUserId?: string
) {
  const cleaned = (clearedReason ?? "").trim();

  // Mark this blocker as cleared
  const fb = await getFirebase();
  await updateDoc(doc(fb.db, `organizations/${organizationId}/blockers/${blockerToResolve.id}`), {
    status: "cleared",
    clearedReason: cleaned || null,
    clearedAt: serverTimestamp(),
    ...(clearedByUserId && { clearedBy: clearedByUserId }),
  });
  // Activity logging handled by calling functions

  const { entityId, entityType } = blockerToResolve;

  // Any other active blockers on this entity?
  const fb5 = await getFirebase();
  const qActive = query(
    fb5.orgCol(organizationId, "blockers"),
    where("entityId", "==", entityId),
    where("entityType", "==", entityType),
    where("status", "==", "active")
  );
  const remaining = await getDocs(qActive);
  if (!remaining.empty) return; // still blocked by others

  // No active blockers remain → update entity state
  if (entityType === "task") {
    // Always set to in_progress when all blockers are cleared
    await updateTask(organizationId, entityId, { status: "in_progress" });

    // Re-evaluate the parent project if any
    try {
    const fb6 = await getFirebase();
    const tSnap = await getDoc(doc(fb6.db, `organizations/${organizationId}/tasks/${entityId}`));
      const projectId = tSnap.exists() ? (tSnap.data() as any).projectId : null;
      if (projectId) await reevaluateProjectBlockedState(organizationId, projectId);
    } catch (e: any) {
      const { logError } = await import('../utils/logger');
      logError("reevaluate after task unblocked failed:", e?.message ?? e);
    }
  } else {
    // For projects, ensure there are no blocked tasks remaining.
    const fb7 = await getFirebase();
    const blockedTasksSnap = await getDocs(
      query(fb7.orgCol(organizationId, "tasks"), where("projectId", "==", entityId), where("status", "==", "blocked"))
    );

    if (blockedTasksSnap.empty) {
      // Let reevaluation determine final status (respects archived/completed, etc.)
      await reevaluateProjectBlockedState(organizationId, entityId);
    }
  }
}

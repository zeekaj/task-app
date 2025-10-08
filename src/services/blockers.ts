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
import { db, col } from "../firebase";
import type {
  Blocker,
  BlockerEntityType,
  TaskStatus,
  ProjectStatus,
} from "../types";
import { logActivity } from "./activity";
import { updateTask } from "./tasks";
import { updateProject, reevaluateProjectBlockedState } from "./projects";

/**
 * Create a blocker for a task or project.
 * - Captures previous status (prevStatus) if the entity is not already blocked.
 * - Sets the entity's status to "blocked".
 */
export async function createBlocker(
  uid: string,
  entity: { id: string; type: BlockerEntityType }, // "task" | "project"
  data: { reason: string; waitingOn?: string; expectedDate?: string | null }
) {
  // Determine if we should capture the previous status
  let currentStatus: TaskStatus | ProjectStatus | null = null;

  if (entity.type === "task") {
    const snap = await getDoc(doc(db, "users", uid, "tasks", entity.id));
    currentStatus = snap.exists() ? ((snap.data() as any).status ?? null) : null;
  } else {
    const snap = await getDoc(doc(db, "users", uid, "projects", entity.id));
    currentStatus = snap.exists() ? ((snap.data() as any).status ?? null) : null;
  }

  const shouldCapturePrev =
    currentStatus != null && currentStatus !== "blocked" && currentStatus !== "archived";

  const ref = await addDoc(col(uid, "blockers"), {
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
    await updateTask(uid, entity.id, { status: "blocked" });

    // If task belongs to a project, re-evaluate project state
    try {
      const tSnap = await getDoc(doc(db, "users", uid, "tasks", entity.id));
      const projectId = tSnap.exists() ? (tSnap.data() as any).projectId : null;
      if (projectId) await reevaluateProjectBlockedState(uid, projectId);
    } catch (e) {
      console.error("reevaluate after task blocked failed:", e);
    }
  } else {
    await updateProject(uid, entity.id, { status: "blocked" as ProjectStatus });
  }

  await logActivity(uid, `Blocked ${entity.type}: ${data.reason}`, "blocker", ref.id, "block");
}

/**
 * Update an existing blocker’s details (reason / waitingOn / expectedDate).
 */
export async function updateBlocker(
  uid: string,
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
    await updateDoc(doc(db, `users/${uid}/blockers/${blockerId}`), payload);
    await logActivity(uid, "Updated blocker details", "blocker", blockerId, "update");
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
  uid: string,
  blockerToResolve: {
    id: string;
    reason: string;
    entityId: string;
    entityType: BlockerEntityType;
  } & Partial<Blocker>,
  clearedReason: string
) {
  const cleaned = (clearedReason ?? "").trim();

  // Mark this blocker as cleared
  await updateDoc(doc(db, `users/${uid}/blockers/${blockerToResolve.id}`), {
    status: "cleared",
    clearedReason: cleaned || null,
    clearedAt: serverTimestamp(),
  });
  await logActivity(
    uid,
    `Resolved blocker: ${blockerToResolve.reason}`,
    "blocker",
    blockerToResolve.id!,
    "unblock"
  );

  const { entityId, entityType } = blockerToResolve;

  // Any other active blockers on this entity?
  const qActive = query(
    col(uid, "blockers"),
    where("entityId", "==", entityId),
    where("entityType", "==", entityType),
    where("status", "==", "active")
  );
  const remaining = await getDocs(qActive);
  if (!remaining.empty) return; // still blocked by others

  // No active blockers remain → update entity state
  const prevStatusCaptured = blockerToResolve.prevStatus;

  if (entityType === "task") {
    // Always set to in_progress when all blockers are cleared
    await updateTask(uid, entityId, { status: "in_progress" });

    // Re-evaluate the parent project if any
    try {
      const tSnap = await getDoc(doc(db, "users", uid, "tasks", entityId));
      const projectId = tSnap.exists() ? (tSnap.data() as any).projectId : null;
      if (projectId) await reevaluateProjectBlockedState(uid, projectId);
    } catch (e) {
      console.error("reevaluate after task unblocked failed:", e);
    }
  } else {
    // For projects, ensure there are no blocked tasks remaining.
    const blockedTasksSnap = await getDocs(
      query(col(uid, "tasks"), where("projectId", "==", entityId), where("status", "==", "blocked"))
    );

    if (blockedTasksSnap.empty) {
      // Let reevaluation determine final status (respects archived/completed, etc.)
      await reevaluateProjectBlockedState(uid, entityId);
    }
  }
}

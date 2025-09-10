// src/services/tasks.ts
import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, col } from "../firebase";
import type { Task, TaskStatus } from "../types";
import { logActivity } from "./activity";
import { reevaluateProjectBlockedState } from "./projects";

export async function createTask(uid: string, title: string, projectId?: string | null) {
  const ref = await addDoc(col(uid, "tasks"), {
    title,
    description: "",
    projectId: projectId ?? null,
    status: "not_started" as TaskStatus,
    priority: 2,
    dueDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Task);

  await logActivity(uid, `Created task: ${title}`, "task", ref.id, "create");
  return ref.id;
}

export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId" | "status">>
) {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (typeof data.title !== "undefined") payload.title = data.title;
  if (typeof data.description !== "undefined") payload.description = data.description;
  if (typeof data.priority !== "undefined") payload.priority = data.priority;
  if (typeof data.dueDate !== "undefined") payload.dueDate = data.dueDate;
  if (typeof data.projectId !== "undefined") payload.projectId = data.projectId;
  if (typeof data.status !== "undefined") payload.status = data.status;

  await updateDoc(doc(db, `users/${uid}/tasks/${taskId}`), payload);

  if (typeof data.status !== "undefined") {
    await logActivity(uid, `Task status → ${data.status}`, "task", taskId, "status_change");
  } else {
    await logActivity(uid, "Updated task", "task", taskId, "update");
  }

  try {
    if (typeof data.status !== "undefined" || typeof data.projectId !== "undefined") {
      const tSnap = await getDoc(doc(db, `users/${uid}/tasks/${taskId}`));
      const projectId = tSnap.exists() ? ((tSnap.data() as Task).projectId ?? null) : null;
      if (projectId) await reevaluateProjectBlockedState(uid, projectId);
    }
  } catch (e) {
    console.error("reevaluateProjectBlockedState after updateTask failed:", e);
  }
}

export async function removeTask(uid: string, taskId: string) {
  let parentProjectId: string | null = null;
  try {
    const tSnap = await getDoc(doc(db, `users/${uid}/tasks/${taskId}`));
    parentProjectId = tSnap.exists() ? ((tSnap.data() as Task).projectId ?? null) : null;
  } catch (e) {
    console.error("Failed to fetch task before delete:", e);
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, `users/${uid}/tasks/${taskId}`));
  // blockers cleanup done in blockers service during project delete; safe to keep simple here
  await batch.commit();
  await logActivity(uid, "Deleted task", "task", taskId, "delete");

  try {
    if (parentProjectId) await reevaluateProjectBlockedState(uid, parentProjectId);
  } catch (e) {
    console.error("reevaluateProjectBlockedState after delete failed:", e);
  }
}

/** Archive / Unarchive */
export const archiveTask = (uid: string, taskId: string) =>
  updateTask(uid, taskId, { status: "archived" });

export const unarchiveTask = (uid: string, taskId: string) =>
  updateTask(uid, taskId, { status: "in_progress" });

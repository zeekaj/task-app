/**
 * Add a dependency to a task
 */
export async function addDependency(
  uid: string,
  taskId: string,
  dependencyTaskId: string
): Promise<void> {
  const ref = doc(db, `users/${uid}/tasks/${taskId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = Array.isArray(task.dependencies)
    ? Array.from(new Set([...task.dependencies, dependencyTaskId]))
    : [dependencyTaskId];
  await updateDoc(ref, { dependencies, updatedAt: serverTimestamp() });
  await logActivity(uid, `Added dependency: ${dependencyTaskId}`, "task", taskId, "update");
}

/**
 * Remove a dependency from a task
 */
export async function removeDependency(
  uid: string,
  taskId: string,
  dependencyTaskId: string
): Promise<void> {
  const ref = doc(db, `users/${uid}/tasks/${taskId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = (task.dependencies || []).filter((id) => id !== dependencyTaskId);
  await updateDoc(ref, { dependencies, updatedAt: serverTimestamp() });
  await logActivity(uid, `Removed dependency: ${dependencyTaskId}`, "task", taskId, "update");
}
// src/services/tasks.ts
import {
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, col } from "../firebase";
import type { Task, TaskStatus, Subtask } from "../types";
// Subtask CRUD operations
import { v4 as uuidv4 } from "uuid";

/**
 * Add a subtask to a task
 */
export async function addSubtask(
  uid: string,
  taskId: string,
  title: string
): Promise<Subtask> {
  const subtask: Subtask = { id: uuidv4(), title, done: false };
  const ref = doc(db, `users/${uid}/tasks/${taskId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks, subtask] : [subtask];
  await updateDoc(ref, { subtasks, updatedAt: serverTimestamp() });
  await logActivity(uid, `Added subtask: ${title}`, "task", taskId, "update");
  return subtask;
}

/**
 * Update a subtask (title or done)
 */
export async function updateSubtask(
  uid: string,
  taskId: string,
  subtaskId: string,
  data: Partial<Pick<Subtask, "title" | "done">>
): Promise<void> {
  const ref = doc(db, `users/${uid}/tasks/${taskId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).map((s) =>
    s.id === subtaskId ? { ...s, ...data } : s
  );
  await updateDoc(ref, { subtasks, updatedAt: serverTimestamp() });
  await logActivity(uid, `Updated subtask: ${subtaskId}`, "task", taskId, "update");
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(
  uid: string,
  taskId: string,
  subtaskId: string
): Promise<void> {
  const ref = doc(db, `users/${uid}/tasks/${taskId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId);
  await updateDoc(ref, { subtasks, updatedAt: serverTimestamp() });
  await logActivity(uid, `Deleted subtask: ${subtaskId}`, "task", taskId, "update");
}
import { logActivity } from "./activity";
import { reevaluateProjectBlockedState } from "./projects";

export async function createTask(
  uid: string,
  title: string,
  projectId?: string | null,
  options?: Partial<Pick<Task, "description" | "priority" | "dueDate" | "assignee" | "recurrence" | "attachments" | "comments">>
) {
  const docData: any = {
    title,
    description: options?.description ?? "",
    comments: options?.comments ?? "",
    projectId: projectId ?? null,
    status: "not_started" as TaskStatus,
    priority: typeof options?.priority === "number" ? options.priority : 2,
    dueDate: options?.dueDate ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (typeof options?.assignee !== "undefined") {
    docData.assignee = options.assignee;
  }
  if (typeof options?.recurrence !== "undefined") {
    docData.recurrence = options.recurrence;
  }
  if (typeof options?.attachments !== "undefined") {
    docData.attachments = options.attachments;
  }
  const ref = await addDoc(col(uid, "tasks"), docData as Task);

  await logActivity(uid, `Created task: ${title}`, "task", ref.id, "create");
  return ref.id;
}

export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId" | "status" | "order" | "assignee" | "recurrence" | "attachments" | "comments">>
) {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (typeof data.title !== "undefined") payload.title = data.title;
  if (typeof data.description !== "undefined") payload.description = data.description;
  if (typeof data.comments !== "undefined") payload.comments = data.comments;
  if (typeof data.priority !== "undefined") payload.priority = data.priority;
  if (typeof data.dueDate !== "undefined") payload.dueDate = data.dueDate;
  if (typeof data.projectId !== "undefined") payload.projectId = data.projectId;
  if (typeof data.status !== "undefined") payload.status = data.status;
  if (typeof data.order !== "undefined") payload.order = data.order;
  if (typeof data.assignee !== "undefined") payload.assignee = data.assignee;
  if (typeof data.recurrence !== "undefined") payload.recurrence = data.recurrence;
  if (typeof data.attachments !== "undefined") payload.attachments = data.attachments;

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

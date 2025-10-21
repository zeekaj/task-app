// src/services/tasks.ts
// Firestore functions are imported dynamically inside functions to avoid bundling Firestore eagerly
import { getFirebase } from "../firebase";
import type { Task, TaskStatus, Subtask } from "../types";

// Lightweight ID generator for subtasks (uses crypto.randomUUID when available)
const generateId = () =>
  (globalThis.crypto && (globalThis.crypto as any).randomUUID
    ? (globalThis.crypto as any).randomUUID()
    : Math.random().toString(36).slice(2, 10));
import { reevaluateProjectBlockedState } from "./projects";
import { logActivity } from "./activityHistory";

/** Create a new task */
export async function createTask(
  uid: string,
  title: string,
  projectId?: string | null,
  options?: Partial<Pick<Task, "description" | "priority" | "dueDate" | "assignee" | "recurrence" | "attachments" | "comments">>
) {
  const { serverTimestamp: _serverTimestamp, addDoc: _addDoc } = await import('firebase/firestore');
  const docData: any = {
    title,
    description: options?.description ?? "",
    comments: options?.comments ?? "",
    projectId: projectId ?? null,
    status: "not_started" as TaskStatus,
    priority: typeof options?.priority === "number" ? options.priority : 50,
    dueDate: options?.dueDate ?? null,
    createdAt: _serverTimestamp(),
    updatedAt: _serverTimestamp(),
  };
  if (typeof options?.assignee !== "undefined") docData.assignee = options.assignee;
  if (typeof options?.recurrence !== "undefined") docData.recurrence = options.recurrence;
  if (typeof options?.attachments !== "undefined") docData.attachments = options.attachments;

  const fb = await getFirebase();
  const ref = await _addDoc(fb.col(uid, "tasks"), docData as Task);

  await logActivity(uid, "task", ref.id, title, "created", {
    description: `Created task: ${title}`,
  });
  return ref.id;
}

/** Update a task with partial fields and log changes */
export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId" | "status" | "order" | "assignee" | "recurrence" | "attachments" | "comments" | "subtasks" | "dependencies">>
) {
  const fb = await getFirebase();
  const { serverTimestamp: _serverTimestamp, doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc } = await import('firebase/firestore');
  const payload: Record<string, unknown> = { updatedAt: _serverTimestamp() };

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
  if (typeof data.subtasks !== "undefined") payload.subtasks = data.subtasks;
  if (typeof data.dependencies !== "undefined") payload.dependencies = data.dependencies;

  // Get current task data for change tracking
  const taskRef = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const taskSnap = await _getDoc(taskRef);
  const currentTask = taskSnap.exists() ? (taskSnap.data() as Task) : null;

  await _updateDoc(taskRef, payload);

  // Build changes object for activity logging
  const changes: Record<string, { from: any; to: any; type?: string }> = {};
  if (typeof data.title !== "undefined" && currentTask?.title !== data.title) {
    changes.title = { from: currentTask?.title || null, to: data.title || null };
  }
  if (typeof data.description !== "undefined" && currentTask?.description !== data.description) {
    console.log('Description change detected:', {
      currentDescription: currentTask?.description,
      newDescription: data.description,
      currentType: typeof currentTask?.description,
      newType: typeof data.description
    });
    changes.description = { 
      from: currentTask?.description === undefined ? undefined : currentTask.description,
      to: data.description === undefined ? undefined : data.description,
      type: 'string'
    };
    console.log('Change recorded as:', changes.description);
  }
  if (typeof data.status !== "undefined" && currentTask?.status !== data.status) {
    changes.status = { from: currentTask?.status || null, to: data.status };
  }
  if (typeof data.priority !== "undefined" && currentTask?.priority !== data.priority) {
    changes.priority = { from: currentTask?.priority || null, to: data.priority };
  }
  if (typeof data.assignee !== "undefined" && currentTask?.assignee !== data.assignee) {
    changes.assignee = { from: currentTask?.assignee || null, to: data.assignee || null };
  }
  if (typeof data.projectId !== "undefined" && currentTask?.projectId !== data.projectId) {
    changes.projectId = { from: currentTask?.projectId || null, to: data.projectId || null };
  }
  if (typeof data.dueDate !== "undefined" && currentTask?.dueDate !== data.dueDate) {
    changes.dueDate = { from: currentTask?.dueDate || null, to: data.dueDate ?? null };
  }
  if (typeof data.comments !== "undefined" && currentTask?.comments !== data.comments) {
    changes.comments = { from: currentTask?.comments || null, to: data.comments || null };
  }
  if (typeof data.subtasks !== "undefined" && JSON.stringify(currentTask?.subtasks || []) !== JSON.stringify(data.subtasks || [])) {
    changes.subtasks = { from: currentTask?.subtasks || [], to: data.subtasks || [] };
  }
  if (typeof data.dependencies !== "undefined" && JSON.stringify(currentTask?.dependencies || []) !== JSON.stringify(data.dependencies || [])) {
    changes.dependencies = { from: currentTask?.dependencies || [], to: data.dependencies || [] };
  }

  // Log activity if there are changes
  if (Object.keys(changes).length > 0) {
    const action = changes.status ? "status_changed" : "updated";
    const taskTitle = data.title || currentTask?.title || "Unknown Task";

    await logActivity(uid, "task", taskId, taskTitle, action, {
      changes,
      description: `Updated task: ${Object.keys(changes).join(", ")}`,
    });
  }

  try {
    if (typeof data.status !== "undefined" || typeof data.projectId !== "undefined") {
      const tSnap = await _getDoc(_doc(fb.db, `users/${uid}/tasks/${taskId}`));
      const projectId = tSnap.exists() ? ((tSnap.data() as Task).projectId ?? null) : null;
      if (projectId) await reevaluateProjectBlockedState(uid, projectId);
    }
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("reevaluateProjectBlockedState after updateTask failed:", e?.message ?? e);
  }
}

/** Remove a task */
export async function removeTask(uid: string, taskId: string) {
  const fb = await getFirebase();
  let parentProjectId: string | null = null;
  let taskTitle = "Unknown Task";
  const { doc: _doc, getDoc: _getDoc, writeBatch: _writeBatch } = await import('firebase/firestore');
  try {
    const tSnap = await _getDoc(_doc(fb.db, `users/${uid}/tasks/${taskId}`));
    if (tSnap.exists()) {
      const taskData = tSnap.data() as Task;
      parentProjectId = taskData.projectId ?? null;
      taskTitle = taskData.title || "Unknown Task";
    }
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("Failed to fetch task before delete:", e?.message ?? e);
  }

  const batch = _writeBatch(fb.db);
  batch.delete(_doc(fb.db, `users/${uid}/tasks/${taskId}`));
  // blockers cleanup done in blockers service during project delete; safe to keep simple here
  await batch.commit();

  await logActivity(uid, "task", taskId, taskTitle, "deleted", {
    description: `Deleted task: ${taskTitle}`,
  });

  try {
    if (parentProjectId) await reevaluateProjectBlockedState(uid, parentProjectId);
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("reevaluateProjectBlockedState after delete failed:", e?.message ?? e);
  }
}

/** Subtask CRUD operations */
export async function addSubtask(uid: string, taskId: string, title: string): Promise<Subtask> {
  const fb = await getFirebase();
  const subtask: Subtask = { id: generateId(), title, done: false };
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks, subtask] : [subtask];
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(uid, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Added subtask: ${title}`,
  });
  return subtask;
}

export async function updateSubtask(
  uid: string,
  taskId: string,
  subtaskId: string,
  data: Partial<Pick<Subtask, "title" | "done">>
): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, ...data } : s));
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(uid, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Updated subtask: ${subtaskId}`,
  });
}

export async function deleteSubtask(uid: string, taskId: string, subtaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId);
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(uid, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Deleted subtask: ${subtaskId}`,
  });
}

/** Dependency helpers */
export async function addDependency(uid: string, taskId: string, dependencyTaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = Array.isArray(task.dependencies)
    ? Array.from(new Set([...(task.dependencies || []), dependencyTaskId]))
    : [dependencyTaskId];
  await _updateDoc(ref, { dependencies, updatedAt: _serverTimestamp() });

  await logActivity(uid, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Added dependency: ${dependencyTaskId}`,
  });
}

export async function removeDependency(uid: string, taskId: string, dependencyTaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `users/${uid}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = (task.dependencies || []).filter((id) => id !== dependencyTaskId);
  await _updateDoc(ref, { dependencies, updatedAt: _serverTimestamp() });

  await logActivity(uid, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Removed dependency: ${dependencyTaskId}`,
  });
}

/** Archive / Unarchive */
export const archiveTask = (uid: string, taskId: string) =>
  updateTask(uid, taskId, { status: "archived" as TaskStatus });

export const unarchiveTask = (uid: string, taskId: string) =>
  updateTask(uid, taskId, { status: "in_progress" as TaskStatus });

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

/**
 * Create a new task
 * @param organizationId - The organization ID (owner's uid)
 * @param title - Task title
 * @param projectId - Optional project ID to associate with
 * @param options - Additional task fields
 * @param createdBy - User ID of the person creating the task
 */
export async function createTask(
  organizationId: string,
  title: string,
  projectId?: string | null,
  options?: Partial<Pick<Task, "description" | "priority" | "dueDate" | "assignee" | "recurrence" | "attachments" | "comments">>,
  createdBy?: string
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
    organizationId, // Add organizationId to document
    createdBy: createdBy || undefined, // Add creator's userId
    createdAt: _serverTimestamp(),
    updatedAt: _serverTimestamp(),
  };
  if (typeof options?.assignee !== "undefined") docData.assignee = options.assignee;
  if (typeof options?.recurrence !== "undefined") docData.recurrence = options.recurrence;
  if (typeof options?.attachments !== "undefined") docData.attachments = options.attachments;

  const fb = await getFirebase();
  const ref = await _addDoc(fb.orgCol(organizationId, "tasks"), docData as Task);

  await logActivity(organizationId, "task", ref.id, title, "created", {
    description: `Created task: ${title}`,
  });
  console.log('Activity log for created task submitted:', { taskId: ref.id, title });
  return ref.id;
}

/** Update a task with partial fields and log changes */
export async function updateTask(
  organizationId: string,
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
  const taskRef = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const taskSnap = await _getDoc(taskRef);
  const currentTask = taskSnap.exists() ? (taskSnap.data() as Task) : null;

  console.log('Updating task:', taskId, 'with data:', data);
  console.log('Current task:', currentTask);

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
    console.log('Status change detected:', {
      currentStatus: currentTask?.status,
      newStatus: data.status,
      areEqual: currentTask?.status === data.status,
      currentType: typeof currentTask?.status,
      newType: typeof data.status
    });
    changes.status = { from: currentTask?.status || null, to: data.status };
  } else if (typeof data.status !== "undefined") {
    console.log('Status NOT changed (values are equal):', {
      currentStatus: currentTask?.status,
      newStatus: data.status
    });
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

    console.log('About to log activity. Changes:', changes);
    await logActivity(organizationId, "task", taskId, taskTitle, action, {
      changes,
      description: `Updated task: ${Object.keys(changes).join(", ")}`,
    });
    console.log('Activity logged successfully');
  } else {
    console.log('No changes detected, skipping activity log');
  }

  // Re-evaluate project blocked state if status or projectId changed
  try {
    if (typeof data.status !== "undefined" || typeof data.projectId !== "undefined") {
      // If projectId changed, re-evaluate both old and new projects
      if (typeof data.projectId !== "undefined" && currentTask?.projectId !== data.projectId) {
        // Re-evaluate the OLD project (task was removed from it)
        if (currentTask?.projectId) {
          await reevaluateProjectBlockedState(organizationId, currentTask.projectId);
        }
        // Re-evaluate the NEW project (task was added to it)
        if (data.projectId) {
          await reevaluateProjectBlockedState(organizationId, data.projectId);
        }
      } else {
        // Status changed but projectId didn't - re-evaluate current project
        const tSnap = await _getDoc(_doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`));
        const projectId = tSnap.exists() ? ((tSnap.data() as Task).projectId ?? null) : null;
        if (projectId) await reevaluateProjectBlockedState(organizationId, projectId);
      }
    }
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("reevaluateProjectBlockedState after updateTask failed:", e?.message ?? e);
  }
}

/** Convert a general task to a project-specific task by setting projectId */
export async function convertTaskToProject(
  organizationId: string,
  taskId: string,
  projectId: string,
  projectTitle?: string
) {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc } = await import('firebase/firestore');

  // Get current task to verify it exists and is general (no projectId)
  const taskRef = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const taskSnap = await _getDoc(taskRef);
  
  if (!taskSnap.exists()) {
    throw new Error("Task not found");
  }

  const currentTask = taskSnap.data() as Task;
  
  if (currentTask.projectId) {
    throw new Error("Task is already associated with a project");
  }

  // Update the task with the new projectId
  await updateTask(organizationId, taskId, { projectId });

  // Log the conversion activity
  await logActivity(organizationId, "task", taskId, currentTask.title || "Unknown Task", "updated", {
    description: `Converted general task to project task: ${projectTitle || projectId}`,
    changes: {
      projectId: {
        from: null,
        to: projectId,
      },
    },
  });

  console.log('Task converted to project task:', { taskId, projectId, taskTitle: currentTask.title });

  // Re-evaluate project blocked state if needed
  try {
    await reevaluateProjectBlockedState(organizationId, projectId);
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("reevaluateProjectBlockedState after convertTaskToProject failed:", e?.message ?? e);
  }

  return { success: true };
}

/** Remove a task */
export async function removeTask(organizationId: string, taskId: string) {
  const fb = await getFirebase();
  let parentProjectId: string | null = null;
  let taskTitle = "Unknown Task";
  const { doc: _doc, getDoc: _getDoc, writeBatch: _writeBatch } = await import('firebase/firestore');
  try {
    const tSnap = await _getDoc(_doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`));
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
  batch.delete(_doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`));
  // blockers cleanup done in blockers service during project delete; safe to keep simple here
  await batch.commit();

  await logActivity(organizationId, "task", taskId, taskTitle, "deleted", {
    description: `Deleted task: ${taskTitle}`,
  });
  console.log('Activity log for deleted task submitted:', { taskId, taskTitle });

  try {
    if (parentProjectId) await reevaluateProjectBlockedState(organizationId, parentProjectId);
  } catch (e: any) {
    const { logError } = await import('../utils/logger');
    logError("reevaluateProjectBlockedState after delete failed:", e?.message ?? e);
  }
}

/** Subtask CRUD operations */
export async function addSubtask(organizationId: string, taskId: string, title: string): Promise<Subtask> {
  const fb = await getFirebase();
  const subtask: Subtask = { id: generateId(), title, done: false };
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = Array.isArray(task.subtasks) ? [...task.subtasks, subtask] : [subtask];
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(organizationId, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Added subtask: ${title}`,
  });
  return subtask;
}

export async function updateSubtask(
  organizationId: string,
  taskId: string,
  subtaskId: string,
  data: Partial<Pick<Subtask, "title" | "done">>
): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, ...data } : s));
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(organizationId, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Updated subtask: ${subtaskId}`,
  });
}

export async function deleteSubtask(organizationId: string, taskId: string, subtaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const subtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId);
  await _updateDoc(ref, { subtasks, updatedAt: _serverTimestamp() });

  await logActivity(organizationId, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Deleted subtask: ${subtaskId}`,
  });
}

/** Dependency helpers */
export async function addDependency(organizationId: string, taskId: string, dependencyTaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = Array.isArray(task.dependencies)
    ? Array.from(new Set([...(task.dependencies || []), dependencyTaskId]))
    : [dependencyTaskId];
  await _updateDoc(ref, { dependencies, updatedAt: _serverTimestamp() });

  await logActivity(organizationId, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Added dependency: ${dependencyTaskId}`,
  });
}

export async function removeDependency(organizationId: string, taskId: string, dependencyTaskId: string): Promise<void> {
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc, updateDoc: _updateDoc, serverTimestamp: _serverTimestamp } = await import('firebase/firestore');
  const ref = _doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`);
  const snap = await _getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found");
  const task = snap.data() as Task;
  const dependencies = (task.dependencies || []).filter((id) => id !== dependencyTaskId);
  await _updateDoc(ref, { dependencies, updatedAt: _serverTimestamp() });

  await logActivity(organizationId, "task", taskId, task.title || "Unknown Task", "updated", {
    description: `Removed dependency: ${dependencyTaskId}`,
  });
}

/** Archive / Unarchive */
export const archiveTask = async (organizationId: string, taskId: string) => {
  await updateTask(organizationId, taskId, { status: "archived" as TaskStatus });
  // Fetch task title for activity log
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc } = await import('firebase/firestore');
  let taskTitle = "Unknown Task";
  try {
    const tSnap = await _getDoc(_doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`));
    if (tSnap.exists()) {
      const taskData = tSnap.data();
      taskTitle = taskData.title || "Unknown Task";
    }
  } catch (e) { /* noop */ }
  await logActivity(organizationId, "task", taskId, taskTitle, "archived", {
    description: `Archived task: ${taskTitle}`,
  });
};

export const unarchiveTask = async (organizationId: string, taskId: string) => {
  await updateTask(organizationId, taskId, { status: "in_progress" as TaskStatus });
  // Fetch task title for activity log
  const fb = await getFirebase();
  const { doc: _doc, getDoc: _getDoc } = await import('firebase/firestore');
  let taskTitle = "Unknown Task";
  try {
    const tSnap = await _getDoc(_doc(fb.db, `organizations/${organizationId}/tasks/${taskId}`));
    if (tSnap.exists()) {
      const taskData = tSnap.data();
      taskTitle = taskData.title || "Unknown Task";
    }
  } catch (e) { /* noop */ }
  await logActivity(organizationId, "task", taskId, taskTitle, "status_changed", {
    description: `Unarchived task: ${taskTitle}`,
  });
};

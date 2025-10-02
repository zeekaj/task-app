// src/services/projects.ts
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
import type { Project } from "../types";
import { logActivity } from "./activity";

/** Create a new project. */
export async function createProject(uid: string, title: string) {
  const ref = await addDoc(col(uid, "projects"), {
    title,
    status: "in_progress" as ProjectStatus,
    assignee: undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Project);
  await logActivity(uid, `Created project: ${title}`, "project", ref.id, "create");
  return ref.id;
}

/** Update project title/status (safely builds payload). */
export async function updateProject(
  uid: string,
  projectId: string,
  data: Partial<Pick<Project, "title" | "status" | "assignee">>
) {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof data.title !== "undefined") payload.title = data.title;
  if (typeof data.status !== "undefined") payload.status = data.status;
  if (typeof data.assignee !== "undefined") payload.assignee = data.assignee;

  await updateDoc(doc(db, `users/${uid}/projects/${projectId}`), payload);

  const summary =
    typeof data.title !== "undefined"
      ? "Updated project title"
      : typeof data.status !== "undefined"
      ? `Updated project status to ${data.status}`
      : "Updated project";
  await logActivity(uid, summary, "project", projectId, "update");
}

/**
 * Delete a project and cascade-delete its tasks and any blockers tied
 * to the project or those tasks.
 */
export async function deleteProject(uid: string, projectId: string) {
  const batch = writeBatch(db);

  // Delete project tasks
  const tasksQ = query(col(uid, "tasks"), where("projectId", "==", projectId));
  const tasksSnap = await getDocs(tasksQ);
  const taskIds = tasksSnap.docs.map((d) => d.id);
  for (const d of tasksSnap.docs) {
    batch.delete(doc(db, `users/${uid}/tasks/${d.id}`));
  }

  // Delete blockers directly on the project
  const projectBlockersQ = query(
    col(uid, "blockers"),
    where("entityId", "==", projectId),
    where("entityType", "==", "project")
  );
  const projectBlockersSnap = await getDocs(projectBlockersQ);
  projectBlockersSnap.forEach((b) => batch.delete(b.ref));

  // Delete blockers on each task in chunks of 10 (Firestore 'in' limit)
  const chunkSize = 10;
  for (let i = 0; i < taskIds.length; i += chunkSize) {
    const chunk = taskIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const taskBlockersQ = query(
      col(uid, "blockers"),
      where("entityId", "in", chunk),
      where("entityType", "==", "task")
    );
    const taskBlockersSnap = await getDocs(taskBlockersQ);
    taskBlockersSnap.forEach((b) => batch.delete(b.ref));
  }

  // Finally delete the project doc
  batch.delete(doc(db, `users/${uid}/projects/${projectId}`));

  await batch.commit();
  await logActivity(
    uid,
    "Deleted project and its tasks/blockers",
    "project",
    projectId,
    "delete"
  );
}

/**
 * Re-evaluate whether a project should be 'blocked' based on:
 *  - any blocked tasks in the project
 *  - any active blockers on the project
 * If unblocking, leave 'completed'/'archived' sticky.
 */
export async function reevaluateProjectBlockedState(uid: string, projectId: string) {
  const projectRef = doc(db, `users/${uid}/projects/${projectId}`);

  const [blockedTasksSnap, activeProjectBlockersSnap, projectSnap] = await Promise.all([
    getDocs(
      query(col(uid, "tasks"), where("projectId", "==", projectId), where("status", "==", "blocked"))
    ),
    getDocs(
      query(
        col(uid, "blockers"),
        where("entityType", "==", "project"),
        where("entityId", "==", projectId),
        where("status", "==", "active")
      )
    ),
    getDoc(projectRef),
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
      targetStatus = "in_progress";
    }
  }

  if (targetStatus && targetStatus !== currentStatus) {
    await updateProject(uid, projectId, { status: targetStatus });
    await logActivity(
      uid,
      `Project status auto-set to ${targetStatus}`,
      "project",
      projectId,
      "status_change"
    );
  }
}
// src/services/projects.ts
// ...existing imports and functions remain unchanged...

import type { ProjectStatus } from "../types";

export const archiveProject = (uid: string, projectId: string) =>
  updateProject(uid, projectId, { status: "archived" as ProjectStatus });

export const unarchiveProject = (uid: string, projectId: string) =>
  updateProject(uid, projectId, { status: "in_progress" as ProjectStatus });

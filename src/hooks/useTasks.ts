// src/hooks/useTasks.ts
import { useEffect, useState } from "react";
import {
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebase } from "../firebase";
import type { Task, WithId } from "../types";
import { mapSnapshotDocs } from "../utils/firestore";

// Lightweight local snapshot shape compatible with SDK runtime shape
// Use the SDK's QuerySnapshot generic for accurate typings
// QuerySnapshot<T> is imported above

/**
 * Subscribes to the current user's tasks.
 */
export type TasksQueryOptions = {
  projectId?: string | null; // subscribe to tasks for a project only
  status?: string[]; // optional status filter
  limit?: number; // optional limit
  orderByCreatedDesc?: boolean; // default true
};

// Backwards-compatible hook: useTasks(uid) still works. New signature: useTasks(uid, options)
export function useTasks(uid?: string, options?: TasksQueryOptions) {
  const [tasks, setTasks] = useState<WithId<Task>[]>([]);
  const optionsKey = `${options?.limit ?? ''}|${options?.orderByCreatedDesc ?? ''}|${options?.projectId ?? ''}|${Array.isArray(options?.status) ? options!.status.join(',') : ''}`;

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      return;
    }

    (async () => {
  const { query, orderBy, where, limit, onSnapshot } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [];
  if (options?.orderByCreatedDesc ?? true) {
      constraints.push(orderBy("createdAt", "desc"));
    }
    if (typeof options?.limit === "number") {
      constraints.push(limit(options!.limit));
    }
  const fb = await getFirebase();
  const collectionRef = fb.colFor(uid, 'tasks');

        // Build more targeted queries where possible
        let qRef: any = collectionRef;
        if (typeof options?.projectId !== "undefined") {
          qRef = query(qRef, where("projectId", "==", options.projectId));
        }
        if (Array.isArray(options?.status) && options!.status.length > 0) {
          const statusChunk = options!.status.slice(0, 10);
          qRef = query(qRef, where("status", "in", statusChunk));
        }
        if (constraints.length > 0) {
          qRef = query(qRef, ...constraints);
        }

        const unsub = onSnapshot(qRef, (snap: any) => {
          let tasks = mapSnapshotDocs<Task>(snap);
          if (tasks.length > 0 && tasks.every((t: any) => typeof t.order === "number")) {
            tasks = tasks.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          }
          setTasks(tasks);
        });

        // Cleanup
        return () => unsub();
      })();
  }, [uid, optionsKey, options]);

  return tasks;
}

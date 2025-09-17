// src/hooks/useTasks.ts
import { useEffect, useState } from "react";
import {
  onSnapshot,
  query,
  orderBy,
  collection,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Task, WithId } from "../types";

/**
 * Subscribes to the current user's tasks.
 */
export function useTasks(uid?: string) {
  const [tasks, setTasks] = useState<WithId<Task>[]>([]);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      return;
    }

  // Only order by createdAt to ensure all tasks are returned, sort by 'order' in JS if needed
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    const ref = collection(db, `users/${uid}/tasks`);
    const q = query(ref, ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      let tasks = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
      // If all tasks have an order, sort by order ascending
      if (tasks.length > 0 && tasks.every(t => typeof t.order === "number")) {
        tasks = tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      setTasks(tasks);
    });

    return () => unsub();
  }, [uid]);

  return tasks;
}

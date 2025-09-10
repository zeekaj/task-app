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

    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    const ref = collection(db, `users/${uid}/tasks`);
    const q = query(ref, ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) })));
    });

    return () => unsub();
  }, [uid]);

  return tasks;
}

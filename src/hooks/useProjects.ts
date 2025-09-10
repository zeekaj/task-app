// src/hooks/useProjects.ts
import { useEffect, useState } from "react";
import {
  onSnapshot,
  query,
  orderBy,
  collection,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Project, WithId } from "../types";

/**
 * Subscribes to the current user's projects.
 * Keeps ordering by createdAt desc for consistent UI.
 */
export function useProjects(uid?: string) {
  const [projects, setProjects] = useState<WithId<Project>[]>([]);

  useEffect(() => {
    if (!uid) {
      setProjects([]);
      return;
    }

    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    const ref = collection(db, `users/${uid}/projects`);
    const q = query(ref, ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setProjects(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Project) }))
      );
    });

    return () => unsub();
  }, [uid]);

  return projects;
}

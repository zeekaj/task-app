// src/hooks/useProjects.ts
import { useEffect, useState } from "react";
import {
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebase } from "../firebase";
import type { Project, WithId } from "../types";
import { mapSnapshotDocs } from "../utils/firestore";

/**
 * Subscribes to the current user's projects.
 * Keeps ordering by createdAt desc for consistent UI.
 */
export type ProjectsQueryOptions = {
  status?: string[];
  limit?: number;
  orderByCreatedDesc?: boolean; // default true
};

export function useProjects(uid?: string, options?: ProjectsQueryOptions) {
  const [projects, setProjects] = useState<WithId<Project>[]>([]);
  const optionsKey = `${options?.limit ?? ''}|${options?.orderByCreatedDesc ?? ''}|${Array.isArray(options?.status) ? options!.status.join(',') : ''}`;

  useEffect(() => {
    if (!uid) {
      setProjects([]);
      return;
    }

    (async () => {
      const { query, orderBy, where, limit, onSnapshot } = await import('firebase/firestore');
      const constraints: QueryConstraint[] = [];
      if (options?.orderByCreatedDesc ?? true) constraints.push(orderBy("createdAt", "desc"));
      if (typeof options?.limit === "number") constraints.push(limit(options!.limit));
      const fb = await getFirebase();
      let qRef: any = fb.colFor(uid, 'projects');
      if (Array.isArray(options?.status) && options!.status.length > 0) {
        const chunk = options!.status.slice(0, 10);
        qRef = query(qRef, where("status", "in", chunk));
      }
      if (constraints.length > 0) qRef = query(qRef, ...constraints);

      const unsub = onSnapshot(qRef, (snap: any) => {
        setProjects(mapSnapshotDocs<Project>(snap));
      });

      return () => unsub();
    })();
  }, [uid, optionsKey, options]);

  return projects;
}

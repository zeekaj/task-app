// src/hooks/useBlockers.ts
import { useEffect, useState } from "react";
import {
  onSnapshot,
  query,
  orderBy,
  collection,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Blocker, WithId } from "../types";

/**
 * Subscribes to all blockers for the current user.
 */
export function useAllBlockers(uid?: string) {
  const [blockers, setBlockers] = useState<WithId<Blocker>[]>([]);

  useEffect(() => {
    if (!uid) {
      setBlockers([]);
      return;
    }

    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    const ref = collection(db, `users/${uid}/blockers`);
    const q = query(ref, ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setBlockers(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Blocker) }))
      );
    });

    return () => unsub();
  }, [uid]);

  return blockers;
}

// src/hooks/useBlockers.ts
import { useEffect, useState } from "react";
import { getFirebase } from "../firebase";
import type { Blocker, WithId } from "../types";

/**
 * Subscribes to all blockers for the current user.
 */
export function useAllBlockers(organizationId?: string) {
  const [blockers, setBlockers] = useState<WithId<Blocker>[]>([]);

  useEffect(() => {
    if (!organizationId) {
      setBlockers([]);
      return;
    }

    (async () => {
    const fb = await getFirebase();
    const { onSnapshot, orderBy, query } = await import('firebase/firestore');
    const ref = fb.orgCol(organizationId, 'blockers');
    const q = query(ref, orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snap: any) => setBlockers(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Blocker) }))));
    return () => unsub();
  })();
  }, [organizationId]);

  return blockers;
}

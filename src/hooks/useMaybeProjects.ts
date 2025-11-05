import { useEffect, useState } from 'react';
import type { WithId, Project } from '../types';

// A hook that defers subscribing to projects until `enabled` is true.
export function useMaybeProjects(organizationId?: string | null, enabled?: boolean) {
  const [projects, setProjects] = useState<WithId<Project>[]>([]);

  useEffect(() => {
    if (!enabled || !organizationId) {
      setProjects([]);
      return;
    }

    let unsub: (() => void) | null = null;
    let mounted = true;

    (async () => {
      const fb = await (await import('../firebase')).getFirebase();
      const { onSnapshot, query, orderBy } = await import('firebase/firestore');
      const ref = fb.orgCol(organizationId, 'projects');
      const q = query(ref, orderBy('title'));
      unsub = onSnapshot(q, (snap: any) => {
        if (!mounted) return;
        setProjects(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Project) })));
      });
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [organizationId, enabled]);

  return projects;
}

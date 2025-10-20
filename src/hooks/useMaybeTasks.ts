import { useEffect, useState } from 'react';
import type { WithId, Task } from '../types';

// A hook that defers subscribing to tasks until `enabled` is true.
export function useMaybeTasks(uid?: string | null, enabled?: boolean) {
  const [tasks, setTasks] = useState<WithId<Task>[]>([]);

  useEffect(() => {
    if (!enabled || !uid) {
      setTasks([]);
      return;
    }

    let unsub: (() => void) | null = null;
    let mounted = true;

    (async () => {
      // call internal hook logic by subscribing directly to Firestore here
      // useTasks is a hook, we can't call it inside effect; instead import firestore functions directly
      const fb = await (await import('../firebase')).getFirebase();
      const { onSnapshot, query, orderBy } = await import('firebase/firestore');
      const ref = fb.col(uid, 'tasks');
      const q = query(ref, orderBy('order'));
      unsub = onSnapshot(q, (snap: any) => {
        if (!mounted) return;
        setTasks(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Task) })));
      });
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [uid, enabled]);

  return tasks;
}

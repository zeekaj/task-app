// src/hooks/useClients.ts
import { useEffect, useState } from 'react';
import type { Client, WithId } from '../types';
import { getFirebase } from '../firebase';

export function useClients(orgId: string): [WithId<Client>[] | null] {
  const [clients, setClients] = useState<WithId<Client>[] | null>(null);

  useEffect(() => {
    if (!orgId) {
      setClients([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { onSnapshot, query, where } = await import('firebase/firestore');
        const fb = await getFirebase();
        const ref = fb.orgCol(orgId, 'clients');
        const q = query(ref, where('active', '==', true));

        unsubscribe = onSnapshot(
          q,
          (snapshot: any) => {
            const items = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
            })) as WithId<Client>[];
            setClients(items);
          }
        );
      } catch (error) {
        console.error('Failed to setup clients listener', error);
        setClients([]);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [orgId]);

  return [clients];
}

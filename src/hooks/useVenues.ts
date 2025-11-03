// src/hooks/useVenues.ts
import { useEffect, useState } from 'react';
import type { Venue, WithId } from '../types';
import { getFirebase } from '../firebase';

export function useVenues(orgId: string): [WithId<Venue>[] | null] {
  const [venues, setVenues] = useState<WithId<Venue>[] | null>(null);

  useEffect(() => {
    if (!orgId) {
      setVenues([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { onSnapshot, query, where } = await import('firebase/firestore');
        const fb = await getFirebase();
        const ref = fb.col(orgId, 'venues');
        const q = query(ref, where('active', '==', true));

        unsubscribe = onSnapshot(
          q,
          (snapshot: any) => {
            const items = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
            })) as WithId<Venue>[];
            setVenues(items);
          }
        );
      } catch (error) {
        console.error('Failed to setup venues listener', error);
        setVenues([]);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [orgId]);

  return [venues];
}

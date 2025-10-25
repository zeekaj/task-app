// src/hooks/useTeamMembers.ts
import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, where, collection } from 'firebase/firestore';
import { getFirestoreClient } from '../firebase';
import type { TeamMember, WithId } from '../types';

/**
 * Hook to get team members for a specific organization
 * @param organizationId - The UID of the organization owner
 */
export function useTeamMembers(organizationId: string): WithId<TeamMember>[] | null {
  const [members, setMembers] = useState<WithId<TeamMember>[] | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setMembers([]);
      return;
    }

  let unsubscribe: (() => void) | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const { db } = await getFirestoreClient();
        const membersRef = collection(db, 'teamMembers');
        const q = query(
          membersRef,
          where('organizationId', '==', organizationId),
          orderBy('name', 'asc')
        );

        const subscribe = (theQuery: any, sortClientSide = false, allowFallback = true) =>
          onSnapshot(
            theQuery,
            {
              next: (snapshot: any) => {
                try {
                  let data = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as WithId<TeamMember>[];
                  if (sortClientSide) {
                    data = data.sort((a, b) => (
                      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
                    ));
                  }
                  setMembers(data);
                } catch (error) {
                  console.error('Error processing team members:', error);
                  setMembers([]);
                }
              },
              error: (error: any) => {
                // Handle missing index by falling back to a query without orderBy
                const code = (error && (error.code || error.name)) as string | undefined;
                const msg = (error && (error.message as string)) || '';
                const needsIndex = msg.includes('The query requires an index') || msg.includes('requires an index');
                if (allowFallback && (code === 'failed-precondition' || needsIndex)) {
                  if (typeof unsubscribe === 'function') unsubscribe();
                  const fallbackQuery = query(
                    membersRef,
                    where('organizationId', '==', organizationId)
                  );
                  unsubscribe = subscribe(fallbackQuery, true, false);
                  // Schedule a one-time retry with server-side ordering in case the index becomes available
                  if (retryTimer) clearTimeout(retryTimer);
                  retryTimer = setTimeout(() => {
                    try {
                      if (typeof unsubscribe === 'function') unsubscribe();
                      unsubscribe = subscribe(q, false, true);
                    } catch (e) {
                      // No-op: if it still fails, the error handler above will keep the fallback
                    }
                  }, 15000);
                  return;
                }
                console.error('Error in team members snapshot:', error);
                setMembers([]);
              },
            }
          );

        // Start with server-side orderBy; on missing index, we fallback in the error handler
        unsubscribe = subscribe(q, false, true);
      } catch (error) {
        console.error('Error setting up team members listener:', error);
        setMembers([]);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [organizationId]);

  return members;
}

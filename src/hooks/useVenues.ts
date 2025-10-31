// src/hooks/useVenues.ts
import { useEffect, useState, useCallback } from 'react';
import type { Venue, WithId } from '../types';
import { listVenues } from '../services/venues';

export function useVenues(orgId: string): [WithId<Venue>[] | null, () => void] {
  const [venues, setVenues] = useState<WithId<Venue>[] | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!orgId) {
          setVenues([]);
          return;
        }
        const items = await listVenues(orgId);
        if (!cancelled) setVenues(items as WithId<Venue>[]);
      } catch (e) {
        console.error('Failed to load venues', e);
        if (!cancelled) setVenues([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, refetchTrigger]);

  return [venues, refetch];
}

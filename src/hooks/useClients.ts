// src/hooks/useClients.ts
import { useEffect, useState, useCallback } from 'react';
import type { Client, WithId } from '../types';
import { listClients } from '../services/clients';

export function useClients(orgId: string): [WithId<Client>[] | null, () => void] {
  const [clients, setClients] = useState<WithId<Client>[] | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!orgId) {
          setClients([]);
          return;
        }
        const items = await listClients(orgId);
        if (!cancelled) setClients(items as WithId<Client>[]);
      } catch (e) {
        console.error('Failed to load clients', e);
        if (!cancelled) setClients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, refetchTrigger]);

  return [clients, refetch];
}

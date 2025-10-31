// src/hooks/useScheduleEvents.ts
import { useEffect, useState } from "react";
import { getFirebase } from "../firebase";
import type { ScheduleEvent, ScheduleStatus, WithId } from "../types";
import { mapSnapshotDocs } from "../utils/firestore";

export type ScheduleEventsQueryOptions = {
  startDate?: Date;
  endDate?: Date;
  projectId?: string;
  memberId?: string;
  type?: string;
  limit?: number;
  status?: ScheduleStatus[]; // client-side filter list
};

/**
 * Subscribe to schedule events with real-time updates
 */
export function useScheduleEvents(orgId?: string, options?: ScheduleEventsQueryOptions) {
  const [events, setEvents] = useState<WithId<ScheduleEvent>[]>([]);
  const [loading, setLoading] = useState(true);
  
  const optionsKey = `${options?.startDate?.getTime() ?? ''}|${options?.endDate?.getTime() ?? ''}|${options?.projectId ?? ''}|${options?.memberId ?? ''}|${options?.type ?? ''}|${options?.limit ?? ''}|${(options?.status || []).join(',')}`;

  useEffect(() => {
    if (!orgId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    
    (async () => {
      try {
        const { query, orderBy, where, limit, onSnapshot, Timestamp } = await import('firebase/firestore');
        const fb = await getFirebase();
        const collectionRef = fb.col(orgId, 'scheduleEvents');

        const constraints: any[] = [];
        
        // Date range filters
        // IMPORTANT: Firestore only supports range filters on a single field per query.
        // We filter by start in-range at the query level, and do any end-date checks client-side if needed.
        if (options?.startDate) {
          const startTimestamp = Timestamp.fromDate(options.startDate);
          constraints.push(where("start", ">=", startTimestamp));
        }
        if (options?.endDate) {
          const endTimestamp = Timestamp.fromDate(options.endDate);
          // Use a second range on the SAME field (start) to keep this query indexable
          constraints.push(where("start", "<=", endTimestamp));
        }
        
        // Other filters
        if (options?.projectId) {
          constraints.push(where("projectId", "==", options.projectId));
        }
        if (options?.memberId) {
          constraints.push(where("assignedMemberIds", "array-contains", options.memberId));
        }
        if (options?.type) {
          constraints.push(where("type", "==", options.type));
        }
        
        // Default ordering by start date
        constraints.push(orderBy("start", "asc"));
        
        if (options?.limit) {
          constraints.push(limit(options.limit));
        }

        const qRef = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

        const unsub = onSnapshot(qRef, (snap: any) => {
          if (!mounted) return;
          let events = mapSnapshotDocs<ScheduleEvent>(snap);
          // Optional client-side post-filter if both startDate and endDate provided,
          // to exclude events that start within the range but end before startDate, etc.
          if (options?.startDate && options?.endDate) {
            const windowStart = options.startDate.getTime();
            const windowEnd = options.endDate.getTime();
            events = events.filter(ev => {
              const evStart = (ev.start as any)?.toDate ? (ev.start as any).toDate().getTime() : new Date(ev.start as any).getTime();
              const evEnd = (ev.end as any)?.toDate ? (ev.end as any).toDate().getTime() : new Date(ev.end as any).getTime();
              // Keep events that start within the window
              // Future enhancement: include overlapping events that start before windowStart but end after windowStart
              return evStart >= windowStart && evStart <= windowEnd && (!Number.isNaN(evEnd));
            });
          }
          // Client-side status filter (avoids composite index on status+start)
          if (options?.status && options.status.length > 0) {
            events = events.filter(ev => {
              const s = (ev as any).status as ScheduleStatus | undefined;
              return s ? options.status!.includes(s) : options.status!.includes('confirmed');
            });
          }
          setEvents(events);
          setLoading(false);
        });

        return () => {
          mounted = false;
          unsub();
        };
      } catch (error) {
        console.error('Error subscribing to schedule events:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    })();
  }, [orgId, optionsKey]);

  return { events, loading };
}

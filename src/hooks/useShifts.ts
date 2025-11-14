// src/hooks/useShifts.ts
import { useEffect, useState } from "react";
import type { Shift, ShiftStatus, WithId } from "../types";

interface UseShiftsOptions {
  startDate?: Date;
  endDate?: Date;
  memberId?: string;
  projectId?: string;
  status?: ShiftStatus[];
}

export function useShifts(organizationId: string, options: UseShiftsOptions = {}) {
  const [shifts, setShifts] = useState<WithId<Shift>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { getFirebase } = await import("../firebase");
        const fb = await getFirebase();

        // Start with base collection and order by date only (to avoid composite index requirement)
        let q = query(fb.orgCol(organizationId, "shifts"), orderBy("date", "asc"));

        // Apply filters
        if (options.startDate) {
          const startDateStr = options.startDate.toISOString().split('T')[0];
          q = query(q, where("date", ">=", startDateStr));
        }
        if (options.endDate) {
          const endDateStr = options.endDate.toISOString().split('T')[0];
          q = query(q, where("date", "<=", endDateStr));
        }
        if (options.memberId) {
          q = query(q, where("assignedMemberId", "==", options.memberId));
        }
        if (options.projectId) {
          q = query(q, where("projectId", "==", options.projectId));
        }

        unsubscribe = onSnapshot(
          q,
          {
            next: (snapshot: any) => {
              let data: WithId<Shift>[] = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
              } as WithId<Shift>));

              // Filter by status in memory (since Firestore doesn't support array-contains on non-array fields)
              if (options.status && options.status.length > 0) {
                data = data.filter(shift => options.status!.includes(shift.status));
              }

              // Sort by startTime in memory (to avoid composite index requirement)
              data.sort((a, b) => {
                if (a.date !== b.date) {
                  return a.date.localeCompare(b.date);
                }
                return a.startTime.localeCompare(b.startTime);
              });

              setShifts(data);
              setLoading(false);
            },
            error: (err: Error) => {
              setError(err);
              setLoading(false);
            }
          }
        );
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [organizationId, options.startDate, options.endDate, options.memberId, options.projectId, JSON.stringify(options.status)]);

  return { shifts, loading, error };
}

export function useShiftTemplates(organizationId: string) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { query, where, orderBy, onSnapshot } = await import("firebase/firestore");
        const { getFirebase } = await import("../firebase");
        const fb = await getFirebase();

        const q = query(
          fb.orgCol(organizationId, "shiftTemplates"),
          where("active", "==", true),
          orderBy("name", "asc")
        );

        unsubscribe = onSnapshot(
          q,
          {
            next: (snapshot: any) => {
              const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setTemplates(data);
              setLoading(false);
            },
            error: (err: Error) => {
              setError(err);
              setLoading(false);
            }
          }
        );
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [organizationId]);

  return { templates, loading, error };
}

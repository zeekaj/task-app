import type { WithId } from "../types";

export function mapSnapshotDocs<T>(snap: any): WithId<T>[] {
  if (!snap || !Array.isArray(snap.docs)) return [];
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as T) }));
}

export default mapSnapshotDocs;

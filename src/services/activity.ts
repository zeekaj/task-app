// src/services/activity.ts
import { addDoc, serverTimestamp } from "firebase/firestore";
import { col } from "../firebase";

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "block"
  | "unblock";

/** Write a lightweight activity log entry. */
export async function logActivity(
  uid: string,
  summary: string,
  entityType: "project" | "task" | "blocker",
  entityId: string,
  action: ActivityAction
) {
  await addDoc(col(uid, "activity"), {
    summary,
    entityType,
    entityId,
    action,
    userId: uid,
    createdAt: serverTimestamp(),
    at: serverTimestamp(),
  });
}

// src/services/organizations.ts
import { getFirestoreClient } from '../firebase';
import type { TeamMemberRole } from '../types';

/**
 * Upsert membership mirror under organizations/{orgId}/members/{uid}
 * Used by security rules to authorize org-scoped actions.
 */
export async function upsertOrgMembership(orgId: string, uid: string, role: TeamMemberRole, active = true) {
  const { db } = await getFirestoreClient();
  const firestoreModule: any = await import('firebase/firestore');
  const doc = firestoreModule.doc;
  const setDoc = firestoreModule.setDoc;
  const serverTimestamp = firestoreModule.serverTimestamp;

  // Basic validation
  if (!orgId || !uid || !role) return;

  const ref = doc(db, 'organizations', orgId, 'members', uid);
  const payload = {
    role: role as string,
    active: !!active,
    updatedAt: serverTimestamp(),
  } as const;

  await setDoc(ref, payload as any, { merge: true });
}

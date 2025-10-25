// src/services/teamMembers.ts
import { addDoc, updateDoc, doc, serverTimestamp, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { getFirestoreClient } from '../firebase';
import type { TeamMember, SkillAssessment } from '../types';

function sanitizeSkills(skills?: SkillAssessment): SkillAssessment | undefined {
  if (!skills) return undefined;
  const out: SkillAssessment = {};
  for (const [k, v] of Object.entries(skills)) {
    if (typeof v === 'number' && !Number.isNaN(v)) {
      // @ts-expect-error dynamic assignment within known keys
      out[k] = Math.max(0, Math.min(10, Math.round(v)));
    }
  }
  return out;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = stripUndefined(v as any);
      if (Object.keys(nested).length > 0) out[k] = nested;
    } else {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

/**
 * Create a new team member in the global collection
 * @param organizationId - The UID of the admin/organization owner
 * @param member - Team member data
 */
export async function createTeamMember(
  organizationId: string,
  member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'invitedAt' | 'lastLoginAt' | 'hasPassword'>
) {
  const { db } = await getFirestoreClient();
  const ref = collection(db, 'teamMembers');
  const payload = stripUndefined({
    name: (member.name || '').trim(),
    email: (member.email || '').trim().toLowerCase(),
    role: member.role || 'member',
    title: member.title ? member.title.trim() : undefined,
    userId: member.userId || undefined,
    hasPassword: false,
    invitedAt: serverTimestamp(),
    lastLoginAt: undefined,
    skills: sanitizeSkills(member.skills),
    availability: typeof member.availability === 'number' && !Number.isNaN(member.availability) ? member.availability : 100,
    workload: typeof member.workload === 'number' && !Number.isNaN(member.workload) ? member.workload : 0,
    viewerPermissions: member.role === 'viewer' ? (member.viewerPermissions || []) : [],
    avatar: member.avatar || undefined,
    active: member.active !== false,
    organizationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const docRef = await addDoc(ref, payload as any);
    return docRef.id;
  } catch (error: any) {
    // Improve debugging information
    const code = error?.code || 'unknown';
    const message = error?.message || String(error);
    console.error('Failed to create team member:', { code, message, payload });
    throw error;
  }
}

/** Find active team member by org + email */
export async function findTeamMemberByOrgAndEmail(organizationId: string, email: string): Promise<(TeamMember & { id: string }) | null> {
  const { db } = await getFirestoreClient();
  const ref = collection(db, 'teamMembers');
  const q = query(ref, where('organizationId', '==', organizationId), where('email', '==', email.toLowerCase()), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as TeamMember) } as TeamMember & { id: string };
}

/** Find active team member by org + userId */
export async function findTeamMemberByOrgAndUserId(organizationId: string, userId: string): Promise<(TeamMember & { id: string }) | null> {
  const { db } = await getFirestoreClient();
  const ref = collection(db, 'teamMembers');
  const q = query(ref, where('organizationId', '==', organizationId), where('userId', '==', userId), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as TeamMember) } as TeamMember & { id: string };
}

/** Ensure a single owner record exists for org; returns the member id */
export async function ensureOrgOwner(organizationId: string, name: string, email?: string, userId?: string): Promise<string> {
  const existingByUser = userId ? await findTeamMemberByOrgAndUserId(organizationId, userId) : null;
  const existingByEmail = (!existingByUser && email) ? await findTeamMemberByOrgAndEmail(organizationId, email) : null;
  const existing = existingByUser || existingByEmail;
  if (existing) {
    await updateTeamMember(existing.id, {
      name: name || existing.name,
      email: (email || existing.email)?.toLowerCase(),
      role: 'owner',
      title: existing.title || 'Organization Owner',
      active: true,
      organizationId,
      userId: userId || existing.userId,
    });
    return existing.id;
  }
  // Create fresh owner record
  return await createTeamMember(organizationId, {
    name,
    email: (email || '').toLowerCase(),
    role: 'owner',
    title: 'Organization Owner',
    active: true,
    userId,
  } as any);
}

/** Find current owner member for an org */
export async function findCurrentOwner(organizationId: string): Promise<(TeamMember & { id: string }) | null> {
  const { db } = await getFirestoreClient();
  const ref = collection(db, 'teamMembers');
  const q = query(ref, where('organizationId', '==', organizationId), where('role', '==', 'owner'), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as TeamMember) } as TeamMember & { id: string };
}

/** Transfer ownership to another active member (atomic batch) */
export async function transferOwnership(organizationId: string, newOwnerMemberId: string): Promise<void> {
  const { db } = await getFirestoreClient();
  const currentOwner = await findCurrentOwner(organizationId);
  if (currentOwner && currentOwner.id === newOwnerMemberId) return; // no-op

  // Load target member
  const m: any = await import('firebase/firestore');
  const getDoc = m.getDoc;
  const targetRef = doc(db, 'teamMembers', newOwnerMemberId);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Target member not found');
  const target = targetSnap.data() as TeamMember;
  if (target.organizationId !== organizationId) throw new Error('Target member not in this organization');
  if (target.active === false) throw new Error('Target member is inactive');

  const batch = writeBatch(db);
  // Promote target
  batch.update(targetRef, { role: 'owner', updatedAt: serverTimestamp() });
  // Demote current owner to admin
  if (currentOwner) {
    const curRef = doc(db, 'teamMembers', (currentOwner as any).id);
    batch.update(curRef, { role: 'admin', updatedAt: serverTimestamp() });
  }
  await batch.commit();

  // Mirror membership docs best-effort
  try {
    const fm: any = await import('firebase/firestore');
    const setDoc = fm.setDoc; const orgDoc = fm.doc; const ts = fm.serverTimestamp;
    if (currentOwner?.userId) {
      const curMemRef = orgDoc(db, 'organizations', organizationId, 'members', currentOwner.userId);
      await setDoc(curMemRef, { role: 'admin', updatedAt: ts() }, { merge: true });
    }
    if ((target as any).userId) {
      const newMemRef = orgDoc(db, 'organizations', organizationId, 'members', (target as any).userId);
      await setDoc(newMemRef, { role: 'owner', updatedAt: ts() }, { merge: true });
    }
  } catch {
    // ignore
  }
}

/**
 * Update a team member in the global collection
 */
export async function updateTeamMember(memberId: string, updates: Partial<TeamMember>) {
  const { db } = await getFirestoreClient();
  const ref = doc(db, 'teamMembers', memberId);
  const payload = stripUndefined({
    ...updates,
    title: updates.title ? updates.title.trim() : updates.title,
    email: updates.email ? updates.email.trim().toLowerCase() : updates.email,
    skills: sanitizeSkills(updates.skills),
    viewerPermissions: updates.role === 'viewer' ? (updates.viewerPermissions || []) : updates.viewerPermissions ?? undefined,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, payload as any);

  // If role changed, mirror it to organizations/{orgId}/members/{uid}
  if (typeof updates.role === 'string') {
    try {
      const m: any = await import('firebase/firestore');
      const getDoc = m.getDoc;
      const setDoc = m.setDoc;
      const orgDoc = m.doc;
      const serverTimestamp = m.serverTimestamp;
      const snap = await getDoc(ref);
      const data = snap.data() as any;
      const orgId = data?.organizationId as string | undefined;
      const uid = data?.userId as string | undefined;
      if (orgId && uid) {
        const memRef = orgDoc(db, 'organizations', orgId, 'members', uid);
        const mirrorPayload: any = { role: updates.role, updatedAt: serverTimestamp() };
        await setDoc(memRef, mirrorPayload, { merge: true });
      }
    } catch {
      // best-effort; ignore if fails
    }
  }
}

/**
 * Soft delete a team member (set active = false)
 */
export async function deleteTeamMember(memberId: string) {
  const { db } = await getFirestoreClient();
  const ref = doc(db, 'teamMembers', memberId);
  await updateDoc(ref, { 
    active: false, 
    updatedAt: serverTimestamp() 
  });
}

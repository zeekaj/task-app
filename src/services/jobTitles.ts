// src/services/jobTitles.ts
import { getFirebase } from "../firebase";
import type { JobTitleDoc } from "../types";

export async function createJobTitle(orgId: string, name: string) {
  const { addDoc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = fb.col(orgId, "jobTitles");
  const docData = { name, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const docRef = await addDoc(ref, docData);
  return docRef.id;
}

export async function updateJobTitle(orgId: string, jobTitleId: string, updates: Partial<JobTitleDoc>) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/jobTitles/${jobTitleId}`);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteJobTitle(orgId: string, jobTitleId: string) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/jobTitles/${jobTitleId}`);
  await updateDoc(ref, { active: false, updatedAt: serverTimestamp() });
}

export async function listJobTitles(orgId: string) {
  const { getDocs, query, where } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = fb.col(orgId, "jobTitles");
  const q = query(ref, where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as JobTitleDoc[];
}

// src/services/venues.ts
import { getFirebase } from "../firebase";
import type { Venue } from "../types";

export async function createVenue(orgId: string, data: Omit<Venue, "id" | "createdAt" | "updatedAt">) {
  try {
    const { addDoc, serverTimestamp } = await import("firebase/firestore");
    const fb = await getFirebase();
    const ref = fb.col(orgId, "venues");
    const docData = { ...data, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(ref, docData);
    return docRef.id;
  } catch (error) {
    console.error('createVenue error:', error);
    throw error;
  }
}

export async function updateVenue(orgId: string, venueId: string, updates: Partial<Venue>) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/venues/${venueId}`);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteVenue(orgId: string, venueId: string) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/venues/${venueId}`);
  await updateDoc(ref, { active: false, updatedAt: serverTimestamp() });
}

export async function listVenues(orgId: string) {
  const { getDocs, query, where } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = fb.col(orgId, "venues");
  const q = query(ref, where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Venue[];
}

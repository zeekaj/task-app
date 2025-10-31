// src/services/clients.ts
import { getFirebase } from "../firebase";
import type { Client } from "../types";

export async function createClient(orgId: string, data: Omit<Client, "id" | "createdAt" | "updatedAt">) {
  try {
    const { addDoc, serverTimestamp } = await import("firebase/firestore");
    const fb = await getFirebase();
    const ref = fb.col(orgId, "clients");
    const docData = { ...data, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(ref, docData);
    return docRef.id;
  } catch (error) {
    console.error('createClient error:', error);
    throw error;
  }
}

export async function updateClient(orgId: string, clientId: string, updates: Partial<Client>) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/clients/${clientId}`);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteClient(orgId: string, clientId: string) {
  const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = doc(fb.db, `users/${orgId}/clients/${clientId}`);
  await updateDoc(ref, { active: false, updatedAt: serverTimestamp() });
}

export async function listClients(orgId: string) {
  const { getDocs, query, where } = await import("firebase/firestore");
  const fb = await getFirebase();
  const ref = fb.col(orgId, "clients");
  const q = query(ref, where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Client[];
}

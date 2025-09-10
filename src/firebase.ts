// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";

/** ---------- Firebase config (from your current app) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAJFmn9_pSmZqiF-oG-QPvR2kxusuu8TbE",
  authDomain: "todo-tasks-projects.firebaseapp.com",
  projectId: "todo-tasks-projects",
  storageBucket: "todo-tasks-projects.firebasestorage.app",
  messagingSenderId: "64547098061",
  appId: "1:64547098061:web:f34081a9ecb3af41190884",
};

/** ---------- Initialize ---------- */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** ---------- Helpers ---------- */
export function col(uid: string, name: string) {
  return collection(db, `users/${uid}/${name}`);
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e: any) {
    console.error("signIn error:", e);
    alert("Sign-in error: " + (e?.message || e));
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}

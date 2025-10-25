// src/firebase.ts
/**
 * Lazy Firebase initializer
 * - Provides getFirebase() which initializes and returns { app, auth, db, col }
 * - This lets the app avoid downloading the full Firebase SDK on first paint.
 *
 * Usage:
 *   const { db, auth, col } = await getFirebase();
 */

const metaEnv = (import.meta as any).env ?? {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY ?? "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: metaEnv.VITE_FIREBASE_APP_ID ?? "",
};

let appInitPromise: Promise<any> | null = null;
let appCached: any = null;

async function getApp() {
  if (appCached) return appCached;
  if (!appInitPromise) {
    appInitPromise = (async () => {
      // Basic validation so the runtime error from Firebase is clearer
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            const missing = [] as string[];
            if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
            if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
            const msg = `Missing Firebase config env var(s): ${missing.join(', ')}.\n` +
              `Add them to your .env or Vite environment (see .env.example).`;
            // Use a dev-only logger to avoid noisy production logs
            const { logError } = await import('./utils/logger');
            logError(msg);
            throw new Error(msg);
          }

      const appModule: any = await import('firebase/app');
      const initializeApp = appModule.initializeApp;
      appCached = initializeApp(firebaseConfig);
      return appCached;
    })();
  }
  return appInitPromise;
}

let authInitPromise: Promise<any> | null = null;
let authCached: any = null;

export async function getAuth() {
  if (authCached) return authCached;
  if (!authInitPromise) {
    authInitPromise = (async () => {
      const app = await getApp();
      const authModule: any = await import('firebase/auth');
      const getAuth = authModule.getAuth;
      const GoogleAuthProvider = authModule.GoogleAuthProvider;
      const signInWithPopup = authModule.signInWithPopup;
      const signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
      const createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
      const updateProfile = authModule.updateProfile;
      const firebaseSignOutFn = authModule.signOut;

      const auth = getAuth(app);

      const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (e: any) {
          const { logError } = await import('./utils/logger');
          logError('signIn error:', e?.message ?? e);
          alert('Sign-in error: ' + (e?.message || e));
        }
      };

      const signOut = async () => {
        await firebaseSignOutFn(auth);
      };

      authCached = { 
        app, 
        auth, 
        signIn, 
        signOut,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        updateProfile
      };
      return authCached;
    })();
  }
  return authInitPromise;
}

// typed imports avoided to maintain compatibility with installed firebase SDK

// Use ReturnType inference to remain compatible with the installed firebase SDK
type GetFirestoreFn = typeof import('firebase/firestore').getFirestore;
type CollectionFn = typeof import('firebase/firestore').collection;
type Firestore = ReturnType<GetFirestoreFn>;
type CollectionReference = ReturnType<CollectionFn>;
// Lightweight generic wrapper type so callers can annotate element type T
type CollectionRefOf<T = any> = CollectionReference & { __docType?: T };

let firestoreInitPromise: Promise<{ app: any; db: Firestore; col: <T = any>(uid: string, name: string) => CollectionRefOf<T>; colFor: <T = any>(uid: string, name: string) => CollectionRefOf<T> }> | null = null;
let firestoreCached: { app: any; db: Firestore; col: <T = any>(uid: string, name: string) => CollectionRefOf<T>; colFor: <T = any>(uid: string, name: string) => CollectionRefOf<T> } | null = null;

export async function getFirestoreClient() {
  if (firestoreCached) return firestoreCached;
  if (!firestoreInitPromise) {
    firestoreInitPromise = (async () => {
      const app = await getApp();
      const firestoreModule: any = await import('firebase/firestore');
      const getFirestore = firestoreModule.getFirestore;
      const collection = firestoreModule.collection;

      const db: Firestore = getFirestore(app);
      const col = (uid: string, name: string) => collection(db, `users/${uid}/${name}`) as CollectionReference;
      const colFor = <T = any>(uid: string, name: string) => collection(db, `users/${uid}/${name}`) as unknown as CollectionRefOf<T>;

  const result = { app, db, col, colFor } as { app: any; db: Firestore; col: <T = any>(uid: string, name: string) => CollectionRefOf<T>; colFor: <T = any>(uid: string, name: string) => CollectionRefOf<T> };
  firestoreCached = result;
  return result;
    })();
  }
  return firestoreInitPromise;
}

let combinedCached: any = null;
export async function getFirebase() {
  if (combinedCached) return combinedCached;
  const [a, f] = await Promise.all([getAuth(), getFirestoreClient()]);
  combinedCached = {
    app: a.app || f.app,
    auth: a.auth,
    db: f!.db,
    // typed col<T>
    col: f!.col,
    colFor: f!.colFor,
    signIn: a.signIn,
    signOut: a.signOut,
  };
  return combinedCached;
}

// Synchronous fallbacks that throw helpful errors if used before initialization
export const app: any = null;
export const auth: any = null;
export const db: any = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function col(_uid: string, _name: string) {
  throw new Error('col() called synchronously. Use getFirebase()/getFirestoreClient() and await it before calling col.');
}
export async function signIn() {
  const f = await getAuth();
  return f.signIn();
}
export async function signOut() {
  const f = await getAuth();
  return f.signOut();
}

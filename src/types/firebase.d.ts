declare module 'firebase/app' {
  export function initializeApp(config?: any): any;
  export default any;
}

declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
  export function onAuthStateChanged(auth: any, cb: any): any;
  export const GoogleAuthProvider: any;
  export function signInWithPopup(auth: any, provider: any): any;
  export function signOut(auth: any): any;
  export type User = any;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export function collection(db: any, path: string): any;
  export function addDoc(ref: any, data: any): any;
  // doc can accept multiple path segments
  export function doc(db: any, ...pathSegments: any[]): any;
  export function getDoc(ref: any): any;
  export function getDocs(q: any): any;
  export function query(...args: any[]): any;
  export function where(...args: any[]): any;
  export function orderBy(...args: any[]): any;
  export function limit(...args: any[]): any;
  export function onSnapshot(query: any, cb: any): () => void;
  export function deleteField(): any;
  export function serverTimestamp(): any;
  export function updateDoc(ref: any, data: any): any;
  export function writeBatch(db: any): any;
  export type QueryConstraint = any;
  export type Query = any;
  export type QuerySnapshot = any;
  export type DocumentData = any;
  export type Timestamp = any;
  export const Timestamp: any;
  export type FieldValue = any;
  export const deleteField: any;
}

declare module 'firebase/storage' {
  export function getStorage(app?: any): any;
  export function ref(storage: any, path: string): any;
  export function uploadBytes(ref: any, data: any): any;
  export function getDownloadURL(ref: any): any;
  export function deleteObject(ref: any): any;
}

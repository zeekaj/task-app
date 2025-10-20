declare module 'firebase/app' {
  const initializeApp: any;
  export { initializeApp };
}
declare module 'firebase/auth' {
  const getAuth: any;
  const GoogleAuthProvider: any;
  const signInWithPopup: any;
  const signOut: any;
  export { getAuth, GoogleAuthProvider, signInWithPopup, signOut };
}
declare module 'firebase/firestore' {
  const getFirestore: any;
  const collection: any;
  const doc: any;
  const addDoc: any;
  const getDoc: any;
  const updateDoc: any;
  const writeBatch: any;
  const query: any;
  const where: any;
  const getDocs: any;
  const orderBy: any;
  const limit: any;
  const serverTimestamp: any;
  const Timestamp: any;
  export { getFirestore, collection, doc, addDoc, getDoc, updateDoc, writeBatch, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp };
}

// Also allow deep-imports used elsewhere
declare module 'firebase/firestore/lite' {
  const anything: any;
  export default anything;
}

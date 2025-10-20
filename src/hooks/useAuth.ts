// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getAuth } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let unsub: any;
    (async () => {
      const a = await getAuth();
      unsub = onAuthStateChanged(a.auth, setUser);
    })();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  return user;
}

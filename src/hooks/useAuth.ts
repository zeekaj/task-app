// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getAuth } from "../firebase";

export function useAuth() {
  // Start as undefined so the app can render a loading state instead of flashing the login view
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let unsub: any;
    (async () => {
      const a = await getAuth();
  unsub = onAuthStateChanged(a.auth, (u: User | null) => setUser(u));
    })();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  return user;
}

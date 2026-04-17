'use client';
import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  // Seed from localStorage after hydration so navbar renders quickly
  // without causing a server/client mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Re-fetch the current user from the server on every navigation.
  // This ensures impersonation start/exit (which do a hard reload + redirect)
  // always get the correct user's roles for the new session.
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            return;
          }
        }
        // Not authenticated — clear stale data
        setUser(null);
        localStorage.removeItem('user');
      } catch {
        // Network failure — keep existing user state
      }
    }
    fetchCurrentUser();
  }, [pathname]);

  // Keep localStorage in sync when user changes (e.g. after login/profile update)
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
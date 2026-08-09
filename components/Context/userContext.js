'use client';
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

/**
 * Client-side holder for the current user. The user object comes from
 * the server layout (`app/layout.js` → `getInitialUser`), so there is
 * NO client fetch, NO /api/auth/me poll, and NO localStorage seed to
 * drift out of sync with the real session.
 *
 * On navigation, the server layout re-runs, computes a fresh
 * `initialUser` from the request cookie, and passes it down. The
 * effect below syncs local state to that fresh value — so a login,
 * logout, or impersonation switch (all of which hard-navigate through
 * a server action) is reflected here without a network round-trip.
 *
 * Callers can still mutate optimistically via `setUser` (e.g. login
 * screen after a successful 2FA) so the sidebar updates before the
 * next navigation.
 */
export function UserProvider({ initialUser = null, children }) {
  const [user, setUser] = useState(initialUser);

  // Keep local state in sync with server-provided prop across
  // navigations. React only initialises useState on mount, so a fresh
  // prop from the server won't overwrite existing state without this.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
import { createContext, useContext, useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still resolving the initial auth state, null = signed out
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Picks up the result of a signInWithRedirect that just completed
    // (the page reloaded coming back from Google). A rejection here
    // means the sign-in itself failed, not just "no redirect pending".
    getRedirectResult(auth).catch((err) => setAuthError(err.message));

    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  function signIn() {
    setAuthError(null);
    // signInWithPopup is unreliable on mobile Safari and doesn't work at
    // all from a standalone (Home Screen) PWA, which is the main way
    // this app gets used — redirect is the robust choice here.
    signInWithRedirect(auth, googleProvider);
  }

  function signOutUser() {
    signOut(auth);
  }

  const value = { user, authError, signIn, signOut: signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

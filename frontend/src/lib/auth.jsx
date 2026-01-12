import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { apiFetch } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setToken(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setProfileLoading(true);
    apiFetch("/me", { token })
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      profile,
      loading,
      profileLoading,
      login,
      logout,
      isSuper: profile?.role === "super",
    }),
    [user, token, profile, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

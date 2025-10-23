// src/hooks/useSavedProducts.js
import { useEffect, useState, useMemo } from "react";
import { auth, db, googleProvider } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInWithPopup,
} from "firebase/auth";

// …(savedIds, toggleSave 등 기존 코드 유지)

export default function useSavedProducts() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoadingUser(false);
    });
    return unsub;
  }, []);

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUp = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const signOut = () => fbSignOut(auth);

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

  // savedIds, toggleSave 등 기존 반환값과 함께 아래 메서드도 리턴
  return {
    user,
    loadingUser,
    // savedIds, toggleSave, ...
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };
}

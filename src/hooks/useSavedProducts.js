// src/hooks/useSavedProducts.js (또는 사용 중인 훅)
import { useEffect, useMemo, useState, useCallback } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export default function useSavedProducts() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => {
      setUser(u || null);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); setLoadingSaved(false); return; }
    setLoadingSaved(true);
    const colRef = collection(db, "users", user.uid, "saved");
    const unsub = onSnapshot(colRef, (snap) => {
      const next = new Set();
      snap.forEach((d) => next.add(d.id));
      setSavedIds(next);
      setLoadingSaved(false);
    }, () => setLoadingSaved(false));
    return () => unsub();
  }, [user]);

  // ✅ 규칙에 정확히 맞춘 토글
  const toggleSave = useCallback(async (productId) => {
    if (!user) throw new Error("Sign in required");
    const ref = doc(db, "users", user.uid, "saved", productId);

    if (savedIds.has(productId)) {
      // 🗑 unlike → delete (규칙: allow delete if isSelf)
      await deleteDoc(ref);
    } else {
      // ❤️ like → create (규칙: keys only ['createdAt'] + timestamp)
      await setDoc(ref, { createdAt: serverTimestamp() }, { merge: false });
      // merge:false 권장 (혹시 기존 문서가 있으면 update로 간주되어 규칙 위배될 수 있음)
    }
  }, [user, savedIds]);

  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])), [savedIds]);

  return { user, loadingUser, savedIds: savedSet, loadingSaved, toggleSave };
}

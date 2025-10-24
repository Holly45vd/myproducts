import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";


const SavedCtx = createContext(null);


export function SavedProvider({ children }) {
const [user, setUser] = useState(null);
const [loadingUser, setLoadingUser] = useState(true);
const [savedSet, setSavedSet] = useState(new Set());
const [loadingSaved, setLoadingSaved] = useState(true);


useEffect(() => {
const unsub = onAuthStateChanged(getAuth(), (u) => { setUser(u || null); setLoadingUser(false); });
return unsub;
}, []);


useEffect(() => {
if (!user) { setSavedSet(new Set()); setLoadingSaved(false); return; }
setLoadingSaved(true);
const unsub = onSnapshot(
collection(db, "users", user.uid, "saved"),
(snap) => {
const next = new Set();
snap.forEach((d) => next.add(d.id));
setSavedSet(next);
setLoadingSaved(false);
},
() => setLoadingSaved(false)
);
return unsub;
}, [user]);


const toggleSave = useCallback(async (productId) => {
if (!user) throw new Error("Sign in required");
const ref = doc(db, "users", user.uid, "saved", productId);
if (savedSet.has(productId)) await deleteDoc(ref);
else await setDoc(ref, { createdAt: serverTimestamp() }, { merge: false });
}, [user, savedSet]);


const value = useMemo(() => ({ user, loadingUser, savedSet, loadingSaved, toggleSave }), [user, loadingUser, savedSet, loadingSaved, toggleSave]);
return <SavedCtx.Provider value={value}>{children}</SavedCtx.Provider>;
}


export const useSaved = () => {
const ctx = useContext(SavedCtx);
if (!ctx) throw new Error("useSaved must be used within SavedProvider");
return ctx;
};
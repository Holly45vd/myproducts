import { useEffect, useMemo, useRef, useState } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const tsToMs = (ts) => (typeof ts?.toMillis === "function" ? ts.toMillis() : Number(ts) || 0);
const chunk10 = (arr) => Array.from({length: Math.ceil(arr.length/10)}, (_,i) => arr.slice(i*10, i*10+10));

export default function useSavedList({ user, savedSet }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSaved = async (ids) => {
    setLoading(true); setErrorMsg("");
    try {
      if (!user || ids.length === 0) { setItems([]); return; }
      const chunks = chunk10(ids);
      const snaps = await Promise.all(
        chunks.map((cid) => getDocs(query(collection(db, "products"), where(documentId(), "in", cid))))
      );
      const res = [];
      snaps.forEach((snap) => snap.forEach((d) => res.push({ id: d.id, ...d.data() })));
      res.sort((a,b) => (tsToMs(b.updatedAt)||tsToMs(b.createdAt)) - (tsToMs(a.updatedAt)||tsToMs(a.createdAt)));
      setItems(res);
    } catch (e) {
      setErrorMsg(e?.message || "Load failed");
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const ids = Array.from(savedSet).sort();
    fetchSaved(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, useMemo(() => Array.from(savedSet).sort().join("|"), [savedSet])]);

  return { items, loading, errorMsg, refetch: () => fetchSaved(Array.from(savedSet)) };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { toMYR } from "../utils/currency";

// util
const tsToMs = (ts) => (typeof ts?.toMillis === "function" ? ts.toMillis() : Number(ts) || 0);
const chunk10 = (a) => Array.from({ length: Math.ceil(a.length / 10) }, (_, i) => a.slice(i * 10, i * 10 + 10));
const isRestockPending = (p) => {
  const has = (v) => (v ? (Array.isArray(v) ? v.join(" ") : String(v)).match(/재입고\s*예정|재입고예정/i) : false);
  return !!(p?.restockPending || p?.restockSoon || has(p?.tags) || has(p?.badges) || has(p?.labels) || has(p?.status) || has(p?.nameBadge) || has(p?.badgeText));
};

export default function useOrderComposer({ user, savedSet }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]); // products
  const [qty, setQty] = useState({});     // id -> number

  const savedIds = useMemo(() => Array.from(savedSet).sort(), [savedSet]);

  const fetchSavedProducts = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (!user || savedIds.length === 0) {
        setItems([]); setQty({}); return;
      }
      const snaps = await Promise.all(
        chunk10(savedIds).map((ids) => getDocs(query(collection(db, "products"), where(documentId(), "in", ids))))
      );
      const res = [];
      snaps.forEach((s) => s.forEach((d) => res.push({ id: d.id, ...d.data() })));
      res.sort((a, b) => (tsToMs(b.updatedAt) || tsToMs(b.createdAt) || 0) - (tsToMs(a.updatedAt) || tsToMs(a.createdAt) || 0));
      setItems(res);
      setQty((prev) => {
        const next = { ...prev };
        res.forEach((p) => {
          if (isRestockPending(p)) next[p.id] = 0;
          else if (next[p.id] == null) next[p.id] = Number(p.price) > 0 ? 1 : 0;
        });
        return next;
      });
    } catch (e) {
      setErrorMsg(e?.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSavedProducts(); /* eslint-disable-next-line */ }, [user, savedIds.join("|")]);

  const rows = useMemo(() => {
    return items.map((p) => {
      const price = Number(p.price || 0);
      const restock = isRestockPending(p);
      const q = restock ? 0 : Math.max(0, Number(qty[p.id] || 0));
      return { ...p, _price: price, _qty: q, _subtotal: price * q, _restockPending: restock };
    });
  }, [items, qty]);

  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + r._qty, 0);
    const totalPrice = rows.reduce((s, r) => s + r._subtotal, 0);
    return { totalQty, totalPrice, totalMYR: toMYR(totalPrice) };
  }, [rows]);

  const setQtySafe = (id, v) => {
    const p = items.find((x) => x.id === id);
    if (p && isRestockPending(p)) { setQty((prev) => ({ ...prev, [id]: 0 })); return; }
    let n = Number(String(v).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > 9999) n = 9999;
    setQty((prev) => ({ ...prev, [id]: n }));
  };

  return {
    loading, errorMsg, items, rows, totals, qty, setQtySafe, refetch: fetchSavedProducts,
  };
}

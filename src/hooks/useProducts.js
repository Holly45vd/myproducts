import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";


export default function useProducts() {
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);


useEffect(() => {
let alive = true;
(async () => {
setLoading(true);
setError(null);
try {
const qRef = query(collection(db, "products"), orderBy("updatedAt", "desc"));
const snap = await getDocs(qRef);
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p && p.name);
if (alive) setItems(rows);
} catch (e) {
if (alive) setError(e);
} finally {
if (alive) setLoading(false);
}
})();
return () => {
alive = false;
};
}, []);


return { items, loading, error };
}
// src/pages/OrderCreatePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection, getDocs, query, where, documentId, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Stack, Typography, Paper, IconButton, Button, TextField, Divider, Alert, CircularProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { useSaved } from "../providers/SavedProvider";
import { formatKRW } from "../shared/utils/currency";
import { useLanguage } from "../context/LanguageContext";

export default function OrderCreatePage() {
  const { user, savedSet, loadingUser } = useSaved();
  const savedIds = useMemo(() => [...savedSet], [savedSet]);
  const { isKorean } = useLanguage();

  const [items, setItems] = useState([]);        // [{id, name, name_en, price, ...}]
  const [qty, setQty] = useState({});            // { [productId]: number }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 로그인 가드
  if (!loadingUser && !user) {
    return (
      <Stack spacing={2} sx={{ py: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {isKorean ? "주문 생성" : "Create Order"}
        </Typography>
        <Alert severity="info">
          {isKorean
            ? '주문 생성은 로그인 후 이용 가능합니다. 상단의 "로그인" 버튼을 눌러주세요.'
            : 'Order creation is available after you log in. Please click the "Login" button at the top.'}
        </Alert>
      </Stack>
    );
  }

  useEffect(() => {
    (async () => {
      if (!user) return;
      setErr("");
      try {
        if (savedIds.length === 0) { setItems([]); setQty({}); return; }
        const chunks = [];
        for (let i = 0; i < savedIds.length; i += 10) chunks.push(savedIds.slice(i, i + 10));

        const rows = [];
        for (const c of chunks) {
          const snap = await getDocs(query(collection(db, "products"), where(documentId(), "in", c)));
          snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
        }
        // 초기 수량 1로 설정
        const initQty = {};
        rows.forEach(r => { initQty[r.id] = 1; });
        setItems(rows);
        setQty(initQty);
      } catch (e) {
        console.error("[OrderCreate] load failed:", e);
        setErr(isKorean
          ? "상품을 불러오는 중 문제가 발생했습니다. 권한/규칙을 확인하세요."
          : "Failed to load items. Check your permissions/rules.");
      }
    })();
  }, [user?.uid, savedIds.join("|"), isKorean]);

  const setCount = (id, v) => {
    const n = Math.max(1, Number.isFinite(v) ? Math.trunc(v) : 1);
    setQty(prev => ({ ...prev, [id]: n }));
  };
  const inc = (id) => setCount(id, (qty[id] || 1) + 1);
  const dec = (id) => setCount(id, (qty[id] || 1) - 1);

  const removeLine = (id) => {
    setItems(prev => prev.filter(p => p.id !== id));
    setQty(prev => {
      const next = { ...prev }; delete next[id]; return next;
    });
  };

  // ✅ 표시명은 여기서 언어에 맞게 미리 계산해 둔다
  const lines = useMemo(() => items.map(p => {
    const displayName = isKorean ? (p.name || p.name_en || p.id) : (p.name_en || p.name || p.id);
    const price = Number(p.price || 0);
    const q = qty[p.id] || 1;
    return {
      id: p.id,
      displayName,
      price,
      qty: q,
      subtotal: price * q,
    };
  }), [items, qty, isKorean]);

  const totalPrice = lines.reduce((s, l) => s + l.subtotal, 0);

  const handleCreateOrder = async () => {
    if (!user) return;
    if (lines.length === 0) {
      alert(isKorean ? "상품이 없습니다." : "No items.");
      return;
    }
    setBusy(true); setErr("");
    try {
      const nowStr = new Date().toLocaleString(isKorean ? "ko-KR" : "en-US");
      const payload = {
        orderName: isKorean ? `주문 ${nowStr}` : `Order ${nowStr}`,
        createdAt: serverTimestamp(),
        userId: user.uid,
        items: lines.map(l => ({
          productId: l.id, name: l.displayName, price: l.price, qty: l.qty
        })),
        totalPrice,
        finalTotal: totalPrice,
      };
      await addDoc(collection(db, "users", user.uid, "orders"), payload);
      window.location.assign("/orders"); // 성공 시 주문리스트로 이동
    } catch (e) {
      console.error("[OrderCreate] create failed:", e);
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loadingUser || (user && items.length === 0 && !err && savedIds.length > 0)) {
    return <Stack sx={{ py: 8, alignItems: "center" }}><CircularProgress /></Stack>;
  }

  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography variant="h5" fontWeight={700}>
        {isKorean ? "주문 생성" : "Create Order"}
      </Typography>
      {err && <Alert severity="warning">{err}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          {lines.length === 0 && (
            <Typography color="text.secondary">
              {isKorean ? "추가된 상품이 없습니다. 좋아요에서 담아오세요." : "No items. Add from Likes."}
            </Typography>
          )}

          {lines.map(l => (
            <Paper key={l.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ flex: 1 }}>{l.displayName}</Typography>

                <IconButton size="small" onClick={() => dec(l.id)} aria-label="decrease">
                  <RemoveIcon />
                </IconButton>
                <TextField
                  value={l.qty}
                  size="small"
                  type="number"
                  inputProps={{ min: 1, style: { width: 56, textAlign: "center" } }}
                  onChange={(e) => setCount(l.id, Number(e.target.value))}
                />
                <IconButton size="small" onClick={() => inc(l.id)} aria-label="increase">
                  <AddIcon />
                </IconButton>

                <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
                <Typography>{formatKRW(l.subtotal)}</Typography>

                <IconButton size="small" color="error" onClick={() => removeLine(l.id)} aria-label="remove line">
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          {isKorean ? "합계" : "Total"}: {formatKRW(totalPrice)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
          <Button variant="outlined" href="/likes">
            {isKorean ? "좋아요로 돌아가기" : "Back to Likes"}
          </Button>
          <Button variant="contained" onClick={handleCreateOrder} disabled={busy || lines.length === 0}>
            {isKorean ? "주문 생성" : "Create Order"}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

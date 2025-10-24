import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { db } from "../firebase";
import { Stack, Typography, Paper, Chip, Divider, CircularProgress, Button, Alert } from "@mui/material";
import {
  formatKRW, formatMYR, formatAED,
  toMYR, toAED,
  KRW_PER_MYR, KRW_PER_AED
} from "../shared/utils/currency";
import { useSaved } from "../providers/SavedProvider";

export default function OrdersPage() {
  const { user } = useSaved(); // SavedProvider가 이미 auth 구독 중
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  const doSignIn = async () => {
    try {
      const auth = getAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error("[OrdersPage] signIn failed:", e);
      setError(e?.message || String(e));
    }
  };

  const doSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      console.error("[OrdersPage] signOut failed:", e);
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    (async () => {
      setOrders(null);
      setError(null);
      if (!user) return; // 로그인 전에는 로딩 보여주지 말고 아래에서 안내

      try {
        // 유저별 주문 경로: users/{uid}/orders
        const q = query(collection(db, "users", user.uid, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("[OrdersPage] fetch failed:", e);
        setError(e?.message || String(e));
        try {
          // createdAt 정렬 불가 시 폴백 (순서 보장X)
          const snap = await getDocs(collection(db, "users", user.uid, "orders"));
          setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e2) {
          setError(e2?.message || String(e2));
          setOrders([]); // 무한 로딩 방지
        }
      }
    })();
  }, [user?.uid]);

  // 로그인 전 UI
  if (!user) {
    return (
      <Stack spacing={2} sx={{ py: 2 }}>
        <Typography variant="h5" fontWeight={700}>주문리스트</Typography>
        <Alert severity="info">주문은 로그인 후에만 조회됩니다.</Alert>
        <Button onClick={doSignIn} variant="contained">Google로 로그인</Button>
      </Stack>
    );
  }

  // 첫 로딩
  if (orders === null) {
    return <Stack sx={{ py: 8, alignItems: "center" }}><CircularProgress /></Stack>;
  }

  const count = orders.length;
  const sumKRW = orders.reduce((s, o) => s + Number(o.finalTotal ?? o.totalPrice ?? 0), 0);
  const sumMYR = toMYR(sumKRW);
  const sumAED = toAED(sumKRW);

  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography variant="h5" fontWeight={700}>주문리스트</Typography>

      {error && <Alert severity="warning">주문 데이터를 불러오는 중 문제가 있었습니다. (자세한 내용은 콘솔)</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={`총 ${count.toLocaleString()}건`} />
          <Divider orientation="vertical" flexItem />
          <Chip color="primary" label={`합계 ${formatKRW(sumKRW)} · ${formatMYR(sumMYR)} · ${formatAED(sumAED)}`} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          고정 환율: 1 MYR = {KRW_PER_MYR.toLocaleString("ko-KR")} KRW · 1 AED = {KRW_PER_AED.toLocaleString("ko-KR")} KRW
        </Typography>
      </Paper>

      {orders.map(o => (
        <Paper key={o.id} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{o.orderName || o.id}</Typography>
          <Typography variant="body2" color="text.secondary">{o.orderDate || "-"}</Typography>
          <Typography variant="body2">{formatKRW(o.finalTotal ?? o.totalPrice ?? 0)}</Typography>
        </Paper>
      ))}

      {orders.length === 0 && <Typography color="text.secondary">주문이 없습니다.</Typography>}

      <Stack direction="row" spacing={1}>
        <Button href="/likes" variant="outlined">좋아요로 이동</Button>
        <Button onClick={doSignOut} variant="text">로그아웃</Button>
      </Stack>
    </Stack>
  );
}

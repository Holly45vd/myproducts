import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Stack, Typography, CircularProgress, IconButton, Button, Alert } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useSaved } from "../providers/SavedProvider";   // << 경로 수정
import { useLanguage } from "../context/LanguageContext";

export default function LikesPage() {
  const { user, savedSet, toggleSave, loadingUser } = useSaved();
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const { isKorean } = useLanguage();

  const savedIds = useMemo(() => [...savedSet], [savedSet]);
  // 로그인 전에는 로딩 스피너 대신 안내 + 로그인 버튼은 네비에 있음
  if (!loadingUser && !user) {
    return (
      <Stack spacing={2} sx={{ py: 2 }}>
        <Typography variant="h5" fontWeight={700}>좋아요</Typography>
        <Alert severity="info">좋아요 목록은 로그인 후 조회됩니다.</Alert>
        <Typography color="text.secondary" variant="body2">우측 상단 “Google 로그인”을 눌러 로그인하세요.</Typography>
      </Stack>
    );
  }

  useEffect(() => {
    (async () => {
       if (!user || savedIds.length === 0) { setItems([]); return; }
      const chunks = [];
      for (let i=0;i<savedIds.length;i+=10) chunks.push(savedIds.slice(i,i+10));
      const rows = [];
      for (const c of chunks) {
        const snap = await getDocs(query(collection(db,"products"), where(documentId(),"in", c)));
        snap.forEach(d => rows.push({ id:d.id, ...d.data() }));
      }
      setItems(rows);
    })();
  }, [user, savedIds.join("|")]);

  if (loadingUser) return <Stack sx={{ py:8, alignItems:"center" }}><CircularProgress/></Stack>;

  return (
    <Stack spacing={2} sx={{ py:2 }}>
      <Button onClick={() => navigate("/orders/new")} variant="contained">Create Order</Button>
      {items.map(p => (
        <Stack key={p.id} direction="row" spacing={1} alignItems="center" sx={{ p:1, border:"1px solid", borderColor:"divider", borderRadius:1 }}>
          <Typography sx={{ flex:1 }}>
            {isKorean ? (p.name || p.name_en || p.id) : (p.name_en || p.name || p.id)}
          </Typography>
          <IconButton type="button" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); toggleSave(p.id); }}>
            <FavoriteIcon color={savedSet.has(p.id) ? "error" : "disabled"} />
          </IconButton>
        </Stack>
      ))}
      {items.length === 0 && <Typography color="text.secondary">저장된 상품이 없습니다.</Typography>}
      
    </Stack>
  );
}

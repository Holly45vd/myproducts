import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Box, Stack, Typography, TextField, IconButton, Chip, CircularProgress, Alert } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useSaved } from "../providers/SavedProvider";
import { haystack } from "../shared/utils/search";
import { tokenizeTags, hasAllTags } from "../shared/utils/tags";
import { useLanguage } from "../context/LanguageContext";

export default function CategoryPage() {
  const { savedSet, toggleSave, loadingUser, user } = useSaved();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const { isKorean } = useLanguage();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 우선 updatedAt 정렬 시도
        const qRef = query(collection(db, "products"), orderBy("updatedAt", "desc"), limit(200));
        const snap = await getDocs(qRef);
        if (!alive) return;
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn("[CategoryPage] primary fetch failed:", e);
        try {
          // 폴백: 정렬 없이 최대 200개
          const snap = await getDocs(collection(db, "products"));
          if (!alive) return;
          const rows = snap.docs.slice(0, 200).map(d => ({ id: d.id, ...d.data() }));
          setItems(rows);
          setErr("일부 정렬/권한 문제로 기본 목록으로 대체했습니다.");
        } catch (e2) {
          console.error("[CategoryPage] fallback fetch failed:", e2);
          if (!alive) return;
          setItems([]);
          // 권한 문제 가능성이 높음
          setErr("상품을 불러올 수 없습니다. (권한/규칙 또는 인덱스를 확인하세요)");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // 권한 규칙이 로그인 필요하면 user 변화에 맞춰 다시 시도
  }, [user?.uid]);

  const tagTokens = useMemo(() => tokenizeTags(tags), [tags]);
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items.filter(p => (!k || haystack(p).includes(k)) && hasAllTags(p, tagTokens));
  }, [items, q, tagTokens]);

  if (loadingUser || loading) {
    return <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Stack spacing={2} sx={{ py: 2 }}>

      {err && <Alert severity="warning">{err}</Alert>}

      <Stack direction="row" spacing={1}>
        <TextField size="small" placeholder="검색" value={q} onChange={e => setQ(e.target.value)} />
        <TextField size="small" placeholder="태그: a,b,c" value={tags} onChange={e => setTags(e.target.value)} />
      </Stack>

      <Stack spacing={1}>
        {filtered.map(p => (
          <Stack key={p.id} direction="row" alignItems="center" spacing={1}
                 sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Typography sx={{ flex:1 }}>
            {isKorean ? (p.name || p.name_en || p.id) : (p.name_en || p.name || p.id)}
          </Typography>
            {(p.tags || []).slice(0, 3).map(t => <Chip key={t} size="small" label={t} />)}
<IconButton
  type="button"
  onClick={async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleSave(p.id);
    } catch (err) {
      console.error("[like] toggle failed:", err);
      alert("좋아요를 저장할 수 없습니다. 로그인 상태 또는 권한을 확인하세요.");
    }
  }}
>
  <FavoriteIcon color={savedSet.has(p.id) ? "error" : "disabled"} />
</IconButton>

          </Stack>
        ))}
        {filtered.length === 0 && <Typography color="text.secondary">검색 결과가 없습니다.</Typography>}
      </Stack>
    </Stack>
  );
}

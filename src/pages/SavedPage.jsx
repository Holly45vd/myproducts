// src/pages/SavedPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Container, Stack, Typography, Alert, CircularProgress, Chip } from "@mui/material";
import useSavedProducts from "../hooks/useSavedProducts";
import useSavedList from "../hooks/useSavedList";
import SavedToolbar from "../components/SavedToolbar";
import SavedGrid from "../components/SavedGrid";

const tsToMs = (ts) => (typeof ts?.toMillis === "function" ? ts.toMillis() : Number(ts) || 0);

export default function SavedPage() {
  const { user, savedIds, toggleSave, loadingUser, loadingSaved } = useSavedProducts();
  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])), [savedIds]);

  const { items, loading, errorMsg, refetch } = useSavedList({ user, savedSet });

  const [qText, setQText] = useState("");
  const [sortKey, setSortKey] = useState("updated_desc");
  const [catFilter, setCatFilter] = useState("");

  // 파생
  const categories = useMemo(() => {
    const set = new Set(items.map((p) => p.categoryL1).filter(Boolean));
    return Array.from(set).sort((a,b)=> String(a).localeCompare(String(b)));
  }, [items]);

  const filteredSorted = useMemo(() => {
    const q = qText.trim().toLowerCase();
    let arr = items.filter((p) => (q
      ? [p.name,p.productCode,p.categoryL1,p.categoryL2,...(p.tags||[])]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      : true));
    if (catFilter) arr = arr.filter((p)=> p.categoryL1 === catFilter);
    switch (sortKey) {
      case "price_desc": arr.sort((a,b)=>(+b.price||0)-(+a.price||0)); break;
      case "price_asc": arr.sort((a,b)=>(+a.price||0)-(+b.price||0)); break;
      case "name_asc": arr.sort((a,b)=> String(a.name||"").localeCompare(String(b.name||""))); break;
      default:
        arr.sort((a,b)=>(tsToMs(b.updatedAt)||tsToMs(b.createdAt)||0)-(tsToMs(a.updatedAt)||tsToMs(a.createdAt)||0));
    }
    return arr;
  }, [items, qText, sortKey, catFilter]);

  // 페이지네이션(클라)
  const PAGE = 96;
  const [page, setPage] = useState(1);
  useEffect(()=> setPage(1), [qText, sortKey, catFilter]);
  const visible = useMemo(()=> filteredSorted.slice(0, PAGE*page), [filteredSorted, page]);
  const canLoadMore = PAGE*page < filteredSorted.length;

  const onToggleSave = async (id, e) => {
    e?.stopPropagation?.();
    try { await toggleSave(id); } catch (err) { alert(err?.message || "Failed to save"); }
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ pb:4, mt:4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Login Required</Typography>
        <Typography color="text.secondary">Please sign in/sign up using the buttons at the top.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      <SavedToolbar
        qText={qText} setQText={setQText}
        catFilter={catFilter} setCatFilter={setCatFilter} categories={categories}
        sortKey={sortKey} setSortKey={setSortKey}
        onRefresh={refetch}
        onCsvVisible={()=>{/* optional */}} onCsvAll={()=>{/* optional */}}
        disabled={loading}
      />

      {errorMsg && <Alert severity="warning" sx={{ mb:2 }}>{errorMsg}</Alert>}

      {loadingUser || loadingSaved || loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading...</Typography>
        </Stack>
      ) : (
        <>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
            <Chip variant="outlined" label={`Saved total ${savedSet.size.toLocaleString()}`} />
            {(qText || catFilter) && <Chip color="primary" label={`Results ${filteredSorted.length.toLocaleString()}`} />}
            <Chip variant="outlined" label={`With price ${filteredSorted.filter(p=>+p.price>0).length}`} />
            <Chip variant="outlined" label={`Showing ${visible.length}/${filteredSorted.length}`} />
          </Stack>

          <SavedGrid
            items={visible}
            user={user}
            savedSet={savedSet}
            onToggleSave={onToggleSave}
            canLoadMore={canLoadMore}
            onLoadMore={()=> setPage((v)=>v+1)}
          />
        </>
      )}
    </Container>
  );
}

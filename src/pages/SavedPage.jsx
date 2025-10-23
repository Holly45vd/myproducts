// src/pages/SavedPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import useSavedProducts from "../hooks/useSavedProducts";
import ProductCard from "../components/ProductCard";

/* ================= MUI ================= */
import {
  Container,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Box,
  MenuItem,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";

/* ===== Utils ===== */
// Safe Timestamp → number(ms)
function tsToMs(ts) {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  const v = Number(ts); // protect right after serverTimestamp
  return Number.isFinite(v) ? v : 0;
}
function chunk10(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10));
  return out;
}
const fmtKRW = (n = 0) => Number(n || 0).toLocaleString("ko-KR");
const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function SavedPage() {
  const {
    user,
    savedIds, // Set<string>
    loadingUser,
    loadingSaved,
    toggleSave,
  } = useSavedProducts();

  const [items, setItems] = useState([]); // [{ id, ...data }]
  const [qText, setQText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [sortKey, setSortKey] = useState("updated_desc"); // updated_desc | price_desc | price_asc | name_asc
  const [catFilter, setCatFilter] = useState(""); // categoryL1 filter

  const savedIdList = useMemo(() => Array.from(savedIds || new Set()), [savedIds]);

  // Debounced search text
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qText.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [qText]);

  // Load saved list details
  const runIdRef = useRef(0);
  const fetchSaved = async () => {
    setErrorMsg("");
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (!savedIdList.length) {
        setItems([]);
        return;
      }

      const chunks = chunk10(savedIdList);
      const snaps = await Promise.all(
        chunks.map((ids) =>
          getDocs(query(collection(db, "products"), where(documentId(), "in", ids)))
        )
      );

      const results = [];
      snaps.forEach((snap) => {
        snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
      });

      const foundIds = new Set(results.map((r) => r.id));
      const missingCount = savedIdList.filter((id) => !foundIds.has(id)).length;

      results.sort((a, b) => {
        const av = tsToMs(a.updatedAt) || tsToMs(a.createdAt) || 0;
        const bv = tsToMs(b.updatedAt) || tsToMs(b.createdAt) || 0;
        if (bv !== av) return bv - av;
        return String(b.id).localeCompare(String(a.id));
      });

      setItems(results);
      if (missingCount > 0) {
        setErrorMsg(
          `Notice: Of the ${savedIdList.length} saved items, ${missingCount} cannot be retrieved right now (deleted/permission/private).`
        );
      }
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || "");
      const hint = /per-query|disjunct/i.test(msg)
        ? " (Hint: Firestore 'in' clause must be chunked to 10 IDs per query.)"
        : /permission|denied|insufficient/i.test(msg)
        ? " (Hint: Check authentication/security rules.)"
        : "";
      setErrorMsg(`Error: ${msg || "There was a problem loading the list."}${hint}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let canceled = false;
    const myRun = ++runIdRef.current;
    (async () => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      await fetchSaved();
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedIdList.join("|")]);

  // Filter cache (lowercased haystack)
  const itemsForFilter = useMemo(
    () =>
      items.map((p) => ({
        raw: p,
        hay: [
          p.name,
          p.productCode,
          p.categoryL1,
          p.categoryL2,
          ...(p.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [items]
  );

  // Category L1 list
  const categories = useMemo(() => {
    const set = new Set(items.map((p) => p.categoryL1).filter(Boolean));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [items]);

  // Filter + sort
  const filteredSorted = useMemo(() => {
    let arr =
      debouncedQ || catFilter
        ? itemsForFilter
            .filter((x) => (!debouncedQ ? true : x.hay.includes(debouncedQ)))
            .map((x) => x.raw)
        : items.slice();

    if (catFilter) arr = arr.filter((p) => p.categoryL1 === catFilter);

    switch (sortKey) {
      case "price_desc":
        arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case "price_asc":
        arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case "name_asc":
        arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        break;
      default: // updated_desc
        arr.sort(
          (a, b) =>
            (tsToMs(b.updatedAt) || tsToMs(b.createdAt) || 0) -
            (tsToMs(a.updatedAt) || tsToMs(a.createdAt) || 0)
        );
    }
    return arr;
  }, [items, itemsForFilter, debouncedQ, sortKey, catFilter]);

  // Toggle save
  const handleToggleSave = async (id) => {
    try {
      await toggleSave(id);
    } catch (e) {
      alert(e?.message || "Failed to change saved state.");
    }
  };

  const savedTotal = savedIdList.length;

  // Simple client-side pagination
  const PAGE = 96;
  const [page, setPage] = useState(1);
  const visible = useMemo(
    () => filteredSorted.slice(0, PAGE * page),
    [filteredSorted, page]
  );
  const canLoadMore = PAGE * page < filteredSorted.length;

  // CSV export (based on current filtered/sorted list; only visible vs all)
  const downloadCsv = (onlyVisible = false) => {
    const list = onlyVisible ? visible : filteredSorted;
    if (list.length === 0) {
      alert("Nothing to export.");
      return;
    }
    const header = [
      "id",
      "name",
      "productCode",
      "categoryL1",
      "categoryL2",
      "price",
      "tags",
      "updatedAt",
    ].join(",");
    const lines = list.map((p) =>
      [
        p.id,
        csvEscape(p.name || ""),
        csvEscape(p.productCode || ""),
        csvEscape(p.categoryL1 || ""),
        csvEscape(p.categoryL2 || ""),
        Number(p.price || 0),
        csvEscape((p.tags || []).join(" | ")),
        tsToMs(p.updatedAt) || tsToMs(p.createdAt) || "",
      ].join(",")
    );
    const content = "\uFEFF" + [header, ...lines].join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `saved_${onlyVisible ? "visible" : "all"}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      {!user ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Login Required
          </Typography>
          <Typography color="text.secondary">
            Please sign in/sign up using the buttons at the top.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Top control bar */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ my: 2, flexWrap: "wrap" }}
          >
            {/* Search */}
            <TextField
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Search within saved products"
              size="small"
              sx={{ flex: 1, minWidth: 240 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: qText ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setQText("")}
                      aria-label="Clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            {/* Category filter */}
            <TextField
              select
              size="small"
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setPage(1);
              }}
              sx={{ width: 200 }}
              label="Category"
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            {/* Sort */}
            <TextField
              select
              size="small"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              sx={{ width: 180 }}
              label="Sort"
            >
              <MenuItem value="updated_desc">Last updated</MenuItem>
              <MenuItem value="price_desc">Price: high to low</MenuItem>
              <MenuItem value="price_asc">Price: low to high</MenuItem>
              <MenuItem value="name_asc">Name: A → Z</MenuItem>
            </TextField>

            {/* Actions */}
            <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
              <Tooltip title="Export ONLY currently visible items to CSV">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCsv(true)}
                    disabled={visible.length === 0}
                  >
                    CSV (Visible)
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Export ALL filtered/sorted items to CSV">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCsv(false)}
                    disabled={filteredSorted.length === 0}
                  >
                    CSV (All)
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={fetchSaved} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Error/Notice */}
          {errorMsg && (
            <Alert
              severity={/^error:/i.test(errorMsg) ? "error" : "warning"}
              sx={{ mb: 2 }}
            >
              {errorMsg}
            </Alert>
          )}

          {/* Loading */}
          {loadingUser || loadingSaved || loading ? (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading...
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Summary */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1, flexWrap: "wrap" }}
              >
                <Chip
                  variant="outlined"
                  label={`Saved total ${savedTotal.toLocaleString()}`}
                />
                {(debouncedQ || catFilter) && (
                  <Chip
                    color="primary"
                    label={`Results ${filteredSorted.length.toLocaleString()}`}
                  />
                )}
                <Chip
                  variant="outlined"
                  label={`With price ${
                    filteredSorted.filter((p) => Number(p.price) > 0).length
                  }`}
                />
                <Chip
                  variant="outlined"
                  label={`Showing ${visible.length}/${filteredSorted.length}`}
                />
              </Stack>

              {/* Results */}
              {filteredSorted.length === 0 ? (
                <Alert sx={{ mt: 2 }} severity="info">
                  {savedTotal === 0
                    ? "You do not have any saved items."
                    : "No search/filter results. Try changing the conditions."}
                </Alert>
              ) : (
                <>
                  <Grid
                    container
                    spacing={2}
                    justifyContent="flex-start"
                    alignItems="stretch"
                  >
                    {visible.map((p) => (
                      <Grid
                        key={p.id}
                        item
                        xs={12}
                        sm={6}
                        md={3} // 4 per row on md+
                        sx={{ display: "flex", justifyContent: "center" }}
                      >
                        <ProductCard
                          product={p}
                          user={user}
                          isSaved={savedIds?.has(p.id)}
                          onToggleSave={handleToggleSave}
                          dense
                        />
                      </Grid>
                    ))}
                  </Grid>

                  {/* Load more */}
                  {canLoadMore && (
                    <Stack alignItems="center" sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setPage((v) => v + 1)}
                        sx={{ minWidth: 220 }}
                      >
                        See More
                      </Button>
                    </Stack>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}

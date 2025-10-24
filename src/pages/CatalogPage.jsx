// src/pages/CatalogPage.jsx
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { Container, Paper, Stack, Pagination, CircularProgress, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";

import useSavedProducts from "../hooks/useSavedProducts";
import useDebouncedValue from "../hooks/useDebouncedValue";
import CatalogFilters from "../components/CatalogFilters";
import TagFacets from "../components/TagFacets";
import ResultSummary from "../components/ResultSummary";
import ProductsGrid from "../components/ProductsGrid";
import { L1_KO_TO_KEY, L2_KO_TO_KEY } from "../constants/categories";
import { tokenizeTags } from "../utils/tags";
import { isRestockPending } from "../utils/restock";
import { haystack } from "../utils/search";

const PAGE_SIZE = 20;    // 화면 표시 개수
const BATCH_SIZE = 300;  // 서버 스캔 배치(900개면 3번 왕복)

export default function CatalogPage() {
  const { t } = useTranslation();

  // ---------- 필터/검색 ----------
  const [qText, setQText] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [fCatL1, setFCatL1] = useState("");
  const [fCatL2, setFCatL2] = useState("");
  const [fTag, setFTag] = useState("");
  const [excludeRestock, setExcludeRestock] = useState(false);
  const qTextDebounced = useDebouncedValue(qText, 250);

  // ---------- 저장 ----------
  const { user, savedIds, toggleSave } = useSavedProducts();
  const savedSet = useMemo(
    () => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])),
    [savedIds]
  );

  // ---------- 전체 검색(스캔) 상태 ----------
  const [matched, setMatched] = useState([]);
  const [scanCursor, setScanCursor] = useState(null);
  const [scanDone, setScanDone] = useState(false);
  const [scanning, setScanning] = useState(false);

  // ---------- 페이지 ----------
  const [page, setPage] = useState(1);

  // ---------- DB 전체 개수 (항상 서버 숫자 표시) ----------
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, "products"));
        setTotalCount(snapshot.data().count || 0);
      } catch (e) {
        console.error("getCountFromServer failed:", e);
        setTotalCount(0);
      }
    })();
  }, []);

  // 라벨 번역
  const trL1 = useCallback((ko) => {
    if (!ko) return t("catL1.unspecified");
    const key = L1_KO_TO_KEY[ko];
    return key ? t(`catL1.${key}`) : ko;
  }, [t]);

  const trL2 = useCallback((ko) => {
    if (!ko) return "";
    const key = L2_KO_TO_KEY[ko];
    return key ? t(`catL2.${key}`) : ko;
  }, [t]);

  const handleToggleSave = useCallback(
    (id) => Promise.resolve(toggleSave(id)).catch((e) => alert(e?.message || "Failed to save")),
    [toggleSave]
  );

  // 현재 조건과 일치 여부
  const matches = useCallback((p) => {
    if (onlySaved && user && !savedSet.has(p.id)) return false;
    if (fCatL1 && (p.categoryL1 || "") !== fCatL1) return false;
    if (fCatL2 && (p.categoryL2 || "") !== fCatL2) return false;

    const tagTokens = tokenizeTags(fTag);
    if (tagTokens.length) {
      const set = new Set((p.tags || []).map((t) => String(t).toLowerCase()));
      for (const tok of tagTokens) if (!set.has(tok)) return false;
    }

    const q = qTextDebounced.trim().toLowerCase();
    if (q && !haystack(p).includes(q)) return false;

    if (excludeRestock && isRestockPending(p)) return false;
    return true;
  }, [onlySaved, user, savedSet, fCatL1, fCatL2, fTag, qTextDebounced, excludeRestock]);

  // 배치 스캔(전체에서 조건 맞는 것만 누적)
  const scanNextBatch = useCallback(async () => {
    if (scanDone || scanning) return;
    setScanning(true);
    try {
      const qBase = query(
        collection(db, "products"),
        orderBy("updatedAt", "desc"),
        limit(BATCH_SIZE),
        ...(scanCursor ? [startAfter(scanCursor)] : []
      ));
      const snap = await getDocs(qBase);
      const docs = snap.docs;
      const rows = docs.map((d) => ({ id: d.id, ...d.data() })).filter(Boolean);

      const filtered = rows.filter((p) => p.name && matches(p));
      setMatched((prev) => [...prev, ...filtered]);

      const last = docs[docs.length - 1] || null;
      setScanCursor(last);
      if (docs.length < BATCH_SIZE) setScanDone(true);
    } finally {
      setScanning(false);
    }
  }, [scanCursor, scanDone, scanning, matches]);

  // 필터/검색 변경 시 초기화 후 1페이지 분 확보 시도
  useEffect(() => {
    setMatched([]);
    setScanCursor(null);
    setScanDone(false);
    setPage(1);
  }, [onlySaved, fCatL1, fCatL2, fTag, qTextDebounced, excludeRestock, user, savedSet]);

  // 현재 페이지를 그릴 수 있을 만큼 없으면 스캔
  useEffect(() => {
    const need = page * PAGE_SIZE;
    if (matched.length >= need || scanDone) return;
    const run = async () => {
      for (let i = 0; i < 3; i++) {
        if (matched.length >= need || scanDone) break;
        // eslint-disable-next-line no-await-in-loop
        await scanNextBatch();
      }
    };
    run();
  }, [page, matched.length, scanDone, scanNextBatch]);

  // 다음 페이지 프리페치(부드럽게)
  useEffect(() => {
    const need = (page + 1) * PAGE_SIZE;
    if (matched.length >= need || scanDone) return;
    scanNextBatch();
  }, [page, matched.length, scanDone, scanNextBatch]);

  // 페이지 아이템
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = matched.slice(start, end);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(matched.length / PAGE_SIZE)),
    [matched.length]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5, mb: 1.5 }}>
        <CatalogFilters
          qText={qText} setQText={setQText}
          fCatL1={fCatL1} setFCatL1={setFCatL1}
          fCatL2={fCatL2} setFCatL2={setFCatL2}
          fTag={fTag} setFTag={setFTag}
          excludeRestock={excludeRestock} setExcludeRestock={setExcludeRestock}
          onlySaved={onlySaved} setOnlySaved={setOnlySaved}
          trL1={trL1} trL2={trL2}
          resetFilters={() => {
            setQText("");
            setOnlySaved(false);
            setFCatL1("");
            setFCatL2("");
            setFTag("");
            setExcludeRestock(false);
          }}
        />
      </Paper>

      {/* 상단: 요약 + 페이지네이션 (상품 카드 나오기 전) */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <ResultSummary
            t={t}
            items={matched}
            filtered={pageItems}
            onlySaved={onlySaved}
            user={user}
            fCatL1={fCatL1}
            fCatL2={fCatL2}
            fTag={fTag}
            qText={qText}
            excludeRestock={excludeRestock}
            facetCatsL1={new Set()}
            facetMode={"include"}
            trL1={trL1}
            trL2={trL2}
            totalOverride={totalCount}        // ✅ 항상 DB 전체 개수
            shownOverride={pageItems.length}  // ✅ 현재 페이지 표시 수(최대 20)
          />
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="small"
          />
          {scanning && <CircularProgress size={16} />}
        </Stack>
      </Stack>

      {/* (옵션) 태그 파셋 */}
      <TagFacets
        visible={Boolean(fTag)}
        tagFacetsL1={useMemo(() => {
          const map = new Map();
          matched.forEach((p) => {
            const l1 = p.categoryL1 || "(미지정)";
            map.set(l1, (map.get(l1) || 0) + 1);
          });
          return map;
        }, [matched])}
        facetMode={"include"}
        setFacetMode={() => {}}
        facetCatsL1={new Set()}
        setFacetCatsL1={() => {}}
        trL1={trL1}
        t={t}
      />

      {/* 상품 카드 */}
      {pageItems.length === 0 && !scanning ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          {t("common.noResult")}
        </Paper>
      ) : (
        <ProductsGrid
          loading={false}
          filtered={pageItems}
          user={user}
          savedSet={savedSet}
          onToggleSave={handleToggleSave}
          t={t}
        />
      )}
    </Container>
  );
}

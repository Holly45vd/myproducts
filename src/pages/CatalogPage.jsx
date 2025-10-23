import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import useSavedProducts from "../hooks/useSavedProducts";
import ProductCard from "../components/ProductCard";
import { useTranslation } from "react-i18next";

/* ================= MUI ================= */
import {
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Divider,
  Typography,
  InputAdornment,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CategoryIcon from "@mui/icons-material/Category";
import LayersIcon from "@mui/icons-material/Layers";

/** 기존 한글 카테고리 맵(데이터는 유지) */
const CATEGORY_MAP = {
  "청소/욕실": ["청소용품(세제/브러쉬)", "세탁용품(세탁망/건조대)", "욕실용품(발매트/수건)", "휴지통/분리수거"],
  "수납/정리": ["수납박스/바구니", "리빙박스/정리함", "틈새수납", "옷걸이/선반", "주방수납", "냉장고 정리"],
  "주방용품": ["식기(접시/그릇)", "컵/물병/텀블러", "밀폐용기", "조리도구(칼/가위)", "주방잡화(행주/수세미)"],
  "문구/팬시": ["필기구/노트", "사무용품(파일/서류)", "포장용품", "디자인 문구", "전자기기 액세서리"],
  "뷰티/위생": ["스킨/바디케어", "마스크팩", "화장소품(브러쉬)", "메이크업", "위생용품(마스크/밴드)"],
  "패션/잡화": ["의류/언더웨어", "가방/파우치", "양말/스타킹", "패션소품(액세서리)", "슈즈용품"],
  "인테리어/원예": ["홈데코(쿠션/커튼)", "액자/시계", "원예용품(화분/씨앗)", "조명", "시즌 데코"],
  "공구/디지털": ["공구/안전용품", "차량/자전거 용품", "디지털 액세서리(케이블/충전기)", "전지/건전지"],
  "스포츠/레저/취미": ["캠핑/여행용품", "스포츠/헬스용품", "DIY/취미용품", "뜨개/공예", "반려동물용품"],
  "식품": ["과자/초콜릿", "음료/주스", "라면/즉석식품", "건강식품", "견과류"],
  "유아/완구": ["아동/유아용품", "완구/장난감", "교육/학습용품"],
  "시즌/시리즈": ["봄/여름 기획", "전통 시리즈", "캐릭터 컬래버"],
  "베스트/신상품": ["인기 순위 상품", "신상품"],
};

/** 한글 → i18n key (없으면 원문 fallback) */
const L1_KO_TO_KEY = {
  "청소/욕실": "home_cleaning",
  "수납/정리": "storage",
  "주방용품": "kitchen",
  "문구/팬시": "stationery",
  "뷰티/위생": "beauty_hygiene",
  "패션/잡화": "fashion",
  "인테리어/원예": "interior_garden",
  "공구/디지털": "tools_digital",
  "스포츠/레저/취미": "sports_leisure_hobby",
  "식품": "food",
  "유아/완구": "baby_toys",
  "시즌/시리즈": "seasonal_series",
  "베스트/신상품": "best_new",
};

// 🔄 REPLACE this whole block
const L2_KO_TO_KEY = {
  /* 청소/욕실 */
  "청소용품(세제/브러쉬)": "detergents_brushes",
  "세탁용품(세탁망/건조대)": "laundry_nets_racks",
  "욕실용품(발매트/수건)": "bath_mats_towels",
  "휴지통/분리수거": "trash_recycle",

  /* 수납/정리 */
  "수납박스/바구니": "storage_baskets",
  "리빙박스/정리함": "living_boxes_organizers",
  "틈새수납": "slim_storage",
  "옷걸이/선반": "hangers_shelves",
  "주방수납": "kitchen_storage",
  "냉장고 정리": "fridge_organizing",

  /* 주방용품 */
  "식기(접시/그릇)": "tableware_plates_bowls",
  "컵/물병/텀블러": "cups_bottles_tumblers",
  "밀폐용기": "food_containers",
  "조리도구(칼/가위)": "cooking_tools_knives_scissors",
  "주방잡화(행주/수세미)": "kitchen_misc_cloths_sponges",

  /* 문구/팬시 */
  "필기구/노트": "writing_notebooks",
  "사무용품(파일/서류)": "office_supplies_files_docs",
  "포장용품": "packing_supplies",
  "디자인 문구": "design_stationery",
  "전자기기 액세서리": "gadget_accessories",

  /* 뷰티/위생 */
  "스킨/바디케어": "skin_body_care",
  "마스크팩": "sheet_masks",
  "화장소품(브러쉬)": "makeup_tools_brushes",
  "메이크업": "makeup",
  "위생용품(마스크/밴드)": "hygiene_masks_bandages",

  /* 패션/잡화 */
  "의류/언더웨어": "apparel_underwear",
  "가방/파우치": "bags_pouches",
  "양말/스타킹": "socks_stockings",
  "패션소품(액세서리)": "fashion_accessories",
  "슈즈용품": "shoe_care",

  /* 인테리어/원예 */
  "홈데코(쿠션/커튼)": "home_decor_cushions_curtains",
  "액자/시계": "frames_clocks",
  "원예용품(화분/씨앗)": "gardening_pots_seeds",
  "조명": "lighting",
  "시즌 데코": "seasonal_decor",

  /* 공구/디지털 */
  "공구/안전용품": "tools_safety",
  "차량/자전거 용품": "car_bike_accessories",
  "디지털 액세서리(케이블/충전기)": "digital_accessories_cables_chargers",
  "전지/건전지": "batteries",

  /* 스포츠/레저/취미 */
  "캠핑/여행용품": "camping_travel",
  "스포츠/헬스용품": "sports_fitness",
  "DIY/취미용품": "diy_hobbies",
  "뜨개/공예": "knitting_crafts",
  "반려동물용품": "pet_supplies",

  /* 식품 */
  "과자/초콜릿": "snacks_chocolate",
  "음료/주스": "drinks_juice",
  "라면/즉석식품": "ramen_instant",
  "건강식품": "health_food",
  "견과류": "nuts",

  /* 유아/완구 */
  "아동/유아용품": "baby_kids_goods",
  "완구/장난감": "toys",
  "교육/학습용품": "educational_learning",

  /* 시즌/시리즈 */
  "봄/여름 기획": "spring_summer_collection",
  "전통 시리즈": "traditional_series",
  "캐릭터 컬래버": "character_collab",

  /* 베스트/신상품 */
  "인기 순위 상품": "bestsellers",
  "신상품": "new_arrivals",
};


/** 태그 파싱 */
function tokenizeTags(input = "") {
  return String(input)
    .split(/[,|#/ ]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 재입고 예정 판별 */
const hasRestockKeyword = (v) => {
  if (!v) return false;
  const s = Array.isArray(v) ? v.join(" ") : String(v);
  return /재입고\s*예정|재입고예정/i.test(s);
};
const isRestockPending = (p) => {
  return !!(
    p?.restockPending ||
    p?.restockSoon ||
    hasRestockKeyword(p?.tags) ||
    hasRestockKeyword(p?.badges) ||
    hasRestockKeyword(p?.labels) ||
    hasRestockKeyword(p?.status) ||
    hasRestockKeyword(p?.nameBadge) ||
    hasRestockKeyword(p?.badgeText)
  );
};

export default function CatalogPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [qText, setQText] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlySaved, setOnlySaved] = useState(false);

  const [fCatL1, setFCatL1] = useState("");
  const [fCatL2, setFCatL2] = useState("");
  const [fTag, setFTag] = useState("");

  const [excludeRestock, setExcludeRestock] = useState(false);

  const [facetCatsL1, setFacetCatsL1] = useState(new Set());
  const [facetMode, setFacetMode] = useState("include"); // 'include' | 'exclude'

  const { user, savedIds, toggleSave } = useSavedProducts();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const qRef = query(collection(db, "products"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(qRef);
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p && p.name);
        setItems(rows);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  /** 카테고리 표시용 번역 (데이터는 한글 그대로지만, 라벨만 영문 표시) */
  const trL1 = (ko) => {
    if (!ko) return t("catL1.unspecified");
    const key = L1_KO_TO_KEY[ko];
    return key ? t(`catL1.${key}`) : ko;
  };
  const trL2 = (ko) => {
    if (!ko) return "";
    const key = L2_KO_TO_KEY[ko];
    return key ? t(`catL2.${key}`) : ko;
  };

  /** 태그 검색 결과 기반 L1 파셋 집계 */
  const tagFacetsL1 = useMemo(() => {
    const tagTokens = tokenizeTags(fTag);
    if (!tagTokens.length) return new Map();

    let base = items;
    if (onlySaved && user) base = base.filter((p) => savedIds.has(p.id));

    base = base.filter((p) => {
      const tagSet = new Set((p.tags || []).map((t) => String(t).toLowerCase()));
      return tagTokens.every((t) => tagSet.has(t));
    });

    const k = qText.trim().toLowerCase();
    if (k) {
      base = base.filter((p) => {
        const hay = [p.name, p.productCode, ...(p.tags || [])].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(k);
      });
    }

    const map = new Map(); // L1 -> count
    base.forEach((p) => {
      const l1 = p.categoryL1 || "(미지정)";
      map.set(l1, (map.get(l1) || 0) + 1);
    });
    return map;
  }, [items, onlySaved, user, savedIds, fTag, qText]);

  /** 실제 화면 목록 */
  const filtered = useMemo(() => {
    let base = items;

    if (onlySaved && user) {
      base = base.filter((p) => savedIds.has(p.id));
    }
    if (fCatL1) base = base.filter((p) => (p.categoryL1 || "") === fCatL1);
    if (fCatL2) base = base.filter((p) => (p.categoryL2 || "") === fCatL2);

    const tagTokens = tokenizeTags(fTag);
    if (tagTokens.length) {
      base = base.filter((p) => {
        const tagSet = new Set((p.tags || []).map((t) => String(t).toLowerCase()));
        return tagTokens.every((t) => tagSet.has(t));
      });
    }

    const k = qText.trim().toLowerCase();
    if (k) {
      base = base.filter((p) => {
        const hay = [p.name, p.productCode, p.categoryL1, p.categoryL2, ...(p.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(k);
      });
    }

    if (excludeRestock) {
      base = base.filter((p) => !isRestockPending(p));
    }

    if (fTag && facetCatsL1.size > 0) {
      base = base.filter((p) => {
        const key = p.categoryL1 || "(미지정)";
        const hit = facetCatsL1.has(key);
        return facetMode === "include" ? hit : !hit;
      });
    }

    return base;
  }, [items, onlySaved, user, savedIds, fCatL1, fCatL2, fTag, qText, excludeRestock, facetCatsL1, facetMode]);

  const resetFilters = () => {
    setFCatL1("");
    setFCatL2("");
    setFTag("");
    setFacetCatsL1(new Set());
    setFacetMode("include");
    setExcludeRestock(false);
  };

  const l2Options = fCatL1 ? CATEGORY_MAP[fCatL1] || [] : [];

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {/* 검색 바 */}
      <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5, mb: 1.5 }}>
        <TextField
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* 필터 바 */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={1.5} alignItems="center">
            {/* L1 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label={t("common.l1")}
                value={fCatL1}
                onChange={(e) => {
                  setFCatL1(e.target.value);
                  setFCatL2("");
                }}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CategoryIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">{t("common.all")}</MenuItem>
                {Object.keys(CATEGORY_MAP).map((k) => (
                  <MenuItem key={k} value={k}>
                    {trL1(k)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* L2 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label={t("common.l2")}
                value={fCatL2}
                onChange={(e) => setFCatL2(e.target.value)}
                fullWidth
                size="small"
                disabled={!fCatL1}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LayersIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">{fCatL1 ? t("common.all") : t("common.selectL1First")}</MenuItem>
                {l2Options.map((s) => (
                  <MenuItem key={s} value={s}>
                    {trL2(s)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 태그 */}
            <Grid item xs={12} md={3}>
              <TextField
                value={fTag}
                onChange={(e) => setFTag(e.target.value)}
                placeholder={t("common.tagFilterPlaceholder")}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalOfferIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 재입고 제외 */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={excludeRestock}
                    onChange={(e) => setExcludeRestock(e.target.checked)}
                    size="small"
                  />
                }
                label={t("common.excludeRestock")}
              />
            </Grid>

            {/* 초기화/적용 */}
            <Grid item xs={12} sm={6} md={1.5}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Tooltip title={t("common.reset")}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RestartAltIcon />}
                      onClick={resetFilters}
                    >
                      {t("common.reset")}
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={t("common.apply")}>
                  <span>
                    <Button variant="contained" size="small" startIcon={<FilterAltIcon />}>
                      {t("common.apply")}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 태그 결과 기반 파셋 */}
      {fTag && tagFacetsL1.size > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle2">{t("common.facetsTitle")}</Typography>
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                size="small"
                value={facetMode}
                exclusive
                onChange={(_, v) => v && setFacetMode(v)}
              >
                <ToggleButton value="include">{t("common.include")}</ToggleButton>
                <ToggleButton value="exclude">{t("common.exclude")}</ToggleButton>
              </ToggleButtonGroup>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFacetCatsL1(new Set())}
                sx={{ ml: 1 }}
              >
                {t("common.clearSelection")}
              </Button>
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {Array.from(tagFacetsL1.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([l1, cnt]) => {
                  const active = facetCatsL1.has(l1);
                  return (
                    <Chip
                      key={l1}
                      label={`${trL1(l1)} · ${cnt.toLocaleString()}`}
                      clickable
                      variant={active ? "filled" : "outlined"}
                      color={active ? (facetMode === "include" ? "info" : "error") : "default"}
                      onClick={() =>
                        setFacetCatsL1((prev) => {
                          const next = new Set(prev);
                          if (next.has(l1)) next.delete(l1);
                          else next.add(l1);
                          return next;
                        })
                      }
                    />
                  );
                })}
            </Stack>

            {facetCatsL1.size > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {t(facetMode === "include" ? "common.facetAppliedInclude" : "common.facetAppliedExclude")} · {t("common.facetCount")} {facetCatsL1.size}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* 결과 정보 */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t("common.total")} {items.length.toLocaleString()} / {t("common.shown")} {filtered.length.toLocaleString()}
        </Typography>
        {onlySaved && user && <Chip size="small" label={t("common.savedOnly")} variant="outlined" />}
        {fCatL1 && <Chip size="small" label={`${t("chips.l1") }=${trL1(fCatL1)}`} />}
        {fCatL2 && <Chip size="small" label={`${t("chips.l2") }=${trL2(fCatL2)}`} />}
        {fTag && <Chip size="small" label={`${t("chips.tag") }=${fTag}`} />}
        {qText && <Chip size="small" label={`${t("chips.search") }="${qText}"`} />}
        {excludeRestock && <Chip size="small" color="default" variant="outlined" label={t("chips.excludeRestock")} />}
        {fTag && facetCatsL1.size > 0 && (
          <Chip
            size="small"
            label={`${t("chips.facet") }(${facetMode}): ${Array.from(facetCatsL1).map(trL1).join(", ")}`}
          />
        )}
      </Stack>

      {/* 리스트 */}
      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t("common.loading")}
          </Typography>
        </Stack>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">{t("common.noResult")}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {filtered.map((p) => (
            <Grid item key={p.id} xs={6} sm={4} md={3} lg={3}>
              <ProductCard
                product={p}
                user={user}
                isSaved={savedIds.has(p.id)}
                restockPending={isRestockPending(p)}
                onToggleSave={async (id) => {
                  try {
                    await toggleSave(id);
                  } catch (e) {
                    alert(e.message);
                  }
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

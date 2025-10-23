import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  limit as fsLimit,
  startAfter as fsStartAfter,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

/* ================= MUI ================= */
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Checkbox,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  Tooltip,
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import TagIcon from "@mui/icons-material/Sell";
import RefreshIcon from "@mui/icons-material/Refresh";
import CategoryIcon from "@mui/icons-material/Category";

/** ===== 카테고리 정의 (데이터는 한글, 라벨은 i18n로 변환) ===== */
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
const L2_KO_TO_KEY = {
  "청소용품(세제/브러쉬)": "detergents_brushes",
  "세탁용품(세탁망/건조대)": "laundry_racks",
  "욕실용품(발매트/수건)": "bath_mats_towels",
  "휴지통/분리수거": "trash_recycle",
  // 필요시 확장
};

/** ===== 유틸 ===== */
const PAGE_SIZE = 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokenizeTags = (input = "") =>
  String(input)
    .split(/[,|#/ ]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function buildCsv(rows) {
  const header = [
    "상품ID","상품명","상품코드","가격","평점","리뷰수","조회수",
    "태그","링크","이미지URL","이미지여부(hasImage)",
    "대분류(categoryL1)","중분류(categoryL2)",
  ];
  const lines = [header.map(csvEscape).join(",")];
  rows.forEach((p) => {
    lines.push(
      [
        p.id,
        p.name,
        p.productCode || "",
        p.price ?? "",
        p.rating ?? "",
        p.reviewCount ?? "",
        p.views ?? "",
        (p.tags || []).join(" | "),
        p.link || "",
        p.imageUrl || "",
        p.imageUrl ? "Y" : "N",
        p.categoryL1 || "",
        p.categoryL2 || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  });
  return lines.join("\r\n");
}

const downloadText = (content, filename, mime = "text/csv;charset=utf-8") => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ===== CSV/파싱 유틸 ===== */
function parseCsv(text) {
  let src = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const sep = src.includes("\t") ? "\t" : ",";
  const out = [];
  let cur = [];
  let cell = "";
  let inQ = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQ && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else inQ = !inQ;
      continue;
    }
    if (!inQ && (ch === sep || ch === "\n")) {
      cur.push(cell);
      cell = "";
      if (ch === "\n") {
        out.push(cur);
        cur = [];
      }
      continue;
    }
    cell += ch;
  }
  cur.push(cell);
  if (cur.length) out.push(cur);
  return out.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function normalizeHeader(h = "") {
  const raw = String(h).trim();
  const canon = raw.toLowerCase().replace(/\s+/g, "").replace(/\([^)]*\)/g, "");
  if (["id", "상품id", "문서id"].includes(canon)) return "id";
  if (["상품명", "name", "title"].includes(canon)) return "name";
  if (["상품코드", "productcode", "code", "pdno"].includes(canon)) return "productCode";
  if (["가격", "price"].includes(canon)) return "price";
  if (["평점", "rating"].includes(canon)) return "rating";
  if (["리뷰수", "review", "reviewcount"].includes(canon)) return "reviewCount";
  if (["조회수", "views", "view"].includes(canon)) return "views";
  if (["태그", "tags"].includes(canon)) return "tags";
  if (["링크", "url", "link"].includes(canon)) return "link";
  if (["이미지", "이미지url", "image", "imageurl", "thumbnail"].includes(canon)) return "imageUrl";
  if (["재입고", "restock", "restockable"].includes(canon)) return "restockable";
  if (["상태", "status"].includes(canon)) return "status";
  if (["재고", "stock", "재고수량"].includes(canon)) return "stock";
  if (/^(대분류|categoryl1|category_l1|lnb|lnb1)$/.test(canon)) return "categoryL1";
  if (/^(중분류|categoryl2|category_l2|sub|lnb2)$/.test(canon)) return "categoryL2";
  return raw;
}

function parseKoreanCount(text = "") {
  const t = String(text).replace(/[\s,()보기]/g, "");
  if (!t) return 0;
  const mMan = t.match(/([\d.]+)\s*만/);
  const mCheon = t.match(/([\d.]+)\s*천/);
  if (mMan) return Math.round(parseFloat(mMan[1]) * 10000);
  if (mCheon) return Math.round(parseFloat(mCheon[1]) * 1000);
  const num = t.match(/[\d.]+/);
  return num ? Number(num[0]) : 0;
}

function parsePrice(text = "") {
  const n = String(text).replace(/[^\d.]/g, "");
  return n ? Number(n) : 0;
}

function clean(s = "") {
  return String(s).replace(/\s+/g, " ").replace(/^"|"$/g, "").trim();
}

function rowToProduct(row, header) {
  const obj = {};
  header.forEach((key, idx) => (obj[key] = row[idx] ?? ""));
  const id = clean(obj.id || obj.productCode || "");
  if (!id) return null;

  const product = { id };
  const fields = {
    name: clean(obj.name || ""),
    imageUrl: clean(obj.imageUrl || ""),
    link: clean(obj.link || ""),
    productCode: clean(obj.productCode || ""),
    price: obj.price !== undefined ? parsePrice(obj.price) : undefined,
    rating: obj.rating !== undefined ? parseFloat(String(obj.rating).replace(/[^\d.]/g, "")) || 0 : undefined,
    reviewCount: obj.reviewCount !== undefined ? parseKoreanCount(obj.reviewCount) : undefined,
    views: obj.views !== undefined ? parseKoreanCount(obj.views) : undefined,
    restockable: obj.restockable !== undefined ? /^(true|1|예|y)$/i.test(String(obj.restockable).trim()) : undefined,
    status: obj.status ? String(obj.status).trim() : undefined,
    stock: obj.stock !== undefined ? Number(String(obj.stock).replace(/[^\d-]/g, "")) || 0 : undefined,
    categoryL1: obj.categoryL1 ? clean(obj.categoryL1) : undefined,
    categoryL2: obj.categoryL2 ? clean(obj.categoryL2) : undefined,
  };
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined) return;
    if (typeof v === "string" && !v) return;
    product[k] = v;
  });
  if (obj.tags != null && String(obj.tags).trim() !== "") {
    product.tags = Array.from(new Set(tokenizeTags(String(obj.tags))));
  }
  return product;
}

/* =============== 공통 확인 다이얼로그 =============== */
function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmText = "OK", loading = false }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: "pre-line" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onConfirm} disabled={loading}>
          {loading ? "Working…" : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

//* =============== CSV 업서트 모달(MUI 버전) =============== */
const CsvImportModal = React.memo(function CsvImportModal({ open, onClose, onAfterImport }) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState([]); // string[][]
  const [header, setHeader] = useState([]); // normalized
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [replaceTags, setReplaceTags] = useState(true);
  const [replaceCategories, setReplaceCategories] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0, running: false });

  const fileRef = useRef(null);

  const parsedProducts = useMemo(() => {
    if (!rows.length) return [];
    try {
      return rows.map((r) => rowToProduct(r, header)).filter(Boolean);
    } catch (e) {
      console.error("CSV parse error:", e);
      return [];
    }
  }, [rows, header]);

  function loadText(text) {
    const grid = parseCsv(text);
    if (!grid.length) {
      setRows([]);
      setHeader([]);
      setRaw("");
      return;
    }
    const [h0, ...body] = grid;
    const norm = h0.map(normalizeHeader);
    setRaw(text);
    setRows(body);
    setHeader(norm);
  }

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    loadText(text);
  };

  const downloadTemplate = () => {
    const headers = [
      "상품ID","상품명","상품코드","가격","평점","리뷰수","조회수",
      "태그","링크","이미지URL","재입고","상태","재고",
      "대분류(categoryL1)","중분류(categoryL2)",
    ];
    const content = "\uFEFF" + headers.join(",") + "\r\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "상품_업데이트_템플릿.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsedProducts.length) return alert(t("csv.noValidRows","No valid rows."));
    const total = parsedProducts.length;
    setProgress({ done: 0, total, running: true });
    try {
      const chunkSize = 400;
      for (let i = 0; i < parsedProducts.length; i += chunkSize) {
        const chunk = parsedProducts.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((p) => {
          const { id, ...rest } = p;
          const payload = { updatedAt: serverTimestamp() };
          if (replaceTags && rest.tags) payload.tags = rest.tags;
          ["name","imageUrl","link","productCode","price","rating","reviewCount","views","restockable","status","stock"].forEach((k) => {
            if (rest[k] !== undefined) payload[k] = rest[k];
          });
          if (replaceCategories) {
            if (rest.categoryL1 !== undefined) payload.categoryL1 = rest.categoryL1;
            if (rest.categoryL2 !== undefined) payload.categoryL2 = rest.categoryL2;
          }
          batch.set(doc(db, "products", id), payload, { merge: true });
        });
        await batch.commit();
        setProgress((s) => ({ ...s, done: Math.min(s.done + chunk.length, total) }));
        await sleep(10);
      }
      onAfterImport?.();
      onClose?.();
    } catch (e) {
      alert(t("csv.error", { defaultValue: "Error: {{msg}}", msg: e.message }));
    } finally {
      setProgress({ done: 0, total: 0, running: false });
    }
  };

  return (
    <Dialog open={open} onClose={progress.running ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t("csv.title","CSV Upsert (Insert/Update)")}</DialogTitle>

      <DialogContent dividers sx={{ pb: 0 }}>
        <Stack spacing={2}>
          {/* 파일 선택 */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              style={{ display: "none" }}
              onChange={onFile}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                fileRef.current?.click();
              }}
            >
              {t("csv.pickFile","Pick file")}
            </Button>
            <Button variant="outlined" onClick={downloadTemplate}>
              {t("csv.downloadTemplate","Download template")}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {fileName ? t("csv.selectedFile","Selected: {{name}}", { name: fileName }) : t("csv.supported","CSV/TSV (UTF-8, BOM recommended)")}
            </Typography>
          </Stack>

          {/* 옵션 + 실행 */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip label={t("csv.overwriteChip","Overwrite: {{v}}", { v: overwriteMode ? "ON" : "OFF" })} onClick={() => setOverwriteMode((v) => !v)} variant={overwriteMode ? "filled" : "outlined"} />
            <Chip label={t("csv.replaceTagsChip","Replace tags: {{v}}", { v: replaceTags ? "ON" : "OFF" })} onClick={() => setReplaceTags((v) => !v)} icon={<TagIcon />} variant={replaceTags ? "filled" : "outlined"} />
            <Chip label={t("csv.replaceCatsChip","Replace categories: {{v}}", { v: replaceCategories ? "ON" : "OFF" })} onClick={() => setReplaceCategories((v) => !v)} icon={<CategoryIcon />} variant={replaceCategories ? "filled" : "outlined"} />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!parsedProducts.length || progress.running}
            >
              {progress.running ? t("csv.processing","Processing… ({{done}}/{{total}})", { done: progress.done, total: progress.total }) : t("csv.runUpsert","Run upsert ({{n}})", { n: parsedProducts.length })}
            </Button>
          </Stack>

          {/* 붙여넣기 */}
          <TextField
            minRows={6}
            maxRows={12}
            multiline
            placeholder={t(
              "csv.pastePlaceholder",
              `Paste CSV/TSV here
e.g., 상품ID,상품명,가격,태그,대분류(categoryL1),중분류(categoryL2)
1038756,전통문양 봉투 2매입,1000,"전통 | 봉투 | 핑크",전통/시리즈,전통 시리즈`
            )}
            value={raw}
            onChange={(e) => {
              const v = e.target.value;
              setRaw(v);
              if (v) loadText(v);
            }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      {/* 미리보기 */}
      <DialogContent dividers sx={{ pt: 2, maxHeight: 420 }}>
        <Typography variant="subtitle1">{t("csv.preview","Preview ({{n}} rows)", { n: parsedProducts.length })}</Typography>
        <Box sx={{ overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["id","name","productCode","price","rating","reviewCount","views","tags","link","imageUrl","restockable","status","stock","categoryL1","categoryL2"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedProducts.slice(0, 1000).map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{p.id}</td>
                  <td style={{ padding: 8 }}>{p.name || ""}</td>
                  <td style={{ padding: 8 }}>{p.productCode || ""}</td>
                  <td style={{ padding: 8 }}>{p.price ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.rating ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.reviewCount ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.views ?? ""}</td>
                  <td style={{ padding: 8 }}>{Array.isArray(p.tags) ? p.tags.join(" | ") : ""}</td>
                  <td style={{ padding: 8, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.link || ""}</td>
                  <td style={{ padding: 8, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.imageUrl || ""}</td>
                  <td style={{ padding: 8 }}>{p.restockable ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.status ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.stock ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL1 ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL2 ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedProducts.length > 1000 && (
            <Typography variant="caption" sx={{ p: 1, display: "block", color: "text.secondary" }}>
              {t("csv.previewMore","Preview shows top 1000 rows. All {{n}} rows will be processed.", { n: parsedProducts.length })}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
        <Typography sx={{ mr: "auto" }} color="text.secondary" variant="body2">
          {parsedProducts.length ? t("csv.toProcess","To process: {{n}}", { n: parsedProducts.length }) : t("csv.pickOrPaste","Pick a CSV/TSV file or paste it above.")}
        </Typography>
        <Button onClick={onClose} disabled={progress.running}>{t("common.cancel","Cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!parsedProducts.length || progress.running}
        >
          {progress.running ? t("csv.processing","Processing… ({{done}}/{{total}})", { done: progress.done, total: progress.total }) : t("csv.runUpsert","Run upsert ({{n}})", { n: parsedProducts.length })}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

/* ======================= 메인 페이지 ======================= */
export default function EditTagsAndCategoriesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [qText, setQText] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  const [selected, setSelected] = useState(new Set());
  const [bulkInput, setBulkInput] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const [noImageOnly, setNoImageOnly] = useState(false);

  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTargetIds, setConfirmTargetIds] = useState([]);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuTargetId, setMenuTargetId] = useState(null);

  const trL1 = (ko) => {
    if (!ko) return t("catL1.unspecified","(Unspecified)");
    const key = L1_KO_TO_KEY[ko];
    return key ? t(`catL1.${key}`) : ko;
  };
  const trL2 = (ko) => {
    if (!ko) return "";
    const key = L2_KO_TO_KEY[ko];
    return key ? t(`catL2.${key}`) : ko;
  };

  const openMenu = (e, id) => {
    setMenuAnchor(e.currentTarget);
    setMenuTargetId(id);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuTargetId(null);
  };

  const loadPage = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        let qRef = query(collection(db, "products"), orderBy("updatedAt", "desc"), fsLimit(PAGE_SIZE));
        if (!reset && lastDocRef.current) {
          qRef = query(collection(db, "products"), orderBy("updatedAt", "desc"), fsStartAfter(lastDocRef.current), fsLimit(PAGE_SIZE));
        }
        const snap = await getDocs(qRef);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p && p.name);

        if (reset) {
          setItems(rows);
          setSelected(new Set());
        } else {
          setItems((prev) => [...prev, ...rows]);
        }
        if (snap.docs.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      } catch (e) {
        setSnack({ open: true, msg: t("edit.loadFail","Load failed: {{m}}",{ m: e.message }), severity: "error" });
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  const reloadAll = useCallback(() => {
    lastDocRef.current = null;
    setHasMore(true);
    loadPage(true);
  }, [loadPage]);

  // 디바운스 검색
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const tId = setTimeout(() => setDebounced(qText.trim().toLowerCase()), 300);
    return () => clearTimeout(tId);
  }, [qText]);

  const filtered = useMemo(() => {
    const base = items;
    const searched = debounced
      ? base.filter((p) => {
          const hay = [p.name, p.productCode, ...(p.tags || []), p.categoryL1 || "", p.categoryL2 || ""]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(debounced);
        })
      : base;
    return searched.filter((p) => !noImageOnly || !p.imageUrl);
  }, [items, debounced, noImageOnly]);

  // 선택
  const toggleCheck = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.id));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  // 태그 벌크 추가/삭제
  const handleBulkAdd = async () => {
    const tokens = tokenizeTags(bulkInput);
    if (!tokens.length) return setSnack({ open: true, msg: t("edit.enterTags","Enter tags to add."), severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: t("edit.noSelection","No items selected."), severity: "warning" });

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) => batch.update(doc(db, "products", id), { tags: arrayUnion(...tokens), updatedAt: serverTimestamp() }));
      await batch.commit();
      setItems((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, tags: Array.from(new Set([...(p.tags || []), ...tokens])) } : p)));
      setBulkInput("");
      setSnack({ open: true, msg: t("edit.added","Tags added ({{n}})", { n: selected.size }), severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: t("edit.addFail","Bulk add failed: {{m}}",{ m: e.message }), severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkRemove = async () => {
    const tokens = tokenizeTags(bulkInput);
    if (!tokens.length) return setSnack({ open: true, msg: t("edit.enterTagsToRemove","Enter tags to remove."), severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: t("edit.noSelection","No items selected."), severity: "warning" });

    if (!window.confirm(t("edit.confirmRemove","Remove tags [{{tags}}] from {{n}} items?", { tags: tokens.join(", "), n: selected.size }))) return;

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) =>
        batch.update(doc(db, "products", id), { tags: arrayRemove(...tokens), updatedAt: serverTimestamp() })
      );
      await batch.commit();
      setItems((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, tags: (p.tags || []).filter((t0) => !tokens.includes(t0)) } : p)));
      setBulkInput("");
      setSnack({ open: true, msg: t("edit.removed","Tags removed ({{n}})", { n: selected.size }), severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: t("edit.removeFail","Bulk remove failed: {{m}}", { m: e.message }), severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  };

  // 카테고리 벌크 지정
  const handleBulkSetCategory = async () => {
    if (!l1 || !l2) return setSnack({ open: true, msg: t("edit.pickCats","Pick L1/L2 first."), severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: t("edit.noSelection","No items selected."), severity: "warning" });

    if (!window.confirm(t("edit.confirmCats","Set category {{l1}} > {{l2}} for {{n}} items?", { l1: trL1(l1), l2: trL2(l2), n: selected.size }))) return;

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) =>
        batch.update(doc(db, "products", id), { categoryL1: l1, categoryL2: l2, updatedAt: serverTimestamp() })
      );
      await batch.commit();
      setItems((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, categoryL1: l1, categoryL2: l2 } : p)));
      setSnack({ open: true, msg: t("edit.catDone","Category set ({{n}})", { n: selected.size }), severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: t("edit.catFail","Set category failed: {{m}}",{ m: e.message }), severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  };

  // CSV export
  const downloadCsv = (onlySelected = false) => {
    const list = onlySelected ? filtered.filter((p) => selected.has(p.id)) : filtered;
    if (list.length === 0) return setSnack({ open: true, msg: t("edit.noExport","Nothing to export."), severity: "warning" });
    const csv = buildCsv(list);
    const today = new Date().toISOString().slice(0, 10);
    downloadText(csv, `상품리스트_${onlySelected ? "선택만" : "필터결과"}_${today}.csv`);
  };

  // 삭제
  const requestDelete = (ids) => {
    setConfirmTargetIds(ids);
    setConfirmOpen(true);
    closeMenu();
  };

  const doDelete = async () => {
    setConfirmLoading(true);
    try {
      if (confirmTargetIds.length === 1) {
        await deleteDoc(doc(db, "products", confirmTargetIds[0]));
      } else {
        const ids = [...confirmTargetIds];
        const CHUNK = 400;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          const batch = writeBatch(db);
          chunk.forEach((id) => batch.delete(doc(db, "products", id)));
          await batch.commit();
        }
      }
      setItems((prev) => prev.filter((p) => !confirmTargetIds.includes(p.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        confirmTargetIds.forEach((id) => next.delete(id));
        return next;
      });
      setSnack({ open: true, msg: t("edit.deleted","Deleted ({{n}})", { n: confirmTargetIds.length }), severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: t("edit.deleteFail","Delete failed: {{m}}", { m: e.message }), severity: "error" });
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmTargetIds([]);
    }
  };

  const l2Options = useMemo(() => (l1 ? CATEGORY_MAP[l1] || [] : []), [l1]);

  return (
    <>
      {/* 상단 앱바 */}
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("edit.title","Edit Tags / Categories")}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder={t("common.searchPlaceholder","Search: name / code / tags / category")}
            size="small"
            sx={{ minWidth: 340 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title={t("edit.reloadAll","Reload all")}>
            <span>
              <IconButton onClick={reloadAll} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setCsvOpen(true)}>
            {t("edit.csvUpsert","CSV Upsert")}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(false)}>
            {t("edit.csvFiltered","CSV (filtered)")}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(true)} disabled={selected.size === 0}>
            {t("edit.csvSelected","CSV (selected)")}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* 선택/벌크 툴바 */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={t("edit.tagInputPh","Tags: traditional, pink #envelope")}
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><TagIcon fontSize="small" /></InputAdornment> }}
                />
              </Grid>
              <Grid item>
                <Button variant="contained" onClick={handleBulkAdd} disabled={bulkWorking || selected.size === 0} startIcon={<AddIcon />}>
                  {t("edit.addTags","Add tags ({{n}})", { n: selected.size })}
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={handleBulkRemove} disabled={bulkWorking || selected.size === 0}>
                  {t("edit.removeTags","Remove tags ({{n}})", { n: selected.size })}
                </Button>
              </Grid>
              <Grid item>
                <Divider orientation="vertical" flexItem />
              </Grid>
              <Grid item xs={12} md={3}>
                <Select size="small" value={l1} onChange={(e) => { setL1(e.target.value); setL2(""); }} displayEmpty fullWidth>
                  <MenuItem value="">
                    <em>{t("common.l1","Category (L1)")}</em>
                  </MenuItem>
                  {Object.keys(CATEGORY_MAP).map((k) => (
                    <MenuItem key={k} value={k}>
                      {trL1(k)}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Select size="small" value={l2} onChange={(e) => setL2(e.target.value)} displayEmpty fullWidth disabled={!l1}>
                  <MenuItem value="">
                    <em>{l1 ? t("common.l2","Subcategory (L2)") : t("common.selectL1First","Select L1 first")}</em>
                  </MenuItem>
                  {l2Options.map((k) => (
                    <MenuItem key={k} value={k}>
                      {trL2(k)}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={handleBulkSetCategory} disabled={bulkWorking || selected.size === 0 || !l1 || !l2} startIcon={<CategoryIcon />}>
                  {t("edit.setCategory","Set category ({{n}})", { n: selected.size })}
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={selectAllOnPage}>
                  {t("edit.selectAll","Select all (page)")}
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={clearSelection}>
                  {t("edit.clearSel","Clear selection")}
                </Button>
              </Grid>
              <Grid item sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={selected.size === 0}
                  onClick={() => requestDelete([...selected])}
                  title={t("edit.deleteSelected","Delete selected")}
                >
                  {t("edit.deleteSelected","Delete selected")}
                </Button>
                <FormControlLabel
                  control={<Checkbox checked={noImageOnly} onChange={(e) => setNoImageOnly(e.target.checked)} size="small" />}
                  label={t("edit.onlyNoImage","Only items without image")}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 리스트 */}
        {loading && items.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t("common.loading","Loading…")}
            </Typography>
          </Stack>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary">{t("common.noResult","No results.")}</Typography>
        ) : (
          <Grid container spacing={1.5}>
            {filtered.map((p) => {
              const isChecked = selected.has(p.id);
              const uniqTags = Array.from(new Set(p.tags || []));
              return (
                <Grid item xs={12} key={p.id}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: "grid", gridTemplateColumns: "36px 88px 1fr 36px", gap: 12, alignItems: "center" }}>
                      <Checkbox checked={isChecked} onChange={() => toggleCheck(p.id)} inputProps={{ "aria-label": `select-${p.name}` }} />
                      {p.imageUrl ? (
                        <CardMedia component="img" image={p.imageUrl} alt={p.name} sx={{ width: 80, height: 80, borderRadius: 1, bgcolor: "grey.100", objectFit: "cover" }} />
                      ) : (
                        <Box sx={{ width: 80, height: 80, borderRadius: 1, bgcolor: "grey.100" }} />
                      )}
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography fontWeight={700}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({p.productCode || p.id})
                          </Typography>
                          {p.link && (
                            <Button size="small" href={p.link} target="_blank" rel="noopener noreferrer">
                              {t("edit.originLink","Original link")}
                            </Button>
                          )}
                          {isChecked && <Chip label={t("edit.selected","Selected")} size="small" color="default" variant="outlined" sx={{ ml: "auto" }} />}
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {p.categoryL1 || p.categoryL2 ? (
                            <>
                              <Chip size="small" label={`${t("chips.l1","L1")}: ${trL1(p.categoryL1 || "-")}`} color="primary" variant="outlined" />
                              <Chip size="small" label={`${t("chips.l2","L2")}: ${trL2(p.categoryL2 || "-")}`} color="info" variant="outlined" />
                            </>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {t("edit.noCategory","No category")}
                            </Typography>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {uniqTags.length > 0
                            ? uniqTags.map((tg) => <Chip key={tg} label={`#${tg}`} size="small" variant="outlined" />)
                            : <Typography variant="caption" color="text.secondary">{t("edit.noTags","No tags")}</Typography>}
                        </Stack>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <IconButton aria-label="more" onClick={(e) => openMenu(e, p.id)}>
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* 페이지네이션 */}
        <Stack alignItems="center" sx={{ mt: 2 }}>
          {hasMore ? (
            <Button variant="contained" onClick={() => loadPage(false)} disabled={loading} sx={{ minWidth: 200 }}>
              {loading ? t("edit.loading","Loading…") : t("edit.loadMore","Load more")}
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t("edit.allLoaded","All items loaded.")}
            </Typography>
          )}
        </Stack>
      </Container>

      {/* CSV 모달 */}
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onAfterImport={() => reloadAll()} />

      {/* per-item 메뉴 */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { requestDelete([menuTargetId]); }}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> {t("edit.delete","Delete")}
        </MenuItem>
      </Menu>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("edit.confirmTitle","Confirm deletion")}
        message={
          confirmTargetIds.length > 1
            ? t("edit.confirmMsgMulti","You are about to delete {{n}} items.\nThis action cannot be undone.", { n: confirmTargetIds.length })
            : t("edit.confirmMsgSingle","This item will be deleted. This cannot be undone.")
        }
        confirmText={t("edit.delete","Delete")}
        onCancel={() => !confirmLoading && setConfirmOpen(false)}
        onConfirm={doDelete}
        loading={confirmLoading}
      />

      {/* 스낵바 */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

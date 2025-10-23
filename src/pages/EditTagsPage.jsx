// src/pages/EditTagsAndCategoriesPage.jsx
import React, {
  useEffect, useMemo, useState, useCallback, useRef,
  useDeferredValue, useTransition
} from "react";
import {
  collection, getDocs, orderBy, query, doc, writeBatch,
  arrayUnion, arrayRemove, serverTimestamp,
  limit as fsLimit, startAfter as fsStartAfter, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

/* ================= MUI ================= */
import {
  AppBar, Toolbar, Typography, Container, Box, Grid, Card, CardContent,
  Checkbox, IconButton, Button, TextField, InputAdornment, Select, MenuItem, Chip,
  Stack, Divider, Snackbar, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Menu, Tooltip, FormControlLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import TagIcon from "@mui/icons-material/Sell";
import RefreshIcon from "@mui/icons-material/Refresh";
import CategoryIcon from "@mui/icons-material/Category";

// ⛔️ react-window 제거
import ProductRow from "../components/ProductRow";

/** ===== Category map (EN) ===== */
const CATEGORY_MAP = {
  "Cleaning/Bath": ["Cleaning Supplies (Detergent/Brush)", "Laundry Supplies (Nets/Racks)", "Bathroom Items (Mat/Towel)", "Trash/Recycle Bins"],
  "Storage/Organization": ["Storage Boxes/Baskets", "Living Boxes/Organizers", "Slim Storage", "Hangers/Shelves", "Kitchen Storage", "Fridge Organization"],
  "Kitchenware": ["Tableware (Plates/Bowls)", "Cups/Bottles/Tumblers", "Food Containers", "Cooking Tools (Knife/Scissors)", "Kitchen Sundries (Cloth/Sponge)"],
  "Stationery/Fancy": ["Pens/Notebooks", "Office Supplies (Files/Docs)", "Packing Materials", "Design Stationery", "Electronic Accessories"],
  "Beauty/Hygiene": ["Skin/Body Care", "Sheet Masks", "Makeup Tools (Brushes)", "Makeup", "Hygiene (Masks/Bandages)"],
  "Fashion/Accessories": ["Clothing/Underwear", "Bags/Pouches", "Socks/Stockings", "Fashion Accessories", "Shoe Care"],
  "Interior/Gardening": ["Home Decor (Cushion/Curtain)", "Frames/Clocks", "Gardening (Pots/Seeds)", "Lighting", "Seasonal Decor"],
  "Tools/Digital": ["Tools/Safety", "Car/Bike Accessories", "Digital Accessories (Cables/Chargers)", "Batteries"],
  "Sports/Leisure/Hobby": ["Camping/Travel", "Sports/Fitness", "DIY/Hobbies", "Knitting/Crafts", "Pet Supplies"],
  "Food": ["Snacks/Chocolate", "Drinks/Juice", "Ramen/Instant", "Health Foods", "Nuts"],
  "Kids/Toys": ["Kids/Baby Items", "Toys", "Education/Learning"],
  "Season/Series": ["Spring/Summer Plans", "Traditional Series", "Character Collab"],
  "Best/New": ["Top Sellers", "New Arrivals"],
};

/* ================= Utils ================= */

const PAGE_SIZE = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 안전한 브라우저 전역 접근 (SSR/HMR 대비) */
function getBrowser() {
  try {
    const g = typeof globalThis !== "undefined"
      ? globalThis
      : typeof window !== "undefined"
      ? window
      : undefined;
    if (!g || !g.document || !g.Blob || !(g.URL || g.webkitURL)) return null;
    return g;
  } catch {
    return null;
  }
}

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
    "Product ID", "Product Name", "Product Name EN", "Product Code", "Price", "Rating", "Reviews", "Views",
    "Tags", "Link", "Image URL", "Has Image",
    "Category L1", "Category L2", "Category L1 EN", "Category L2 EN",
  ];
  const lines = [header.map(csvEscape).join(",")];
  rows.forEach((p) => {
    lines.push(
      [
        p.id,
        p.name,
        p.name_en || "",
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
        p.categoryL1_en || "",
        p.categoryL2_en || "",
      ].map(csvEscape).join(",")
    );
  });
  return lines.join("\r\n");
}

/** 브라우저에서만 안전하게 파일 다운로드 */
function downloadText(content, filename, mime = "text/csv;charset=utf-8") {
  const g = getBrowser();
  if (!g) {
    console.error("Download is only available in browsers.");
    return;
  }
  const BOM = "\uFEFF";
  const blob = new g.Blob([BOM + content], { type: mime });
  const url = (g.URL || g.webkitURL).createObjectURL(blob);
  const a = g.document.createElement("a");
  a.href = url;
  a.download = filename;
  g.document.body.appendChild(a);
  a.click();
  a.remove();
  (g.URL || g.webkitURL).revokeObjectURL(url);
}

/* ===== CSV/Parsing utils ===== */
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
        cell += '"'; i++;
      } else inQ = !inQ;
      continue;
    }
    if (!inQ && (ch === sep || ch === "\n")) {
      cur.push(cell); cell = "";
      if (ch === "\n") { out.push(cur); cur = []; }
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
  // 공백/밑줄 제거해서 관대한 매칭
  const canon = raw.toLowerCase().replace(/[\s_]+/g, "").replace(/\([^)]*\)/g, "");
  if (["id", "상품id", "문서id", "productid"].includes(canon)) return "id";
  if (["상품명", "name", "title", "productname"].includes(canon)) return "name";
  if (["영문명","영어명","productnameen","nameen","productname_en","name_en"].includes(canon)) return "name_en";
  if (["상품코드", "productcode", "code", "pdno"].includes(canon)) return "productCode";
  if (["가격", "price"].includes(canon)) return "price";
  if (["평점", "rating"].includes(canon)) return "rating";
  if (["리뷰수", "review", "reviews", "reviewcount"].includes(canon)) return "reviewCount";
  if (["조회수", "views", "view"].includes(canon)) return "views";
  if (["태그", "tags"].includes(canon)) return "tags";
  if (["링크", "url", "link"].includes(canon)) return "link";
  if (["이미지", "이미지url", "image", "imageurl", "thumbnail"].includes(canon)) return "imageUrl";
  if (["재입고", "restock", "restockable"].includes(canon)) return "restockable";
  if (["상태", "status"].includes(canon)) return "status";
  if (["재고", "stock", "재고수량"].includes(canon)) return "stock";
  if (/^(대분류|categoryl1|categoryl1)$/.test(canon)) return "categoryL1";
  if (/^(중분류|categoryl2|categoryl2)$/.test(canon)) return "categoryL2";
  // ✅ 영문 카테고리
  if (/^(대분류en|categoryl1en|categoryl1_en)$/.test(canon)) return "categoryL1_en";
  if (/^(중분류en|categoryl2en|categoryl2_en)$/.test(canon)) return "categoryL2_en";
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
function clean(s = "") { return String(s).replace(/\s+/g, " ").replace(/^"|"$/g, "").trim(); }

function rowToProduct(row, header) {
  const obj = {};
  header.forEach((key, idx) => (obj[key] = row[idx] ?? ""));
  const id = clean(obj.id || obj.productCode || "");
  if (!id) return null;

  const product = { id };
  const fields = {
    name: clean(obj.name || ""),
    name_en: obj.name_en ? clean(obj.name_en) : undefined,
    imageUrl: clean(obj.imageUrl || ""),
    link: clean(obj.link || ""),
    productCode: clean(obj.productCode || ""),
    price: obj.price !== undefined ? parsePrice(obj.price) : undefined,
    rating: obj.rating !== undefined ? parseFloat(String(obj.rating).replace(/[^\d.]/g, "")) || 0 : undefined,
    reviewCount: obj.reviewCount !== undefined ? parseKoreanCount(obj.reviewCount) : undefined,
    views: obj.views !== undefined ? parseKoreanCount(obj.views) : undefined,
    restockable: obj.restockable !== undefined ? /^(true|1|yes|y)$/i.test(String(obj.restockable).trim()) : undefined,
    status: obj.status ? String(obj.status).trim() : undefined,
    stock: obj.stock !== undefined ? Number(String(obj.stock).replace(/[^\d-]/g, "")) || 0 : undefined,
    categoryL1: obj.categoryL1 ? clean(obj.categoryL1) : undefined,
    categoryL2: obj.categoryL2 ? clean(obj.categoryL2) : undefined,
    categoryL1_en: obj.categoryL1_en ? clean(obj.categoryL1_en) : undefined,
    categoryL2_en: obj.categoryL2_en ? clean(obj.categoryL2_en) : undefined,
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

/* =============== Confirm dialog =============== */
function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmText = "Confirm", loading = false }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: "pre-line" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onConfirm} disabled={loading}>
          {loading ? "Processing…" : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

//* =============== CSV Upsert Modal (MUI) =============== */
const CsvImportModal = React.memo(function CsvImportModal({ open, onClose, onAfterImport }) {
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState([]); // string[][]
  const [header, setHeader] = useState([]); // normalized keys
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
      setRows([]); setHeader([]); setRaw(""); return;
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
      "id","name","name_en","productCode","price","rating","reviewCount","views",
      "tags","link","imageUrl","restockable","status","stock",
      "categoryL1","categoryL2","categoryL1_en","categoryL2_en",
    ];
    const content = "\uFEFF" + headers.join(",") + "\r\n";
    downloadText(content, "Product_Update_Template.csv");
  };

  const handleImport = async () => {
    if (!parsedProducts.length) return alert("No valid rows.");
    const total = parsedProducts.length;
    setProgress({ done: 0, total, running: true });
    try {
      const chunkSize = 400;
      for (let i = 0; i < parsedProducts.length; i += chunkSize) {
        const chunk = parsedProducts.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((p) => {
          const { id, ...rest } = p;

          if (!overwriteMode) {
            // Merge mode
            const payload = { updatedAt: serverTimestamp() };
            if (replaceTags && rest.tags) payload.tags = rest.tags;

            [
              "name","name_en","imageUrl","link","productCode","price","rating",
              "reviewCount","views","restockable","status","stock"
            ].forEach((k) => { if (rest[k] !== undefined) payload[k] = rest[k]; });

            if (replaceCategories) {
              if (rest.categoryL1 !== undefined) payload.categoryL1 = rest.categoryL1;
              if (rest.categoryL2 !== undefined) payload.categoryL2 = rest.categoryL2;
              if (rest.categoryL1_en !== undefined) payload.categoryL1_en = rest.categoryL1_en;
              if (rest.categoryL2_en !== undefined) payload.categoryL2_en = rest.categoryL2_en;
            }
            batch.set(doc(db, "products", id), payload, { merge: true });
          } else {
            // Overwrite mode (merge:false)
            const over = {
              name: rest.name ?? "",
              name_en: rest.name_en ?? "",
              imageUrl: rest.imageUrl ?? "",
              link: rest.link ?? "",
              productCode: rest.productCode ?? "",
              price: rest.price ?? 0,
              rating: rest.rating ?? 0,
              reviewCount: rest.reviewCount ?? 0,
              views: rest.views ?? 0,
              restockable: rest.restockable ?? false,
              status: rest.status ?? "",
              stock: rest.stock ?? 0,
              updatedAt: serverTimestamp(),
            };
            if (replaceCategories) {
              over.categoryL1 = rest.categoryL1 ?? "";
              over.categoryL2 = rest.categoryL2 ?? "";
              over.categoryL1_en = rest.categoryL1_en ?? "";
              over.categoryL2_en = rest.categoryL2_en ?? "";
            }
            if (replaceTags) {
              over.tags = rest.tags ?? [];
            }
            batch.set(doc(db, "products", id), over, { merge: false });
          }
        });
        await batch.commit();
        setProgress((s) => ({ ...s, done: Math.min(s.done + chunk.length, total) }));
        await sleep(10);
      }
      onAfterImport?.();
      onClose?.();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setProgress({ done: 0, total: 0, running: false });
    }
  };

  return (
    <Dialog open={open} onClose={progress.running ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>CSV Upsert (Create/Update)</DialogTitle>

      <DialogContent dividers sx={{ pb: 0 }}>
        <Stack spacing={2}>
          {/* File chooser */}
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
              onClick={() => { if (fileRef.current) fileRef.current.value = ""; fileRef.current?.click(); }}
            >
              Choose File
            </Button>
            <Button variant="outlined" onClick={downloadTemplate}>
              Download Template
            </Button>
            <Typography variant="body2" color="text.secondary">
              {fileName ? `Selected: ${fileName}` : "CSV/TSV supported (UTF-8, BOM recommended)"}
            </Typography>
          </Stack>

          {/* Options + Run */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              label={`Overwrite document: ${overwriteMode ? "ON" : "OFF"}`}
              onClick={() => setOverwriteMode((v) => !v)}
              variant={overwriteMode ? "filled" : "outlined"}
            />
            <Chip
              label={`Replace tags: ${replaceTags ? "ON" : "OFF"}`}
              onClick={() => setReplaceTags((v) => !v)}
              icon={<TagIcon />}
              variant={replaceTags ? "filled" : "outlined"}
            />
            <Chip
              label={`Replace categories: ${replaceCategories ? "ON" : "OFF"}`}
              onClick={() => setReplaceCategories((v) => !v)}
              icon={<CategoryIcon />}
              variant={replaceCategories ? "filled" : "outlined"}
            />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!parsedProducts.length || progress.running}
            >
              {progress.running ? `Processing… (${progress.done}/${progress.total})` : `Run Upsert (${parsedProducts.length})`}
            </Button>
          </Stack>

          {/* Paste area → parse */}
          <TextField
            minRows={6}
            maxRows={12}
            multiline
            placeholder={`Paste CSV/TSV here
Example:
id,name,name_en,price,tags,categoryL1,categoryL2,categoryL1_en,categoryL2_en
1038756,전통 디자인 봉투 2매입,Traditional Pattern Envelope (2pcs),1000,"traditional | envelope | pink",시즌/시리즈,전통 시리즈,Season/Series,Traditional Series`}
            value={raw}
            onChange={(e) => { const v = e.target.value; setRaw(v); if (v) loadText(v); }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      {/* Preview */}
      <DialogContent dividers sx={{ pt: 2, maxHeight: 420 }}>
        <Typography variant="subtitle1">Preview ({parsedProducts.length} rows)</Typography>
        <Box sx={{ overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {[
                  "id","name","name_en","productCode","price","rating","reviewCount","views",
                  "tags","link","imageUrl","restockable","status","stock",
                  "categoryL1","categoryL2","categoryL1_en","categoryL2_en"
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedProducts.slice(0, 1000).map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{p.id}</td>
                  <td style={{ padding: 8 }}>{p.name || ""}</td>
                  <td style={{ padding: 8 }}>{p.name_en || ""}</td>
                  <td style={{ padding: 8 }}>{p.productCode || ""}</td>
                  <td style={{ padding: 8 }}>{p.price ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.rating ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.reviewCount ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.views ?? ""}</td>
                  <td style={{ padding: 8 }}>{Array.isArray(p.tags) ? p.tags.join(" | ") : ""}</td>
                  <td style={{ padding: 8, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.link || ""}</td>
                  <td style={{ padding: 8, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.imageUrl || ""}</td>
                  <td style={{ padding: 8 }}>{String(p.restockable ?? "")}</td>
                  <td style={{ padding: 8 }}>{p.status ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.stock ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL1 ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL2 ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL1_en ?? ""}</td>
                  <td style={{ padding: 8 }}>{p.categoryL2_en ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedProducts.length > 1000 && (
            <Typography variant="caption" sx={{ p: 1, display: "block", color: "text.secondary" }}>
              Preview shows top 1000 rows only. Total processed: {parsedProducts.length}.
            </Typography>
          )}
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
        <Typography sx={{ mr: "auto" }} color="text.secondary" variant="body2">
          {parsedProducts.length ? `Items to process: ${parsedProducts.length}` : "Select a CSV/TSV file or paste content."}
        </Typography>
        <Button onClick={onClose} disabled={progress.running}>Close</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!parsedProducts.length || progress.running}
        >
          {progress.running ? `Processing… (${progress.done}/${progress.total})` : `Run Upsert (${parsedProducts.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

/* ======================= Main Page ======================= */
export default function EditTagsAndCategoriesPage() {
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

  // Only items without image
  const [noImageOnly, setNoImageOnly] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // Confirm (bulk delete / single delete)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTargetIds, setConfirmTargetIds] = useState([]); // []=bulk, [id]=single

  // per-item menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuTargetId, setMenuTargetId] = useState(null);

  const openMenu = useCallback((e, id) => {
    setMenuAnchor(e.currentTarget);
    setMenuTargetId(id);
  }, []);
  const closeMenu = useCallback(() => {
    setMenuAnchor(null);
    setMenuTargetId(null);
  }, []);

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
        setHasMore(snap.docs.length >= PAGE_SIZE);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      } catch (e) {
        setSnack({ open: true, msg: `Failed to load: ${e.message}`, severity: "error" });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => { loadPage(true); }, [loadPage]);

  const reloadAll = useCallback(() => {
    lastDocRef.current = null;
    setHasMore(true);
    loadPage(true);
  }, [loadPage]);

  // Search debounce + Defer + Transition
  const [, startTransition] = useTransition();
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => setDebounced(qText.trim().toLowerCase()));
    }, 250);
    return () => clearTimeout(t);
  }, [qText, startTransition]);

  const deferredQ = useDeferredValue(debounced);
  const deferredNoImg = useDeferredValue(noImageOnly);

  const filtered = useMemo(() => {
    const base = items;
    const searched = deferredQ
      ? base.filter((p) => {
          const hay = [p.name, p.productCode, ...(p.tags || []), p.categoryL1 || "", p.categoryL2 || ""]
            .filter(Boolean).join(" ").toLowerCase();
          return hay.includes(deferredQ);
        })
      : base;
    return searched.filter((p) => !deferredNoImg || !p.imageUrl);
  }, [items, deferredQ, deferredNoImg]);

  // Selection
  const toggleCheck = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const selectAllOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }, [filtered]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Bulk: add tags
  const handleBulkAdd = useCallback(async () => {
    const tokens = tokenizeTags(bulkInput);
    if (!tokens.length) return setSnack({ open: true, msg: "Enter tags to add.", severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: "No items selected.", severity: "warning" });

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) => batch.update(doc(db, "products", id), { tags: arrayUnion(...tokens), updatedAt: serverTimestamp() }));
      await batch.commit();
      setItems((prev) =>
        prev.map((p) => {
          if (!selected.has(p.id)) return p;
          const merged = Array.from(new Set([...(p.tags || []), ...tokens]));
          if (String(merged) === String(p.tags || [])) return p;
          return { ...p, tags: merged };
        })
      );
      setBulkInput("");
      setSnack({ open: true, msg: `Tags added (${selected.size})`, severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: `Bulk add failed: ${e.message}`, severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  }, [bulkInput, selected]);

  // Bulk: remove tags
  const handleBulkRemove = useCallback(async () => {
    const tokens = tokenizeTags(bulkInput);
    if (!tokens.length) return setSnack({ open: true, msg: "Enter tags to remove.", severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: "No items selected.", severity: "warning" });

    if (!window.confirm(`Remove [${tokens.join(", ")}] from ${selected.size} selected items?`)) return;

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) =>
        batch.update(doc(db, "products", id), { tags: arrayRemove(...tokens), updatedAt: serverTimestamp() })
      );
      await batch.commit();
      setItems((prev) =>
        prev.map((p) => (selected.has(p.id) ? { ...p, tags: (p.tags || []).filter((t) => !tokens.includes(t)) } : p))
      );
      setBulkInput("");
      setSnack({ open: true, msg: `Tags removed (${selected.size})`, severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: `Bulk remove failed: ${e.message}`, severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  }, [bulkInput, selected]);

  // Bulk: set category
  const handleBulkSetCategory = useCallback(async () => {
    if (!l1 || !l2) return setSnack({ open: true, msg: "Select Category L1/L2.", severity: "warning" });
    if (selected.size === 0) return setSnack({ open: true, msg: "No items selected.", severity: "warning" });

    if (!window.confirm(`Set category to\n${l1} > ${l2}\nfor ${selected.size} selected items?`)) return;

    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((id) =>
        batch.update(doc(db, "products", id), { categoryL1: l1, categoryL2: l2, updatedAt: serverTimestamp() })
      );
      await batch.commit();
      setItems((prev) =>
        prev.map((p) => (selected.has(p.id) ? { ...p, categoryL1: l1, categoryL2: l2 } : p))
      );
      setSnack({ open: true, msg: `Category set (${selected.size})`, severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: `Set category failed: ${e.message}`, severity: "error" });
    } finally {
      setBulkWorking(false);
    }
  }, [l1, l2, selected]);

  // CSV export
  const downloadCsv = useCallback((onlySelected = false) => {
    const list = onlySelected ? filtered.filter((p) => selected.has(p.id)) : filtered;
    if (list.length === 0) return setSnack({ open: true, msg: "No items to export.", severity: "warning" });
    const csv = buildCsv(list);
    const today = new Date().toISOString().slice(0, 10);
    downloadText(csv, `Products_${onlySelected ? "Selected" : "Filtered"}_${today}.csv`);
  }, [filtered, selected]);

  // Delete (single/bulk)
  const requestDelete = useCallback((ids) => {
    setConfirmTargetIds(ids);
    setConfirmOpen(true);
    closeMenu();
  }, [closeMenu]);

  const doDelete = useCallback(async () => {
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
      setSnack({ open: true, msg: `Deleted (${confirmTargetIds.length})`, severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: `Delete failed: ${e.message}`, severity: "error" });
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmTargetIds([]);
    }
  }, [confirmTargetIds]);

  const l2Options = useMemo(() => (l1 ? CATEGORY_MAP[l1] || [] : []), [l1]);

  return (
    <>
      {/* App Bar */}
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Product Tags & Categories
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search: name / code / tag / category"
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
          <Tooltip title="Refresh all">
            <span>
              <IconButton onClick={reloadAll} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setCsvOpen(true)}>
            CSV Upsert
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(false)}>
            CSV (Filtered)
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(true)} disabled={selected.size === 0}>
            CSV (Selected)
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Bulk toolbar */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Enter tags: traditional, pink #envelope"
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><TagIcon fontSize="small" /></InputAdornment> }}
                />
              </Grid>
              <Grid item>
                <Button variant="contained" onClick={handleBulkAdd} disabled={bulkWorking || selected.size === 0} startIcon={<AddIcon />}>
                  Add Tags ({selected.size})
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={handleBulkRemove} disabled={bulkWorking || selected.size === 0}>
                  Remove Tags ({selected.size})
                </Button>
              </Grid>
              <Grid item>
                <Divider orientation="vertical" flexItem />
              </Grid>
              <Grid item xs={12} md={3}>
                <Select size="small" value={l1} onChange={(e) => { setL1(e.target.value); setL2(""); }} displayEmpty fullWidth>
                  <MenuItem value="">
                    <em>Category L1</em>
                  </MenuItem>
                  {Object.keys(CATEGORY_MAP).map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Select size="small" value={l2} onChange={(e) => setL2(e.target.value)} displayEmpty fullWidth disabled={!l1}>
                  <MenuItem value="">
                    <em>{l1 ? "Category L2" : "Select L1 first"}</em>
                  </MenuItem>
                  {l2Options.map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={handleBulkSetCategory} disabled={bulkWorking || selected.size === 0 || !l1 || !l2} startIcon={<CategoryIcon />}>
                  Set Category ({selected.size})
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={selectAllOnPage}>
                  Select All
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </Grid>
              <Grid item sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={selected.size === 0}
                  onClick={() => requestDelete([...selected])}
                  title="Delete selected items"
                >
                  Delete Selected
                </Button>
                <FormControlLabel
                  control={<Checkbox checked={noImageOnly} onChange={(e) => setNoImageOnly(e.target.checked)} size="small" />}
                  label="Only items without image"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* List (일반 렌더링) */}
        {loading && items.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading…
            </Typography>
          </Stack>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary">No results.</Typography>
        ) : (
          <Stack spacing={1}>
            {filtered.map((p) => {
              const isChecked = selected.has(p.id);
              return (
                <Box key={p.id} sx={{ px: 0.5 }}>
                  <ProductRow
                    p={p}
                    isChecked={isChecked}
                    onToggle={() => toggleCheck(p.id)}
                    onOpenMenu={(e) => openMenu(e, p.id)}
                  />
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Pagination */}
        <Stack alignItems="center" sx={{ mt: 2 }}>
          {hasMore ? (
            <Button variant="contained" onClick={() => loadPage(false)} disabled={loading} sx={{ minWidth: 200 }}>
              {loading ? "Loading…" : "Load More"}
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              All items have been loaded.
            </Typography>
          )}
        </Stack>
      </Container>

      {/* CSV modal */}
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onAfterImport={() => reloadAll()} />

      {/* Per-item menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { requestDelete([menuTargetId]); }}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Delete"
        message={
          confirmTargetIds.length > 1
            ? `Delete ${confirmTargetIds.length} selected item(s)?\nThis action cannot be undone.`
            : "Delete this item? This action cannot be undone."
        }
        confirmText="Delete"
        onCancel={() => !confirmLoading && setConfirmOpen(false)}
        onConfirm={doDelete}
        loading={confirmLoading}
      />

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

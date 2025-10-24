// src/pages/SavedPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, documentId, getDocs, query, where, addDoc, serverTimestamp
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import useSavedProducts from "../hooks/useSavedProducts";

/* ================= Currency (fixed 1 MYR = 340.67 KRW) ================= */
import { KRW_PER_MYR, formatKRW, formatMYR, toMYR } from "../utils/currency";

/* ================= MUI ================= */
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import ListAltIcon from "@mui/icons-material/ListAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import ClearAllIcon from "@mui/icons-material/ClearAll";

/* ===== helpers ===== */
function tsToMs(ts){ if(!ts) return 0; if(typeof ts?.toMillis==="function") return ts.toMillis(); const v=Number(ts); return Number.isFinite(v)?v:0; }
function chunk10(a){ const out=[]; for(let i=0;i<a.length;i+=10) out.push(a.slice(i,i+10)); return out; }
const isPositive = (n)=> Number(n||0) > 0;

/* "Restock Soon" detection (keeps Korean keyword checks for data compatibility) */
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

export default function SavedPage(){
  const { user, savedIds, loadingUser, loadingSaved } = useSavedProducts();
  const navigate = useNavigate();

  const [items,setItems] = useState([]);
  const [qty,setQty] = useState({});
  const [loading,setLoading] = useState(true);
  const [errorMsg,setErrorMsg] = useState("");

  // Order meta
  const [orderName,setOrderName] = useState("");
  const [orderDate,setOrderDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [discountAmount,setDiscountAmount] = useState(0);

  // Search/sort/display options
  const [qText, setQText] = useState("");
  const [sortKey, setSortKey] = useState("updated_desc"); // updated_desc | price_desc | price_asc | name_asc
  const [showZero, setShowZero] = useState(false);
  const [hideRestock, setHideRestock] = useState(false);

  // UI
  const [snack, setSnack] = useState({ open:false, msg:"", severity:"success" });

  const savedIdList = useMemo(()=> Array.from(savedIds || new Set()), [savedIds]);

  const runIdRef = useRef(0);
  const fetchProducts = async () => {
    setErrorMsg("");
    if(!user){ setItems([]); setLoading(false); return; }
    setLoading(true);
    try{
      if(!savedIdList.length){ setItems([]); return; }
      const snaps = await Promise.all(
        chunk10(savedIdList).map(ids=> getDocs(query(collection(db,"products"), where(documentId(),"in",ids))))
      );
      const results=[];
      snaps.forEach(s=> s.forEach(d=> results.push({id:d.id, ...d.data()})));
      results.sort((a,b)=>
        (tsToMs(b.updatedAt)||tsToMs(b.createdAt)||0) - (tsToMs(a.updatedAt)||tsToMs(a.createdAt)||0) ||
        String(b.id).localeCompare(String(a.id))
      );
      setItems(results);
      setQty(prev=>{
        const next={...prev};
        results.forEach(p=>{
          const restock = isRestockPending(p);
          if (restock) next[p.id] = 0;
          else if (next[p.id]==null) next[p.id] = (typeof p.price==="number"&&p.price>0)?1:0;
        });
        return next;
      });
    }catch(e){
      console.error(e);
      setErrorMsg(e?.message||"Failed to load list");
      setItems([]);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    const myRun=++runIdRef.current;
    (async()=>{
      if(!user){ setItems([]); setLoading(false); return; }
      await fetchProducts();
    })();
    return ()=>{ /* noop */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user, savedIdList.join("|")]);

  const baseRows = useMemo(()=> items.map(p=>{
    const price = typeof p.price==="number"? p.price:0; // KRW
    const restock = isRestockPending(p);
    const baseQty = qty[p.id] ?? 0;
    const q = restock ? 0 : Math.max(0, Number(baseQty) || 0);
    return { ...p, _price:price, _qty:q, _subtotal: price*q, _restockPending: restock };
  }),[items,qty]);

  // 🔍 Filter & sort
  const rows = useMemo(()=>{
    const k = qText.trim().toLowerCase();
    let r = baseRows.filter(r=>{
      if (!k) return true;
      const hay = [
        r.name || "",
        r.productCode || "",
        r.categoryL1 || "",
        r.categoryL2 || "",
      ].join(" ").toLowerCase();
      return hay.includes(k);
    });
    if (hideRestock) r = r.filter(x => !x._restockPending);

    const arr = [...r];
    switch (sortKey) {
      case "price_desc":
        arr.sort((a,b)=> (b._price||0) - (a._price||0)); break;
      case "price_asc":
        arr.sort((a,b)=> (a._price||0) - (b._price||0)); break;
      case "name_asc":
        arr.sort((a,b)=> String(a.name||"").localeCompare(String(b.name||""))); break;
      default: // updated_desc
        arr.sort((a,b)=>
          (tsToMs(b.updatedAt)||tsToMs(b.createdAt)||0) - (tsToMs(a.updatedAt)||tsToMs(a.createdAt)||0)
        );
    }
    return arr;
  },[baseRows, qText, sortKey, hideRestock]);

  const totalQty = useMemo(()=> rows.reduce((s,r)=>s+r._qty,0),[rows]);
  const totalPrice = useMemo(()=> rows.reduce((s,r)=>s+r._subtotal,0),[rows]); // KRW
  const discount = Math.max(0, Number(discountAmount)||0); // KRW
  const finalTotal = Math.max(0, totalPrice - discount); // KRW

  // Derived MYR amounts
  const totalPriceMYR = useMemo(()=> toMYR(totalPrice), [totalPrice]);
  const discountMYR = useMemo(()=> toMYR(discount), [discount]);
  const finalTotalMYR = useMemo(()=> toMYR(finalTotal), [finalTotal]);

  const setQtySafe=(id,v)=>{
    const p = items.find(x=>x.id===id);
    if (p && isRestockPending(p)) {
      setQty(prev=>({ ...prev, [id]: 0 }));
      return;
    }
    let n=Number(String(v).replace(/[^\d]/g,""));
    if(!Number.isFinite(n)||n<0) n=0;
    if(n>9999) n=9999;
    setQty(prev=>({...prev,[id]:n}));
  };

  // 📦 Bulk quantity adjust
  const setAllQty = (valueSetter) => {
    setQty(prev=>{
      const next={...prev};
      rows.forEach(r=>{
        if (r._restockPending) { next[r.id] = 0; return; }
        const base = prev[r.id] ?? 0;
        let v = valueSetter(base, r);
        if(!Number.isFinite(v)||v<0) v=0;
        if(v>9999) v=9999;
        next[r.id]=v;
      });
      return next;
    });
  };
  const handleAllZero = () => setAllQty(()=>0);
  const handleAllOne = () => setAllQty((_,r)=> (r._price>0?1:0));
  const handleAllPlusOne = () => setAllQty((b)=> b+1);

  // 📤 CSV (current visible rows with qty>0)
  const downloadCsv = () => {
    const exporting = rows.filter(r=> r._qty>0);
    if (exporting.length===0) {
      setSnack({ open:true, msg:"Nothing to export (qty > 0).", severity:"warning" });
      return;
    }
    const header = ["productId","name","productCode","categoryL1","categoryL2","price","qty","subtotal"].join(",");
    const lines = exporting.map(r=>[
      r.id,
      csvEscape(r.name||""),
      csvEscape(r.productCode||""),
      csvEscape(r.categoryL1||""),
      csvEscape(r.categoryL2||""),
      r._price,
      r._qty,
      r._subtotal
    ].join(","));
    const content = "\uFEFF" + [header, ...lines].join("\r\n");
    const blob = new Blob([content], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0,10);
    a.download = `saved_checkout_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const csvEscape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleCreateOrder = async ()=>{
    if(!user){ setSnack({open:true,msg:"Log in is required.",severity:"info"}); return; }
    const itemsForOrder = rows.filter(r=> r._qty>0);
    if(itemsForOrder.length===0){ setSnack({open:true,msg:"No items with quantity ≥ 1.",severity:"warning"}); return; }
    const d=new Date(orderDate); if(Number.isNaN(d.getTime())){ setSnack({open:true,msg:"Invalid order date.",severity:"warning"}); return; }

    const payload = {
      userId: user.uid,
      orderName: orderName?.trim() || "",
      orderDate: d.toISOString().slice(0,10),
      createdAt: serverTimestamp(),
      totalQty,
      totalPrice,         // KRW
      discountAmount: discount, // KRW
      finalTotal,         // KRW
      items: itemsForOrder.map(r=>({
        productId:r.id, name:r.name||"",
        price:r._price, qty:r._qty, subtotal:r._subtotal,
        imageUrl:r.imageUrl||"", productCode:r.productCode||"",
        categoryL1:r.categoryL1||"", categoryL2:r.categoryL2||"",
        link:r.link||""
      })),
    };

    try{
      const ref = await addDoc(collection(db,"users",user.uid,"orders"), payload);
      navigate(`/orders/${ref.id}`, { replace: true, state: { created: true } });
    }catch(e){
      console.error(e);
      setSnack({ open:true, msg: e?.message || "Failed to create order", severity:"error" });
    }
  };

  /* ======= Guards ======= */
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="info">Log in is required.</Alert>
      </Container>
    );
  }
  if (loadingUser || loadingSaved || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Container>
    );
  }

  return (
    <>
      {/* Top AppBar */}
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Saved · Make Order</Typography>

          {/* 🔍 Search */}
          <TextField
            value={qText}
            onChange={(e)=>setQText(e.target.value)}
            placeholder="Search: name/code/category"
            size="small"
            sx={{ ml: 2, minWidth: 260, maxWidth: 420 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* ↕ Sort */}
          <TextField
            select
            size="small"
            value={sortKey}
            onChange={(e)=>setSortKey(e.target.value)}
            sx={{ ml: 1, width: 180 }}
          >
            <MenuItem value="updated_desc">Recently updated</MenuItem>
            <MenuItem value="price_desc">Price: high → low</MenuItem>
            <MenuItem value="price_asc">Price: low → high</MenuItem>
            <MenuItem value="name_asc">Name A → Z</MenuItem>
          </TextField>

          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            {/* 👉 Order List 이동 */}
            <Button
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => navigate("/orders")}
            >
              Order List
            </Button>

            <Tooltip title="Export CSV (qty > 0)">
              <span>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={rows.every(r=>r._qty===0)}>
                  CSV
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Refresh saved items">
              <span>
                <IconButton onClick={fetchProducts} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<ShoppingCartCheckoutIcon />}
              onClick={handleCreateOrder}
              disabled={totalQty === 0}
            >
              Create Order
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Top form */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  label="Order name"
                  value={orderName}
                  onChange={(e)=>setOrderName(e.target.value)}
                  fullWidth size="small"
                  placeholder="e.g., October MD PO"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Order date"
                  type="date"
                  value={orderDate}
                  onChange={(e)=>setOrderDate(e.target.value)}
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Discount amount"
                  value={discountAmount}
                  onChange={(e)=> setDiscountAmount(String(e.target.value).replace(/[^\d]/g,""))}
                  fullWidth size="small" inputMode="numeric"
                  InputProps={{ endAdornment: <InputAdornment position="end">KRW</InputAdornment> }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Summary bar + options */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={<Checkbox checked={showZero} onChange={(e)=>setShowZero(e.target.checked)} size="small" />}
                label="Show quantity 0"
              />
              <FormControlLabel
                control={<Checkbox checked={hideRestock} onChange={(e)=>setHideRestock(e.target.checked)} size="small" />}
                label="Hide Restock Soon"
              />
              <Tooltip title="Set all visible rows to 0">
                <span>
                  <Button size="small" variant="outlined" startIcon={<ClearAllIcon />} onClick={handleAllZero}>
                    All 0
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Set all priced items to 1">
                <span>
                  <Button size="small" variant="outlined" onClick={handleAllOne}>
                    All 1
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Increase all visible rows by +1">
                <span>
                  <Button size="small" variant="outlined" onClick={handleAllPlusOne}>
                    All +1
                  </Button>
                </span>
              </Tooltip>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`Saved items ${items.length}`} variant="outlined" />
              <Divider orientation="vertical" flexItem />
              <Chip label={`Total Qty ${totalQty}`} variant="outlined" />
              <Divider orientation="vertical" flexItem />
              <Chip label={`Items total ${formatKRW(totalPrice)} KRW · ${formatMYR(totalPriceMYR)}`} />
              <Chip variant="outlined" label={`Discount -${formatKRW(discount)} KRW · -${formatMYR(discountMYR)}`} />
              <Chip color="primary" label={`Grand total ${formatKRW(finalTotal)} KRW · ${formatMYR(finalTotalMYR)}`} />
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Fixed rate: 1 MYR = {KRW_PER_MYR.toLocaleString("ko-KR")} KRW
          </Typography>
        </Paper>

        {/* Table */}
        {rows.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
            <Typography color="text.secondary">
              No saved products{qText ? " (no match for the search criteria)" : ""}.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>Product</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="center">Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows
                  .filter(r => isPositive(r._qty) || items.length <= 50 || r._restockPending)
                  .filter(r => showZero || r._qty > 0 || r._restockPending)
                  .map(r => {
                    const priceMYR = toMYR(r._price);
                    const subtotalMYR = toMYR(r._subtotal);
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ minWidth: 320 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Paper
                              variant="outlined"
                              sx={{
                                position: "relative",
                                width: 60, height: 60,
                                bgcolor: "grey.100", borderRadius: 1,
                                overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"
                              }}
                            >
                              {r.imageUrl ? (
                                <img
                                  src={r.imageUrl} alt={r.name}
                                  style={{
                                    width:"100%", height:"100%", objectFit:"cover",
                                    filter: r._restockPending ? "grayscale(80%)" : "none"
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.secondary">No Image</Typography>
                              )}
                              {r._restockPending && (
                                <Stack
                                  title="Restock-soon items are excluded from orders."
                                  sx={{
                                    position:"absolute", inset:0, bgcolor:"rgba(55,65,81,0.45)",
                                    color:"#fff", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12
                                  }}
                                  direction="row"
                                >
                                  Restock Soon
                                </Stack>
                              )}
                            </Paper>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700} color={r._restockPending ? "text.secondary" : "text.primary"} noWrap title={r.name}>
                                {r.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {r.categoryL1 || "-"} {r.categoryL2 ? `> ${r.categoryL2}` : ""}
                              </Typography>
                              {r._restockPending && (
                                <Typography variant="caption" color="text.secondary">
                                  Quantity input is disabled for restock-soon items.
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {r.productCode || r.id}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Stack spacing={0} alignItems="flex-end">
                            <Typography fontWeight={700}>{formatKRW(r._price)} KRW</Typography>
                            <Typography variant="caption" color="text.secondary">{formatMYR(priceMYR)}</Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center" sx={{ minWidth: 160 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ opacity: r._restockPending ? 0.5 : 1 }}>
                            <IconButton size="small" disabled={r._restockPending} onClick={()=> setQtySafe(r.id, (qty[r.id]||0) - 1)}>
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              value={qty[r.id] ?? 0}
                              onChange={(e)=> setQtySafe(r.id, e.target.value)}
                              size="small"
                              inputMode="numeric"
                              sx={{ width: 80 }}
                              disabled={r._restockPending}
                            />
                            <IconButton size="small" disabled={r._restockPending} onClick={()=> setQtySafe(r.id, (qty[r.id]||0) + 1)}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={()=> setQtySafe(r.id, 0)}
                              disabled={r._restockPending}
                              sx={{ ml: 0.5 }}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          <Stack spacing={0} alignItems="flex-end">
                            <Typography fontWeight={700}>{formatKRW(r._subtotal)} KRW</Typography>
                            <Typography variant="caption" color="text.secondary">{formatMYR(subtotalMYR)}</Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          {r.link ? (
                            <Tooltip title="Open source">
                              <IconButton
                                size="small"
                                component="a"
                                href={r.link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Container>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=> setSnack(s=>({ ...s, open:false }))}>
        <Alert severity={snack.severity} onClose={()=> setSnack(s=>({ ...s, open:false }))} sx={{ width:"100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

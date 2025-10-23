// src/pages/OrderDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { db } from "../firebase";
import useSavedProducts from "../hooks/useSavedProducts";

/* ================= MUI ================= */
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Container,
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
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Box,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

// ✅ 통화 유틸 (고정 환율)
import { formatKRW, formatMYR, toMYR, KRW_PER_MYR } from "../utils/currency";

export default function OrderDetailPage() {
  const { user, loadingUser } = useSavedProducts();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // detect /orders/new
  const isNew = !orderId && location.pathname.endsWith("/orders/new");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);

  // edit states
  const [orderName, setOrderName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState([]); // [{productId, name, price, qty, subtotal, ...}]

  // UI state
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stayAfterSave, setStayAfterSave] = useState(true); // stay on page after saving

  // 1) Entering /orders/new: create draft → navigate to detail
  useEffect(() => {
    if (!user || !isNew) return;

    (async () => {
      try {
        const payload = {
          orderName: "New Order",
          orderDate: new Date().toISOString().slice(0, 10),
          discountAmount: 0,
          totalQty: 0,
          totalPrice: 0,
          finalTotal: 0,
          items: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, "users", user.uid, "orders"), payload);
        navigate(`/orders/${ref.id}`, { replace: true, state: { created: true } });
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to create order");
      }
    })();
  }, [user, isNew, navigate]);

  // Show notice when just created and entered
  useEffect(() => {
    if (location.state?.created) {
      setSnack({ open: true, msg: "Order created.", severity: "success" });
      // remove state so it only shows once
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Load existing order detail
  useEffect(() => {
    if (!user || isNew) {
      // if isNew, the redirect above will handle it
      if (!user) setLoading(false);
      return;
    }

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const ref = doc(collection(db, "users", user.uid, "orders"), orderId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setErr("Order not found.");
          setOrder(null);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setOrder(data);
        setOrderName(data.orderName || "");
        setOrderDate(data.orderDate || new Date().toISOString().slice(0, 10));
        setDiscountAmount(Number(data.discountAmount || 0));
        setItems(
          (data.items || []).map((it) => ({
            ...it,
            price: Number(it.price || 0),
            qty: Number(it.qty || 0),
            subtotal:
              Number(it.subtotal || Number(it.price || 0) * Number(it.qty || 0)),
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, orderId, isNew]);

  const totals = useMemo(() => {
    const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const totalPrice = items.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.qty || 0),
      0
    );
    const discount = Math.max(0, Number(discountAmount) || 0);
    const finalTotal = Math.max(0, totalPrice - discount);
    return { totalQty, totalPrice, discount, finalTotal };
  }, [items, discountAmount]);

  const setQty = (idx, v) => {
    setItems((prev) => {
      const cp = [...prev];
      let n = Number(String(v).replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || n < 0) n = 0;
      if (n > 9999) n = 9999;
      const price = Number(cp[idx].price || 0);
      cp[idx] = { ...cp[idx], qty: n, subtotal: n * price };
      return cp;
    });
  };

  const handleRemoveRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!user || !order) return;
    if (items.length === 0) {
      setSnack({
        open: true,
        msg: "At least one item is required.",
        severity: "warning",
      });
      return;
    }
    if (!orderDate || Number.isNaN(new Date(orderDate).getTime())) {
      setSnack({
        open: true,
        msg: "Invalid order date.",
        severity: "warning",
      });
      return;
    }

    const payload = {
      orderName: orderName?.trim() || "",
      orderDate,
      discountAmount: totals.discount,
      totalQty: totals.totalQty,
      totalPrice: totals.totalPrice,
      finalTotal: totals.finalTotal,
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name || "",
        price: Number(it.price || 0),
        qty: Number(it.qty || 0),
        subtotal: Number(it.price || 0) * Number(it.qty || 0),
        imageUrl: it.imageUrl || "",
        productCode: it.productCode || "",
        categoryL1: it.categoryL1 || "",
        categoryL2: it.categoryL2 || "",
        link: it.link || "",
      })),
      updatedAt: serverTimestamp(),
    };

    try {
      setSaving(true);
      await updateDoc(doc(db, "users", user.uid, "orders", order.id), payload);
      setSnack({ open: true, msg: "Saved.", severity: "success" });
      if (!stayAfterSave) {
        navigate("/orders", { replace: true });
      }
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: e?.message || "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!user || !order) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "orders", order.id));
      setSnack({ open: true, msg: "Deleted.", severity: "success" });
      navigate("/orders", { replace: true });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: e?.message || "Delete failed", severity: "error" });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  /* ====== Guarded states ====== */
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Log in is required.</Alert>
      </Container>
    );
  }
  if (loadingUser || loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Container>
    );
  }
  if (err) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{err}</Alert>
      </Container>
    );
  }
  if (!order) return null;

  return (
    <>
      {/* Top AppBar */}
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Tooltip title="Back">
            <IconButton edge="start" onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>
            Edit Order
          </Typography>
          <Box sx={{ flex: 1 }} />
          <FormControlLabel
            control={
              <Switch
                checked={stayAfterSave}
                onChange={(e) => setStayAfterSave(e.target.checked)}
                size="small"
              />
            }
            label="Stay on this page after saving"
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={items.length === 0 || saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Top form */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  label="Order Name"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Order Date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Discount Amount"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(String(e.target.value).replace(/[^\d]/g, ""))
                  }
                  fullWidth
                  size="small"
                  inputMode="numeric"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">KRW</InputAdornment>,
                    sx: { textAlign: "right" },
                  }}
                  helperText={`Fixed rate: 1 MYR = ${KRW_PER_MYR.toLocaleString("ko-KR")} KRW`}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Totals bar */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="flex-end"
          >
            <Chip label={`Total Qty ${totals.totalQty}`} variant="outlined" />
            <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
            <Chip
              label={`Items Subtotal ${formatKRW(totals.totalPrice)} KRW · ${formatMYR(
                toMYR(totals.totalPrice)
              )}`}
            />
            <Chip
              color="default"
              variant="outlined"
              label={`Discount -${formatKRW(totals.discount)} KRW · -${formatMYR(
                toMYR(totals.discount)
              )}`}
            />
            <Chip
              color="primary"
              label={`Final Total ${formatKRW(totals.finalTotal)} KRW · ${formatMYR(
                toMYR(totals.finalTotal)
              )}`}
            />
          </Stack>
        </Paper>

        {/* Items table */}
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Product</TableCell>
                <TableCell>Code</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="center">Link/Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={it.productId || `${it.name}-${idx}`} hover>
                  <TableCell sx={{ minWidth: 280 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Paper
                        variant="outlined"
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          overflow: "hidden",
                          bgcolor: "grey.100",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {it.imageUrl ? (
                          <img
                            alt={it.name}
                            src={it.imageUrl}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No Image
                          </Typography>
                        )}
                      </Paper>
                      <Box>
                        <Typography fontWeight={700} noWrap title={it.name}>
                          {it.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {it.categoryL1 || "-"} {it.categoryL2 ? `> ${it.categoryL2}` : ""}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {it.productCode || it.productId}
                    </Typography>
                  </TableCell>

                  {/* Price: KRW + MYR */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography>{`${formatKRW(it.price)} KRW`}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatMYR(toMYR(it.price))}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="center" sx={{ minWidth: 100 }}>
                    <TextField
                      value={it.qty}
                      onChange={(e) => setQty(idx, e.target.value)}
                      size="small"
                      inputMode="numeric"
                      sx={{ width: 82 }}
                    />
                  </TableCell>

                  {/* Subtotal: KRW + MYR */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography fontWeight={700}>
                        {formatKRW(Number(it.price || 0) * Number(it.qty || 0))} KRW
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatMYR(toMYR(Number(it.price || 0) * Number(it.qty || 0)))}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                    {it.link ? (
                      <Tooltip title="Open link">
                        <IconButton
                          size="small"
                          component="a"
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                    <Tooltip title="Remove row">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoveRow(idx)}
                          sx={{ ml: 1 }}
                        >
                          Delete
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No items. (You cannot save without items)
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* 고정 환율 안내 */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Fixed rate used in this page: 1 MYR = {KRW_PER_MYR.toLocaleString("ko-KR")} KRW
          </Typography>
        </Box>
      </Container>

      {/* Delete confirm dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => (deleting ? null : setConfirmOpen(false))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete the order. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteOrder}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

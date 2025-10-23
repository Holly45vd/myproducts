// src/pages/OrdersPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import useSavedProducts from "../hooks/useSavedProducts";

/* =============== MUI =============== */
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Stack,
  Button,
  IconButton,
  Paper,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  Divider,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";

/* ✅ Currency utils (fixed rate 1 MYR = 340.67 KRW) */
import { formatKRW, formatMYR, toMYR, KRW_PER_MYR } from "../utils/currency";

export default function OrdersPage() {
  const { user, loadingUser } = useSavedProducts();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const fetchOrders = async () => {
    if (!user) return;
    setErr("");
    setLoading(true);
    try {
      const qRef = query(
        collection(db, "users", user.uid, "orders"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(rows);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAskDelete = (order) => {
    setConfirmTarget(order);
    setConfirmOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!user || !confirmTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "orders", confirmTarget.id));
      setOrders((prev) => prev.filter((o) => o.id !== confirmTarget.id));
      setSnack({ open: true, msg: "Deleted.", severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: e?.message || "Delete failed", severity: "error" });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const totalInfo = useMemo(() => {
    const count = orders.length;
    const sumKRW = orders.reduce((s, o) => s + Number(o.finalTotal ?? o.totalPrice ?? 0), 0);
    const sumMYR = toMYR(sumKRW);
    return { count, sumKRW, sumMYR };
  }, [orders]);

  /* ====== Guards ====== */
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="info">Log in is required.</Alert>
      </Container>
    );
  }
  if (loadingUser || loading) {
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
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Order List
          </Typography>
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchOrders} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/orders/new")}
            >
              Create Order
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Error alert */}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        {/* Summary bar */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Chip label={`Total ${totalInfo.count.toLocaleString()}`} />
            <Divider orientation="vertical" flexItem />
            <Chip
              color="primary"
              label={`Sum ${formatKRW(totalInfo.sumKRW)} KRW · ${formatMYR(totalInfo.sumMYR)}`}
            />
          </Stack>
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Fixed rate: 1 MYR = {KRW_PER_MYR.toLocaleString("ko-KR")} KRW
            </Typography>
          </Box>
        </Paper>

        {/* List */}
        {orders.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
            <Typography color="text.secondary">No orders.</Typography>
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/orders/new")}
            >
              Create Order
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={1.5}>
            {orders.map((o) => {
              const totalKRW = Number(o.finalTotal ?? o.totalPrice ?? 0);
              const totalMYR = toMYR(totalKRW);
              return (
                <Grid item xs={12} key={o.id}>
                  <Card variant="outlined">
                    <CardContent
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                      >
                        <Typography fontWeight={700} noWrap>
                          {o.orderName || `#${o.id.slice(0, 8)}`} · {o.orderDate || "-"}
                        </Typography>
                        <Stack spacing={0} alignItems="flex-end">
                          <Typography color="text.primary">
                            Qty <b>{o.totalQty || 0}</b> · Total <b>{formatKRW(totalKRW)}</b> KRW
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatMYR(totalMYR)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                        {(o.items || []).slice(0, 6).map((it, idx) => (
                          <Chip
                            key={it.productId || idx}
                            size="small"
                            variant="outlined"
                            label={`${it.name} × ${it.qty}`}
                            sx={{ maxWidth: 260 }}
                          />
                        ))}
                        {(o.items || []).length > 6 && (
                          <Chip size="small" label={`…and ${o.items.length - 6} more`} />
                        )}
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ justifyContent: "flex-end" }}>
                      <Tooltip title="Open details">
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          Open
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete order">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleAskDelete(o)}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
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
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
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
        autoHideDuration={2500}
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

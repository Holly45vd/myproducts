import React, { useMemo } from "react";
import {
  Drawer, Box, Stack, Typography, IconButton, Divider, Chip, Button, Tooltip, TextField
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { formatKRW, formatMYR, toMYR } from "../utils/currency";

export default function LikedOrderPanel({
  open, onClose,
  rows, totals, qty, setQtySafe,
  onCreateOrder, creating = false,
}) {
  const canCreate = totals.totalQty > 0;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 420, p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>Liked · Order</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack spacing={1} sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
          {rows.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
              No liked products.
            </Typography>
          ) : rows.map((r) => (
            <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 1, overflow: "hidden", bgcolor: "grey.100", flexShrink: 0, position: "relative" }}>
                {r.imageUrl ? <img src={r.imageUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap title={r.name} fontWeight={700}>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{r.productCode || r.id}</Typography>
              </Box>

              <Stack alignItems="flex-end" spacing={0} sx={{ minWidth: 120 }}>
                <Typography>{formatKRW(r._price)} KRW</Typography>
                <Typography variant="caption" color="text.secondary">{formatMYR(toMYR(r._price))}</Typography>
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 130 }}>
                <IconButton size="small" disabled={r._restockPending} onClick={() => setQtySafe(r.id, (qty[r.id] || 0) - 1)}><RemoveIcon fontSize="small" /></IconButton>
                <TextField size="small" value={qty[r.id] ?? 0} onChange={(e) => setQtySafe(r.id, e.target.value)} sx={{ width: 60 }} inputMode="numeric" disabled={r._restockPending} />
                <IconButton size="small" disabled={r._restockPending} onClick={() => setQtySafe(r.id, (qty[r.id] || 0) + 1)}><AddIcon fontSize="small" /></IconButton>
              </Stack>

              {r.link ? (
                <Tooltip title="Open">
                  <IconButton size="small" component="a" href={r.link} target="_blank" rel="noopener noreferrer">
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={`Qty ${totals.totalQty}`} variant="outlined" />
            <Chip color="primary" label={`Total ${formatKRW(totals.totalPrice)} · ${formatMYR(totals.totalMYR)}`} />
          </Stack>
          <Tooltip title={canCreate ? "Create order from liked items" : "Add quantities first"}>
            <span>
              <Button
                variant="contained"
                startIcon={<ShoppingCartCheckoutIcon />}
                onClick={onCreateOrder}
                disabled={!canCreate || creating}
              >
                {creating ? "Creating…" : "Create"}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}

// src/components/ResultSummary.jsx
import React from "react";
import { Stack, Typography, Chip } from "@mui/material";

export default function ResultSummary({
  t, items, filtered, onlySaved, user,
  fCatL1, fCatL2, fTag, qText, excludeRestock,
  facetCatsL1, facetMode, trL1, trL2
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t("common.total")} {items.length.toLocaleString()} / {t("common.shown")} {filtered.length.toLocaleString()}
      </Typography>
      {onlySaved && user && <Chip size="small" label={t("common.savedOnly")} variant="outlined" />}
      {fCatL1 && <Chip size="small" label={`${t("chips.l1")}=${trL1(fCatL1)}`} />}
      {fCatL2 && <Chip size="small" label={`${t("chips.l2")}=${trL2(fCatL2)}`} />}
      {fTag && <Chip size="small" label={`${t("chips.tag")}=${fTag}`} />}
      {qText && <Chip size="small" label={`${t("chips.search")}="${qText}"`} />}
      {excludeRestock && <Chip size="small" color="default" variant="outlined" label={t("chips.excludeRestock")} />}
      {fTag && facetCatsL1.size > 0 && (
        <Chip size="small" label={`${t("chips.facet")}(${facetMode}): ${Array.from(facetCatsL1).map(trL1).join(", ")}`} />
      )}
    </Stack>
  );
}

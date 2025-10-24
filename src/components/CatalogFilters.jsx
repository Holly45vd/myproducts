// src/components/CatalogFilters.jsx
import React, { useMemo } from "react";
import {
  Card, CardContent, Grid, TextField, MenuItem,
  InputAdornment, Button, Stack, Tooltip, Checkbox, FormControlLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CategoryIcon from "@mui/icons-material/Category";
import LayersIcon from "@mui/icons-material/Layers";
import { CATEGORY_MAP } from "../constants/categories"
import { useTranslation } from "react-i18next";

export default function CatalogFilters({
  qText, setQText,
  fCatL1, setFCatL1,
  fCatL2, setFCatL2,
  fTag, setFTag,
  excludeRestock, setExcludeRestock,
  onlySaved, setOnlySaved,
  trL1, trL2,
  resetFilters,
}) {
  const { t } = useTranslation();
  const l2Options = useMemo(() => (fCatL1 ? CATEGORY_MAP[fCatL1] || [] : []), [fCatL1]);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12}>
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
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label={t("common.l1")}
              value={fCatL1}
              onChange={(e) => { setFCatL1(e.target.value); setFCatL2(""); }}
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
                <MenuItem key={k} value={k}>{trL1(k)}</MenuItem>
              ))}
            </TextField>
          </Grid>

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
                <MenuItem key={s} value={s}>{trL2(s)}</MenuItem>
              ))}
            </TextField>
          </Grid>

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

          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <FormControlLabel
                control={<Checkbox checked={excludeRestock} onChange={(e) => setExcludeRestock(e.target.checked)} size="small" />}
                label={t("common.excludeRestock")}
              />
              <FormControlLabel
                control={<Checkbox checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} size="small" />}
                label={t("common.savedOnly")}
              />
              <Tooltip title={t("common.reset")}>
                <span>
                  <Button variant="outlined" size="small" startIcon={<RestartAltIcon />} onClick={resetFilters}>
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
  );
}

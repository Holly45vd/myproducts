import React from "react";
import { Stack, TextField, InputAdornment, IconButton, Button, MenuItem, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";

export default function SavedToolbar({
  qText, setQText,
  catFilter, setCatFilter, categories,
  sortKey, setSortKey,
  onRefresh, onCsvVisible, onCsvAll,
  disabled,
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 2, flexWrap: "wrap" }}>
      <TextField
        value={qText}
        onChange={(e) => setQText(e.target.value)}
        placeholder="Search within saved products"
        size="small"
        sx={{ flex: 1, minWidth: 240 }}
        InputProps={{
          startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
          endAdornment: qText ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setQText("")} aria-label="Clear search">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      <TextField select size="small" value={catFilter} onChange={(e)=>setCatFilter(e.target.value)} sx={{ width: 200 }} label="Category">
        <MenuItem value="">All categories</MenuItem>
        {categories.map((c)=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>

      <TextField select size="small" value={sortKey} onChange={(e)=>setSortKey(e.target.value)} sx={{ width: 180 }} label="Sort">
        <MenuItem value="updated_desc">Last updated</MenuItem>
        <MenuItem value="price_desc">Price: high to low</MenuItem>
        <MenuItem value="price_asc">Price: low to high</MenuItem>
        <MenuItem value="name_asc">Name: A → Z</MenuItem>
      </TextField>

      <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
        <Tooltip title="Export ONLY visible items"><span>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onCsvVisible} disabled={disabled}>CSV (Visible)</Button>
        </span></Tooltip>
        <Tooltip title="Export ALL filtered items"><span>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onCsvAll} disabled={disabled}>CSV (All)</Button>
        </span></Tooltip>
        <Tooltip title="Refresh"><span>
          <IconButton onClick={onRefresh} disabled={disabled}><RefreshIcon /></IconButton>
        </span></Tooltip>
      </Stack>
    </Stack>
  );
}

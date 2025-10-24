import React from "react";
import { Card, CardContent, Stack, Typography, Divider, Chip, ToggleButtonGroup, ToggleButton, Button } from "@mui/material";


export default function TagFacets({ visible, tagFacetsL1, facetMode, setFacetMode, facetCatsL1, setFacetCatsL1, trL1, t }) {
if (!visible || tagFacetsL1.size === 0) return null;
return (
<Card variant="outlined" sx={{ mb: 2 }}>
<CardContent>
<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
<Typography variant="subtitle2">{t("common.facetsTitle")}</Typography>
<div style={{ flex: 1 }} />
<ToggleButtonGroup size="small" value={facetMode} exclusive onChange={(_, v) => v && setFacetMode(v)}>
<ToggleButton value="include">{t("common.include")}</ToggleButton>
<ToggleButton value="exclude">{t("common.exclude")}</ToggleButton>
</ToggleButtonGroup>
<Button size="small" variant="outlined" onClick={() => setFacetCatsL1(new Set())} sx={{ ml: 1 }}>
{t("common.clearSelection")}
</Button>
</Stack>
<Divider sx={{ my: 1 }} />


<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
{Array.from(tagFacetsL1.entries()).sort((a,b)=>b[1]-a[1]).map(([l1, cnt]) => {
const active = facetCatsL1.has(l1);
return (
<Chip key={l1} label={`${trL1(l1)} · ${cnt.toLocaleString()}`} clickable
variant={active ? "filled" : "outlined"}
color={active ? (facetMode === "include" ? "info" : "error") : "default"}
onClick={() => setFacetCatsL1((prev) => { const next = new Set(prev); next.has(l1) ? next.delete(l1) : next.add(l1); return next; })}
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
);
}
// src/components/ProductRow.jsx
import React from "react";
import {
  Card, CardContent, CardMedia, Checkbox, Box, Stack, Chip, Typography, Button, IconButton
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { formatKRW, formatMYR, toMYR } from "../utils/currency";

function areEqual(prev, next){
  // 최소 필드만 비교해 재렌더 절감
  return (
    prev.isChecked === next.isChecked &&
    prev.p?.id === next.p?.id &&
    prev.p?.name === next.p?.name &&
    prev.p?.imageUrl === next.p?.imageUrl &&
    prev.p?.productCode === next.p?.productCode &&
    prev.p?.categoryL1 === next.p?.categoryL1 &&
    prev.p?.categoryL2 === next.p?.categoryL2 &&
    prev.p?.price === next.p?.price &&
    String(prev.p?.tags) === String(next.p?.tags)
  );
}

function ProductRow({ p, isChecked, onToggle, onOpenMenu }) {
  const uniqTags = Array.from(new Set(p.tags || []));
  return (
    <Card variant="outlined">
      <CardContent sx={{ display:"grid", gridTemplateColumns:"36px 88px 1fr 36px", gap:12, alignItems:"center" }}>
        <Checkbox checked={isChecked} onChange={onToggle} inputProps={{ "aria-label": `select-${p.name}` }} />
        {p.imageUrl ? (
          <CardMedia component="img" image={p.imageUrl} alt={p.name}
            sx={{ width:80, height:80, borderRadius:1, bgcolor:"grey.100", objectFit:"cover" }} />
        ) : (
          <Box sx={{ width:80, height:80, borderRadius:1, bgcolor:"grey.100" }} />
        )}
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={700}>{p.name}</Typography>
            <Typography variant="caption" color="text.secondary">({p.productCode || p.id})</Typography>
            {p.link && (
              <Button size="small" href={p.link} target="_blank" rel="noopener noreferrer">원본 링크</Button>
            )}
            {isChecked && <Chip label="선택됨" size="small" color="default" variant="outlined" sx={{ ml:"auto" }} />}
          </Stack>

          {/* Category + Price chips */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt:0.5, flexWrap:"wrap" }}>
            {p.categoryL1 || p.categoryL2 ? (
              <>
                <Chip size="small" label={`L1: ${p.categoryL1 || "-"}`} color="primary" variant="outlined" />
                <Chip size="small" label={`L2: ${p.categoryL2 || "-"}`} color="info" variant="outlined" />
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">카테고리 미지정</Typography>
            )}
            {typeof p.price === "number" && (
              <>
                <Chip size="small" label={formatKRW(p.price)} />
                <Chip size="small" label={formatMYR(toMYR(p.price))} variant="outlined" />
              </>
            )}
          </Stack>

          {/* Tags */}
          <Stack direction="row" spacing={0.5} sx={{ mt:0.5, flexWrap:"wrap" }}>
            {uniqTags.length>0
              ? uniqTags.map((t)=> <Chip key={t} label={`#${t}`} size="small" variant="outlined" />)
              : <Typography variant="caption" color="text.secondary">태그 없음</Typography>}
          </Stack>
        </Box>

        <Box sx={{ display:"flex", justifyContent:"center" }}>
          <IconButton aria-label="more" onClick={onOpenMenu}><MoreVertIcon/></IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

export default React.memo(ProductRow, areEqual);

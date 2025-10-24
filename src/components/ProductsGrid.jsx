// src/components/ProductsGrid.jsx
import React from "react";
import { Grid } from "@mui/material";
import ProductCard from "./ProductCard";

export default function ProductsGrid({
  filtered = [],
  user,
  savedSet,
  onToggleSave,
  t,
  loading = false,
}) {
  if (!filtered?.length && !loading) return null;

  return (
    <Grid
      container
      spacing={1.5}                     // ← 기존 2~3 이었다면 1~1.5로 줄이기
      justifyContent="flex-start"
      alignItems="stretch"
      sx={{
        rowGap: 1.5,                    // 세로 간격
        columnGap: 1.5,                 // 가로 간격
        marginTop: 1,
      }}
    >
      {filtered.map((p) => (
        <Grid
          key={p.id}
          item
          xs={6} sm={4} md={3} lg={2.4} // 화면 폭에 맞게 5열로 조정
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          <ProductCard
            product={p}
            user={user}
            isSaved={savedSet?.has(p.id)}
            onToggleSave={onToggleSave}
            t={t}
          />
        </Grid>
      ))}
    </Grid>
  );
}

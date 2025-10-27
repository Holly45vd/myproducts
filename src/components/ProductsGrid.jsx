// src/components/ProductsGrid.jsx
import React from "react";
import Grid from "@mui/material/Grid";
import ProductCard from "./ProductCard";

export default function ProductsGrid({ loading, filtered, user, savedSet, onToggleSave }) {
  if (loading) return null;
  return (
    <Grid container spacing={1}>
      {filtered.map(p => (
        <Grid key={p.id} item xs={6} sm={4} md={3} lg={2.4} xl={2}>
          <ProductCard
            product={p}
            user={user}
            isSaved={savedSet?.has?.(p.id)}
            onToggleSave={onToggleSave}
            dense
            maxTags={3}
            showCategories
            showTags
          />
        </Grid>
      ))}
    </Grid>
  );
}

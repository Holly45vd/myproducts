import React from "react";
import { Grid, Stack, Button, Paper } from "@mui/material";
import ProductCard from "./ProductCard";

export default function SavedGrid({ items, user, savedSet, onToggleSave, canLoadMore, onLoadMore }) {
  if (!items?.length) {
    return <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>No items</Paper>;
  }
  return (
    <>
      <Grid container spacing={1.5} alignItems="stretch">
        {items.map((p) => (
          <Grid key={p.id} item xs={6} sm={4} md={3} lg={2.4} sx={{ display: "flex", justifyContent: "center" }}>
            <ProductCard
              product={p}
              user={user}
              isSaved={savedSet.has(p.id)}
              onToggleSave={(e)=>onToggleSave(p.id, e)}
              dense
            />
          </Grid>
        ))}
      </Grid>
      {canLoadMore && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={onLoadMore} sx={{ minWidth: 220 }}>See More</Button>
        </Stack>
      )}
    </>
  );
}

// src/components/ProductCard.jsx
import React, { useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  Card, CardActionArea, CardContent, Chip, Stack, Typography, Box, Tooltip, IconButton,
} from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { formatKRW, formatMYR, toMYR } from "../utils/currency";

export default function ProductCard({
  product,
  user,
  isSaved = false,
  onToggleSave,
  onTagClick,
  restockPending,
  dense = true,
  maxTags = 3,
  showCategories = true,
  showTags = true,
}) {
  const {
    id,
    name,
    price,
    imageUrl,
    tags = [],
    link,
    categoryL1,
    categoryL2,
    productName_en,
    name_en,
  } = product || {};

  const { isKorean } = useLanguage();
  // productName_en 또는 name_en 중 있는 값을 사용, 없으면 한글 name
  const displayName = isKorean ? (name || "") : (productName_en || name_en || name || "");

  // "재입고 예정" 상태
  const _restockPending = useMemo(() => {
    if (typeof restockPending === "boolean") return restockPending;
    const hasRestockKeyword = (v) => {
      if (!v) return false;
      const s = Array.isArray(v) ? v.join(" ") : String(v);
      return /재입고\s*예정|재입고예정/i.test(s);
    };
    return hasRestockKeyword(tags);
  }, [restockPending, tags]);

  const tryToggle = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) {
      alert("Sign in required");
      return;
    }
    onToggleSave && onToggleSave(id);
  };

  const CARD_W = 250;
  const CARD_H = 400;
  const GAP_Y = 0.5;
  const TITLE_V = "body2";
  const PRICE_V = "body2";
  const CHIP_SIZE = "small";
  const CONTENT_P = 1;
  const SHOW_TAG_ICON = false;

  const limitedTags = showTags ? tags.slice(0, maxTags) : [];
  const restTagCount = Math.max(0, tags.length - limitedTags.length);

  return (
    <Card
      variant="outlined"
      sx={{
        width: CARD_W,
        height: CARD_H,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image + link */}
      <CardActionArea
        component="a"
        href={link || "#"}
        target={link ? "_blank" : undefined}
        rel={link ? "noopener noreferrer" : undefined}
        sx={{ position: "relative" }}
      >
        <Box sx={{ position: "relative", width: "100%", pt: "100%", bgcolor: "grey.50" }}>
          {imageUrl ? (
            <Box
              component="img"
              alt={displayName || "product image"}
              src={imageUrl}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: _restockPending ? "grayscale(80%)" : "none",
              }}
            />
          ) : (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
                color: "text.secondary",
                fontSize: 11,
              }}
            >
              No Image
            </Box>
          )}

          {_restockPending && (
            <Box
              aria-label="Restock soon"
              title="Restock soon"
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(55,65,81,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Typography variant="caption" sx={{ color: "#fff", fontWeight: 800, letterSpacing: 0.5 }}>
                Restock Soon
              </Typography>
            </Box>
          )}

          <Tooltip title={user ? (isSaved ? "Remove from saved" : "Save this item") : "Sign in required"}>
            <span>
              <IconButton
                onClick={tryToggle}
                size="small"
                disabled={!user}
                aria-label={isSaved ? "Remove from saved" : "Save this item"}
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  bgcolor: "rgba(255,255,255,0.85)",
                  border: "1px solid",
                  borderColor: "grey.300",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
                }}
              >
                {isSaved ? (
                  <FavoriteIcon sx={{ color: "grey.900" }} />
                ) : (
                  <FavoriteBorderIcon sx={{ color: "grey.700" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardActionArea>

      {/* Body */}
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: GAP_Y,
          p: CONTENT_P,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Title */}
        <Typography
          variant={TITLE_V}
          fontWeight={700}
          sx={{
            color: _restockPending ? "grey.700" : "text.primary",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.25,
            fontSize: 13,
          }}
          title={displayName}
        >
          {displayName}
        </Typography>

        {/* Categories */}
        {showCategories && (categoryL1 || categoryL2 || _restockPending) && (
          <Box sx={{ maxHeight: 26, overflow: "hidden" }}>
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              {categoryL1 && <Chip size={CHIP_SIZE} variant="outlined" color="primary" label={`L1: ${categoryL1}`} />}
              {categoryL2 && <Chip size={CHIP_SIZE} variant="outlined" color="info" label={`L2: ${categoryL2}`} />}
              {_restockPending && <Chip size={CHIP_SIZE} variant="outlined" label="Restock Soon" />}
            </Stack>
          </Box>
        )}

        {/* Price (KRW + MYR) */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant={PRICE_V} fontWeight={700} sx={{ fontSize: 13 }}>
            {formatKRW(price || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatMYR(toMYR(price || 0))}
          </Typography>
        </Stack>

        {/* Tags */}
        {showTags && limitedTags.length > 0 && (
          <Box sx={{ maxHeight: 24, overflow: "hidden" }}>
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              {limitedTags.map((t) => (
                <Chip
                  key={t}
                  size={CHIP_SIZE}
                  variant="outlined"
                  icon={SHOW_TAG_ICON ? <LocalOfferIcon /> : undefined}
                  label={`#${t}`}
                  clickable={!!onTagClick}
                  onClick={onTagClick ? () => onTagClick(t) : undefined}
                />
              ))}
              {restTagCount > 0 && (
                <Chip size={CHIP_SIZE} variant="outlined" label={`+${restTagCount}`} title={tags.slice(maxTags).join(", ")} />
              )}
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: "auto" }} />
      </CardContent>
    </Card>
  );
}

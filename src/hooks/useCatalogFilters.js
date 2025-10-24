// src/hooks/useCatalogFilters.js
import { useMemo, useState } from "react";
import { tokenizeTags, hasAllTags } from "../utils/tags";
import { isRestockPending } from "../utils/restock";
import { haystack } from "../utils/search";

/**
 * Catalog 필터/파셋 로직
 */
export default function useCatalogFilters(items, opts = {}) {
  const { user, savedSet } = opts;

  const [qText, setQText] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [fCatL1, setFCatL1] = useState("");
  const [fCatL2, setFCatL2] = useState("");
  const [fTag, setFTag] = useState("");
  const [excludeRestock, setExcludeRestock] = useState(false);
  const [facetCatsL1, setFacetCatsL1] = useState(new Set());
  const [facetMode, setFacetMode] = useState("include"); // include | exclude

  const tagTokens = useMemo(() => tokenizeTags(fTag), [fTag]);
  const q = useMemo(() => qText.trim().toLowerCase(), [qText]);

  const tagFacetsL1 = useMemo(() => {
    if (!tagTokens.length) return new Map();
    let base = items;
    if (onlySaved && user) base = base.filter((p) => savedSet?.has(p.id));
    base = base.filter((p) => hasAllTags(p, tagTokens));
    if (q) base = base.filter((p) => haystack(p).includes(q));
    const map = new Map();
    base.forEach((p) => {
      const l1 = p.categoryL1 || "(미지정)";
      map.set(l1, (map.get(l1) || 0) + 1);
    });
    return map;
  }, [items, onlySaved, user, savedSet, tagTokens, q]);

  const filtered = useMemo(() => {
    let base = items;
    if (onlySaved && user) base = base.filter((p) => savedSet?.has(p.id));
    if (fCatL1) base = base.filter((p) => (p.categoryL1 || "") === fCatL1);
    if (fCatL2) base = base.filter((p) => (p.categoryL2 || "") === fCatL2);
    if (tagTokens.length) base = base.filter((p) => hasAllTags(p, tagTokens));
    if (q) base = base.filter((p) => haystack(p).includes(q));
    if (excludeRestock) base = base.filter((p) => !isRestockPending(p));
    if (fTag && facetCatsL1.size > 0) {
      base = base.filter((p) => {
        const key = p.categoryL1 || "(미지정)";
        const hit = facetCatsL1.has(key);
        return facetMode === "include" ? hit : !hit;
      });
    }
    return base;
  }, [
    items,
    onlySaved,
    user,
    savedSet,
    fCatL1,
    fCatL2,
    tagTokens,
    q,
    excludeRestock,
    facetCatsL1,
    facetMode,
    fTag,
  ]);

  const resetFilters = () => {
    setFCatL1("");
    setFCatL2("");
    setFTag("");
    setFacetCatsL1(new Set());
    setFacetMode("include");
    setExcludeRestock(false);
  };

  return {
    // state
    qText, setQText,
    onlySaved, setOnlySaved,
    fCatL1, setFCatL1,
    fCatL2, setFCatL2,
    fTag, setFTag,
    excludeRestock, setExcludeRestock,
    facetCatsL1, setFacetCatsL1,
    facetMode, setFacetMode,

    // derived
    tagFacetsL1,
    filtered,

    // helpers
    resetFilters,
  };
}

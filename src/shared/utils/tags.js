// Normalize user input like "a,b | c  #d"
export function tokenizeTags(input = "") {
  return String(input)
    .split(/[,|#/ ]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// product.tags 가 모두 포함되는지 검사
export function hasAllTags(product, tagTokens) {
  if (!tagTokens || tagTokens.length === 0) return true;
  const tags = Array.isArray(product?.tags) ? product.tags : [];
  const set = new Set(tags.map((t) => String(t).toLowerCase()));
  return tagTokens.every((t) => set.has(t));
}

// (선택) 일부라도 매칭되는지 필요하면 이것도 사용 가능
export function hasAnyTag(product, tagTokens) {
  if (!tagTokens || tagTokens.length === 0) return true;
  const tags = Array.isArray(product?.tags) ? product.tags : [];
  const set = new Set(tags.map((t) => String(t).toLowerCase()));
  return tagTokens.some((t) => set.has(t));
}

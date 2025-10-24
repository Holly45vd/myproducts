export function tokenizeTags(input = "") {
return String(input)
.split(/[,|#/ ]+/)
.map((s) => s.trim().toLowerCase())
.filter(Boolean);
}


export function hasAllTags(product, tagTokens) {
if (!tagTokens?.length) return true;
const set = new Set((product?.tags || []).map((t) => String(t).toLowerCase()));
return tagTokens.every((t) => set.has(t));
}
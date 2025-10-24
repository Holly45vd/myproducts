const re = /재입고\s*예정|재입고예정/i;
function hasRestockKeyword(v) {
if (!v) return false;
const s = Array.isArray(v) ? v.join(" ") : String(v);
return re.test(s);
}
export function isRestockPending(p) {
return !!(
p?.restockPending ||
p?.restockSoon ||
hasRestockKeyword(p?.tags) ||
hasRestockKeyword(p?.badges) ||
hasRestockKeyword(p?.labels) ||
hasRestockKeyword(p?.status) ||
hasRestockKeyword(p?.nameBadge) ||
hasRestockKeyword(p?.badgeText)
);
}
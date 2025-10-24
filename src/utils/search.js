// 검색용 문자열 합치기 + 소문자화
export function haystack(p) {
return [p.name, p.productCode, p.categoryL1, p.categoryL2, ...(p.tags || [])]
.filter(Boolean)
.join(" ")
.toLowerCase();
}
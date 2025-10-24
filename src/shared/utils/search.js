// 간단한 전방 일치용 검색 문자열 생성기
// 필요한 필드만 모아 lowerCase로 이어붙임
export function haystack(p = {}) {
  const arr = [
    p.name,
    p.name_en,
    p.productCode,
    p.categoryL1,
    p.categoryL2,
    ...(Array.isArray(p.tags) ? p.tags : []),
  ];
  return arr.filter(Boolean).join(" ").toLowerCase();
}

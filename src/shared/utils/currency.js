// 환율 상수 — 1 MYR = 340.67 KRW, 1 AED = 390.37 KRW
export const KRW_PER_MYR = 340.67;
export const KRW_PER_AED = 390.37;

// 안전한 숫자 변환
const toNum = (v) => (v == null || isNaN(v) ? 0 : Number(v));

// 환율 변환
export const toMYR = (krw) => toNum(krw) / KRW_PER_MYR;
export const toAED = (krw) => toNum(krw) / KRW_PER_AED;

// 통화 포맷
export const formatKRW = (v) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(toNum(v));

export const formatMYR = (v) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(toNum(v));

export const formatAED = (v) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(toNum(v));

// 복합 출력 (예시)
export const formatBoth = (krw) =>
  `${formatKRW(krw)} · ${formatAED(toAED(krw))}`;

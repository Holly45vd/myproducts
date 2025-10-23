// src/utils/currency.js
export const KRW_PER_MYR = 340.67; // 1 MYR = 340.67 KRW (fixed)

// safe number
const toNum = (v) => (v == null || isNaN(v) ? 0 : Number(v));

// KRW -> MYR
export const toMYR = (krw) => toNum(krw) / KRW_PER_MYR;

// formatters
export const formatKRW = (v) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 })
    .format(toNum(v));

export const formatMYR = (v) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 2 })
    .format(toNum(v));

// combined one-liner
export const formatBoth = (krw) => `${formatKRW(krw)} · ${formatMYR(toMYR(krw))}`;

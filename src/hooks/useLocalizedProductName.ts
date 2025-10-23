// hooks/useLocalizedProductName.ts
export const useLocalizedProductName = (
  product: { name: string; productName_en: string },
  isKorean: boolean
) => {
  return isKorean ? product.name : product.productName_en;
};
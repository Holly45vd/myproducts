// hooks/useLanguage.ts
import { useState } from 'react';

export const useLanguage = () => {
  const [isKorean, setIsKorean] = useState(true);
  const toggleLanguage = () => setIsKorean(prev => !prev);
  return { isKorean, toggleLanguage };
};
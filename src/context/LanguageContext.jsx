import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(); // 또는 createContext(null)

export const LanguageProvider = ({ children }) => {
  const [isKorean, setIsKorean] = useState(true);
  const toggleLanguage = () => setIsKorean(prev => !prev);

  return (
    <LanguageContext.Provider value={{ isKorean, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
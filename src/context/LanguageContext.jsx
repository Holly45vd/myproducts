import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const Ctx = createContext(null);

export function LanguageProvider({ children }) {
  const [isKorean, setIsKorean] = useState(true);

  // 로컬스토리지에 유지
  useEffect(() => {
    const saved = localStorage.getItem("isKorean");
    if (saved != null) setIsKorean(saved === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("isKorean", String(isKorean));
  }, [isKorean]);

  const toggle = () => setIsKorean((v) => !v);

  const value = useMemo(() => ({ isKorean, toggle }), [isKorean]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

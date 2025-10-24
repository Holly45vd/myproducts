import React from "react";
import { LanguageProvider } from "../context/LanguageContext";
import { SavedProvider } from "./SavedProvider";


export function AppProviders({ children }) {
return (
<LanguageProvider>
<SavedProvider>{children}</SavedProvider>
</LanguageProvider>
);
}
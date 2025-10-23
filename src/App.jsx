// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CatalogPage from "./pages/CatalogPage";
import SavedPage from "./pages/SavedPage";
import ImportPage from "./pages/ImportPage";
import EditTagsPage from "./pages/EditTagsPage.jsx";
import CsvImportPage from "./pages/CsvImportPage";
import useSavedProducts from "./hooks/useSavedProducts";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import SavedCheckoutPage from "./pages/SavedCheckoutPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import OrderDetailPage from "./pages/OrderDetailPage.jsx";
import { isAdmin } from "./utils/authz";
import AuthModal from "./components/AuthModal";   // ✅ 추가
import { LanguageProvider } from './context/LanguageContext';

import "./i18n";

export default function App() {
  const { user, signIn, signUp, signOut /*, signInWithGoogle */, /* savedIds */ } = useSavedProducts();
  const [authOpen, setAuthOpen] = useState(false);

  // savedIds를 훅에서 리턴한다면 뱃지 숫자 전달
  const savedCount = 0; // savedIds ? savedIds.size : 0;

  return (
    <BrowserRouter>
    <LanguageProvider>

      <Navbar
        user={user}
        onSignIn={() => setAuthOpen(true)}
        onSignUp={() => setAuthOpen(true)}
        onSignOut={signOut}
        savedCount={savedCount}
      />

      {/* ✅ 로그인/회원가입 모달 */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />

      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/checkout" element={<SavedCheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderDetailPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route
          path="/import"
          element={
            <ProtectedRoute user={user} allow={isAdmin}>
              <ImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit"
          element={
            <ProtectedRoute user={user} allow={isAdmin}>
              <EditTagsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import-csv"
          element={
            <ProtectedRoute user={user} allow={isAdmin}>
              <CsvImportPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

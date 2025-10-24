import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppBar, Toolbar, Container } from "@mui/material";
import Navbar from "../components/Navbar";
import { AppProviders } from "../providers/AppProviders"; // << ./ 가 아니라 ../

import CategoryPage from "../pages/CategoryPage";
import LikesPage from "../pages/LikesPage";
import OrdersPage from "../pages/OrdersPage";
import AdminPage from "../pages/AdminPage";
import OrderCreatePage from "../pages/OrderCreatePage";

export default function App() {
  return (
    <AppProviders>
      <AppBar position="fixed" color="default" elevation={0}>
        <Navbar />
      </AppBar>
      <Toolbar />
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Routes>
          <Route path="/" element={<CategoryPage />} />
          <Route path="/likes" element={<LikesPage />} />
          <Route path="/orders/new" element={<OrderCreatePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </AppProviders>
  );
}

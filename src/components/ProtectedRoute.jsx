// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ user, allow = () => false, children }) {
  const loc = useLocation();

  // If not logged in: redirect to home (could also show a login modal if desired)
  if (!user) return <Navigate to="/" replace state={{ from: loc }} />;

  // Unauthorized: 403 message
  if (!allow(user)) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>403 · Access Denied</h2>
        <p style={{ color: "#6b7280" }}>
          This page is restricted to administrators. Please contact the site
          operator if you need access permission.
        </p>
      </div>
    );
  }
  return children;
}

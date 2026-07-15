import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import PrivateRoute from "./components/PrivateRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Regulations from "./pages/Regulations";
import RegulationDetail from "./pages/RegulationDetail";
import Profile from "./pages/Profile";
import Chatbot from "./pages/Chatbot";
import Contact from "./pages/Contact";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRegulations from "./pages/admin/AdminRegulations";
import AdminRegulationForm from "./pages/admin/AdminRegulationForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminContact from "./pages/admin/AdminContact";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* PROTECTED – tous les utilisateurs connectés */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/reglementations"
            element={<PrivateRoute><Regulations /></PrivateRoute>}
          />
          <Route
            path="/reglementations/:id"
            element={<PrivateRoute><RegulationDetail /></PrivateRoute>}
          />
          <Route
            path="/profil"
            element={<PrivateRoute><Profile /></PrivateRoute>}
          />
          <Route
            path="/chatbot"
            element={<PrivateRoute><Chatbot /></PrivateRoute>}
          />
          <Route
            path="/contact"
            element={<PrivateRoute><Contact /></PrivateRoute>}
          />

          {/* ADMIN ONLY */}
          <Route
            path="/admin"
            element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>}
          />
          <Route
            path="/admin/utilisateurs"
            element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>}
          />
          <Route
            path="/admin/reglementations"
            element={<PrivateRoute adminOnly><AdminRegulations /></PrivateRoute>}
          />
          <Route
            path="/admin/reglementations/ajouter"
            element={<PrivateRoute adminOnly><AdminRegulationForm /></PrivateRoute>}
          />
          <Route
            path="/admin/reglementations/modifier/:id"
            element={<PrivateRoute adminOnly><AdminRegulationForm /></PrivateRoute>}
          />
          <Route
            path="/admin/categories"
            element={<PrivateRoute adminOnly><AdminCategories /></PrivateRoute>}
          />
          <Route
            path="/admin/contact"
            element={<PrivateRoute adminOnly><AdminContact /></PrivateRoute>}
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

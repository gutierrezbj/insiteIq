import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PageWrapper from "./components/layout/PageWrapper";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import SiteListPage from "./pages/sites/SiteListPage";
import SiteDetailPage from "./pages/sites/SiteDetailPage";
import SiteFormPage from "./pages/sites/SiteFormPage";
import TechListPage from "./pages/technicians/TechListPage";
import InterventionListPage from "./pages/interventions/InterventionListPage";
import InterventionDetailPage from "./pages/interventions/InterventionDetailPage";
import InterventionFormPage from "./pages/interventions/InterventionFormPage";
import KBPage from "./pages/kb/KBPage";
import AIOpsPage from "./pages/ai/AIOpsPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <PageWrapper>{children}</PageWrapper>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/sites" element={<ProtectedRoute><SiteListPage /></ProtectedRoute>} />
      <Route path="/sites/new" element={<ProtectedRoute><SiteFormPage /></ProtectedRoute>} />
      <Route path="/sites/:id" element={<ProtectedRoute><SiteDetailPage /></ProtectedRoute>} />
      <Route path="/technicians" element={<ProtectedRoute><TechListPage /></ProtectedRoute>} />
      <Route path="/interventions" element={<ProtectedRoute><InterventionListPage /></ProtectedRoute>} />
      <Route path="/interventions/new" element={<ProtectedRoute><InterventionFormPage /></ProtectedRoute>} />
      <Route path="/interventions/:id" element={<ProtectedRoute><InterventionDetailPage /></ProtectedRoute>} />
      <Route path="/kb" element={<ProtectedRoute><KBPage /></ProtectedRoute>} />
      <Route path="/ai-ops" element={<ProtectedRoute><AIOpsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" theme="dark" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

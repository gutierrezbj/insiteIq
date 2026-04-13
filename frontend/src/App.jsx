import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PageWrapper from "./components/layout/PageWrapper";
import LoginPage from "./pages/auth/LoginPage";
import OpsCockpitPage from "./pages/dashboard/OpsCockpitPage";
import OpsMapPage from "./pages/dashboard/OpsMapPage";
import SiteListPage from "./pages/sites/SiteListPage";
import SiteDetailPage from "./pages/sites/SiteDetailPage";
import SiteFormPage from "./pages/sites/SiteFormPage";
import TechListPage from "./pages/technicians/TechListPage";
import InterventionListPage from "./pages/interventions/InterventionListPage";
import InterventionDetailPage from "./pages/interventions/InterventionDetailPage";
import InterventionFormPage from "./pages/interventions/InterventionFormPage";
import KBPage from "./pages/kb/KBPage";
import AIOpsPage from "./pages/ai/AIOpsPage";
import TechLayout from "./components/layout/TechLayout";
import TechDashboard from "./pages/tech/TechDashboard";
import TechJobDetail from "./pages/tech/TechJobDetail";
import TechProfile from "./pages/tech/TechProfile";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <PageWrapper>{children}</PageWrapper>;
}

function TechProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <TechLayout />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === "technician" ? "/tech" : "/"} /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><OpsCockpitPage /></ProtectedRoute>} />
      <Route path="/ops-map" element={<ProtectedRoute><OpsMapPage /></ProtectedRoute>} />
      <Route path="/sites" element={<ProtectedRoute><SiteListPage /></ProtectedRoute>} />
      <Route path="/sites/new" element={<ProtectedRoute><SiteFormPage /></ProtectedRoute>} />
      <Route path="/sites/:id" element={<ProtectedRoute><SiteDetailPage /></ProtectedRoute>} />
      <Route path="/technicians" element={<ProtectedRoute><TechListPage /></ProtectedRoute>} />
      <Route path="/interventions" element={<ProtectedRoute><InterventionListPage /></ProtectedRoute>} />
      <Route path="/interventions/new" element={<ProtectedRoute><InterventionFormPage /></ProtectedRoute>} />
      <Route path="/interventions/:id" element={<ProtectedRoute><InterventionDetailPage /></ProtectedRoute>} />
      <Route path="/kb" element={<ProtectedRoute><KBPage /></ProtectedRoute>} />
      <Route path="/ai-ops" element={<ProtectedRoute><AIOpsPage /></ProtectedRoute>} />

      {/* Tech mobile routes — light theme, no sidebar */}
      <Route path="/tech" element={<TechProtectedRoute />}>
        <Route index element={<TechDashboard />} />
        <Route path="job/:id" element={<TechJobDetail />} />
        <Route path="profile" element={<TechProfile />} />
      </Route>

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

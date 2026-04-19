/**
 * InsiteIQ v1 Foundation — App shell
 * Router for the 3 spaces + auth guards.
 * Design WOW (Track B) fills these routes with real UX per space.
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RequireSpace from "./components/RequireSpace";
import LoginPage from "./pages/auth/LoginPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

import SrsLayout from "./spaces/srs/Layout";
import SrsHome from "./spaces/srs/HomePage";
import WorkOrdersListPage from "./spaces/srs/ops/WorkOrdersListPage";
import WorkOrderDetailPage from "./spaces/srs/ops/WorkOrderDetailPage";
import InterventionReportPage from "./spaces/srs/ops/InterventionReportPage";
import ProjectsListPage from "./spaces/srs/projects/ProjectsListPage";
import ProjectDetailPage from "./spaces/srs/projects/ProjectDetailPage";
import SitesListPage from "./spaces/srs/sites/SitesListPage";
import SiteDetailPage from "./spaces/srs/sites/SiteDetailPage";

import ClientLayout from "./spaces/client/Layout";
import ClientHome from "./spaces/client/HomePage";

import TechLayout from "./spaces/tech/Layout";
import TechHome from "./spaces/tech/HomePage";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  const space = user.memberships?.[0]?.space;
  const target =
    space === "srs_coordinators" ? "/srs" :
    space === "tech_field" ? "/tech" :
    space === "client_coordinator" ? "/client" :
    "/no-access";
  return <Navigate to={target} replace />;
}

/** Minimal guard for the change-password page: needs a user, nothing else. */
function RequireUser({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center accent-bar bg-surface-raised p-6 rounded-md">
        <div className="label-caps">403</div>
        <h1 className="font-display text-xl text-text-primary mt-1">No active space</h1>
        <p className="text-text-secondary font-body mt-2">
          Your account has no active space membership. Contact the SRS administrator.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />
          <Route
            path="/change-password"
            element={
              <RequireUser>
                <ChangePasswordPage />
              </RequireUser>
            }
          />

          {/* SRS Coordinators */}
          <Route
            path="/srs"
            element={
              <RequireSpace space="srs_coordinators">
                <SrsLayout />
              </RequireSpace>
            }
          >
            <Route index element={<SrsHome />} />
            <Route path="ops" element={<WorkOrdersListPage />} />
            <Route path="ops/:wo_id" element={<WorkOrderDetailPage />} />
            <Route path="ops/:wo_id/report" element={<InterventionReportPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:project_id" element={<ProjectDetailPage />} />
            <Route path="sites" element={<SitesListPage />} />
            <Route path="sites/:site_id" element={<SiteDetailPage />} />
            <Route path="finance" element={<SrsHome />} />
            <Route path="admin" element={<SrsHome />} />
          </Route>

          {/* Client Coordinator */}
          <Route
            path="/client"
            element={
              <RequireSpace space="client_coordinator">
                <ClientLayout />
              </RequireSpace>
            }
          >
            <Route index element={<ClientHome />} />
            <Route path="tickets" element={<ClientHome />} />
            <Route path="deliverables" element={<ClientHome />} />
          </Route>

          {/* Tech Field PWA */}
          <Route
            path="/tech"
            element={
              <RequireSpace space="tech_field">
                <TechLayout />
              </RequireSpace>
            }
          >
            <Route index element={<TechHome />} />
            <Route path="ops/:wo_id" element={<WorkOrderDetailPage />} />
            <Route path="ops/:wo_id/report" element={<InterventionReportPage />} />
            <Route path="briefing" element={<TechHome />} />
            <Route path="profile" element={<TechHome />} />
          </Route>

          {/* Root */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

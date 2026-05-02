/**
 * InsiteIQ v1 Foundation — App shell (Iter 2.8 · v2 default · v1 deprecated)
 *
 * Iter 2.8 (2026-05-02 firma owner): el toggle VITE_V2_SHELL / ?v2=1 se
 * removió. v2 es siempre la única vista. Las páginas v1 que tenían
 * reemplazo v2 directo (CockpitPage, WorkOrdersListPage como Kanban,
 * SrsHome) quedaron deprecadas y removidas. Las páginas v1 que aún NO
 * tienen reemplazo v2 (Projects, Sites, Techs, Agreements, Finance,
 * Insights, Admin, WorkOrderDetailPage, InterventionReportPage) siguen
 * funcionando dentro del V2Shell hasta que sean migradas a v2 nativa.
 *
 * Mapbox GL removido del bundle (era ~2MB) — solo lo usaba el Cockpit v1
 * deprecado. Mapas activos ahora son Leaflet vía CDN (Espacio OPS,
 * Rollouts).
 */
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RequireSpace from "./components/RequireSpace";
import LoginPage from "./pages/auth/LoginPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

import SrsLayout from "./spaces/srs/Layout";
import V2ErrorBoundary from "./components/v2-shared/ErrorBoundary";

// Code splitting · páginas v2 cargan solo cuando se accede a su ruta.
const V2CockpitPage = lazy(() => import("./spaces/srs/v2/CockpitPage"));
const V2EspacioOpsPage = lazy(() => import("./spaces/srs/v2/EspacioOpsPage"));
const V2InterventionsKanbanPage = lazy(() => import("./spaces/srs/v2/InterventionsKanbanPage"));
const V2RolloutsListPage = lazy(() => import("./spaces/srs/v2/RolloutsListPage"));
const V2RolloutDetailPage = lazy(() => import("./spaces/srs/v2/RolloutDetailPage"));

/** Fallback minimal mientras carga el chunk de la página v2 */
function V2LoadingFallback() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "calc(100vh - 200px)",
        color: "#6B7280",
        fontSize: 12,
        fontFamily: "JetBrains Mono, monospace",
        letterSpacing: "0.08em",
      }}
    >
      Cargando vista…
    </div>
  );
}

// Helper para no repetir <V2ErrorBoundary><Suspense>...</Suspense></V2ErrorBoundary>
function V2View({ name, children }) {
  return (
    <V2ErrorBoundary viewName={name}>
      <Suspense fallback={<V2LoadingFallback />}>{children}</Suspense>
    </V2ErrorBoundary>
  );
}

import WorkOrderDetailPage from "./spaces/srs/ops/WorkOrderDetailPage";
import InterventionReportPage from "./spaces/srs/ops/InterventionReportPage";
import ProjectsListPage from "./spaces/srs/projects/ProjectsListPage";
import ProjectDetailPage from "./spaces/srs/projects/ProjectDetailPage";
import SitesListPage from "./spaces/srs/sites/SitesListPage";
import SiteDetailPage from "./spaces/srs/sites/SiteDetailPage";
import AdminPage from "./spaces/srs/admin/AdminPage";
import FinancePage from "./spaces/srs/finance/FinancePage";
import InvoiceDetailPage from "./spaces/srs/finance/InvoiceDetailPage";
import VendorInvoiceDetailPage from "./spaces/srs/finance/VendorInvoiceDetailPage";
import InsightsPage from "./spaces/srs/insights/InsightsPage";
import TechsListPage from "./spaces/srs/techs/TechsListPage";
import TechDetailPage from "./spaces/srs/techs/TechDetailPage";
import AgreementsListPage from "./spaces/srs/agreements/AgreementsListPage";
import AgreementDetailPage from "./spaces/srs/agreements/AgreementDetailPage";

import ClientLayout from "./spaces/client/Layout";
import ClientHome from "./spaces/client/HomePage";

import TechLayout from "./spaces/tech/Layout";
import TechHome from "./spaces/tech/HomePage";
import TechProfilePage from "./spaces/tech/ProfilePage";
import BriefingTodayPage from "./spaces/tech/BriefingTodayPage";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // En dev mode saltamos este guard (mismo patrón que RequireSpace).
  // Activar con VITE_FORCE_ROTATION=1 npm run dev si quieres probar el flow.
  const skipRotation = import.meta.env.DEV && import.meta.env.VITE_FORCE_ROTATION !== "1";
  if (user.must_change_password && !skipRotation) return <Navigate to="/change-password" replace />;
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

          {/* SRS Coordinators · v2 default desde Iter 2.8 */}
          <Route
            path="/srs"
            element={
              <RequireSpace space="srs_coordinators">
                <SrsLayout />
              </RequireSpace>
            }
          >
            <Route index element={<V2View name="V2CockpitPage"><V2CockpitPage scope="srs" /></V2View>} />
            <Route path="espacio-ops" element={<V2View name="V2EspacioOpsPage"><V2EspacioOpsPage /></V2View>} />
            <Route path="intervenciones" element={<V2View name="V2InterventionsKanbanPage"><V2InterventionsKanbanPage /></V2View>} />
            {/* Páginas v1 sin reemplazo v2 todavía · funcionan dentro del V2Shell */}
            <Route path="ops/:wo_id" element={<WorkOrderDetailPage />} />
            <Route path="ops/:wo_id/report" element={<InterventionReportPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:project_id" element={<ProjectDetailPage />} />
            <Route path="rollouts" element={<V2View name="V2RolloutsListPage"><V2RolloutsListPage /></V2View>} />
            <Route path="rollouts/:project_id" element={<V2View name="V2RolloutDetailPage"><V2RolloutDetailPage /></V2View>} />
            <Route path="sites" element={<SitesListPage />} />
            <Route path="sites/:site_id" element={<SiteDetailPage />} />
            <Route path="techs" element={<TechsListPage />} />
            <Route path="techs/:user_id" element={<TechDetailPage />} />
            <Route path="agreements" element={<AgreementsListPage />} />
            <Route path="agreements/:agreement_id" element={<AgreementDetailPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/invoices/:invoice_id" element={<InvoiceDetailPage />} />
            <Route path="finance/vendor-invoices/:vi_id" element={<VendorInvoiceDetailPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Client Coordinator · v2 default desde Iter 2.8 */}
          <Route
            path="/client"
            element={
              <RequireSpace space="client_coordinator">
                <ClientLayout />
              </RequireSpace>
            }
          >
            <Route index element={<V2View name="V2CockpitPage(client)"><V2CockpitPage scope="client" /></V2View>} />
            <Route path="espacio-ops" element={<V2View name="V2EspacioOpsPage(client)"><V2EspacioOpsPage scope="client" /></V2View>} />
            <Route path="intervenciones" element={<V2View name="V2InterventionsKanbanPage(client)"><V2InterventionsKanbanPage scope="client" /></V2View>} />
            <Route path="status" element={<ClientHome />} />
            <Route path="ops/:wo_id" element={<WorkOrderDetailPage />} />
            <Route path="ops/:wo_id/report" element={<InterventionReportPage />} />
            <Route path="invoices/:invoice_id" element={<InvoiceDetailPage />} />
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
            <Route path="briefing" element={<BriefingTodayPage />} />
            <Route path="profile" element={<TechProfilePage />} />
          </Route>

          {/* Root */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

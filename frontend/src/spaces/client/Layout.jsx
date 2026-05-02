/**
 * Client Coordinator — Layout (Iter 2.8 · v2 default · v1 deprecated).
 *
 * Iter 2.8 cierre: el toggle VITE_V2_SHELL / ?v2=1 se removió. v2 con
 * scope="client" es siempre la única shell. El header horizontal v1
 * placeholder quedó deprecado (owner firmó 2026-05-02).
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import V2Shell from "../../components/shell-v2/V2Shell";
import { getClientOrgId } from "../../lib/scope";

export default function ClientLayout() {
  const { user } = useAuth();
  const orgId = getClientOrgId(user);
  const orgName = user?.organization_name || (orgId ? "Workspace" : "Cliente");
  return (
    <V2Shell
      scope="client"
      organizationName={orgName}
      headerProps={{ liveCount: 0, liveLabel: "activas" }}
      showBottomStrip={false}
    />
  );
}

// Outlet ya viene desde V2Shell internamente.
void Outlet;

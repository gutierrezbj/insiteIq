/**
 * SRS Overview — Foundation placeholder.
 * Real Ops cockpit, Finance dashboard, Admin console land in Fases 1–3.
 */
import { useAuth } from "../../contexts/AuthContext";

export default function SrsHome() {
  const { user } = useAuth();

  const cards = [
    { label: "Tenant", value: user?.memberships?.[0]?.organization_id ? "—" : "SRS" },
    { label: "Your spaces", value: (user?.memberships || []).map((m) => m.space).join(" · ") },
    { label: "Your authority (SRS)", value: user?.memberships?.find((m) => m.space === "srs_coordinators")?.authority_level || "—" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="accent-bar pl-4 mb-8">
        <div className="label-caps">Overview</div>
        <h1 className="font-display text-3xl text-text-primary">
          Welcome, {user?.full_name?.split(" ")[0] || "operator"}.
        </h1>
        <p className="font-body text-text-secondary mt-1">
          Foundation shell ready. Ops, Finance and Admin modules land per-phase.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-content">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="stagger-item accent-bar bg-surface-raised rounded-md p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="label-caps mb-1">{c.label}</div>
            <div className="font-mono text-text-primary text-lg break-words">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-content">
        <div className="label-caps mb-2">Blueprint status</div>
        <div className="bg-surface-raised accent-bar rounded-md p-5 font-body text-sm text-text-secondary">
          Blueprint v1.1 · 11 domains · 8 cross-cutting principles · Phase 0 Foundation.
          Next: Track B (UX/UI Identity Sprint by space) then Fase 1 Modo 1 reactive end-to-end.
        </div>
      </div>
    </div>
  );
}

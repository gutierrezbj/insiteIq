/**
 * Client Home — Foundation placeholder.
 * Real Tickets / Status / Deliverables views land in Fases 1–5.
 */
import { useAuth } from "../../contexts/AuthContext";

export default function ClientHome() {
  const { user } = useAuth();

  return (
    <div>
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Status</div>
        <h1 className="font-display text-2xl text-text-primary">Your SRS projects</h1>
      </div>

      <div className="accent-bar bg-surface-raised rounded-md p-6 font-body text-text-secondary">
        <p>
          Welcome {user?.full_name}. Your engagements with SRS will appear here once Fase 1
          (Modo 1 reactive) lands.
        </p>
        <p className="mt-3">
          What you will see here is what SRS delivers to you — never the internal SRS
          machinery. Principle "la ropa se lava en casa".
        </p>
      </div>
    </div>
  );
}

/**
 * Tech Home — Foundation placeholder.
 * Real Jobs list, Copilot Briefing, PWA Capture land in Fase 1 + Fase 5.
 */
import { useAuth } from "../../contexts/AuthContext";

export default function TechHome() {
  const { user } = useAuth();

  return (
    <div>
      <div className="accent-bar pl-4 mb-5">
        <div className="label-caps">Your jobs</div>
        <h1 className="font-display text-xl text-text-primary">No active assignments</h1>
      </div>

      <div className="accent-bar bg-surface-raised rounded-md p-5 font-body text-text-secondary text-sm">
        <p>
          Field workspace ready, {user?.full_name?.split(" ")[0] || "technician"}. Assignments
          will arrive here when Modo 1 Reactive goes live (Fase 1).
        </p>
        <p className="mt-3 text-text-tertiary">
          You will not be able to start a job without confirming the Copilot Briefing
          (Domain 10 Knowledge, Blueprint v1.1).
        </p>
      </div>
    </div>
  );
}

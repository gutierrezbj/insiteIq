/**
 * SRS Coordinators — Layout (Iter 2.8 · v2 default · v1 deprecated).
 *
 * Iter 2.8 cierre: el toggle VITE_V2_SHELL / ?v2=1 se removió. v2 es
 * siempre la única shell. El sidebar v1 (war-room classic 56w) y el
 * código de toggle quedaron deprecados (owner firmó 2026-05-02).
 *
 * Para rollback de emergencia: git revert del commit Iter 2.8.
 */
import V2Shell from "../../components/shell-v2/V2Shell";

export default function SrsLayout() {
  return <V2Shell headerProps={{ liveCount: 11, liveLabel: "activas" }} />;
}

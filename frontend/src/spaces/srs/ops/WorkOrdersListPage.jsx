/**
 * SRS Ops — Work Orders list.
 * Filterable + sortable table. Click row -> detail (Pasito C).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import {
  BallBadge,
  SeverityBadge,
  ShieldBadge,
  StatusBadge,
  formatAge,
} from "../../../components/ui/Badges";

const STATUS_FILTERS = [
  "all",
  "intake",
  "triage",
  "pre_flight",
  "dispatched",
  "en_route",
  "on_site",
  "resolved",
  "closed",
  "cancelled",
];

const BALL_FILTERS = ["all", "srs", "tech", "client"];
const SEVERITY_FILTERS = ["all", "low", "normal", "high", "critical"];

export default function WorkOrdersListPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [ballFilter, setBallFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [search, setSearch] = useState("");

  const path = statusFilter === "all"
    ? "/work-orders?limit=500"
    : `/work-orders?limit=500&status_filter=${statusFilter}`;

  const { data, loading, error } = useFetch(path, { deps: [statusFilter] });

  const rows = useMemo(() => {
    let list = data || [];
    if (ballFilter !== "all") {
      list = list.filter((w) => w.ball_in_court?.side === ballFilter);
    }
    if (sevFilter !== "all") {
      list = list.filter((w) => w.severity === sevFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) =>
          (w.reference || "").toLowerCase().includes(q) ||
          (w.title || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
  }, [data, ballFilter, sevFilter, search]);

  return (
    <div className="px-8 py-7 max-w-wide">
      {/* Header */}
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Operations</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          Work Orders
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          {loading ? "cargando…" : `${rows.length} de ${data?.length || 0} visibles`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface-raised rounded-sm p-3 mb-5 flex flex-wrap gap-4 items-center">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS}
        />
        <FilterSelect
          label="Balón"
          value={ballFilter}
          onChange={setBallFilter}
          options={BALL_FILTERS}
        />
        <FilterSelect
          label="Severidad"
          value={sevFilter}
          onChange={setSevFilter}
          options={SEVERITY_FILTERS}
        />
        <div className="flex-1 min-w-[200px]">
          <label className="label-caps block mb-1">Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="reference o title…"
            className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="accent-bar-danger bg-surface-raised text-danger px-4 py-3 mb-5 rounded-sm">
          {error.message || "Error cargando WOs"}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-raised accent-bar rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-surface-border bg-surface-overlay label-caps">
          <div className="col-span-3">Referencia / Título</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Balón</div>
          <div className="col-span-1">Sev</div>
          <div className="col-span-2">Shield</div>
          <div className="col-span-2 text-right">Resolve in</div>
        </div>
        <div className="divide-y divide-surface-border max-h-[70vh] overflow-y-auto">
          {loading && <EmptyRow text="cargando…" />}
          {!loading && rows.length === 0 && <EmptyRow text="— sin resultados —" />}
          {rows.map((w, i) => (
            <WoRow key={w.id} wo={w} delayMs={Math.min(i * 20, 500)} />
          ))}
        </div>
      </div>

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · detalle + edicion pendiente (Pasito C + Track B Fase 4)
      </p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label-caps block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-base border border-surface-border rounded-sm px-2 py-1.5 text-text-primary font-mono text-xs uppercase tracking-widest-srs focus:outline-none focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function WoRow({ wo, delayMs }) {
  return (
    <Link
      to={`/srs/ops/${wo.id}`}
      className="stagger-item grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast items-center"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="col-span-3 min-w-0">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {wo.reference}
        </div>
        <div className="font-body text-sm text-text-primary truncate">
          {wo.title}
        </div>
      </div>
      <div className="col-span-2">
        <StatusBadge status={wo.status} />
      </div>
      <div className="col-span-2">
        <BallBadge
          side={wo.ball_in_court?.side}
          sinceIso={wo.ball_in_court?.since}
        />
      </div>
      <div className="col-span-1">
        <SeverityBadge severity={wo.severity} />
      </div>
      <div className="col-span-2">
        <ShieldBadge level={wo.shield_level} />
      </div>
      <div className="col-span-2 text-right font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        {formatDeadline(wo.deadline_resolve_at, wo.status)}
      </div>
    </Link>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function formatDeadline(iso, status) {
  if (status === "closed" || status === "cancelled") return "—";
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const delta = t - Date.now();
  const past = delta < 0;
  const abs = Math.abs(delta);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (past) return days > 0 ? `OVERDUE ${days}d` : "OVERDUE";
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

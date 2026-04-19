/**
 * SRS Admin — Users + Organizations + Audit log (Pasito N).
 *
 * Fase 2 plumbing: visibility layer sobre lo que ya existe. Write ops
 * (crear user, crear org, enlazar partner_relationships) se hacen por
 * seed hoy. Admin UI de escritura llega con Fase 3 (Admin/Finance).
 *
 * Audit log = "nuestro corazón guarda todo" (Principio #7). Solo SRS.
 */
import { useMemo, useState } from "react";
import { useFetch } from "../../../lib/useFetch";
import { formatAge } from "../../../components/ui/Badges";

const TABS = [
  { key: "users", label: "Users" },
  { key: "orgs", label: "Organizations" },
  { key: "audit", label: "Audit log" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("users");

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Admin</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          Directorio operativo
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Fase 2 plumbing · lectura de users + orgs + audit. Write ops Fase 3.
        </p>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-raised accent-bar rounded-sm p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-sm font-mono text-2xs uppercase tracking-widest-srs transition-colors duration-fast ${
              tab === t.key
                ? "bg-surface-overlay text-text-primary"
                : "text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "orgs" && <OrgsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

// -------------------- Users tab --------------------

function UsersTab() {
  const { data: users, loading } = useFetch("/users");
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");

  const list = users || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((u) => {
      if (q) {
        const hay = [u.full_name, u.email].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (spaceFilter) {
        const inSpace = (u.memberships || []).some(
          (m) => m.space === spaceFilter && m.active
        );
        if (!inSpace) return false;
      }
      return true;
    });
  }, [list, query, spaceFilter]);

  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="nombre, email…"
          className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast w-52"
        />
        <select
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value)}
          className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
        >
          <option value="">todos los espacios</option>
          <option value="srs_coordinators">SRS coordinators</option>
          <option value="tech_field">Tech field</option>
          <option value="client_coordinator">Client coordinator</option>
        </select>
        <div className="ml-auto font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {filtered.length} / {list.length}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
        <div className="col-span-3 label-caps">Name</div>
        <div className="col-span-3 label-caps">Email</div>
        <div className="col-span-2 label-caps">Type</div>
        <div className="col-span-3 label-caps">Memberships</div>
        <div className="col-span-1 label-caps text-right">Status</div>
      </div>

      <div className="divide-y divide-surface-border max-h-[65vh] overflow-y-auto">
        {loading && <Empty text="cargando…" />}
        {!loading && filtered.length === 0 && <Empty text="— nada match —" />}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-12 gap-3 px-4 py-2.5 items-start"
          >
            <div className="col-span-3 font-body text-sm text-text-primary truncate">
              {u.full_name || <span className="text-text-tertiary">—</span>}
            </div>
            <div className="col-span-3 font-mono text-sm text-text-secondary truncate">
              {u.email}
            </div>
            <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {u.employment_type || "—"}
            </div>
            <div className="col-span-3">
              {(u.memberships || []).map((m, i) => (
                <div
                  key={i}
                  className="font-mono text-2xs uppercase tracking-widest-srs"
                >
                  <span className={m.active ? "text-primary-light" : "text-text-tertiary"}>
                    {m.space}
                  </span>
                  {m.role && (
                    <span className="ml-1 text-text-tertiary">· {m.role}</span>
                  )}
                  {m.authority_level && (
                    <span className="ml-1 text-text-tertiary">
                      · {m.authority_level}
                    </span>
                  )}
                </div>
              ))}
              {(u.memberships || []).length === 0 && (
                <span className="font-body text-sm text-text-tertiary">—</span>
              )}
            </div>
            <div className="col-span-1 text-right">
              <StatusDot active={u.is_active} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// -------------------- Organizations tab --------------------

function OrgsTab() {
  const { data: orgs, loading } = useFetch("/organizations");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const list = orgs || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((o) => {
      if (q) {
        const hay = [o.legal_name, o.display_name, o.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter && !(o.active_roles || []).includes(roleFilter)) return false;
      return true;
    });
  }, [list, query, roleFilter]);

  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="nombre, pais…"
          className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast w-52"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
        >
          <option value="">todos los roles</option>
          <option value="client">client</option>
          <option value="channel_partner">channel_partner</option>
          <option value="joint_venture_partner">joint_venture_partner</option>
          <option value="prime_contractor">prime_contractor</option>
          <option value="vendor_labor">vendor_labor</option>
          <option value="vendor_material">vendor_material</option>
          <option value="vendor_service">vendor_service</option>
          <option value="end_client_metadata">end_client_metadata</option>
        </select>
        <div className="ml-auto font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {filtered.length} / {list.length}
        </div>
      </header>

      <div className="divide-y divide-surface-border max-h-[65vh] overflow-y-auto">
        {loading && <Empty text="cargando…" />}
        {!loading && filtered.length === 0 && <Empty text="— nada match —" />}
        {filtered.map((o) => (
          <OrgRow key={o.id} o={o} />
        ))}
      </div>
    </section>
  );
}

function OrgRow({ o }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-base text-text-primary leading-tight">
              {o.legal_name}
            </span>
            {o.display_name && o.display_name !== o.legal_name && (
              <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                · {o.display_name}
              </span>
            )}
            {o.country && (
              <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                · {o.country}
              </span>
            )}
            <StatusDot active={o.status === "active"} />
          </div>
        </div>
      </div>

      {/* Roles */}
      {(o.active_roles || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {o.active_roles.map((r) => (
            <span
              key={r}
              className="bg-surface-base rounded-sm px-2 py-0.5 font-mono text-2xs uppercase tracking-widest-srs text-primary-light"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Commission / revenue split hints */}
      {(o.partner_relationships || []).some(
        (r) => r.commission_rule || r.revenue_split_pct != null
      ) && (
        <div className="mt-1.5 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex flex-wrap gap-3">
          {o.partner_relationships
            .filter((r) => r.commission_rule)
            .map((r, i) => (
              <span key={`c${i}`}>
                · {r.type} commission {JSON.stringify(r.commission_rule)}
              </span>
            ))}
          {o.partner_relationships
            .filter((r) => r.revenue_split_pct != null)
            .map((r, i) => (
              <span key={`r${i}`}>
                · {r.type} rev split {r.revenue_split_pct}%
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// -------------------- Audit log tab --------------------

function AuditTab() {
  const [actionFilter, setActionFilter] = useState("");
  const [prefix, setPrefix] = useState("");

  const params = new URLSearchParams({ limit: "200" });
  if (actionFilter) params.set("action", actionFilter);
  if (prefix) params.set("action_prefix", prefix);
  const path = `/audit-log?${params.toString()}`;

  const { data: entries, loading, reload } = useFetch(path, {
    deps: [actionFilter, prefix],
  });
  const list = entries || [];

  const { data: users } = useFetch("/users");
  const usersById = useMemo(() => {
    const m = new Map();
    for (const u of users || []) m.set(u.id, u);
    return m;
  }, [users]);

  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border flex items-center gap-3 flex-wrap">
        <div>
          <label className="label-caps block mb-0.5" htmlFor="af">
            Action exacta
          </label>
          <input
            id="af"
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="work_order.advance.triage"
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast w-60"
          />
        </div>
        <div>
          <label className="label-caps block mb-0.5" htmlFor="pref">
            Prefix
          </label>
          <input
            id="pref"
            type="text"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setActionFilter("");
            }}
            placeholder="work_order."
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast w-48"
          />
        </div>
        <button
          type="button"
          onClick={reload}
          className="ml-auto font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light border border-surface-border rounded-sm px-3 py-1.5 hover:border-primary transition-colors duration-fast self-end"
        >
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
        <div className="col-span-1 label-caps">Age</div>
        <div className="col-span-4 label-caps">Action</div>
        <div className="col-span-2 label-caps">Actor</div>
        <div className="col-span-3 label-caps">Entity</div>
        <div className="col-span-2 label-caps text-right">Method · IP</div>
      </div>

      <div className="divide-y divide-surface-border max-h-[65vh] overflow-y-auto">
        {loading && <Empty text="cargando…" />}
        {!loading && list.length === 0 && <Empty text="— nada registrado —" />}
        {list.map((e) => (
          <AuditRow key={e.id} e={e} usersById={usersById} />
        ))}
      </div>
    </section>
  );
}

function AuditRow({ e, usersById }) {
  const actor = e.actor_user_id ? usersById.get(e.actor_user_id) : null;
  const actorLabel = actor?.full_name || (e.actor_user_id ? shortId(e.actor_user_id) : "system");
  const firstRef = (e.entity_refs || [])[0];
  const actionTone = actionTint(e.action);

  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-start">
      <div className="col-span-1 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        {e.ts ? formatAge(e.ts) : "—"}
      </div>
      <div className="col-span-4 min-w-0">
        <div className={`font-mono text-sm ${actionTone} truncate`}>
          {e.action}
        </div>
        {e.context_snapshot && Object.keys(e.context_snapshot).length > 0 && (
          <div className="font-mono text-2xs text-text-tertiary truncate">
            {summarizeContext(e.context_snapshot)}
          </div>
        )}
      </div>
      <div className="col-span-2 font-body text-sm text-text-primary truncate">
        {actorLabel}
      </div>
      <div className="col-span-3 min-w-0">
        {firstRef ? (
          <>
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {firstRef.collection}
            </div>
            <div className="font-body text-sm text-text-primary truncate">
              {firstRef.label || shortId(firstRef.id)}
            </div>
          </>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </div>
      <div className="col-span-2 text-right">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {e.method} {e.path ? shortPath(e.path) : ""}
        </div>
        {e.ip && (
          <div className="font-mono text-2xs text-text-tertiary">{e.ip}</div>
        )}
      </div>
    </div>
  );
}

// -------------------- Helpers --------------------

function StatusDot({ active }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        active ? "bg-success" : "bg-text-tertiary"
      }`}
    />
  );
}

function Empty({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function shortId(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}

function shortPath(p) {
  if (!p) return "";
  if (p.length > 28) return "…" + p.slice(-26);
  return p;
}

function actionTint(action) {
  if (!action) return "text-text-secondary";
  if (action.includes("cancel") || action.includes("reject")) return "text-danger";
  if (action.includes("advance") || action.includes("approve")) return "text-success";
  if (action.startsWith("auth.")) return "text-info";
  if (action.includes("audit") || action.includes("internal")) return "text-warning";
  return "text-text-primary";
}

function summarizeContext(ctx) {
  const parts = [];
  for (const [k, v] of Object.entries(ctx || {})) {
    if (parts.length >= 3) {
      parts.push("…");
      break;
    }
    let val = v;
    if (typeof val === "object") val = JSON.stringify(val);
    if (typeof val === "string" && val.length > 28) val = val.slice(0, 25) + "…";
    parts.push(`${k}=${val}`);
  }
  return parts.join(" · ");
}

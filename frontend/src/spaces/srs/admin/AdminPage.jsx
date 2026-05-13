/**
 * SRS Admin · v2 paleta F (Iter 2.24).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Pasito N · Users +
 * Organizations + Audit log. CreateUserAction + CreateOrgAction
 * preservados v1 — sprints propios.
 *
 * Audit log = "nuestro corazón guarda todo" (Principio #7). Solo SRS.
 *
 * Endpoints:
 *   GET /api/users
 *   GET /api/organizations
 *   GET /api/audit-log?limit=200&action_prefix=&action=
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetch } from "../../../lib/useFetch";
import { formatAge } from "../../../components/ui/Badges";
import CreateUserAction from "../../../components/admin/CreateUserAction";
import EditUserAction from "../../../components/admin/EditUserAction";
import CreateOrgAction from "../../../components/admin/CreateOrgAction";
import EditOrgAction from "../../../components/admin/EditOrgAction";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const TAB_KEYS = [
  { key: "users", i18n: "tab_users" },
  { key: "orgs",  i18n: "tab_orgs" },
  { key: "audit", i18n: "tab_audit" },
];

export default function AdminPage() {
  const { t } = useTranslation("common");
  const [tab, setTab] = useState("users");
  const TABS = useMemo(
    () => TAB_KEYS.map((it) => ({ ...it, label: t(`page_admin.${it.i18n}`) })),
    [t]
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          {t("page_admin.kicker")}
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {t("page_admin.title")}
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
          {t("page_admin.subtitle")}
        </p>
      </div>

      {/* Tabs nav */}
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        {TABS.map((it) => {
          const isActive = tab === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setTab(it.key)}
              style={{
                padding: "8px 16px",
                ...MONO_CAPS,
                fontSize: 10,
                letterSpacing: "0.14em",
                background: isActive ? "#0A1628" : "transparent",
                color: isActive ? "#FFFFFF" : "#3D4A66",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                transition: "all 160ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#F0F2F7";
                  e.currentTarget.style.color = "#0A1628";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#3D4A66";
                }
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "orgs" && <OrgsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

/* ─── Users tab ────────────────────────────────────────────────── */

function UsersTab() {
  const { t } = useTranslation("common");
  const { data: users, loading, reload } = useFetch("/users");
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
    <section style={cardStyle}>
      <header
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("page_admin.users_search_placeholder")}
          style={{ ...inputStyle, width: 220 }}
          onFocus={focusInput}
          onBlur={blurInput}
        />
        <select
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">{t("page_admin.users_filter_all_spaces")}</option>
          <option value="srs_coordinators">{t("page_admin.users_space_srs")}</option>
          <option value="tech_field">{t("page_admin.users_space_tech")}</option>
          <option value="client_coordinator">{t("page_admin.users_space_client")}</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              ...MONO_CAPS,
              fontSize: 11,
              color: "#0A1628",
              letterSpacing: "0.14em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ fontWeight: 800 }}>{filtered.length}</span>{" "}
            <span style={{ color: "#8B95A8" }}>/ {list.length}</span>
          </span>
          <CreateUserAction onCreated={() => reload()} />
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 3fr 2fr 3fr 1fr auto",
          gap: 12,
          padding: "10px 18px",
          background: "#F4F6F8",
          borderBottom: "1px solid #E2E5EC",
          ...MONO_CAPS,
          fontSize: 9.5,
          color: "#3D4A66",
          letterSpacing: "0.14em",
        }}
      >
        <div>{t("page_admin.users_col_name")}</div>
        <div>{t("page_admin.users_col_email")}</div>
        <div>{t("page_admin.users_col_type")}</div>
        <div>{t("page_admin.users_col_memberships")}</div>
        <div style={{ textAlign: "right" }}>{t("page_admin.users_col_status")}</div>
        <div style={{ minWidth: 60 }}></div>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        {loading && <Empty text={t("common.loading")} />}
        {!loading && filtered.length === 0 && <Empty text={t("page_admin.empty_no_match")} />}
        {filtered.map((u) => (
          <div
            key={u.id}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 3fr 2fr 3fr 1fr auto",
              gap: 12,
              padding: "12px 18px",
              borderBottom: "1px solid #F0F2F7",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 13,
                fontWeight: 600,
                color: u.full_name ? "#0A1628" : "#8B95A8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {u.full_name || "—"}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "#3D4A66",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {u.email}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
              {u.employment_type || "—"}
            </div>
            <div>
              {(u.memberships || []).map((m, i) => (
                <div key={i} style={{ ...MONO_CAPS, fontSize: 9.5, letterSpacing: "0.12em", marginBottom: 2 }}>
                  <span style={{ color: m.active ? "#0A1628" : "#8B95A8", fontWeight: 700 }}>
                    {m.space}
                  </span>
                  {m.role && <span style={{ marginLeft: 4, color: "#8B95A8" }}>· {m.role}</span>}
                  {m.authority_level && (
                    <span style={{ marginLeft: 4, color: "#8B95A8" }}>· {m.authority_level}</span>
                  )}
                </div>
              ))}
              {(u.memberships || []).length === 0 && (
                <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <StatusDot active={u.is_active} />
            </div>
            <div style={{ minWidth: 60, display: "flex", justifyContent: "flex-end" }}>
              <EditUserAction user={u} onSaved={() => reload()} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Organizations tab ────────────────────────────────────────── */

function OrgsTab() {
  const { t } = useTranslation("common");
  const { data: orgs, loading, reload } = useFetch("/organizations");
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
    <section style={cardStyle}>
      <header
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("page_admin.orgs_search_placeholder")}
          style={{ ...inputStyle, width: 220 }}
          onFocus={focusInput}
          onBlur={blurInput}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={selectStyle}>
          <option value="">{t("page_admin.orgs_filter_all_roles")}</option>
          <option value="client">client</option>
          <option value="channel_partner">channel_partner</option>
          <option value="joint_venture_partner">joint_venture_partner</option>
          <option value="prime_contractor">prime_contractor</option>
          <option value="vendor_labor">vendor_labor</option>
          <option value="vendor_material">vendor_material</option>
          <option value="vendor_service">vendor_service</option>
          <option value="end_client_metadata">end_client_metadata</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              ...MONO_CAPS,
              fontSize: 11,
              color: "#0A1628",
              letterSpacing: "0.14em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ fontWeight: 800 }}>{filtered.length}</span>{" "}
            <span style={{ color: "#8B95A8" }}>/ {list.length}</span>
          </span>
          <CreateOrgAction onCreated={() => reload()} />
        </div>
      </header>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        {loading && <Empty text={t("common.loading")} />}
        {!loading && filtered.length === 0 && <Empty text={t("page_admin.empty_no_match")} />}
        {filtered.map((o) => <OrgRow key={o.id} o={o} onSaved={() => reload()} />)}
      </div>
    </section>
  );
}

function OrgRow({ o, onSaved }) {
  const { t } = useTranslation("common");
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0F2F7" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: JAKARTA,
                fontSize: 15,
                fontWeight: 700,
                color: "#0A1628",
                lineHeight: 1.2,
              }}
            >
              {o.legal_name}
            </span>
            {o.display_name && o.display_name !== o.legal_name && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                · {o.display_name}
              </span>
            )}
            {o.country && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
                · {o.country}
              </span>
            )}
            <StatusDot active={o.status === "active"} />
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <EditOrgAction org={o} onSaved={onSaved} />
        </div>
      </div>

      {(o.active_roles || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {o.active_roles.map((r) => (
            <span
              key={r}
              style={{
                ...MONO_CAPS,
                background: "#E8EDF5",
                padding: "3px 8px",
                borderRadius: 3,
                fontSize: 9.5,
                color: "#0A1628",
                letterSpacing: "0.12em",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {(o.partner_relationships || []).some(
        (r) => r.commission_rule || r.revenue_split_pct != null
      ) && (
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 9,
            color: "#8B95A8",
            letterSpacing: "0.12em",
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {o.partner_relationships
            .filter((r) => r.commission_rule)
            .map((r, i) => (
              <span key={`c${i}`}>
                · {t("page_admin.audit_commission_label", { type: r.type, rule: JSON.stringify(r.commission_rule) })}
              </span>
            ))}
          {o.partner_relationships
            .filter((r) => r.revenue_split_pct != null)
            .map((r, i) => (
              <span key={`r${i}`}>
                · {t("page_admin.audit_revsplit_label", { type: r.type, pct: r.revenue_split_pct })}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

/* ─── Audit log tab ────────────────────────────────────────────── */

function AuditTab() {
  const { t } = useTranslation("common");
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
    <section style={cardStyle}>
      <header
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <label
            htmlFor="af"
            style={{ ...MONO_CAPS, display: "block", fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}
          >
            {t("page_admin.audit_label_action")}
          </label>
          <input
            id="af"
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder={t("page_admin.audit_placeholder_action")}
            style={{ ...inputStyle, width: 240 }}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>
        <div>
          <label
            htmlFor="pref"
            style={{ ...MONO_CAPS, display: "block", fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}
          >
            {t("page_admin.audit_label_prefix")}
          </label>
          <input
            id="pref"
            type="text"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setActionFilter("");
            }}
            placeholder={t("page_admin.audit_placeholder_prefix")}
            style={{ ...inputStyle, width: 200 }}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>
        <button
          type="button"
          onClick={reload}
          style={{
            marginLeft: "auto",
            ...MONO_CAPS,
            fontSize: 10,
            color: "#3D4A66",
            letterSpacing: "0.14em",
            border: "1px solid #C8CDD8",
            borderRadius: 6,
            padding: "8px 14px",
            background: "#FFFFFF",
            cursor: "pointer",
            transition: "all 160ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#0A1628";
            e.currentTarget.style.color = "#0A1628";
            e.currentTarget.style.background = "#F4F6F8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#C8CDD8";
            e.currentTarget.style.color = "#3D4A66";
            e.currentTarget.style.background = "#FFFFFF";
          }}
        >
          {t("page_admin.audit_btn_refresh")}
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 4fr 2fr 3fr 2fr",
          gap: 12,
          padding: "10px 18px",
          background: "#F4F6F8",
          borderBottom: "1px solid #E2E5EC",
          ...MONO_CAPS,
          fontSize: 9.5,
          color: "#3D4A66",
          letterSpacing: "0.14em",
        }}
      >
        <div>{t("page_admin.audit_col_age")}</div>
        <div>{t("page_admin.audit_col_action")}</div>
        <div>{t("page_admin.audit_col_actor")}</div>
        <div>{t("page_admin.audit_col_entity")}</div>
        <div style={{ textAlign: "right" }}>{t("page_admin.audit_col_method_ip")}</div>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        {loading && <Empty text={t("common.loading")} />}
        {!loading && list.length === 0 && <Empty text={t("page_admin.audit_empty")} />}
        {list.map((e) => <AuditRow key={e.id} e={e} usersById={usersById} />)}
      </div>
    </section>
  );
}

function AuditRow({ e, usersById }) {
  const { t } = useTranslation("common");
  const actor = e.actor_user_id ? usersById.get(e.actor_user_id) : null;
  const actorLabel = actor?.full_name || (e.actor_user_id ? shortId(e.actor_user_id) : t("page_admin.audit_actor_system"));
  const firstRef = (e.entity_refs || [])[0];
  const actionColor = actionTint(e.action);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 4fr 2fr 3fr 2fr",
        gap: 12,
        padding: "12px 18px",
        borderBottom: "1px solid #F0F2F7",
        alignItems: "flex-start",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
        {e.ts ? formatAge(e.ts) : "—"}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            color: actionColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {e.action}
        </div>
        {e.context_snapshot && Object.keys(e.context_snapshot).length > 0 && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: "#8B95A8",
              fontWeight: 500,
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {summarizeContext(e.context_snapshot)}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          fontWeight: 600,
          color: "#0A1628",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {actorLabel}
      </div>
      <div style={{ minWidth: 0 }}>
        {firstRef ? (
          <>
            <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
              {firstRef.collection}
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 13,
                fontWeight: 600,
                color: "#0A1628",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 1,
              }}
            >
              {firstRef.label || shortId(firstRef.id)}
            </div>
          </>
        ) : (
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
          {e.method} {e.path ? shortPath(e.path) : ""}
        </div>
        {e.ip && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", marginTop: 1, fontWeight: 500 }}>
            {e.ip}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers + shared styles ─────────────────────────────────── */

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E5EC",
  borderLeft: "3px solid #0A1628",
  borderRadius: 6,
  overflow: "hidden",
};

const inputStyle = {
  height: 32,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 10px",
  fontFamily: JAKARTA,
  fontSize: 13,
  fontWeight: 500,
  color: "#0A1628",
  outline: "none",
  background: "#FFFFFF",
  transition: "all 160ms",
};

const selectStyle = {
  height: 32,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 10px",
  fontFamily: JAKARTA,
  fontSize: 13,
  fontWeight: 500,
  color: "#0A1628",
  background: "#FFFFFF",
  outline: "none",
  cursor: "pointer",
};

function focusInput(e) {
  e.currentTarget.style.border = "1.5px solid #0A1628";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
}

function blurInput(e) {
  e.currentTarget.style.border = "1px solid #C8CDD8";
  e.currentTarget.style.boxShadow = "none";
}

function StatusDot({ active }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: active ? "#16A34A" : "#C8CDD8",
      }}
    />
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: "24px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
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
  if (!action) return "#3D4A66";
  if (action.includes("cancel") || action.includes("reject")) return "#991B1B";
  if (action.includes("advance") || action.includes("approve")) return "#0A6131";
  if (action.startsWith("auth.")) return "#1E3A8A";
  if (action.includes("audit") || action.includes("internal")) return "#7E5212";
  return "#0A1628";
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

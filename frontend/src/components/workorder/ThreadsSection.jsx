/**
 * ThreadsSection · v2 paleta F (Iter 2.37).
 *
 * Shared + Internal threads por WO (Decision #6/7/8 Modo 1 · WhatsApp kill).
 * Tabs: Shared (SRS+tech+cliente) / Internal (solo SRS). Lazy creation +
 * sealed automatico al cerrar/cancelar.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../contexts/AuthContext";
import { formatAge } from "../ui/Badges";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

export default function ThreadsSection({ wo, isSrs, isClient, isAssignedTech }) {
  const { t } = useTranslation("common");
  const canSeeInternal = isSrs;
  const [tab, setTab] = useState("shared");

  const { data: users } = useFetch("/users");
  const usersById = useMemo(() => {
    const m = new Map();
    for (const u of users || []) m.set(u.id, u);
    return m;
  }, [users]);

  const activeTab = canSeeInternal ? tab : "shared";

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <SectionTitle marginBottom={10}>{t("wo_threads.section_title")}</SectionTitle>
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 4,
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderRadius: 6,
          }}
        >
          <TabButton
            active={activeTab === "shared"}
            onClick={() => setTab("shared")}
            label={t("wo_threads.tab_shared")}
            hint={t("wo_threads.tab_shared_hint")}
          />
          {canSeeInternal && (
            <TabButton
              active={activeTab === "internal"}
              onClick={() => setTab("internal")}
              label={t("wo_threads.tab_internal")}
              hint="SRS"
            />
          )}
        </div>
      </header>

      <ThreadView
        key={activeTab}
        wo={wo}
        kind={activeTab}
        usersById={usersById}
        canPost={
          activeTab === "internal"
            ? isSrs && !["closed", "cancelled"].includes(wo.status)
            : (isSrs || isAssignedTech || isClient) &&
              !["closed", "cancelled"].includes(wo.status)
        }
      />
    </SectionCard>
  );
}

function TabButton({ active, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...MONO_CAPS,
        padding: "6px 12px",
        fontSize: 10,
        letterSpacing: "0.14em",
        background: active ? "#0A1628" : "transparent",
        color: active ? "#FFFFFF" : "#3D4A66",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#FFFFFF";
          e.currentTarget.style.color = "#0A1628";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#3D4A66";
        }
      }}
    >
      {label}
      <span
        style={{
          marginLeft: 6,
          textTransform: "none",
          letterSpacing: "0.02em",
          color: active ? "#C8CDD8" : "#8B95A8",
          fontWeight: 500,
        }}
      >
        · {hint}
      </span>
    </button>
  );
}

function ThreadView({ wo, kind, usersById, canPost }) {
  const { data: thread } = useFetch(`/work-orders/${wo.id}/threads/${kind}`, {
    deps: [wo.id, kind],
  });
  const { data: messages, reload } = useFetch(
    `/work-orders/${wo.id}/threads/${kind}/messages?limit=200`,
    { deps: [wo.id, kind] }
  );

  const sealed = !!thread?.sealed_at;
  const list = messages || [];

  return (
    <div>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
          {list.length} mensaje{list.length === 1 ? "" : "s"} ·{" "}
          {(thread?.participants?.length || 0)} participant
          {thread?.participants?.length === 1 ? "e" : "es"}
        </div>
        {sealed && (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · sealed {formatAge(thread.sealed_at)} ago
          </span>
        )}
      </div>

      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "50vh",
          overflowY: "auto",
        }}
      >
        {list.length === 0 && (
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#8B95A8",
              padding: "16px 0",
              fontWeight: 500,
            }}
          >
            — sin mensajes aún —
          </div>
        )}
        {list.map((m) => <MessageRow key={m.id} m={m} usersById={usersById} />)}
      </div>

      {!sealed && canPost && <Composer wo={wo} kind={kind} onPosted={reload} />}
      {sealed && (
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#8B95A8",
            letterSpacing: "0.14em",
          }}
        >
          Thread sealed · no se aceptan mensajes nuevos
        </div>
      )}
      {!sealed && !canPost && (
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#8B95A8",
            letterSpacing: "0.14em",
          }}
        >
          {["closed", "cancelled"].includes(wo.status)
            ? t("wo_threads.wo_terminal_hint")
            : t("wo_threads.no_permission_post")}
        </div>
      )}
    </div>
  );
}

function MessageRow({ m, usersById }) {
  const isSystem = m.kind === "system_event";
  const isEvidence = m.kind === "evidence";
  const actor = m.actor_user_id ? usersById.get(m.actor_user_id) : null;
  const actorName = actor?.full_name || (m.actor_user_id ? short(m.actor_user_id) : "system");

  if (isSystem) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          ...MONO_CAPS,
          fontSize: 9.5,
          color: "#8B95A8",
          letterSpacing: "0.12em",
          padding: "4px 0",
        }}
      >
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8B95A8" }} />
        <span>{m.text}</span>
        <span style={{ marginLeft: "auto" }}>{m.ts ? formatAge(m.ts) + " ago" : ""}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#0A1628",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {actorName}
          </span>
          {isEvidence && (
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
              · evidence
            </span>
          )}
        </div>
        <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", flexShrink: 0 }}>
          {m.ts ? formatAge(m.ts) + " ago" : ""}
        </span>
      </div>
      {m.text && (
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#0A1628",
            whiteSpace: "pre-line",
            fontWeight: 500,
            lineHeight: 1.55,
          }}
        >
          {m.text}
        </div>
      )}
      {(m.attachments?.length || 0) > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {m.attachments.map((a, i) => (
            <span
              key={i}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E5EC",
                borderRadius: 3,
                padding: "3px 8px",
                fontFamily: MONO,
                fontSize: 10,
                color: "#3D4A66",
                fontWeight: 600,
              }}
            >
              {a.filename || a.url || `attach ${i + 1}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ wo, kind, onPosted }) {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/work-orders/${wo.id}/threads/${kind}/messages`, {
        text: trimmed,
        kind: "message",
      });
      setText("");
      onPosted?.();
    } catch (err) {
      setError(err?.message || t("wo_threads.send_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: "12px 18px", borderTop: "1px solid #E2E5EC" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder={
            kind === "internal"
              ? t("wo_threads.placeholder_internal")
              : t("wo_threads.placeholder_shared")
          }
          style={{
            flex: 1,
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            borderRadius: 6,
            padding: "8px 12px",
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#0A1628",
            fontWeight: 500,
            outline: "none",
            resize: "vertical",
            transition: "all 160ms",
            lineHeight: 1.5,
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1.5px solid #0A1628";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid #C8CDD8";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          style={{
            ...MONO_CAPS,
            fontSize: 11,
            letterSpacing: "0.14em",
            padding: "10px 14px",
            background: busy || !text.trim() ? "#C8CDD8" : "#0A1628",
            color: "#FFFFFF",
            border: `1.5px solid ${busy || !text.trim() ? "#C8CDD8" : "#0A1628"}`,
            borderRadius: 6,
            cursor: busy || !text.trim() ? "not-allowed" : "pointer",
            opacity: busy || !text.trim() ? 0.5 : 1,
            boxShadow: "0 2px 6px -1px rgba(10, 22, 40, 0.32)",
            transition: "all 160ms",
            flexShrink: 0,
          }}
        >
          {busy ? t("wo_threads.btn_sending") : t("wo_threads.btn_send")}
        </button>
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...MONO_CAPS,
          fontSize: 9,
          color: "#8B95A8",
          letterSpacing: "0.12em",
        }}
      >
        <div>{kind === "internal" ? "interno · solo SRS" : "shared · todo el equipo"}</div>
        <div style={{ fontFamily: MONO, textTransform: "none", letterSpacing: 0 }}>⌘/ctrl + enter</div>
      </div>
      {error && (
        <div style={{ marginTop: 8, fontFamily: JAKARTA, fontSize: 13, color: "#991B1B", fontWeight: 500 }}>
          {error}
        </div>
      )}
    </form>
  );
}

function short(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}

/**
 * ThreadsSection — Shared + Internal threads por WO (Decision #6/7 Modo 1).
 *
 * Decision #8 "WhatsApp kill from day 1" vive aqui. Todo lo que hoy va por
 * WhatsApp/email pasa por estos threads trackeados + sealable.
 *
 * Tabs:
 *   - Shared   → SRS + tech asignado + cliente (NOC/resident). Todos ven.
 *   - Internal → solo SRS coordinators. Nunca sale al cliente.
 *
 * Lazy creation en backend: el thread no existe hasta que alguien postea.
 * Sealing automatico al cerrar/cancelar el WO — thread inmutable.
 */
import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../contexts/AuthContext";
import { formatAge } from "../ui/Badges";

export default function ThreadsSection({ wo, isSrs, isClient, isAssignedTech }) {
  const canSeeInternal = isSrs;
  const [tab, setTab] = useState("shared");

  // Users directory for name resolution. Backend narrows scope for non-SRS.
  const { data: users } = useFetch("/users");
  const usersById = useMemo(() => {
    const m = new Map();
    for (const u of users || []) m.set(u.id, u);
    return m;
  }, [users]);

  const activeTab = canSeeInternal ? tab : "shared";

  return (
    <section className="bg-surface-raised accent-bar rounded-sm mt-4">
      <header className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps mb-2">Threads · WhatsApp kill</div>
        <div className="flex gap-1">
          <TabButton
            active={activeTab === "shared"}
            onClick={() => setTab("shared")}
            label="Shared"
            hint="SRS + tech + cliente"
          />
          {canSeeInternal && (
            <TabButton
              active={activeTab === "internal"}
              onClick={() => setTab("internal")}
              label="Internal"
              hint="solo SRS"
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
    </section>
  );
}

function TabButton({ active, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-sm font-mono text-2xs uppercase tracking-widest-srs transition-colors duration-fast ${
        active
          ? "bg-surface-overlay text-text-primary"
          : "text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay/60"
      }`}
    >
      {label}
      <span className="ml-2 normal-case tracking-normal text-text-tertiary">
        · {hint}
      </span>
    </button>
  );
}

// -------------------- Thread (messages + composer) --------------------

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
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between gap-3 text-text-secondary">
        <div className="font-mono text-2xs uppercase tracking-widest-srs">
          {list.length} mensaje{list.length === 1 ? "" : "s"} ·{" "}
          {(thread?.participants?.length || 0)} participant
          {thread?.participants?.length === 1 ? "e" : "es"}
        </div>
        {sealed && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · sealed {formatAge(thread.sealed_at)} ago
          </span>
        )}
      </div>

      {/* Messages list */}
      <div className="px-4 py-3 space-y-2 max-h-[50vh] overflow-y-auto">
        {list.length === 0 && (
          <div className="font-body text-sm text-text-tertiary py-4">
            — sin mensajes aun —
          </div>
        )}
        {list.map((m) => (
          <MessageRow key={m.id} m={m} usersById={usersById} />
        ))}
      </div>

      {/* Composer */}
      {!sealed && canPost && (
        <Composer wo={wo} kind={kind} onPosted={reload} />
      )}
      {sealed && (
        <div className="px-4 py-3 border-t border-surface-border font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          Thread sealed · no se aceptan mensajes nuevos
        </div>
      )}
      {!sealed && !canPost && (
        <div className="px-4 py-3 border-t border-surface-border font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {["closed", "cancelled"].includes(wo.status)
            ? "WO terminal · threads inmutables"
            : "No tienes permiso para postear aqui"}
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
      <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary py-1">
        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
        <span>{m.text}</span>
        <span className="ml-auto">
          {m.ts ? formatAge(m.ts) + " ago" : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-body text-sm text-text-primary font-semibold truncate">
            {actorName}
          </span>
          {isEvidence && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
              · evidence
            </span>
          )}
        </div>
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
          {m.ts ? formatAge(m.ts) + " ago" : ""}
        </span>
      </div>
      {m.text && (
        <div className="font-body text-sm text-text-primary whitespace-pre-line">
          {m.text}
        </div>
      )}
      {(m.attachments?.length || 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.attachments.map((a, i) => (
            <span
              key={i}
              className="bg-surface-overlay rounded-sm px-2 py-1 font-mono text-2xs text-text-secondary"
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
      setError(err?.message || "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="px-4 py-3 border-t border-surface-border"
    >
      <div className="flex items-start gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder={
            kind === "internal"
              ? "Nota interna (no visible al cliente)…"
              : "Mensaje visible a todo el shared thread…"
          }
          className="flex-1 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo resize-y"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2.5 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast ease-out-expo flex-shrink-0"
        >
          {busy ? "…" : "Enviar"}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {kind === "internal" ? "interno · solo SRS" : "shared · todo el equipo"}
        </div>
        <div className="font-mono text-2xs text-text-tertiary">
          ⌘/ctrl + enter
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-danger font-body">{error}</div>
      )}
    </form>
  );
}

function short(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}

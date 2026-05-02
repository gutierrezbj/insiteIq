/**
 * RolloutNotesPanel — Iter 2.7 · Sprint Rollouts v2
 *
 * Sidebar derecho slide-in con notas internas del rollout. v1 simple:
 * lista cronológica + composer + visibility toggle + edit/delete propias.
 * Backend persiste todo via /api/projects/{id}/notes (regla #5 firmada).
 *
 * Features omitidas a propósito (v1 keep it simple, owner firmó):
 *   @mentions, markdown, threads/replies, reactions, attachments, tags,
 *   búsqueda, drag-reorder, vista archivo. Vendrán en Iter 2.7.x si el
 *   uso real lo demanda.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Icon, ICONS } from "../../lib/icons";

export default function RolloutNotesPanel({ projectId, currentUser, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [composerVisibility, setComposerVisibility] = useState("srs_internal");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingBody, setEditingBody] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/projects/${projectId}/notes`);
      const items = Array.isArray(data) ? data : data?.items || [];
      setNotes(items);
    } catch (err) {
      toast.error(`Error cargando notas: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // Esc cierra panel
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function submitNew() {
    const body = composer.trim();
    if (!body) {
      toast.error("Escribí algo antes de guardar");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/notes`, { body, visibility: composerVisibility });
      setComposer("");
      setComposerVisibility("srs_internal");
      toast.success("Nota guardada");
      await load();
    } catch (err) {
      toast.error(`Error guardando: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditingBody(note.body);
  }

  async function saveEdit(noteId) {
    const body = editingBody.trim();
    if (!body) {
      toast.error("Texto vacío");
      return;
    }
    try {
      await api.patch(`/projects/${projectId}/notes/${noteId}`, { body });
      setEditingId(null);
      setEditingBody("");
      toast.success("Nota actualizada");
      await load();
    } catch (err) {
      toast.error(`Error: ${err.message || err}`);
    }
  }

  async function toggleVisibility(note) {
    const next = note.visibility === "srs_internal" ? "shared" : "srs_internal";
    try {
      await api.patch(`/projects/${projectId}/notes/${note.id}`, { visibility: next });
      toast.success(`Visibilidad → ${next === "shared" ? "Compartida" : "SRS interna"}`);
      await load();
    } catch (err) {
      toast.error(`Error: ${err.message || err}`);
    }
  }

  async function deleteNote(noteId) {
    if (!window.confirm("¿Eliminar esta nota? (soft delete · auditoría preserva el histórico)")) return;
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
      toast.success("Nota eliminada");
      await load();
    } catch (err) {
      toast.error(`Error: ${err.message || err}`);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[4000]"
        style={{ background: "rgba(10,10,10,0.45)" }}
        onClick={onClose}
      />
      {/* Panel slide-in derecho */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-[4001] bg-wr-bg border-l border-wr-border flex flex-col"
        style={{ width: 460, maxWidth: "100vw", boxShadow: "-12px 0 30px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-wr-border flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <p className="label-caps-v2 mb-0.5">Notas internas</p>
            <p className="text-[11px] text-wr-text-mid font-mono">
              {loading ? "Cargando…" : `${notes.length} ${notes.length === 1 ? "nota" : "notas"}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-wr-text-dim hover:text-wr-text transition"
            title="Cerrar (Esc)"
          >
            <Icon icon={ICONS.close} size={18} />
          </button>
        </header>

        {/* Composer */}
        <div className="px-5 py-3 border-b border-wr-border flex-shrink-0">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Anotá contexto del rollout…"
            rows={3}
            className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-3 py-2 text-[12px] text-wr-text font-mono placeholder-wr-text-dim focus:outline-none focus:border-wr-amber/60 resize-none"
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setComposerVisibility("srs_internal")}
                className="text-[10px] px-2 py-1 rounded-sm border transition"
                style={{
                  color: composerVisibility === "srs_internal" ? "#F59E0B" : "#9CA3AF",
                  borderColor: composerVisibility === "srs_internal" ? "#F59E0B" : "#1F1F1F",
                  background: composerVisibility === "srs_internal" ? "rgba(245,158,11,0.08)" : "transparent",
                }}
                title="Solo visible para SRS (ropa en casa)"
              >
                SRS interna
              </button>
              <button
                onClick={() => setComposerVisibility("shared")}
                className="text-[10px] px-2 py-1 rounded-sm border transition"
                style={{
                  color: composerVisibility === "shared" ? "#F59E0B" : "#9CA3AF",
                  borderColor: composerVisibility === "shared" ? "#F59E0B" : "#1F1F1F",
                  background: composerVisibility === "shared" ? "rgba(245,158,11,0.08)" : "transparent",
                }}
                title="Visible también para client coordinator"
              >
                Compartida
              </button>
            </div>
            <button
              onClick={submitNew}
              disabled={submitting || !composer.trim()}
              className="text-[11px] uppercase font-medium px-3 py-1.5 rounded-sm transition"
              style={{
                background: submitting || !composer.trim() ? "#1F1F1F" : "#F59E0B",
                color: submitting || !composer.trim() ? "#6B7280" : "#0A0A0A",
                cursor: submitting || !composer.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.08em",
              }}
            >
              {submitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto wr-scroll">
          {loading ? (
            <div className="px-5 py-8 text-[11px] text-wr-text-mid font-mono text-center">Cargando notas…</div>
          ) : notes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[11px] text-wr-text-dim font-mono">Sin notas todavía.</p>
              <p className="text-[10px] text-wr-text-dim mt-1">La primera nota abre el cuaderno del rollout.</p>
            </div>
          ) : (
            <ul className="divide-y divide-wr-border">
              {notes.map((n) => {
                const isOwn = currentUser?.id && n.author_user_id === currentUser.id;
                const isEditing = editingId === n.id;
                return (
                  <li key={n.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-wr-text font-medium truncate">{n.author_full_name}</p>
                        <p className="text-[9px] text-wr-text-dim font-mono mt-0.5">
                          {n.created_at ? new Date(n.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : ""}
                          {n.updated_at && n.updated_at !== n.created_at ? " · editada" : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => isOwn && toggleVisibility(n)}
                        disabled={!isOwn}
                        className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-sm flex-shrink-0"
                        style={{
                          color: n.visibility === "shared" ? "#22C55E" : "#9CA3AF",
                          background: n.visibility === "shared" ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                          letterSpacing: "0.1em",
                          cursor: isOwn ? "pointer" : "default",
                        }}
                        title={isOwn ? "Click para cambiar visibilidad" : "Solo el autor puede cambiar"}
                      >
                        {n.visibility === "shared" ? "compartida" : "srs interna"}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-2">
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          rows={3}
                          className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-2 py-1.5 text-[12px] text-wr-text font-mono resize-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => saveEdit(n.id)}
                            className="text-[10px] uppercase font-medium px-2 py-1 rounded-sm"
                            style={{ background: "#F59E0B", color: "#0A0A0A", letterSpacing: "0.08em" }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditingBody(""); }}
                            className="text-[10px] text-wr-text-dim hover:text-wr-text uppercase px-2 py-1"
                            style={{ letterSpacing: "0.08em" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-wr-text leading-relaxed whitespace-pre-wrap break-words">
                        {n.body}
                      </p>
                    )}

                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => startEdit(n)}
                          className="text-[10px] text-wr-text-dim hover:text-wr-amber transition uppercase"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="text-[10px] text-wr-text-dim hover:text-red-500 transition uppercase"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

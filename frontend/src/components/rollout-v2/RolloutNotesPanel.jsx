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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Icon, ICONS } from "../../lib/icons";

export default function RolloutNotesPanel({ projectId, currentUser, onClose }) {
  const { t } = useTranslation("common");
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
      toast.error(t("comp_rollout_notes.toast_load_error", { message: err.message || err }));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

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
      toast.error(t("comp_rollout_notes.toast_empty"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/notes`, { body, visibility: composerVisibility });
      setComposer("");
      setComposerVisibility("srs_internal");
      toast.success(t("comp_rollout_notes.toast_save_success"));
      await load();
    } catch (err) {
      toast.error(t("comp_rollout_notes.toast_save_error", { message: err.message || err }));
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
      toast.error(t("comp_rollout_notes.toast_empty_text"));
      return;
    }
    try {
      await api.patch(`/projects/${projectId}/notes/${noteId}`, { body });
      setEditingId(null);
      setEditingBody("");
      toast.success(t("comp_rollout_notes.toast_update_success"));
      await load();
    } catch (err) {
      toast.error(t("comp_rollout_notes.toast_error", { message: err.message || err }));
    }
  }

  async function toggleVisibility(note) {
    const next = note.visibility === "srs_internal" ? "shared" : "srs_internal";
    try {
      await api.patch(`/projects/${projectId}/notes/${note.id}`, { visibility: next });
      toast.success(t(next === "shared" ? "comp_rollout_notes.toast_vis_shared" : "comp_rollout_notes.toast_vis_internal"));
      await load();
    } catch (err) {
      toast.error(t("comp_rollout_notes.toast_error", { message: err.message || err }));
    }
  }

  async function deleteNote(noteId) {
    if (!window.confirm(t("comp_rollout_notes.confirm_delete"))) return;
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
      toast.success(t("comp_rollout_notes.toast_delete_success"));
      await load();
    } catch (err) {
      toast.error(t("comp_rollout_notes.toast_error", { message: err.message || err }));
    }
  }

  return (
    <>
      {/* Backdrop · tinte navy (paleta F) */}
      <div
        className="fixed inset-0 z-[4000]"
        style={{ background: "rgba(10, 22, 40, 0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      {/* Panel slide-in derecho · bg blanco con border-strong */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-[4001] flex flex-col"
        style={{
          width: 460,
          maxWidth: "100vw",
          background: "#FFFFFF",
          borderLeft: "1px solid #C8CDD8",
          boxShadow: "-24px 0 60px -8px rgba(10, 22, 40, 0.20)",
        }}
      >
        {/* Header · navy strong title */}
        <header className="px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #C8CDD8", background: "#F7F8FA" }}>
          <div>
            <p className="label-caps-v2 mb-0.5" style={{ color: "#0A1628", fontWeight: 800 }}>{t("comp_rollout_notes.title")}</p>
            <p className="text-[12px] font-mono" style={{ color: "#3D4A66", fontWeight: 500 }}>
              {loading
                ? t("comp_rollout_notes.loading")
                : t(notes.length === 1 ? "comp_rollout_notes.count_one" : "comp_rollout_notes.count_other", { count: notes.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition rounded p-1"
            title={t("comp_rollout_notes.close_title")}
            style={{ color: "#8B95A8" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#0A1628";
              e.currentTarget.style.background = "#E8EDF5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#8B95A8";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon icon={ICONS.close} size={18} />
          </button>
        </header>

        {/* Composer · input navy focus */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #E2E5EC" }}>
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder={t("comp_rollout_notes.composer_placeholder")}
            rows={3}
            className="w-full rounded-sm px-3 py-2 text-[13px] font-jakarta resize-none"
            style={{
              background: "#FFFFFF",
              border: "1px solid #C8CDD8",
              color: "#0A1628",
              outline: "none",
              fontWeight: 500,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0A1628";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#C8CDD8";
              e.currentTarget.style.boxShadow = "none";
            }}
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setComposerVisibility("srs_internal")}
                className="font-jakarta text-[10px] px-2.5 py-1 rounded-sm transition"
                style={{
                  color: composerVisibility === "srs_internal" ? "#FFFFFF" : "#3D4A66",
                  border: composerVisibility === "srs_internal" ? "1px solid #0A1628" : "1px solid #C8CDD8",
                  background: composerVisibility === "srs_internal" ? "#0A1628" : "#FFFFFF",
                  fontWeight: composerVisibility === "srs_internal" ? 700 : 600,
                }}
                title={t("comp_rollout_notes.vis_internal_title")}
              >
                {t("comp_rollout_notes.vis_internal")}
              </button>
              <button
                onClick={() => setComposerVisibility("shared")}
                className="font-jakarta text-[10px] px-2.5 py-1 rounded-sm transition"
                style={{
                  color: composerVisibility === "shared" ? "#FFFFFF" : "#3D4A66",
                  border: composerVisibility === "shared" ? "1px solid #0A1628" : "1px solid #C8CDD8",
                  background: composerVisibility === "shared" ? "#0A1628" : "#FFFFFF",
                  fontWeight: composerVisibility === "shared" ? 700 : 600,
                }}
                title={t("comp_rollout_notes.vis_shared_title")}
              >
                {t("comp_rollout_notes.vis_shared")}
              </button>
            </div>
            <button
              onClick={submitNew}
              disabled={submitting || !composer.trim()}
              className="font-jakarta text-[11px] uppercase px-4 py-1.5 rounded-sm transition"
              style={{
                background: submitting || !composer.trim() ? "#E2E5EC" : "#0A1628",
                color: submitting || !composer.trim() ? "#8B95A8" : "#FFFFFF",
                border: submitting || !composer.trim() ? "1px solid #E2E5EC" : "1px solid #0A1628",
                cursor: submitting || !composer.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.08em",
                fontWeight: 700,
                boxShadow: submitting || !composer.trim() ? "none" : "0 2px 6px -1px rgba(10, 22, 40, 0.18)",
              }}
            >
              {submitting ? t("comp_rollout_notes.btn_saving") : t("comp_rollout_notes.btn_save")}
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto wr-scroll">
          {loading ? (
            <div className="px-5 py-8 text-[11px] text-cl-text-mid font-mono text-center">{t("comp_rollout_notes.loading_notes")}</div>
          ) : notes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[11px] text-cl-text-dim font-mono">{t("comp_rollout_notes.empty_main")}</p>
              <p className="text-[10px] text-cl-text-dim mt-1">{t("comp_rollout_notes.empty_hint")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-cl-border">
              {notes.map((n) => {
                const isOwn = currentUser?.id && n.author_user_id === currentUser.id;
                const isEditing = editingId === n.id;
                return (
                  <li key={n.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-cl-text font-medium truncate">{n.author_full_name}</p>
                        <p className="text-[9px] text-cl-text-dim font-mono mt-0.5">
                          {n.created_at ? new Date(n.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : ""}
                          {n.updated_at && n.updated_at !== n.created_at ? t("comp_rollout_notes.edited_suffix") : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => isOwn && toggleVisibility(n)}
                        disabled={!isOwn}
                        className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-sm flex-shrink-0"
                        style={{
                          color: n.visibility === "shared" ? "#22C55E" : "#3D4A66",
                          background: n.visibility === "shared" ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                          letterSpacing: "0.1em",
                          cursor: isOwn ? "pointer" : "default",
                        }}
                        title={isOwn ? t("comp_rollout_notes.vis_toggle_owner") : t("comp_rollout_notes.vis_toggle_other")}
                      >
                        {n.visibility === "shared" ? t("comp_rollout_notes.vis_label_shared") : t("comp_rollout_notes.vis_label_internal")}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-2">
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          rows={3}
                          className="w-full bg-cl-surface/40 border border-cl-border rounded-sm px-2 py-1.5 text-[12px] text-cl-text font-mono resize-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => saveEdit(n.id)}
                            className="text-[10px] uppercase font-medium px-2 py-1 rounded-sm"
                            style={{ background: "#0A1628", color: "#FFFFFF", letterSpacing: "0.08em" }}
                          >
                            {t("comp_rollout_notes.btn_edit_save")}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditingBody(""); }}
                            className="text-[10px] text-cl-text-dim hover:text-cl-text uppercase px-2 py-1"
                            style={{ letterSpacing: "0.08em" }}
                          >
                            {t("comp_rollout_notes.btn_edit_cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-cl-text leading-relaxed whitespace-pre-wrap break-words">
                        {n.body}
                      </p>
                    )}

                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => startEdit(n)}
                          className="text-[10px] text-cl-text-dim hover:text-cl-amber transition uppercase"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          {t("comp_rollout_notes.btn_action_edit")}
                        </button>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="text-[10px] text-cl-text-dim hover:text-red-500 transition uppercase"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          {t("comp_rollout_notes.btn_action_delete")}
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

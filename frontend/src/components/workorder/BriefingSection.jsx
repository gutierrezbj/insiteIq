/**
 * BriefingSection — Copilot Briefing per WO (Domain 10.5).
 *
 * Cierra el UX roto donde el tech tenia "Acknowledge briefing" sin poder
 * leer nada. Ahora:
 *   - SRS: assemble / refresh + coordinator_notes + ve estado del ack
 *   - Tech: lee el briefing completo + ack button inline con seguimiento
 *
 * Fase 1 minimal assembly (site summary + history). Fase 5 sumara
 * Site Bible + Device Bible + known_issues con confidence workflow.
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatAge } from "../ui/Badges";
import ActionDialog, {
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

export default function BriefingSection({ wo, isSrs, isAssignedTech }) {
  const { data, loading, error, reload } = useFetch(
    `/work-orders/${wo.id}/briefing`,
    { deps: [wo.id] }
  );

  // Clients don't see briefing at all (backend 403s). Hide section.
  if (!isSrs && !isAssignedTech) return null;

  if (loading) {
    return (
      <Section label="Copilot Briefing">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          cargando…
        </div>
      </Section>
    );
  }

  // data shape: {exists: bool, ...} or error
  const exists = data?.exists;

  if (error) {
    return (
      <Section label="Copilot Briefing">
        <div className="font-body text-sm text-danger">
          error · {error.message}
        </div>
      </Section>
    );
  }

  if (!exists) {
    return (
      <Section label="Copilot Briefing">
        <div className="px-4 py-5 font-body text-sm text-text-secondary">
          Aun no hay briefing ensamblado.
          {isSrs && (
            <>
              {" "}
              <span className="text-text-tertiary">
                El briefing compila Site Bible + historial + device bible.
                Tech debe ACK antes de en_route (o emergency override).
              </span>
            </>
          )}
          {!isSrs && (
            <>
              {" "}
              <span className="text-text-tertiary">
                Pedile a SRS que lo prepare antes de salir.
              </span>
            </>
          )}
        </div>
        {isSrs && (
          <div className="px-4 pb-4">
            <AssembleAction wo={wo} reload={reload} firstTime />
          </div>
        )}
      </Section>
    );
  }

  const briefing = data;
  const acked = briefing.status === "acknowledged";

  return (
    <Section label="Copilot Briefing">
      {/* Status header */}
      <div className="px-4 py-3 border-b border-surface-border flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs ${
                acked ? "text-success" : "text-warning"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  acked ? "bg-success" : "bg-warning"
                }`}
              />
              {briefing.status}
            </span>
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              · assembled {formatAge(briefing.assembled_at)} ago
            </span>
            {acked && (
              <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                · acked {formatAge(briefing.acknowledged_at)} ago
              </span>
            )}
          </div>
          {briefing.supersedes_id && (
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-0.5">
              supersedes previous version
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSrs && <AssembleAction wo={wo} reload={reload} />}
          {isSrs && <EditNotesAction wo={wo} briefing={briefing} reload={reload} />}
          {isAssignedTech && !acked && (
            <AckInlineAction wo={wo} reload={reload} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {/* AI Summary · Y-c · el sistema aprende */}
        <AiSummaryBlock briefing={briefing} />

        <SiteBible s={briefing.site_bible_summary} />

        {briefing.coordinator_notes && (
          <div>
            <div className="label-caps mb-1.5">Notas del coordinator</div>
            <div className="bg-surface-base rounded-sm p-3 font-body text-sm text-text-primary whitespace-pre-line">
              {briefing.coordinator_notes}
            </div>
          </div>
        )}

        <History history={briefing.history || []} />

        <SimilarCrossSite list={briefing.similar_cross_site || []} />

        <SiteMetrics m={briefing.site_metrics} />

        {(briefing.device_bible?.length || 0) === 0 &&
          (briefing.parts_estimate?.length || 0) === 0 && (
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary border-t border-surface-border pt-3">
              Device Bible + parts_estimate · placeholder Fase 5 (Domain 10 Knowledge)
            </div>
          )}
      </div>
    </Section>
  );
}

function Section({ label, children }) {
  return (
    <section className="bg-surface-raised accent-bar rounded-sm mt-4">
      <div className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps">{label}</div>
        <h2 className="font-display text-base text-text-primary leading-tight">
          Tech lee antes de salir — Decision #8 WhatsApp kill
        </h2>
      </div>
      {children}
    </section>
  );
}

function AiSummaryBlock({ briefing }) {
  const text = briefing.ai_summary;
  const model = briefing.ai_summary_model;
  const generatedAt = briefing.ai_summary_generated_at;
  const error = briefing.ai_summary_error;
  const tokensIn = briefing.ai_summary_tokens_in;
  const tokensOut = briefing.ai_summary_tokens_out;

  // Sin provider o sin generar: no mostramos nada (silencioso)
  if (!text && !error) return null;

  return (
    <div className="bg-surface-base rounded-md p-4 border-l-2 border-primary">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
          SRS Copilot · AI brief
        </span>
        {model && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · {model}
          </span>
        )}
        {tokensIn != null && tokensOut != null && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · {tokensIn}→{tokensOut} tok
          </span>
        )}
        {generatedAt && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · {formatAge(generatedAt)} ago
          </span>
        )}
      </div>
      {text ? (
        <p className="font-body text-sm text-text-primary whitespace-pre-line leading-relaxed">
          {text}
        </p>
      ) : (
        <p className="font-mono text-2xs uppercase tracking-widest-srs text-danger">
          error: {error}
        </p>
      )}
      <p className="mt-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        Y-c Fase 1 · basado en site history + similar cases + metrics · el sistema aprende
      </p>
    </div>
  );
}

function SiteBible({ s }) {
  if (!s || Object.keys(s).length === 0) {
    return (
      <div className="font-body text-sm text-text-tertiary">
        — sin site bible resumen —
      </div>
    );
  }
  return (
    <div>
      <div className="label-caps mb-2">Site bible · resumen</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-surface-base rounded-sm p-3">
          <div className="font-display text-base text-text-primary leading-tight">
            {s.site_name || "—"}
          </div>
          {s.address && (
            <div className="font-body text-sm text-text-secondary mt-1">
              {s.address}
              {s.city && <>, {s.city}</>}
            </div>
          )}
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
            {s.country || "—"}
            {s.timezone && <> · {s.timezone}</>}
          </div>
          <div className="mt-2 font-mono text-2xs uppercase tracking-widest-srs">
            {s.has_physical_resident ? (
              <span className="text-info">· residente fisico</span>
            ) : (
              <span className="text-text-tertiary">NOC remoto</span>
            )}
            {s.confidence && (
              <span className="ml-2 text-text-tertiary">
                · confidence {s.confidence}
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-base rounded-sm p-3">
          <div className="label-caps mb-1">Contacto onsite</div>
          {s.onsite_contact ? (
            <div className="font-body text-sm">
              <div className="text-text-primary">
                {s.onsite_contact.name}
                {s.onsite_contact.role && (
                  <span className="ml-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                    · {s.onsite_contact.role}
                  </span>
                )}
              </div>
              {s.onsite_contact.phone && (
                <div className="font-mono text-sm text-text-primary">
                  {s.onsite_contact.phone}
                </div>
              )}
              {s.onsite_contact.email && (
                <div className="text-text-secondary">{s.onsite_contact.email}</div>
              )}
            </div>
          ) : (
            <div className="font-body text-sm text-text-tertiary">
              — sin contacto —
            </div>
          )}

          <div className="label-caps mt-3 mb-1">Access notes</div>
          {s.access_notes ? (
            <div className="font-body text-sm text-text-primary whitespace-pre-line">
              {s.access_notes}
            </div>
          ) : (
            <div className="font-body text-sm text-text-tertiary">
              — sin notas —
            </div>
          )}
        </div>
      </div>

      {(s.known_issues?.length || 0) > 0 && (
        <div className="mt-3">
          <div className="label-caps mb-1">Known issues</div>
          <ul className="space-y-1 font-body text-sm text-text-primary">
            {s.known_issues.map((issue, i) => (
              <li key={i}>· {issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function History({ history }) {
  return (
    <div>
      <div className="label-caps mb-2">
        Historico · ultimas {history.length} intervenciones mismo site
      </div>
      {history.length === 0 && (
        <div className="font-body text-sm text-text-tertiary">
          — sin historial previo aqui —
        </div>
      )}
      <div className="space-y-2">
        {history.map((h) => (
          <HistoryRow key={h.work_order_id} h={h} />
        ))}
      </div>
    </div>
  );
}

function HistoryRow({ h }) {
  const hasCapture = h.what_found_snippet || h.what_did_snippet;
  return (
    <div className="bg-surface-base rounded-sm px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {h.reference}
            {h.status && (
              <span className="ml-2 text-text-secondary">· {h.status}</span>
            )}
            {h.after_hours && (
              <span className="ml-2 text-warning">· after-hours</span>
            )}
            {h.time_on_site_minutes != null && (
              <span className="ml-2 text-text-secondary">
                · {h.time_on_site_minutes}min on site
              </span>
            )}
          </div>
          <div className="font-body text-sm text-text-primary truncate">
            {h.title}
          </div>
        </div>
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
          {h.closed_at ? formatAge(h.closed_at) + " ago" : "—"}
        </div>
      </div>
      {hasCapture && (
        <div className="mt-2 text-2xs space-y-0.5 pl-2 border-l border-surface-border">
          {h.what_found_snippet && (
            <div>
              <span className="font-mono uppercase tracking-widest-srs text-text-tertiary">
                found:
              </span>{" "}
              <span className="font-body text-sm text-text-primary">
                {h.what_found_snippet}
              </span>
            </div>
          )}
          {h.what_did_snippet && (
            <div>
              <span className="font-mono uppercase tracking-widest-srs text-text-tertiary">
                did:
              </span>{" "}
              <span className="font-body text-sm text-text-primary">
                {h.what_did_snippet}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimilarCrossSite({ list }) {
  if (!list || list.length === 0) return null;
  return (
    <div>
      <div className="label-caps mb-2 flex items-center gap-2">
        Similar cases · mismo cliente otros sites
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light normal-case">
          · Y-a · sistema que aprende
        </span>
      </div>
      <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-2">
        Keyword overlap · usa lo que ya se hizo antes antes de improvisar
      </p>
      <div className="space-y-2">
        {list.map((s) => (
          <div
            key={s.work_order_id}
            className="bg-surface-base rounded-sm px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
                    score {s.match_score}
                  </span>
                  <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                    {s.reference}
                  </span>
                  {s.site_name && (
                    <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                      @ {s.site_name}
                    </span>
                  )}
                  {s.severity && (
                    <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                      · {s.severity}
                    </span>
                  )}
                </div>
                <div className="font-body text-sm text-text-primary truncate mt-0.5">
                  {s.title}
                </div>
                {s.matched_terms && s.matched_terms.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.matched_terms.map((t) => (
                      <span
                        key={t}
                        className="bg-surface-overlay rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-widest-srs text-primary-light"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0 text-right">
                {s.closed_at ? formatAge(s.closed_at) + " ago" : "—"}
                {s.time_on_site_minutes != null && (
                  <div>{s.time_on_site_minutes}min</div>
                )}
              </div>
            </div>
            {(s.what_found_snippet || s.what_did_snippet) && (
              <div className="mt-2 text-2xs space-y-0.5 pl-2 border-l border-primary/40">
                {s.what_found_snippet && (
                  <div>
                    <span className="font-mono uppercase tracking-widest-srs text-text-tertiary">
                      found:
                    </span>{" "}
                    <span className="font-body text-sm text-text-primary">
                      {s.what_found_snippet}
                    </span>
                  </div>
                )}
                {s.what_did_snippet && (
                  <div>
                    <span className="font-mono uppercase tracking-widest-srs text-text-tertiary">
                      did:
                    </span>{" "}
                    <span className="font-body text-sm text-text-primary">
                      {s.what_did_snippet}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteMetrics({ m }) {
  if (!m || !m.window_days) return null;
  const warning = (m.after_hours_pct ?? 0) >= 30 || (m.repeat_count_30d ?? 0) >= 3;
  return (
    <div>
      <div className="label-caps mb-2">
        Site metrics · ultimos {m.window_days}d
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          label="WOs"
          value={m.wo_count_90d ?? 0}
          hint="en 90d"
        />
        <MetricCard
          label="Avg resolve"
          value={
            m.avg_resolution_minutes != null
              ? formatMin(m.avg_resolution_minutes)
              : "—"
          }
          hint="closed → created"
        />
        <MetricCard
          label="Repeat 30d"
          value={m.repeat_count_30d ?? 0}
          hint="posible root-cause"
          tone={(m.repeat_count_30d ?? 0) >= 3 ? "warning" : "default"}
        />
        <MetricCard
          label="After-hours"
          value={`${m.after_hours_pct ?? 0}%`}
          hint="noches/fines"
          tone={(m.after_hours_pct ?? 0) >= 30 ? "warning" : "default"}
        />
      </div>
      {warning && (
        <div className="mt-2 font-mono text-2xs uppercase tracking-widest-srs text-warning">
          · señal: site con patron anormal — revisar root cause o scheduling
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, tone = "default" }) {
  const tint =
    tone === "warning"
      ? "text-warning"
      : tone === "danger"
      ? "text-danger"
      : "text-text-primary";
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="label-caps mb-0.5">{label}</div>
      <div className={`font-display text-lg leading-none ${tint}`}>
        {value}
      </div>
      {hint && (
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}

function formatMin(m) {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// -------------------- Actions --------------------

function AssembleAction({ wo, reload, firstTime }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/assemble`, {});
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm transition-all duration-fast ease-out-expo ${
          firstTime
            ? "bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary"
            : "bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary"
        }`}
      >
        {firstTime ? "Assemble briefing" : "Re-assemble"}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={firstTime ? "Assemble briefing" : "Re-assemble briefing"}
        subtitle={
          firstTime
            ? "Genera briefing con site summary + historial. Tech recibe para leer antes de en_route."
            : "Supersede la version actual. Util si cambio el contexto del site o hay nueva info."
        }
        submitLabel={firstTime ? "Assemble" : "Re-assemble"}
        onSubmit={submit}
      >
        <p className="font-body text-sm text-text-secondary">
          La version actual (si existe) queda marcada superseded y el ack
          previo pierde validez — el tech tiene que leer y confirmar de nuevo.
        </p>
      </ActionDialog>
    </>
  );
}

function EditNotesAction({ wo, briefing, reload }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(briefing.coordinator_notes || "");

  // Refresh local state if the briefing reloads with different notes
  useEffect(() => {
    setNotes(briefing.coordinator_notes || "");
  }, [briefing.coordinator_notes]);

  async function submit() {
    await api.patch(`/work-orders/${wo.id}/briefing`, {
      coordinator_notes: notes.trim() || null,
    });
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast"
      >
        {briefing.coordinator_notes ? "Editar notas" : "+ notas"}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Notas del coordinator"
        subtitle="Contexto adicional para el tech — va arriba del briefing"
        submitLabel="Guardar"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="brief-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="brief-notes"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cliente pidió específicamente X · OJO con el acceso sabado · confirmar badge el dia antes…"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function AckInlineAction({ wo, reload }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/acknowledge`, {});
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        Acknowledge
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Acknowledge briefing"
        subtitle="Confirmás que lo leíste. Desbloquea en_route."
        submitLabel="Confirmar"
        onSubmit={submit}
      >
        <p className="font-body text-sm text-text-secondary">
          Queda registrado con tu user_id + timestamp en audit_log. Si el
          SRS re-assembla con cambios, el ack vuelve a pedirse.
        </p>
      </ActionDialog>
    </>
  );
}

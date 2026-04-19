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
      <div className="space-y-1.5">
        {history.map((h) => (
          <div
            key={h.work_order_id}
            className="bg-surface-base rounded-sm px-3 py-2 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                {h.reference}
                {h.status && (
                  <span className="ml-2 text-text-secondary">· {h.status}</span>
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
        ))}
      </div>
    </div>
  );
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

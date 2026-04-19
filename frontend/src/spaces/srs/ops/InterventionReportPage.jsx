/**
 * Intervention Report viewer — Principle #1 (emit outward).
 *
 * Cierra el loop visualmente: cuando una WO se cierra, el backend
 * auto-ensambla el report con 5 canales emit (JSON/HTML/CSV/email/webhook).
 * Esta pagina lo renderiza + permite dispatch manual y regenerate.
 *
 * Scoping: backend ya devuelve vista scoped por rol (client NO ve
 * internal_message_count). La UI es agnostica.
 */
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../../../components/ui/ActionDialog";
import { formatAge } from "../../../components/ui/Badges";

export default function InterventionReportPage() {
  const { wo_id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { data: report, loading, error, reload } = useFetch(
    `/work-orders/${wo_id}/report`,
    { deps: [wo_id] }
  );

  const isSrs = !!user?.memberships?.some((m) => m.space === "srs_coordinators");
  const inTech = location.pathname.startsWith("/tech");
  const backHref = inTech ? `/tech/ops/${wo_id}` : `/srs/ops/${wo_id}`;

  if (loading) return <Centered text="cargando…" />;
  if (error) {
    const is404 = error.status === 404;
    return (
      <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
        <Link
          to={backHref}
          className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
        >
          ← Work order
        </Link>
        <div className="accent-bar bg-surface-raised p-5 rounded-md">
          <div className="label-caps mb-1">Intervention report</div>
          <h1 className="font-display text-xl text-text-primary leading-tight mb-2">
            {is404 ? "Aun no ensamblado" : "Error"}
          </h1>
          <p className="font-body text-text-secondary mb-4">
            {is404
              ? "El report se auto-ensambla al cerrar el WO. Si querés forzar, podés usar regenerate."
              : error.message}
          </p>
          {isSrs && <RegenerateAction wo_id={wo_id} reload={reload} />}
        </div>
      </div>
    );
  }
  if (!report) return <Centered text="—" />;

  const h = report.header || {};
  const sla = report.sla || {};
  const timeline = report.timeline || [];
  const ballTimeline = report.ball_timeline || [];
  const capture = report.capture;
  const threads = report.threads || {};
  const deliveries = report.deliveries || [];

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to={backHref}
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Work order
      </Link>

      {/* Header */}
      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="label-caps">Intervention report</span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {h.work_order_reference}
          </span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
            · v{report.version}
          </span>
          {report.status !== "final" && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-warning">
              · {report.status}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {h.title}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          {h.client_name} · {h.site_name}
          {h.site_country && <> · {h.site_country}</>}
          {h.site_city && <>, {h.site_city}</>}
        </p>
      </div>

      {/* Dispatch bar */}
      {isSrs && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
          <div className="label-caps mb-3">Emit outward — 5 canales</div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/work-orders/${wo_id}/report.html`}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast"
            >
              HTML ↗
            </a>
            <a
              href={`/api/work-orders/${wo_id}/report.csv`}
              className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast"
            >
              CSV ↓
            </a>
            <DispatchEmailAction wo_id={wo_id} reload={reload} />
            <DispatchWebhookAction wo_id={wo_id} reload={reload} />
            <RegenerateAction wo_id={wo_id} reload={reload} />
          </div>
        </section>
      )}

      {/* Stamp */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5 flex flex-wrap gap-5">
        <Stat
          label="Abierto"
          value={h.opened_at ? new Date(h.opened_at).toLocaleString() : "—"}
        />
        <Stat
          label="Cerrado"
          value={h.closed_at ? new Date(h.closed_at).toLocaleString() : "—"}
        />
        <Stat label="Severity" value={h.severity || "—"} />
        <Stat label="Shield" value={h.shield_level || "—"} />
        <Stat label="Tech" value={h.tech_name || "—"} />
        <Stat label="SRS coord" value={h.srs_coordinator_name || "—"} />
      </section>

      {/* SLA */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
        <div className="label-caps mb-3">SLA</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-body text-sm">
          <SlaMetric
            label="Receive"
            ok={sla.received_within_sla}
            deadlineIso={sla.receive_deadline}
            actualIso={sla.first_action_at}
            marginMinutes={sla.receive_margin_minutes}
          />
          <SlaMetric
            label="Resolve"
            ok={sla.resolved_within_sla}
            deadlineIso={sla.resolve_deadline}
            actualIso={sla.resolution_at}
            marginMinutes={sla.resolve_margin_minutes}
          />
        </div>
      </section>

      {/* Main grid: timeline + capture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Timeline · {timeline.length} eventos</div>
          <div className="space-y-2">
            {timeline.map((t, i) => (
              <TimelineRow key={i} t={t} />
            ))}
          </div>
        </section>

        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Tech capture</div>
          {capture ? (
            <div className="space-y-3">
              <Block label="Que encontró">
                {capture.what_found || "—"}
              </Block>
              <Block label="Que hizo">{capture.what_did || "—"}</Block>
              {capture.anything_new_about_site && (
                <Block label="Nuevo sobre el site">
                  {capture.anything_new_about_site}
                </Block>
              )}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border">
                <MiniStat
                  label="Time on site"
                  value={
                    capture.time_on_site_minutes != null
                      ? `${capture.time_on_site_minutes}min`
                      : "—"
                  }
                />
                <MiniStat
                  label="Devices"
                  value={(capture.devices_touched || []).length}
                />
                <MiniStat
                  label="Photos"
                  value={capture.photos_count ?? 0}
                />
              </div>
              {capture.follow_up_needed && (
                <div className="mt-2 bg-warning-muted rounded-sm px-3 py-2 font-mono text-2xs uppercase tracking-widest-srs text-warning">
                  · follow-up required
                </div>
              )}
            </div>
          ) : (
            <p className="font-body text-sm text-text-tertiary">
              — sin capture registrado —
            </p>
          )}
        </section>
      </div>

      {/* Ball timeline */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
        <div className="label-caps mb-3">
          Ball-in-court log · {ballTimeline.length} transitions
        </div>
        <div className="space-y-1.5 font-body text-sm">
          {ballTimeline.length === 0 && (
            <div className="text-text-tertiary">— sin historial —</div>
          )}
          {ballTimeline.map((b, i) => (
            <BallRow key={i} b={b} />
          ))}
        </div>
      </section>

      {/* Threads counts */}
      {(threads.shared_message_count != null ||
        threads.internal_message_count != null) && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
          <div className="label-caps mb-3">Comunicacion</div>
          <div className="flex gap-5 flex-wrap">
            <Stat label="Shared thread" value={threads.shared_message_count ?? 0} />
            {threads.internal_message_count != null && (
              <Stat
                label="Internal thread"
                value={threads.internal_message_count}
                hint="solo visible a SRS"
              />
            )}
          </div>
        </section>
      )}

      {/* Deliveries log */}
      <section className="bg-surface-raised accent-bar rounded-sm mt-4">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">Deliveries log</div>
          <h2 className="font-display text-base text-text-primary">
            {deliveries.length} registrada{deliveries.length === 1 ? "" : "s"}
          </h2>
        </header>
        <div className="divide-y divide-surface-border">
          {deliveries.length === 0 && (
            <div className="px-4 py-4 font-body text-sm text-text-tertiary">
              — sin entregas aun —
            </div>
          )}
          {deliveries.map((d, i) => (
            <DeliveryRow key={i} d={d} />
          ))}
        </div>
      </section>

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        v{report.version} · generado {formatAge(report.generated_at)} ago ·
        supersedes {report.supersedes_id ? "v previa" : "—"}
      </p>
    </div>
  );
}

// -------------------- Building blocks --------------------

function Stat({ label, value, hint }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div className="font-body text-sm text-text-primary">{value}</div>
      {hint && (
        <div className="font-body text-2xs text-text-tertiary mt-0.5">{hint}</div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-display text-base text-text-primary leading-none">
        {value}
      </div>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <p className="font-body text-sm text-text-primary whitespace-pre-line">
        {children}
      </p>
    </div>
  );
}

function SlaMetric({ label, ok, deadlineIso, actualIso, marginMinutes }) {
  const hasData = deadlineIso || actualIso;
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`w-2 h-2 rounded-full ${
            ok === true ? "bg-success" : ok === false ? "bg-danger" : "bg-text-tertiary"
          }`}
        />
        <span className="label-caps">{label}</span>
      </div>
      {!hasData && <div className="font-body text-sm text-text-tertiary">—</div>}
      {deadlineIso && (
        <div className="font-mono text-2xs text-text-tertiary">
          deadline · {new Date(deadlineIso).toLocaleString()}
        </div>
      )}
      {actualIso && (
        <div className="font-mono text-2xs text-text-primary">
          actual · {new Date(actualIso).toLocaleString()}
        </div>
      )}
      {marginMinutes != null && (
        <div
          className={`font-mono text-2xs uppercase tracking-widest-srs mt-1 ${
            marginMinutes >= 0 ? "text-success" : "text-danger"
          }`}
        >
          margin {marginMinutes >= 0 ? "+" : ""}
          {marginMinutes}min
        </div>
      )}
    </div>
  );
}

function TimelineRow({ t }) {
  return (
    <div className="flex items-start gap-3 bg-surface-base rounded-sm px-3 py-2">
      <div className="w-1 flex-shrink-0 self-stretch bg-primary rounded-full mt-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
            {t.label || t.kind}
          </span>
          {t.from_status && t.to_status && (
            <span className="font-mono text-2xs text-text-tertiary">
              {t.from_status} → {t.to_status}
            </span>
          )}
          {t.ball_side && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              · ball {t.ball_side}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {t.actor_name && (
            <span className="font-body text-sm text-text-secondary">
              {t.actor_name}
            </span>
          )}
          {t.ts && (
            <span className="font-mono text-2xs text-text-tertiary">
              {new Date(t.ts).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BallRow({ b }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface-base rounded-sm px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-2xs uppercase tracking-widest-srs ${
            b.side === "client"
              ? "text-warning"
              : b.side === "tech"
              ? "text-info"
              : "text-text-secondary"
          }`}
        >
          {b.side}
        </span>
        {b.reason && (
          <span className="font-body text-sm text-text-secondary">{b.reason}</span>
        )}
      </div>
      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        {b.since ? new Date(b.since).toLocaleString() : ""}
        {b.duration_minutes != null && <> · {b.duration_minutes}min</>}
      </span>
    </div>
  );
}

function DeliveryRow({ d }) {
  const statusTone =
    d.status === "delivered"
      ? "text-success"
      : d.status === "failed"
      ? "text-danger"
      : d.status === "queued"
      ? "text-warning"
      : "text-text-secondary";
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
            {d.channel}
          </span>
          <span className={`font-mono text-2xs uppercase tracking-widest-srs ${statusTone}`}>
            · {d.status}
          </span>
          {d.attempts != null && (
            <span className="font-mono text-2xs text-text-tertiary">
              · attempts {d.attempts}
            </span>
          )}
        </div>
        <div className="font-body text-sm text-text-primary truncate">
          {d.target}
        </div>
      </div>
      <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
        {d.enqueued_at ? formatAge(d.enqueued_at) + " ago" : "—"}
      </div>
    </div>
  );
}

function Centered({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

// -------------------- Actions --------------------

function RegenerateAction({ wo_id, reload }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo_id}/report/regenerate`, {});
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast"
      >
        Regenerate
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Regenerate intervention report"
        subtitle="Re-ensambla y supersede la version vigente. Util si se reabrio el WO o hay correcciones."
        submitLabel="Regenerate"
        onSubmit={submit}
      >
        <p className="font-body text-sm text-text-secondary">
          La version actual queda marcada como superseded. La nueva version
          hereda el numero siguiente y queda auditada.
        </p>
      </ActionDialog>
    </>
  );
}

function DispatchEmailAction({ wo_id, reload }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");

  async function submit() {
    const body = {
      to: to.trim(),
      cc: cc
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      subject: subject || null,
    };
    await api.post(`/work-orders/${wo_id}/report/dispatch/email`, body);
    reload();
    setTo("");
    setCc("");
    setSubject("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        Dispatch email
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Dispatch report via email"
        subtitle="Enqueue al email_outbox — worker drena en futuro. Audit log graba."
        submitLabel="Enqueue"
        submitDisabled={!to.trim()}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="em-to">To</DialogLabel>
          <DialogInput
            id="em-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="diego@cliente.com"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="em-cc" optional>
            CC (coma-separados)
          </DialogLabel>
          <DialogInput
            id="em-cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="andros@systemrapid.com, rackel@fractalia.com"
          />
        </div>
        <div>
          <DialogLabel htmlFor="em-subj" optional>
            Subject
          </DialogLabel>
          <DialogInput
            id="em-subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="(auto-generado si vacio)"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function DispatchWebhookAction({ wo_id, reload }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [includeHtml, setIncludeHtml] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo_id}/report/dispatch/webhook`, {
      url: url.trim(),
      include_html: includeHtml,
    });
    reload();
    setUrl("");
    setIncludeHtml(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        Dispatch webhook
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Dispatch report via webhook"
        subtitle="Enqueue al webhook_outbox — POST JSON scoped al cliente."
        submitLabel="Enqueue"
        submitDisabled={!url.trim().startsWith("http")}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="wh-url">URL</DialogLabel>
          <DialogInput
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://cliente.com/hooks/insiteiq"
            required
          />
        </div>
        <DialogCheckbox
          id="wh-html"
          label="Incluir HTML rendered en payload"
          checked={includeHtml}
          onChange={setIncludeHtml}
        />
      </ActionDialog>
    </>
  );
}

/**
 * SRS Ops — Work Order detail.
 * Read-only view (Pasito C). Actions (advance, rate, parts) come later.
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import {
  BallBadge,
  SeverityBadge,
  ShieldBadge,
  StatusBadge,
  formatAge,
} from "../../../components/ui/Badges";

// The 7 stages per Blueprint Modo 1 Decision #1
const STAGES = [
  { key: "intake",     label: "Intake" },
  { key: "triage",     label: "Triage" },
  { key: "pre_flight", label: "Pre-flight" },
  { key: "dispatched", label: "Dispatched" },
  { key: "en_route",   label: "En route" },
  { key: "on_site",    label: "On site" },
  { key: "resolved",   label: "Resolved" },
  { key: "closed",     label: "Closed" },
];

export default function WorkOrderDetailPage() {
  const { wo_id } = useParams();

  const { data: wo, loading, error } = useFetch(`/work-orders/${wo_id}`, {
    deps: [wo_id],
  });

  if (loading) return <CenteredMessage text="cargando…" />;
  if (error) return <CenteredMessage text={`error: ${error.message}`} />;
  if (!wo) return <CenteredMessage text="—" />;

  return (
    <div className="px-8 py-7 max-w-wide">
      {/* Back link */}
      <Link
        to="/srs/ops"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Work orders
      </Link>

      {/* Header */}
      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="label-caps">Work Order</span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {wo.reference}
          </span>
          <SeverityBadge severity={wo.severity} />
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {wo.title}
        </h1>
        {wo.description && (
          <p className="font-body text-text-secondary text-sm mt-2 max-w-prose">
            {wo.description}
          </p>
        )}
      </div>

      {/* State + Ball banner */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5 flex flex-wrap gap-5 items-center">
        <StateBlock label="Status" value={<StatusBadge status={wo.status} />} />
        <StateBlock
          label="Balón"
          value={
            <BallBadge
              side={wo.ball_in_court?.side}
              sinceIso={wo.ball_in_court?.since}
            />
          }
          hint={wo.ball_in_court?.reason}
        />
        <StateBlock label="Shield" value={<ShieldBadge level={wo.shield_level} />} />
        <StateBlock
          label="Deadline resolve"
          value={
            <span className="font-mono text-sm text-text-primary">
              {formatDeadline(wo.deadline_resolve_at, wo.status)}
            </span>
          }
        />
        {wo.closed_at && (
          <StateBlock
            label="Closed"
            value={
              <span className="font-mono text-sm text-success">
                {new Date(wo.closed_at).toLocaleString()}
              </span>
            }
          />
        )}
      </section>

      {/* 7-stage timeline */}
      <section className="bg-surface-raised accent-bar rounded-sm mb-5 p-4">
        <div className="label-caps mb-3">State machine — 7 etapas</div>
        <StageTimeline currentStatus={wo.status} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Metadata */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Metadata</div>
          <dl className="font-body text-sm divide-y divide-surface-border">
            <MetaRow label="Cliente org" value={shortId(wo.organization_id)} />
            <MetaRow label="Site" value={shortId(wo.site_id)} />
            <MetaRow label="Service agreement" value={shortId(wo.service_agreement_id)} />
            <MetaRow
              label="SRS Coordinator"
              value={shortId(wo.srs_coordinator_user_id)}
            />
            <MetaRow
              label="Tech asignado"
              value={shortId(wo.assigned_tech_user_id) || "— sin asignar —"}
            />
            <MetaRow
              label="NOC Operator"
              value={shortId(wo.noc_operator_user_id) || "— default remoto —"}
            />
            <MetaRow
              label="Onsite resident"
              value={shortId(wo.onsite_resident_user_id) || "— no aplica —"}
            />
            {wo.project_id && (
              <MetaRow label="Project" value={shortId(wo.project_id)} />
            )}
            {wo.cluster_group_id && (
              <MetaRow label="Cluster group" value={shortId(wo.cluster_group_id)} />
            )}
            <MetaRow
              label="Opened"
              value={wo.created_at ? new Date(wo.created_at).toLocaleString() : "—"}
            />
            <MetaRow
              label="Last update"
              value={wo.updated_at ? formatAge(wo.updated_at) + " ago" : "—"}
            />
          </dl>
        </section>

        {/* Handshakes + pre-flight */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Pre-flight + handshakes</div>
          <div className="mb-4">
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-1">
              Pre-flight checklist
            </div>
            <PreflightBlock checklist={wo.pre_flight_checklist} />
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-2">
              Handshakes ({wo.handshakes?.length || 0})
            </div>
            {(!wo.handshakes || wo.handshakes.length === 0) && (
              <div className="font-body text-sm text-text-tertiary">— ninguno aún —</div>
            )}
            <div className="space-y-2">
              {wo.handshakes?.map((h, i) => (
                <HandshakeRow key={i} h={h} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* SLA snapshot */}
      {wo.sla_snapshot && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
          <div className="label-caps mb-3">SLA snapshot (fijado al intake)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-body text-sm">
            <SlaItem
              label="Receive"
              minutes={wo.sla_snapshot.receive_minutes}
            />
            <SlaItem
              label="Resolve"
              minutes={wo.sla_snapshot.resolve_minutes}
            />
            <SlaItem
              label="Photos"
              text={wo.sla_snapshot.photos_required}
            />
            <SlaItem
              label="24×7"
              text={wo.sla_snapshot.coverage_247 ? "yes" : "no"}
            />
          </div>
        </section>
      )}

      {/* Related tabs stub */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
        <div className="label-caps mb-3">Related</div>
        <div className="flex flex-wrap gap-2">
          <RelatedLink
            to={`#briefing-${wo_id}`}
            label="Copilot Briefing"
            subpath={`/api/work-orders/${wo_id}/briefing`}
          />
          <RelatedLink
            to={`#threads-${wo_id}`}
            label="Threads (shared + internal)"
            subpath={`/api/work-orders/${wo_id}/threads`}
          />
          <RelatedLink
            to={`#capture-${wo_id}`}
            label="Tech Capture"
            subpath={`/api/work-orders/${wo_id}/capture`}
          />
          <RelatedLink
            to={`#parts-${wo_id}`}
            label="Parts / Budget Approvals"
            subpath={`/api/work-orders/${wo_id}/parts`}
          />
          <RelatedLink
            to={`#ratings-${wo_id}`}
            label="Ratings"
            subpath={`/api/work-orders/${wo_id}/ratings`}
          />
          {wo.status === "closed" && (
            <RelatedLink
              to={`#report-${wo_id}`}
              label="Intervention Report"
              subpath={`/api/work-orders/${wo_id}/report`}
            />
          )}
        </div>
        <p className="font-body text-2xs text-text-tertiary mt-3">
          Rendering inline de relacionados pendiente (Track B Fase 4). Los links
          apuntan a los endpoints API para consulta directa.
        </p>
      </section>

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · read-only · acciones (advance/close/rate) pendientes
      </p>
    </div>
  );
}

// -------------------- Sub-components --------------------

function StateBlock({ label, value, hint }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div>{value}</div>
      {hint && (
        <div className="font-body text-2xs text-text-tertiary mt-0.5">{hint}</div>
      )}
    </div>
  );
}

function StageTimeline({ currentStatus }) {
  // Cancelled is displayed separately, not part of the main sequence
  const isCancelled = currentStatus === "cancelled";
  if (isCancelled) {
    return (
      <div className="font-body text-sm text-danger">
        Cancelled · flujo normal no aplica
      </div>
    );
  }
  const currentIdx = STAGES.findIndex((s) => s.key === currentStatus);
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center flex-shrink-0">
            <div
              className={`flex flex-col items-center px-2 ${
                active ? "text-primary-light" : done ? "text-text-primary" : "text-text-tertiary"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full mb-1 ${
                  active
                    ? "bg-primary shadow-glow-primary"
                    : done
                    ? "bg-success"
                    : "bg-surface-border"
                }`}
              />
              <div className="font-mono text-2xs uppercase tracking-widest-srs whitespace-nowrap">
                {s.label}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={`h-px w-6 ${done ? "bg-success" : "bg-surface-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
        {label}
      </span>
      <span className="font-body text-sm text-text-primary truncate max-w-[55%] text-right">
        {value}
      </span>
    </div>
  );
}

function PreflightBlock({ checklist }) {
  const items = Object.entries(checklist || {});
  if (items.length === 0) {
    return (
      <div className="font-body text-sm text-text-tertiary">— sin checklist aún —</div>
    );
  }
  return (
    <div className="space-y-1">
      {items.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2 font-body text-sm">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              val === true
                ? "bg-success"
                : val === false
                ? "bg-danger"
                : "bg-text-tertiary"
            }`}
          />
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {key}
          </span>
          <span className="text-text-primary">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

function HandshakeRow({ h }) {
  const geo = h.lat != null && h.lng != null ? `${h.lat.toFixed(3)}, ${h.lng.toFixed(3)}` : null;
  return (
    <div className="bg-surface-base rounded-sm px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
          {h.kind}
        </div>
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {h.ts ? formatAge(h.ts) + " ago" : "—"}
        </div>
      </div>
      {h.notes && (
        <div className="font-body text-sm text-text-primary mt-1">{h.notes}</div>
      )}
      {geo && (
        <div className="font-mono text-2xs text-text-tertiary mt-1">
          geo {geo}
        </div>
      )}
    </div>
  );
}

function SlaItem({ label, minutes, text }) {
  return (
    <div>
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-mono text-text-primary">
        {text != null
          ? text
          : minutes != null
          ? formatMinutes(minutes)
          : "—"}
      </div>
    </div>
  );
}

function RelatedLink({ label, subpath }) {
  return (
    <a
      href={subpath}
      target="_blank"
      rel="noreferrer"
      className="bg-surface-base border border-surface-border rounded-sm px-3 py-1.5 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
    >
      {label} ↗
    </a>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

// -------------------- Helpers --------------------

function shortId(id) {
  if (!id) return null;
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
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

function formatMinutes(m) {
  if (m < 60) return `${m} min`;
  const hours = Math.round(m / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

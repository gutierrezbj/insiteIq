/**
 * SRS Ops — Work Order detail.
 * Pasito C (read-only view) + Pasito G (actions: advance / cancel / preflight /
 * briefing ack / capture submit / rate tech).
 *
 * Buttons render based on (current status × user role × tech assignment).
 * State machine legality is enforced by the backend; the UI just hides what
 * would 400 out of the gate.
 */
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import {
  BallBadge,
  SeverityBadge,
  ShieldBadge,
  StatusBadge,
  formatAge,
} from "../../../components/ui/Badges";
import ActionDialog, {
  DialogLabel,
  DialogInput,
  DialogTextarea,
  DialogCheckbox,
} from "../../../components/ui/ActionDialog";
import BriefingSection from "../../../components/workorder/BriefingSection";
import PartsSection from "../../../components/workorder/PartsSection";
import ThreadsSection from "../../../components/workorder/ThreadsSection";

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
  const { user } = useAuth();
  const location = useLocation();

  const { data: wo, loading, error, reload } = useFetch(
    `/work-orders/${wo_id}`,
    { deps: [wo_id] }
  );

  if (loading) return <CenteredMessage text="cargando…" />;
  if (error) return <CenteredMessage text={`error: ${error.message}`} />;
  if (!wo) return <CenteredMessage text="—" />;

  const isSrs = !!user?.memberships?.some((m) => m.space === "srs_coordinators");
  const isClient = !!user?.memberships?.some((m) => m.space === "client_coordinator");
  const isAssignedTech =
    !!user?.memberships?.some((m) => m.space === "tech_field") &&
    wo.assigned_tech_user_id === user?.id;

  // Stay within whichever space the user is browsing (tech PWA / SRS cockpit / Client portal)
  const inTech = location.pathname.startsWith("/tech");
  const inClientSpace = location.pathname.startsWith("/client");
  const backHref = inTech ? "/tech" : inClientSpace ? "/client" : "/srs/ops";
  const backLabel = inTech
    ? "Mis trabajos"
    : inClientSpace
    ? "Status"
    : "Work orders";

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      {/* Back link */}
      <Link
        to={backHref}
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← {backLabel}
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

      {/* Actions bar — buttons appear based on status × role × assignment */}
      <ActionBar
        wo={wo}
        reload={reload}
        isSrs={isSrs}
        isClient={isClient}
        isAssignedTech={isAssignedTech}
      />

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
            <MetaRow
              label="Site"
              value={
                wo.site_id ? (
                  <Link
                    to={`/srs/sites/${wo.site_id}`}
                    className="text-primary-light hover:text-primary underline decoration-dotted"
                  >
                    {shortId(wo.site_id)} ↗
                  </Link>
                ) : (
                  "—"
                )
              }
            />
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

      {/* Copilot Briefing — tech lee antes de en_route */}
      <BriefingSection
        wo={wo}
        isSrs={isSrs}
        isAssignedTech={isAssignedTech}
      />

      {/* Threads (shared + internal) — kills WhatsApp */}
      <ThreadsSection
        wo={wo}
        isSrs={isSrs}
        isClient={isClient}
        isAssignedTech={isAssignedTech}
      />

      {/* Parts / Budget approvals */}
      <PartsSection wo={wo} isSrs={isSrs} isClient={isClient} />

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
            <Link
              to={`${
                inTech ? "/tech" : inClientSpace ? "/client" : "/srs"
              }/ops/${wo_id}/report`}
              className="bg-primary text-text-inverse font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-1.5 rounded-sm hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
            >
              Intervention Report →
            </Link>
          )}
        </div>
        <p className="font-body text-2xs text-text-tertiary mt-3">
          Rendering inline de relacionados pendiente (Track B Fase 4). Los links
          apuntan a los endpoints API para consulta directa.
        </p>
      </section>

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · state-machine vivo · audit_log graba todo
      </p>
    </div>
  );
}

// -------------------- Action bar + actions --------------------

// Advance targets per current status (happy path + quick back-steps).
// Every target is re-validated by the backend state machine; this list
// just filters what we ever show the user.
const ADVANCE_TARGETS = {
  intake:     [{ to: "triage",     label: "Pasar a triage" }],
  triage:     [{ to: "pre_flight", label: "A pre-flight" }],
  pre_flight: [
    { to: "dispatched", label: "Dispatch" },
    { to: "triage",     label: "Volver a triage", soft: true },
  ],
  dispatched: [
    { to: "en_route",   label: "En ruta" },
    { to: "triage",     label: "Volver a triage", soft: true },
  ],
  en_route:   [{ to: "on_site",  label: "Check-in on site", handshake: "check_in" }],
  on_site:    [
    { to: "resolved",  label: "Resolver", handshake: "resolution" },
    { to: "en_route",  label: "Sali a por partes", soft: true },
  ],
  resolved:   [
    { to: "closed",    label: "Cerrar WO", handshake: "closure" },
    { to: "on_site",   label: "Reabrir on-site", soft: true },
  ],
  closed:     [],
  cancelled:  [],
};

function ActionBar({ wo, reload, isSrs, isClient, isAssignedTech }) {
  const status = wo.status;
  const isTerminal = status === "closed" || status === "cancelled";

  // Who is allowed to advance to what (mirrors backend auth)
  const srsOnlyTargets = new Set(["triage", "pre_flight", "closed"]);
  const srsOrTechTargets = new Set(["en_route", "on_site", "resolved"]);

  const availableAdvance = (ADVANCE_TARGETS[status] || []).filter((t) => {
    if (srsOnlyTargets.has(t.to)) return isSrs;
    if (srsOrTechTargets.has(t.to)) return isSrs || isAssignedTech;
    // Back-steps + other transitions: SRS can do it
    return isSrs;
  });

  // Nothing to do on this WO for this user
  const canRate =
    (isSrs || isClient) &&
    (status === "resolved" || status === "closed") &&
    !!wo.assigned_tech_user_id;
  const canCancel = isSrs && !isTerminal;
  const canPreflight = (isSrs || isAssignedTech) && status === "pre_flight";
  const canAckBriefing = isAssignedTech && status === "dispatched";
  const canSubmitCapture = isAssignedTech && status === "on_site";
  // Scan equipment: tech on_site (most realistic window) + SRS anytime non-terminal
  const canScan =
    ((isAssignedTech && status === "on_site") || (isSrs && !isTerminal)) &&
    !!wo.site_id;

  const hasAny =
    availableAdvance.length > 0 ||
    canRate ||
    canCancel ||
    canPreflight ||
    canAckBriefing ||
    canSubmitCapture ||
    canScan;

  if (!hasAny) return null;

  return (
    <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
      <div className="label-caps mb-3">Acciones disponibles</div>
      <div className="flex flex-wrap gap-2">
        {availableAdvance.map((t) => (
          <AdvanceAction
            key={t.to}
            wo={wo}
            target={t.to}
            label={t.label}
            handshake={t.handshake}
            soft={t.soft}
            isSrs={isSrs}
            reload={reload}
          />
        ))}
        {canPreflight && <PreflightAction wo={wo} reload={reload} />}
        {canAckBriefing && <AckBriefingAction wo={wo} reload={reload} />}
        {canSubmitCapture && <SubmitCaptureAction wo={wo} reload={reload} />}
        {canScan && <ScanEquipmentAction wo={wo} reload={reload} />}
        {canRate && <RateTechAction wo={wo} reload={reload} isClient={isClient} />}
        {canCancel && <CancelAction wo={wo} reload={reload} />}
      </div>
    </section>
  );
}

function ActionButton({ onClick, label, tone = "default" }) {
  const toneClass =
    tone === "destructive"
      ? "bg-danger text-text-inverse hover:bg-danger/90 hover:shadow-glow-danger"
      : tone === "soft"
      ? "bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary"
      : "bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm transition-all duration-fast ease-out-expo ${toneClass}`}
    >
      {label}
    </button>
  );
}

function AdvanceAction({ wo, target, label, handshake, soft, isSrs, reload }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [emergency, setEmergency] = useState(false);

  const isDispatch = wo.status === "pre_flight" && target === "dispatched";
  const isEnRoute = wo.status === "dispatched" && target === "en_route";
  const isResolve = wo.status === "on_site" && target === "resolved";
  const needsEmergencyHint = isDispatch || isEnRoute || isResolve;

  async function submit() {
    const body = { target_status: target, notes: notes || undefined };
    if (handshake) body.handshake = handshake;
    if (emergency) body.emergency = true;
    await api.post(`/work-orders/${wo.id}/advance`, body);
    reload();
  }

  return (
    <>
      <ActionButton
        onClick={() => setOpen(true)}
        label={label}
        tone={soft ? "soft" : "default"}
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`${wo.status} → ${target}`}
        submitLabel={label}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto breve — opcional, queda en audit_log"
          />
        </div>
        {needsEmergencyHint && isSrs && (
          <div className="bg-surface-base rounded-sm p-3 border border-surface-border">
            <DialogCheckbox
              id="emergency"
              label="Override emergency (bypassa guards)"
              checked={emergency}
              onChange={setEmergency}
            />
            <p className="mt-1.5 text-2xs text-text-tertiary font-mono uppercase tracking-widest-srs">
              {isDispatch && "pre-flight all_green, o emergency"}
              {isEnRoute && "briefing acknowledged, o emergency"}
              {isResolve && "tech capture submitted, o emergency"}
            </p>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function PreflightAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const existing = wo.pre_flight_checklist || {};
  const [kit, setKit] = useState(!!existing.kit_verified);
  const [parts, setParts] = useState(!!existing.parts_ready);
  const [siteBible, setSiteBible] = useState(!!existing.site_bible_read);

  const allGreen = kit && parts && siteBible;

  async function submit() {
    await api.post(`/work-orders/${wo.id}/preflight`, {
      checklist: {
        kit_verified: kit,
        parts_ready: parts,
        site_bible_read: siteBible,
        all_green: allGreen,
      },
    });
    reload();
  }

  return (
    <>
      <ActionButton
        onClick={() => setOpen(true)}
        label="Pre-flight checklist"
        tone="soft"
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Pre-flight checklist"
        subtitle="Todo verde desbloquea dispatch sin emergency"
        submitLabel="Guardar"
        onSubmit={submit}
      >
        <DialogCheckbox
          id="kit"
          label="Kit verificado (laptop, cables, herramientas)"
          checked={kit}
          onChange={setKit}
        />
        <DialogCheckbox
          id="parts"
          label="Partes listas (si aplica)"
          checked={parts}
          onChange={setParts}
        />
        <DialogCheckbox
          id="sitebible"
          label="Site Bible leido"
          checked={siteBible}
          onChange={setSiteBible}
        />
        <div
          className={`font-mono text-2xs uppercase tracking-widest-srs mt-2 ${
            allGreen ? "text-success" : "text-text-tertiary"
          }`}
        >
          {allGreen ? "· all_green" : "· falta"}
        </div>
      </ActionDialog>
    </>
  );
}

function AckBriefingAction({ wo, reload }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/acknowledge`, {});
    reload();
  }

  return (
    <>
      <ActionButton
        onClick={() => setOpen(true)}
        label="Acknowledge briefing"
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Acknowledge Copilot briefing"
        subtitle="Requerido antes de marcar en ruta"
        submitLabel="Confirmar"
        onSubmit={submit}
      >
        <p className="font-body text-sm text-text-secondary">
          Confirmo que lei el briefing asignado a este work order. Queda
          registrado en audit_log con mi user_id y timestamp.
        </p>
      </ActionDialog>
    </>
  );
}

function SubmitCaptureAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const [whatFound, setWhatFound] = useState("");
  const [whatDid, setWhatDid] = useState("");
  const [siteNew, setSiteNew] = useState("");
  const [minutes, setMinutes] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");

  const canSubmit = whatFound.trim().length > 0 && whatDid.trim().length > 0;

  async function submit() {
    const body = {
      what_found: whatFound,
      what_did: whatDid,
      anything_new_about_site: siteNew || null,
      time_on_site_minutes: minutes ? parseInt(minutes, 10) : null,
      follow_up_needed: followUp,
      follow_up_notes: followUp ? followUpNotes || null : null,
      devices_touched: [],
      photos: [],
      parts_used: [],
    };
    await api.post(`/work-orders/${wo.id}/capture/submit`, body);
    reload();
  }

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label="Submit capture" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tech Capture"
        subtitle="Ritual post-intervencion — requerido antes de resolver"
        submitLabel="Submit capture"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cap-found">Que encontraste</DialogLabel>
          <DialogTextarea
            id="cap-found"
            rows={3}
            value={whatFound}
            onChange={(e) => setWhatFound(e.target.value)}
            placeholder="Sintomas, causa raiz, estado al llegar"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="cap-did">Que hiciste</DialogLabel>
          <DialogTextarea
            id="cap-did"
            rows={3}
            value={whatDid}
            onChange={(e) => setWhatDid(e.target.value)}
            placeholder="Pasos ejecutados, partes tocadas, resultado"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="cap-new" optional>
            Algo nuevo sobre el sitio
          </DialogLabel>
          <DialogTextarea
            id="cap-new"
            rows={2}
            value={siteNew}
            onChange={(e) => setSiteNew(e.target.value)}
            placeholder="Cambio de acceso, layout, contacto, rack…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <DialogLabel htmlFor="cap-min" optional>
              Tiempo on site (min)
            </DialogLabel>
            <DialogInput
              id="cap-min"
              type="number"
              min="0"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="90"
            />
          </div>
          <div className="flex items-end">
            <DialogCheckbox
              id="cap-follow"
              label="Requiere follow-up"
              checked={followUp}
              onChange={setFollowUp}
            />
          </div>
        </div>
        {followUp && (
          <div>
            <DialogLabel htmlFor="cap-follow-notes" optional>
              Notas follow-up
            </DialogLabel>
            <DialogTextarea
              id="cap-follow-notes"
              rows={2}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="Que falta, para cuando"
            />
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function RateTechAction({ wo, reload, isClient }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState("5");
  const [notes, setNotes] = useState("");

  async function submit() {
    const body = {
      score: parseFloat(score),
      dimensions: {},
      notes: notes || null,
      rated_by_role: isClient ? "client_coordinator" : "srs_coordinator",
    };
    await api.post(`/work-orders/${wo.id}/rate-tech`, body);
    reload();
  }

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label="Rate tech" tone="soft" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rate tech"
        subtitle="Unico por tech por WO — alimenta Skill Passport"
        submitLabel="Rate"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="rate-score">Score (1.0–5.0)</DialogLabel>
          <DialogInput
            id="rate-score"
            type="number"
            min="1"
            max="5"
            step="0.5"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div>
          <DialogLabel htmlFor="rate-notes" optional>
            Comentario
          </DialogLabel>
          <DialogTextarea
            id="rate-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Que destaco, que pulir"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function CancelAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit() {
    await api.post(`/work-orders/${wo.id}/cancel`, { reason });
    reload();
  }

  const canSubmit = reason.trim().length > 0;

  return (
    <>
      <ActionButton
        onClick={() => setOpen(true)}
        label="Cancelar WO"
        tone="destructive"
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancelar work order"
        subtitle="Accion irreversible — sella threads y emite audit_log"
        submitLabel="Cancelar WO"
        destructive
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cancel-reason">Razon</DialogLabel>
          <DialogTextarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cliente retiro, out of scope, duplicado…"
            required
          />
        </div>
      </ActionDialog>
    </>
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

// -------------------- Scan equipment action --------------------
//
// Tech on-site registra equipment que encontro (Domain 11 Asset Management).
// Backend crea/update asset + inserta asset_event (append-only). Si el serial
// ya existia en otro site, el event_type es 'relocated'; si es nuevo,
// 'installed'; si esta en el mismo site, 'inspected'.
//
// Despues de scan, el assetId + event_type vuelven y los mostramos en una
// lista in-dialog (session buffer) para que el tech vea lo que lleva escaneado
// sin cerrar el dialog.

const CATEGORY_OPTIONS = [
  { v: "", l: "— elegir —" },
  { v: "switch", l: "switch" },
  { v: "router", l: "router" },
  { v: "firewall", l: "firewall" },
  { v: "access_point", l: "access point" },
  { v: "ups", l: "UPS" },
  { v: "display", l: "display/TV" },
  { v: "printer", l: "printer" },
  { v: "camera", l: "camera" },
  { v: "server", l: "server" },
  { v: "storage", l: "storage" },
  { v: "cable", l: "cable" },
  { v: "other", l: "other" },
];

function ScanEquipmentAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const [serial, setSerial] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [recent, setRecent] = useState([]); // session buffer

  function resetForm() {
    setSerial("");
    setAssetTag("");
    setMake("");
    setModel("");
    setCategory("");
    setNotes("");
  }

  async function submit() {
    const body = {
      serial_number: serial.trim(),
      asset_tag: assetTag.trim() || null,
      make: make.trim() || null,
      model: model.trim() || null,
      category: category || null,
      notes: notes.trim() || null,
    };
    const result = await api.post(
      `/sites/${wo.site_id}/equipment/scan`,
      body
    );
    setRecent((r) => [
      {
        ...result,
        make,
        model,
        asset_tag: assetTag || null,
        ts: new Date().toISOString(),
      },
      ...r,
    ].slice(0, 10));
    resetForm();
    reload();
    // Keep dialog open — tech is typically scanning multiple items
  }

  function close() {
    setOpen(false);
    // Clear session buffer when dialog closes
    setTimeout(() => setRecent([]), 300);
  }

  const canSubmit = serial.trim().length >= 2;

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label="Scan equipment" />
      <ActionDialog
        open={open}
        onClose={close}
        title="Scan equipment on-site"
        subtitle={`Site ${shortId(wo.site_id)} · crea asset + evento append-only (Domain 11)`}
        submitLabel="Registrar scan"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="scan-serial">Serial number</DialogLabel>
          <DialogInput
            id="scan-serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="e.g. FOC1234X567"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="scan-tag" optional>
              Asset tag
            </DialogLabel>
            <DialogInput
              id="scan-tag"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="inventory tag"
              autoCapitalize="characters"
            />
          </div>
          <div>
            <DialogLabel htmlFor="scan-cat" optional>
              Categoria
            </DialogLabel>
            <select
              id="scan-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="scan-make" optional>
              Make
            </DialogLabel>
            <DialogInput
              id="scan-make"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Cisco, HP, Samsung…"
            />
          </div>
          <div>
            <DialogLabel htmlFor="scan-model" optional>
              Model
            </DialogLabel>
            <DialogInput
              id="scan-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="C9300-24T, QM55R…"
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="scan-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="scan-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ubicacion en rack, condicion, serial ilegible…"
          />
        </div>

        {/* Session buffer: lo que el tech lleva scaneado en esta apertura */}
        {recent.length > 0 && (
          <div className="pt-3 border-t border-surface-border">
            <div className="label-caps mb-2">
              Scaneados en esta sesion ({recent.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {recent.map((r, i) => (
                <div
                  key={i}
                  className="bg-surface-base rounded-sm px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-text-primary truncate">
                      {r.serial_number}
                    </div>
                    {(r.make || r.model) && (
                      <div className="font-mono text-2xs text-text-tertiary truncate">
                        {[r.make, r.model].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-mono text-2xs uppercase tracking-widest-srs ${
                      r.event_type === "installed"
                        ? "text-success"
                        : r.event_type === "relocated"
                        ? "text-warning"
                        : "text-text-secondary"
                    }`}
                  >
                    {r.event_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

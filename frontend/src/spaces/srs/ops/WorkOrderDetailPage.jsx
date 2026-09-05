/**
 * SRS Ops · Work Order detail · v2 paleta F (Iter 2.33).
 *
 * Pasito C (read-only view) + Pasito G (actions: advance / cancel /
 * preflight / briefing ack / capture submit / rate tech / scan equipment).
 *
 * Buttons render based on (current status × user role × tech assignment).
 * State machine legality is enforced by the backend; the UI just hides lo
 * que daría 400.
 *
 * NOTA: 5 sub-components imported (BriefingSection, CaptureSection,
 * PartsSection, ThreadsSection, CostSnapshotAction) siguen v1 — sprints
 * propios (Iter 2.34-2.36). El chrome de la página principal + ActionBar
 * + Cost AfterHours están en paleta F.
 */
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFetch } from "../../../lib/useFetch";
import { api, uploadFile } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { formatAge } from "../../../components/ui/Badges";
import {
  driftMinutes,
  driftColors,
  timeOnSiteMinutes,
  formatMinutes as formatMinutesHuman,
} from "../../../lib/wo-metrics";
import ActionDialog, {
  DialogLabel,
  DialogInput,
  DialogTextarea,
  DialogCheckbox,
  DialogSelect,
} from "../../../components/ui/ActionDialog";
import AuthImage from "../../../components/ui/AuthImage";
import BriefingSection from "../../../components/workorder/BriefingSection";
import CaptureSection from "../../../components/workorder/CaptureSection";
import CostSnapshotAction from "../../../components/workorder/CostSnapshotAction";
import PartsSection from "../../../components/workorder/PartsSection";
import ThreadsSection from "../../../components/workorder/ThreadsSection";
import {
  WoStatusPill,
  SeverityPill,
  ShieldPill,
  BallPill,
} from "../../../components/v2-shared/Pills";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import MetaRow from "../../../components/v2-shared/MetaRow";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const STAGE_KEYS = [
  { key: "intake",     i18n: "stage_intake" },
  { key: "triage",     i18n: "stage_triage" },
  { key: "pre_flight", i18n: "stage_preflight" },
  { key: "dispatched", i18n: "stage_dispatched" },
  { key: "en_route",   i18n: "stage_en_route" },
  { key: "on_site",    i18n: "stage_on_site" },
  { key: "resolved",   i18n: "stage_resolved" },
  { key: "closed",     i18n: "stage_closed" },
];

export default function WorkOrderDetailPage() {
  const { t } = useTranslation("common");
  const STAGES = useMemo(
    () => STAGE_KEYS.map((s) => ({ ...s, label: t(`page_wo_detail.${s.i18n}`) })),
    [t]
  );
  const { wo_id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const { data: wo, loading, error, reload } = useFetch(
    `/work-orders/${wo_id}`,
    { deps: [wo_id] }
  );

  if (loading) return <CenteredMessage text={t("common.loading")} />;
  if (error) return <CenteredMessage text={`error: ${error.message}`} />;
  if (!wo) return <CenteredMessage text="—" />;

  const isSrs = !!user?.memberships?.some((m) => m.space === "srs_coordinators");
  const isClient = !!user?.memberships?.some((m) => m.space === "client_coordinator");
  const isAssignedTech =
    !!user?.memberships?.some((m) => m.space === "tech_field") &&
    wo.assigned_tech_user_id === user?.id;

  const inTech = location.pathname.startsWith("/tech");
  const inClientSpace = location.pathname.startsWith("/client");
  const backHref = inTech ? "/tech" : inClientSpace ? "/client" : "/srs/ops";
  const backLabel = inTech ? t("page_wo_detail.back_my_work") : inClientSpace ? t("page_wo_detail.back_status") : t("page_wo_detail.back_work_orders");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to={backHref} label={backLabel} />

      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Work Order
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {wo.reference}
          </span>
          <SeverityPill severity={wo.severity} />
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {wo.title}
        </h1>
        {wo.description && (
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13.5,
              color: "#3D4A66",
              marginTop: 10,
              maxWidth: 920,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            {wo.description}
          </p>
        )}
      </div>

      {/* Actions bar */}
      <ActionBar
        wo={wo}
        reload={reload}
        isSrs={isSrs}
        isClient={isClient}
        isAssignedTech={isAssignedTech}
      />

      {/* State + Ball banner */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
          <StateBlock label={t("page_wo_detail.state_status")} value={<WoStatusPill status={wo.status} />} />
          <StateBlock
            label={t("page_wo_detail.state_ball")}
            value={<BallPill side={wo.ball_in_court?.side} />}
            hint={wo.ball_in_court?.reason}
          />
          <StateBlock label={t("page_wo_detail.state_shield")} value={<ShieldPill level={wo.shield_level} />} />
          <StateBlock
            label={t("page_wo_detail.state_deadline_resolve")}
            value={
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  color: "#0A1628",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDeadline(wo.deadline_resolve_at, wo.status)}
              </span>
            }
          />
          {wo.closed_at && (
            <StateBlock
              label={t("page_wo_detail.state_closed")}
              value={
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    color: "#0A6131",
                    fontWeight: 700,
                  }}
                >
                  {new Date(wo.closed_at).toLocaleString()}
                </span>
              }
            />
          )}
          {/* Iter 2.63j · Q5 Agustín · drift de llegada (scheduled vs on_site) */}
          {(() => {
            const drift = driftMinutes(wo);
            if (drift == null) return null;
            const colors = driftColors(drift);
            const label = drift >= 0
              ? t("page_wo_detail.state_drift_late", { delta: formatMinutesHuman(drift) })
              : t("page_wo_detail.state_drift_early", { delta: formatMinutesHuman(Math.abs(drift)) });
            return (
              <StateBlock
                label={t("page_wo_detail.state_drift_arrival")}
                value={
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      fontWeight: 700,
                      background: colors.bg,
                      color: colors.fg,
                      padding: "3px 10px",
                      borderRadius: 6,
                    }}
                    title={t("page_wo_detail.state_drift_title", {
                      scheduled: wo.scheduled_at ? new Date(wo.scheduled_at).toLocaleString() : "—",
                      arrived: wo.status_timestamps?.on_site
                        ? new Date(wo.status_timestamps.on_site).toLocaleString()
                        : "—",
                    })}
                  >
                    {label}
                  </span>
                }
              />
            );
          })()}
          {/* Iter 2.63j · Q6 Agustín · tiempo on-site (lapso del servicio) */}
          {(() => {
            const mins = timeOnSiteMinutes(wo);
            if (mins == null) return null;
            return (
              <StateBlock
                label={t("page_wo_detail.state_time_on_site")}
                value={
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: "#0A1628",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMinutesHuman(mins)}
                  </span>
                }
              />
            );
          })()}
        </div>
      </SectionCard>

      {/* 7-stage timeline */}
      <SectionCard style={{ marginBottom: 16 }}>
        <SectionTitle>{t("page_wo_detail.section_state_machine")}</SectionTitle>
        <StageTimeline currentStatus={wo.status} stages={STAGES} />
      </SectionCard>

      {/* Metadata + Pre-flight grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <SectionCard>
          <SectionTitle>{t("page_wo_detail.section_metadata")}</SectionTitle>
          <dl style={{ display: "flex", flexDirection: "column" }}>
            <MetaRow label={t("page_wo_detail.meta_client_org")} value={shortId(wo.organization_id)} />
            <MetaRow
              label="Site"
              value={
                wo.site_id ? (
                  <Link
                    to={`/srs/sites/${wo.site_id}`}
                    style={dottedLink}
                  >
                    {shortId(wo.site_id)} ↗
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <MetaRow
              label={t("page_wo_detail.meta_service_agreement")}
              value={
                wo.service_agreement_id && !inClientSpace ? (
                  <Link to={`/srs/agreements/${wo.service_agreement_id}`} style={dottedLink}>
                    {shortId(wo.service_agreement_id)} ↗
                  </Link>
                ) : (
                  shortId(wo.service_agreement_id)
                )
              }
            />
            <MetaRow label={t("page_wo_detail.meta_srs_coord")} value={shortId(wo.srs_coordinator_user_id)} />
            <MetaRow
              label={t("page_wo_detail.meta_tech")}
              value={shortId(wo.assigned_tech_user_id) || "—"}
            />
            <MetaRow
              label={t("page_wo_detail.meta_noc")}
              value={shortId(wo.noc_operator_user_id) || "—"}
            />
            <MetaRow
              label={t("page_wo_detail.meta_resident")}
              value={shortId(wo.onsite_resident_user_id) || "—"}
            />
            {wo.project_id && <MetaRow label={t("page_wo_detail.meta_project")} value={shortId(wo.project_id)} />}
            {wo.cluster_group_id && (
              <MetaRow label={t("page_wo_detail.meta_cluster")} value={shortId(wo.cluster_group_id)} />
            )}
            <MetaRow
              label={t("page_wo_detail.meta_opened")}
              value={wo.created_at ? new Date(wo.created_at).toLocaleString() : "—"}
            />
            <MetaRow
              label={t("page_wo_detail.meta_last_update")}
              value={wo.updated_at ? formatAge(wo.updated_at) + " ago" : "—"}
            />
          </dl>
        </SectionCard>

        <SectionCard>
          <SectionTitle>{t("page_wo_detail.section_preflight_handshakes")}</SectionTitle>
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
              Pre-flight checklist
            </div>
            <PreflightBlock checklist={wo.pre_flight_checklist} />
          </div>
          <div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
              Handshakes ({wo.handshakes?.length || 0})
            </div>
            {(!wo.handshakes || wo.handshakes.length === 0) && (
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
                — ninguno aún —
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wo.handshakes?.map((h, i) => <HandshakeRow key={i} h={h} />)}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* SLA snapshot */}
      {wo.sla_snapshot && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle>SLA snapshot (fijado al intake)</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            <SlaItem label={t("page_wo_detail.sla_receive")} minutes={wo.sla_snapshot.receive_minutes} />
            <SlaItem label={t("page_wo_detail.sla_resolve")} minutes={wo.sla_snapshot.resolve_minutes} />
            <SlaItem label={t("page_wo_detail.sla_photos")} text={wo.sla_snapshot.photos_required} />
            <SlaItem label="24×7" text={wo.sla_snapshot.coverage_247 ? t("common.yes") : t("common.no")} />
          </div>
        </SectionCard>
      )}

      {/* Sub-components v1 (sprints propios) */}
      <BriefingSection wo={wo} isSrs={isSrs} isAssignedTech={isAssignedTech} />
      <CaptureSection wo={wo} isSrs={isSrs} isAssignedTech={isAssignedTech} />
      <ThreadsSection wo={wo} isSrs={isSrs} isClient={isClient} isAssignedTech={isAssignedTech} />
      <PartsSection wo={wo} isSrs={isSrs} isClient={isClient} />

      {/* Cost snapshot · SRS internal */}
      {isSrs && <CostAfterHoursSection wo={wo} reload={reload} />}

      {/* Intervention Report link */}
      {wo.status === "closed" && (
        <SectionCard style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <SectionTitle marginBottom={2}>{t("page_wo_detail.section_intervention_report")}</SectionTitle>
              <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", fontWeight: 500 }}>
                Reporte final auto-ensamblado al cierre · 5 canales emit
              </p>
            </div>
            <Link
              to={`${inTech ? "/tech" : inClientSpace ? "/client" : "/srs"}/ops/${wo_id}/report`}
              className="btn-trigger-v2"
              style={{ textDecoration: "none" }}
            >
              Abrir reporte →
            </Link>
          </div>
        </SectionCard>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Iter 2.33 · state-machine vivo · audit_log graba todo
      </p>
    </div>
  );
}

const dottedLink = {
  color: "#0A1628",
  fontWeight: 800,
  textDecoration: "underline",
  textDecorationStyle: "dotted",
};

/* ─── Action bar + actions ─────────────────────────────────────── */

// Targets metadata · `i18n` resuelve la label dinámicamente según el idioma actual.
const ADVANCE_TARGETS = {
  intake:     [{ to: "triage",     i18n: "tx_to_triage" }],
  triage:     [{ to: "pre_flight", i18n: "tx_to_preflight" }],
  pre_flight: [
    { to: "dispatched", i18n: "tx_dispatch" },
    { to: "triage",     i18n: "tx_back_triage", soft: true },
  ],
  dispatched: [
    { to: "en_route",   i18n: "tx_to_en_route" },
    { to: "triage",     i18n: "tx_back_triage", soft: true },
  ],
  en_route:   [{ to: "on_site",  i18n: "tx_check_in", handshake: "check_in" }],
  on_site:    [
    { to: "resolved",  i18n: "tx_resolve",        handshake: "resolution" },
    { to: "en_route",  i18n: "tx_step_out_parts", soft: true },
  ],
  resolved:   [
    { to: "closed",    i18n: "tx_close",          handshake: "closure" },
    { to: "on_site",   i18n: "tx_reopen_on_site", soft: true },
  ],
  closed:     [],
  cancelled:  [],
};

function ActionBar({ wo, reload, isSrs, isClient, isAssignedTech }) {
  const { t } = useTranslation("common");
  const status = wo.status;
  const isTerminal = status === "closed" || status === "cancelled";

  const srsOnlyTargets = new Set(["triage", "pre_flight", "closed"]);
  const srsOrTechTargets = new Set(["en_route", "on_site", "resolved"]);

  const availableAdvance = (ADVANCE_TARGETS[status] || []).filter((t) => {
    if (srsOnlyTargets.has(t.to)) return isSrs;
    if (srsOrTechTargets.has(t.to)) return isSrs || isAssignedTech;
    return isSrs;
  });

  const canRate =
    (isSrs || isClient) &&
    (status === "resolved" || status === "closed") &&
    !!wo.assigned_tech_user_id;
  const canCancel = isSrs && !isTerminal;
  const canPreflight = (isSrs || isAssignedTech) && status === "pre_flight";
  const canAckBriefing = isAssignedTech && status === "dispatched";
  const canSubmitCapture = isAssignedTech && status === "on_site";
  const canScan =
    ((isAssignedTech && status === "on_site") || (isSrs && !isTerminal)) &&
    !!wo.site_id;

  const hasAny =
    availableAdvance.length > 0 ||
    canRate || canCancel || canPreflight || canAckBriefing || canSubmitCapture || canScan;

  if (!hasAny) return null;

  return (
    <SectionCard style={{ marginBottom: 16 }}>
      <SectionTitle>{t("page_wo_detail.section_actions")}</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {availableAdvance.map((tx) => (
          <AdvanceAction
            key={tx.to}
            wo={wo}
            target={tx.to}
            label={t(`page_wo_detail.${tx.i18n}`)}
            handshake={tx.handshake}
            soft={tx.soft}
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
    </SectionCard>
  );
}

function ActionButton({ onClick, label, tone = "default" }) {
  const styles = {
    default: {
      bg: "#0A1628", color: "#FFFFFF", border: "#0A1628",
      hoverBg: "#1A2640", shadow: "rgba(10, 22, 40, 0.32)",
    },
    soft: {
      bg: "#FFFFFF", color: "#3D4A66", border: "#C8CDD8",
      hoverBg: "#F4F6F8", hoverColor: "#0A1628", hoverBorder: "#0A1628",
    },
    destructive: {
      bg: "#DC2626", color: "#FFFFFF", border: "#DC2626",
      hoverBg: "#991B1B", shadow: "rgba(220, 38, 38, 0.32)",
    },
  };
  const s = styles[tone] || styles.default;
  const isSoft = tone === "soft";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: s.bg,
        color: s.color,
        border: `1.5px solid ${s.border}`,
        borderRadius: 6,
        cursor: "pointer",
        boxShadow: isSoft ? "none" : `0 2px 6px -1px ${s.shadow}`,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = s.hoverBg;
        if (s.hoverColor) e.currentTarget.style.color = s.hoverColor;
        if (s.hoverBorder) e.currentTarget.style.borderColor = s.hoverBorder;
        if (!isSoft) e.currentTarget.style.boxShadow = `0 4px 12px -2px ${s.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = s.bg;
        e.currentTarget.style.color = s.color;
        e.currentTarget.style.borderColor = s.border;
        if (!isSoft) e.currentTarget.style.boxShadow = `0 2px 6px -1px ${s.shadow}`;
      }}
    >
      {label}
    </button>
  );
}

function AdvanceAction({ wo, target, label, handshake, soft, isSrs, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [techId, setTechId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const isDispatch = wo.status === "pre_flight" && target === "dispatched";
  const isEnRoute = wo.status === "dispatched" && target === "en_route";
  const isResolve = wo.status === "on_site" && target === "resolved";
  const needsEmergencyHint = isDispatch || isEnRoute || isResolve;

  const earlyStage = isSrs && ["triage", "pre_flight", "dispatched"].includes(target);
  const { data: users } = useFetch(open && earlyStage ? "/users" : null, {
    auto: open && earlyStage,
    deps: [open],
  });
  const techs = useMemo(
    () =>
      (users || []).filter((u) =>
        (u.memberships || []).some((m) => m.space === "tech_field" && m.active)
      ),
    [users]
  );

  async function submit() {
    const body = { target_status: target, notes: notes || undefined };
    if (handshake) body.handshake = handshake;
    if (emergency) body.emergency = true;
    if (earlyStage && techId) body.assigned_tech_user_id = techId;
    if (earlyStage && scheduledAt) body.scheduled_at = new Date(scheduledAt).toISOString();
    await api.post(`/work-orders/${wo.id}/advance`, body);
    reload();
  }

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label={label} tone={soft ? "soft" : "default"} />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`${wo.status} → ${target}`}
        submitLabel={label}
        onSubmit={submit}
      >
        {earlyStage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="adv-tech" optional>
                {t("wo_modal.advance_tech_label", { defaultValue: "Tech asignado" })}
              </DialogLabel>
              <DialogSelect
                id="adv-tech"
                value={techId}
                onChange={setTechId}
                options={[
                  {
                    v: "",
                    l: wo.assigned_tech_user_id
                      ? t("wo_modal.advance_tech_keep", { defaultValue: "— mantener actual —" })
                      : t("wo_modal.advance_tech_none", { defaultValue: "— sin asignar —" }),
                  },
                  ...techs.map((u) => ({
                    v: u.id,
                    l: `${u.full_name} · ${u.employment_type || "—"}`,
                  })),
                ]}
              />
            </div>
            <div>
              <DialogLabel htmlFor="adv-sched" optional>
                {t("wo_modal.advance_schedule_label", { defaultValue: "Fecha programada" })}
              </DialogLabel>
              <DialogInput
                id="adv-sched"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>
        )}
        <div>
          <DialogLabel htmlFor="notes" optional>{t("wo_modal.advance_notes_label")}</DialogLabel>
          <DialogTextarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("wo_modal.advance_notes_placeholder")}
          />
        </div>
        {needsEmergencyHint && isSrs && (
          <div
            style={{
              background: "#F4F6F8",
              border: "1px solid #E2E5EC",
              borderLeft: "3px solid #E8A33D",
              borderRadius: 4,
              padding: 12,
            }}
          >
            <DialogCheckbox
              id="emergency"
              label={t("wo_modal.advance_emergency_label")}
              checked={emergency}
              onChange={setEmergency}
            />
            <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#7E5212", letterSpacing: "0.14em", marginTop: 6, fontWeight: 600 }}>
              {isDispatch && t("wo_modal.emergency_hint_dispatch")}
              {isEnRoute && t("wo_modal.emergency_hint_en_route")}
              {isResolve && t("wo_modal.emergency_hint_resolve")}
            </p>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function PreflightAction({ wo, reload }) {
  const { t } = useTranslation("common");
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
      <ActionButton onClick={() => setOpen(true)} label={t("wo_modal.preflight_btn")} tone="soft" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_modal.preflight_title")}
        subtitle={t("wo_modal.preflight_subtitle")}
        submitLabel={t("wo_modal.preflight_save")}
        onSubmit={submit}
      >
        <DialogCheckbox
          id="kit"
          label={t("wo_modal.preflight_kit")}
          checked={kit}
          onChange={setKit}
        />
        <DialogCheckbox
          id="parts"
          label={t("wo_modal.preflight_parts")}
          checked={parts}
          onChange={setParts}
        />
        <DialogCheckbox
          id="sitebible"
          label={t("wo_modal.preflight_site_bible")}
          checked={siteBible}
          onChange={setSiteBible}
        />
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            letterSpacing: "0.14em",
            marginTop: 8,
            color: allGreen ? "#0A6131" : "#8B95A8",
            fontWeight: 800,
          }}
        >
          {allGreen ? t("wo_modal.preflight_all_green") : t("wo_modal.preflight_missing")}
        </div>
      </ActionDialog>
    </>
  );
}

function AckBriefingAction({ wo, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/acknowledge`, {});
    reload();
  }

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label={t("wo_modal.ack_btn")} />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_modal.ack_title")}
        subtitle={t("wo_modal.ack_subtitle")}
        submitLabel={t("wo_modal.ack_submit")}
        onSubmit={submit}
      >
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          {t("wo_modal.ack_body")}
        </p>
      </ActionDialog>
    </>
  );
}

function SubmitCaptureAction({ wo, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [whatFound, setWhatFound] = useState("");
  const [whatDid, setWhatDid] = useState("");
  const [siteNew, setSiteNew] = useState("");
  const [minutes, setMinutes] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [photos, setPhotos] = useState([]);

  const canSubmit =
    whatFound.trim().length > 0 &&
    whatDid.trim().length > 0 &&
    photos.every((p) => !p.uploading && !p.error);

  async function handleFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    const placeholders = list.map((f) => ({
      local_id: `pending-${Math.random()}-${f.name}`,
      url: null,
      kind: f.type.startsWith("image/") ? "image" : "file",
      label: f.name,
      size_bytes: f.size,
      uploading: true,
      error: null,
    }));
    setPhotos((p) => [...p, ...placeholders]);

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const placeholder = placeholders[i];
      try {
        const up = await uploadFile(file);
        setPhotos((prev) =>
          prev.map((row) =>
            row.local_id === placeholder.local_id
              ? {
                  url: up.url,
                  kind: up.kind === "image" ? "image" : "file",
                  label: up.filename || file.name,
                  size_bytes: up.size_bytes,
                  uploading: false,
                  error: null,
                }
              : row
          )
        );
      } catch (err) {
        setPhotos((prev) =>
          prev.map((row) =>
            row.local_id === placeholder.local_id
              ? { ...row, uploading: false, error: err.message || "upload fail" }
              : row
          )
        );
      }
    }
  }

  function removePhoto(idx) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  async function submit() {
    const body = {
      what_found: whatFound,
      what_did: whatDid,
      anything_new_about_site: siteNew || null,
      time_on_site_minutes: minutes ? parseInt(minutes, 10) : null,
      follow_up_needed: followUp,
      follow_up_notes: followUp ? followUpNotes || null : null,
      devices_touched: [],
      photos: photos
        .filter((p) => p.url && !p.error)
        .map((p) => ({
          url: p.url,
          kind: p.kind,
          label: p.label,
          size_bytes: p.size_bytes,
        })),
      parts_used: [],
    };
    await api.post(`/work-orders/${wo.id}/capture/submit`, body);
    reload();
  }

  const uploading = photos.some((p) => p.uploading);

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label={t("wo_modal.capture_btn")} />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_modal.capture_title")}
        subtitle={t("wo_modal.capture_subtitle")}
        submitLabel={uploading ? t("wo_modal.capture_uploading") : t("wo_modal.capture_btn")}
        submitDisabled={!canSubmit || uploading}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cap-found">{t("wo_modal.capture_what_found_label")}</DialogLabel>
          <DialogTextarea
            id="cap-found"
            rows={3}
            value={whatFound}
            onChange={(e) => setWhatFound(e.target.value)}
            placeholder={t("wo_modal.capture_what_found_placeholder")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="cap-did">{t("wo_modal.capture_what_did_label")}</DialogLabel>
          <DialogTextarea
            id="cap-did"
            rows={3}
            value={whatDid}
            onChange={(e) => setWhatDid(e.target.value)}
            placeholder={t("wo_modal.capture_what_did_placeholder")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="cap-new" optional>
            {t("wo_modal.capture_site_new_label")}
          </DialogLabel>
          <DialogTextarea
            id="cap-new"
            rows={2}
            value={siteNew}
            onChange={(e) => setSiteNew(e.target.value)}
            placeholder={t("wo_modal.capture_site_new_placeholder")}
          />
        </div>

        <div>
          <DialogLabel htmlFor="cap-photos" optional>
            {t("wo_modal.capture_photos_label")}
          </DialogLabel>
          <input
            id="cap-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            multiple
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            style={{
              display: "block",
              width: "100%",
              fontSize: 13,
              color: "#0A1628",
              fontFamily: JAKARTA,
              cursor: "pointer",
            }}
          />
          {photos.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {photos.map((p, i) => (
                <div
                  key={p.local_id || p.url || i}
                  style={{
                    position: "relative",
                    background: "#F4F6F8",
                    border: "1px solid #E2E5EC",
                    borderRadius: 4,
                    overflow: "hidden",
                    aspectRatio: "1 / 1",
                  }}
                >
                  {p.uploading ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...MONO_CAPS,
                        fontSize: 9.5,
                        color: "#8B95A8",
                        letterSpacing: "0.14em",
                      }}
                    >
                      {t("wo_modal.capture_photo_uploading")}
                    </div>
                  ) : p.error ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...MONO_CAPS,
                        fontSize: 9.5,
                        color: "#991B1B",
                        letterSpacing: "0.14em",
                        padding: 4,
                        textAlign: "center",
                      }}
                    >
                      {p.error}
                    </div>
                  ) : p.kind === "image" ? (
                    <AuthImage
                      src={p.url}
                      alt={p.label}
                      thumb
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...MONO_CAPS,
                        fontSize: 9.5,
                        color: "#3D4A66",
                        letterSpacing: "0.14em",
                        padding: 4,
                        textAlign: "center",
                      }}
                    >
                      {p.label || t("wo_modal.capture_photo_file_fallback")}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    title={t("wo_modal.capture_photo_remove")}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(255,255,255,0.92)",
                      border: "1px solid #FCA5A5",
                      borderRadius: 4,
                      padding: "2px 6px",
                      ...MONO_CAPS,
                      fontSize: 9.5,
                      color: "#991B1B",
                      letterSpacing: "0.14em",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <DialogLabel htmlFor="cap-min" optional>
              {t("wo_modal.capture_minutes_label")}
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
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <DialogCheckbox
              id="cap-follow"
              label={t("wo_modal.capture_followup_label")}
              checked={followUp}
              onChange={setFollowUp}
            />
          </div>
        </div>
        {followUp && (
          <div>
            <DialogLabel htmlFor="cap-follow-notes" optional>
              {t("wo_modal.capture_followup_notes_label")}
            </DialogLabel>
            <DialogTextarea
              id="cap-follow-notes"
              rows={2}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder={t("wo_modal.capture_followup_placeholder")}
            />
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function RateTechAction({ wo, reload, isClient }) {
  const { t } = useTranslation("common");
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
      <ActionButton onClick={() => setOpen(true)} label={t("wo_modal.rate_btn")} tone="soft" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_modal.rate_title")}
        subtitle={t("wo_modal.rate_subtitle")}
        submitLabel={t("wo_modal.rate_submit")}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="rate-score">{t("wo_modal.rate_score_label")}</DialogLabel>
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
            {t("wo_modal.rate_comment_label")}
          </DialogLabel>
          <DialogTextarea
            id="rate-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("wo_modal.rate_comment_placeholder")}
          />
        </div>
      </ActionDialog>
    </>
  );
}

function CancelAction({ wo, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit() {
    await api.post(`/work-orders/${wo.id}/cancel`, { reason });
    reload();
  }

  const canSubmit = reason.trim().length > 0;

  return (
    <>
      <ActionButton onClick={() => setOpen(true)} label={t("wo_modal.cancel_btn")} tone="destructive" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_modal.cancel_title")}
        subtitle={t("wo_modal.cancel_subtitle")}
        submitLabel={t("wo_modal.cancel_submit")}
        destructive
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cancel-reason">{t("wo_modal.cancel_reason_label")}</DialogLabel>
          <DialogTextarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("wo_modal.cancel_reason_placeholder")}
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

/* ─── CostAfterHoursSection (X-g) ──────────────────────────────── */

function CostAfterHoursSection({ wo, reload }) {
  const cs = wo.cost_snapshot || null;
  const currency = cs?.currency || "USD";
  const directCost =
    (cs?.labor || 0) + (cs?.parts || 0) + (cs?.travel || 0) + (cs?.other || 0);
  const coordCost =
    (cs?.coordination_hours || 0) * (cs?.coordination_hourly_rate || 0);

  async function toggleAfterHours() {
    try {
      await api.post(`/work-orders/${wo.id}/after-hours`, {
        after_hours: !wo.after_hours,
      });
      reload();
    } catch (e) {
      alert(e.message || "error");
    }
  }

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionTitle marginBottom={4}>Cost snapshot · SRS internal</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {cs
              ? `${directCost.toFixed(2)} ${currency} direct` +
                (coordCost > 0 ? ` · ${coordCost.toFixed(2)} coord` : "")
              : "Sin registrar — carga lo que gastaste"}
          </div>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
            Alimenta P&L · no facturable al cliente
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={toggleAfterHours}
            title="Marca si la WO se ejecutó en horario nocturno / fin de semana — aplica multiplier del rate_card"
            style={{
              ...MONO_CAPS,
              fontSize: 11,
              letterSpacing: "0.14em",
              padding: "8px 14px",
              background: wo.after_hours ? "#E8A33D" : "#FFFFFF",
              color: wo.after_hours ? "#FFFFFF" : "#3D4A66",
              border: `1.5px solid ${wo.after_hours ? "#E8A33D" : "#C8CDD8"}`,
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              if (wo.after_hours) {
                e.currentTarget.style.background = "#7E5212";
                e.currentTarget.style.borderColor = "#7E5212";
              } else {
                e.currentTarget.style.color = "#7E5212";
                e.currentTarget.style.borderColor = "#E8A33D";
              }
            }}
            onMouseLeave={(e) => {
              if (wo.after_hours) {
                e.currentTarget.style.background = "#E8A33D";
                e.currentTarget.style.borderColor = "#E8A33D";
              } else {
                e.currentTarget.style.color = "#3D4A66";
                e.currentTarget.style.borderColor = "#C8CDD8";
              }
            }}
          >
            {wo.after_hours ? "✓ after-hours" : "after-hours"}
          </button>
          <CostSnapshotAction wo={wo} reload={reload} />
        </div>
      </header>

      {cs && (
        <div
          style={{
            padding: "14px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <CostPill label="Labor" value={cs.labor} currency={currency} />
          <CostPill label="Parts" value={cs.parts} currency={currency} />
          <CostPill label="Travel" value={cs.travel} currency={currency} />
          <CostPill label="Other" value={cs.other} currency={currency} />
          <CostPill
            label="Coord absorbido"
            value={coordCost || null}
            currency={currency}
            hint={
              cs.coordination_hours
                ? `${cs.coordination_hours}h × ${cs.coordination_hourly_rate || 0}`
                : null
            }
            tone="warning"
          />
        </div>
      )}
      {cs?.notes && (
        <div style={{ padding: "0 18px 14px" }}>
          <div
            style={{
              background: "#F4F6F8",
              border: "1px solid #E2E5EC",
              borderRadius: 4,
              padding: "10px 12px",
            }}
          >
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
              Notas
            </div>
            <p
              style={{
                fontFamily: JAKARTA,
                fontSize: 13,
                color: "#0A1628",
                whiteSpace: "pre-line",
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              {cs.notes}
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function CostPill({ label, value, currency, hint, tone = "default" }) {
  const valueColor = tone === "warning" ? "#7E5212" : "#0A1628";
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 16,
          fontWeight: 800,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value != null ? value.toFixed(2) : "—"}
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
        {value != null ? currency : "sin cargar"}
        {hint && ` · ${hint}`}
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────── */

function StateBlock({ label, value, hint }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div>{value}</div>
      {hint && (
        <div style={{ fontFamily: JAKARTA, fontSize: 11, color: "#8B95A8", marginTop: 4, fontWeight: 500 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function StageTimeline({ currentStatus, stages }) {
  const isCancelled = currentStatus === "cancelled";
  if (isCancelled) {
    return (
      <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#991B1B", fontWeight: 600 }}>
        Cancelled · flujo normal no aplica
      </div>
    );
  }
  const currentIdx = stages.findIndex((s) => s.key === currentStatus);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
      {stages.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const dotBg = active ? "#0A1628" : done ? "#16A34A" : "#C8CDD8";
        const labelColor = active ? "#0A1628" : done ? "#3D4A66" : "#8B95A8";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px" }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: dotBg,
                  marginBottom: 6,
                  boxShadow: active ? "0 0 0 3px rgba(10, 22, 40, 0.18)" : "none",
                }}
              />
              <div
                style={{
                  ...MONO_CAPS,
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  color: labelColor,
                  whiteSpace: "nowrap",
                  fontWeight: active ? 800 : 700,
                }}
              >
                {s.label}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div
                style={{
                  height: 1,
                  width: 24,
                  background: done ? "#16A34A" : "#E2E5EC",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreflightBlock({ checklist }) {
  const items = Object.entries(checklist || {});
  if (items.length === 0) {
    return (
      <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        — sin checklist aún —
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(([key, val]) => {
        const dotColor =
          val === true ? "#16A34A" : val === false ? "#DC2626" : "#C8CDD8";
        return (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: JAKARTA, fontSize: 13 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor }} />
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {key}
            </span>
            <span style={{ color: "#0A1628", fontWeight: 600 }}>{String(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

function HandshakeRow({ h }) {
  const geo = h.lat != null && h.lng != null ? `${h.lat.toFixed(3)}, ${h.lng.toFixed(3)}` : null;
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.14em" }}>
          {h.kind}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
          {h.ts ? formatAge(h.ts) + " ago" : "—"}
        </div>
      </div>
      {h.notes && (
        <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", marginTop: 6, fontWeight: 500 }}>
          {h.notes}
        </div>
      )}
      {geo && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 4 }}>
          geo {geo}
        </div>
      )}
    </div>
  );
}

function SlaItem({ label, minutes, text }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 14,
          color: "#0A1628",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {text != null ? text : minutes != null ? formatMinutes(minutes) : "—"}
      </div>
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div
      style={{
        padding: "60px 32px",
        textAlign: "center",
        ...MONO_CAPS,
        fontSize: 11,
        color: "#8B95A8",
        letterSpacing: "0.14em",
      }}
    >
      {text}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

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

/* ─── Scan equipment action ────────────────────────────────────── */

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
  const [recent, setRecent] = useState([]);

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
    const result = await api.post(`/sites/${wo.site_id}/equipment/scan`, body);
    setRecent((r) =>
      [
        {
          ...result,
          make,
          model,
          asset_tag: assetTag || null,
          ts: new Date().toISOString(),
        },
        ...r,
      ].slice(0, 10)
    );
    resetForm();
    reload();
  }

  function close() {
    setOpen(false);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
              Categoría
            </DialogLabel>
            <select
              id="scan-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                height: 38,
                border: "1px solid #C8CDD8",
                borderRadius: 6,
                padding: "0 12px",
                fontFamily: JAKARTA,
                fontSize: 13.5,
                fontWeight: 500,
                color: "#0A1628",
                background: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
            placeholder="Ubicación en rack, condición, serial ilegible…"
          />
        </div>

        {recent.length > 0 && (
          <div style={{ paddingTop: 14, borderTop: "1px solid #E2E5EC" }}>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
              Scaneados en esta sesión ({recent.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {recent.map((r, i) => {
                const eventColor =
                  r.event_type === "installed"
                    ? "#0A6131"
                    : r.event_type === "relocated"
                    ? "#7E5212"
                    : "#3D4A66";
                return (
                  <div
                    key={i}
                    style={{
                      background: "#F4F6F8",
                      border: "1px solid #E2E5EC",
                      borderRadius: 4,
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          color: "#0A1628",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.serial_number}
                      </div>
                      {(r.make || r.model) && (
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 10,
                            color: "#8B95A8",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {[r.make, r.model].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <span style={{ ...MONO_CAPS, fontSize: 9.5, color: eventColor, letterSpacing: "0.12em", fontWeight: 800 }}>
                      {r.event_type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

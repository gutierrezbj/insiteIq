/**
 * Intervention Report viewer · v2 paleta F (Iter 2.38).
 *
 * Principle #1 (emit outward). Cierra loop visual: cuando una WO cierra,
 * backend auto-ensambla report con 5 canales emit (JSON/HTML/CSV/email/
 * webhook). Esta página renderiza + dispatch manual + regenerate.
 *
 * Scoping: backend ya devuelve vista scoped por rol (client NO ve
 * internal_message_count). UI agnóstica.
 */
import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
} from "../../../components/ui/ActionDialog";
import { formatAge } from "../../../components/ui/Badges";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

export default function InterventionReportPage() {
  const { t } = useTranslation("common");
  const { wo_id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { data: report, loading, error, reload } = useFetch(
    `/work-orders/${wo_id}/report`,
    { deps: [wo_id] }
  );

  const isSrs = !!user?.memberships?.some((m) => m.space === "srs_coordinators");
  const inTech = location.pathname.startsWith("/tech");
  const inClientSpace = location.pathname.startsWith("/client");
  const backHref = inTech
    ? `/tech/ops/${wo_id}`
    : inClientSpace
    ? `/client/ops/${wo_id}`
    : `/srs/ops/${wo_id}`;

  if (loading) return <Centered text={t("common.loading")} />;
  if (error) {
    const is404 = error.status === 404;
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
        <BackLinkV2 to={backHref} label={t("page_report.back_wo")} />
        <SectionCard>
          <SectionTitle marginBottom={6}>{t("page_report.title")}</SectionTitle>
          <h1
            style={{
              fontFamily: JAKARTA,
              fontSize: 22,
              fontWeight: 800,
              color: "#0A1628",
              letterSpacing: "-0.015em",
              marginBottom: 8,
            }}
          >
            {is404 ? t("page_report.not_assembled_yet") : t("page_report.error_title")}
          </h1>
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#3D4A66",
              fontWeight: 500,
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            {is404
              ? t("page_report.auto_assemble_hint")
              : error.message}
          </p>
          {isSrs && <RegenerateAction wo_id={wo_id} reload={reload} />}
        </SectionCard>
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
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to={backHref} label={t("page_report.back_wo")} />

      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            {t("page_report.kicker")}
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {h.work_order_reference}
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
            · v{report.version}
          </span>
          {report.status !== "final" && (
            <span style={{ ...MONO_CAPS, fontSize: 10, color: "#7E5212", letterSpacing: "0.12em", fontWeight: 800 }}>
              · {report.status}
            </span>
          )}
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
          {h.title}
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13.5, color: "#3D4A66", marginTop: 8, fontWeight: 500 }}>
          {h.client_name} · {h.site_name}
          {h.site_country && <> · {h.site_country}</>}
          {h.site_city && <>, {h.site_city}</>}
        </p>
      </div>

      {isSrs && (
        <SectionCard style={{ marginBottom: 16 }}>
          <SectionTitle>{t("page_report.section_emit")}</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <ChannelLink href={`/api/work-orders/${wo_id}/report.html`} label="HTML ↗" external />
            <ChannelLink href={`/api/work-orders/${wo_id}/report.csv`} label="CSV ↓" />
            <DispatchEmailAction wo_id={wo_id} reload={reload} />
            <DispatchWebhookAction wo_id={wo_id} reload={reload} />
            <RegenerateAction wo_id={wo_id} reload={reload} />
          </div>
        </SectionCard>
      )}

      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <Stat label={t("page_report.stat_opened")} value={h.opened_at ? new Date(h.opened_at).toLocaleString() : "—"} />
          <Stat label={t("page_report.stat_closed")} value={h.closed_at ? new Date(h.closed_at).toLocaleString() : "—"} />
          <Stat label={t("page_report.stat_severity")} value={h.severity || "—"} />
          <Stat label={t("page_report.stat_shield")} value={h.shield_level || "—"} />
          <Stat label={t("page_report.stat_tech")} value={h.tech_name || "—"} />
          <Stat label={t("page_report.stat_srs_coord")} value={h.srs_coordinator_name || "—"} />
        </div>
      </SectionCard>

      <SectionCard style={{ marginBottom: 16 }}>
        <SectionTitle>SLA</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <SlaMetric
            label={t("page_report.sla_label_receive")}
            ok={sla.received_within_sla}
            deadlineIso={sla.receive_deadline}
            actualIso={sla.first_action_at}
            marginMinutes={sla.receive_margin_minutes}
          />
          <SlaMetric
            label={t("page_report.sla_label_resolve")}
            ok={sla.resolved_within_sla}
            deadlineIso={sla.resolve_deadline}
            actualIso={sla.resolution_at}
            marginMinutes={sla.resolve_margin_minutes}
          />
        </div>
      </SectionCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <SectionCard>
          <SectionTitle>{t("page_report.timeline_section", { count: timeline.length })}</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {timeline.map((ev, i) => <TimelineRow key={i} t={ev} />)}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionTitle>{t("page_report.section_tech_capture")}</SectionTitle>
          {capture ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Block label={t("page_report.block_what_found")}>{capture.what_found || "—"}</Block>
              <Block label={t("page_report.block_what_did")}>{capture.what_did || "—"}</Block>
              {capture.anything_new_about_site && (
                <Block label={t("page_report.block_new_about_site")}>{capture.anything_new_about_site}</Block>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  paddingTop: 6,
                  borderTop: "1px solid #E2E5EC",
                }}
              >
                <MiniStat
                  label={t("page_report.stat_time_on_site")}
                  value={
                    capture.time_on_site_minutes != null
                      ? `${capture.time_on_site_minutes}min`
                      : "—"
                  }
                />
                <MiniStat label={t("page_report.stat_devices")} value={(capture.devices_touched || []).length} />
                <MiniStat label={t("page_report.stat_photos")} value={capture.photos_count ?? 0} />
              </div>
              {capture.follow_up_needed && (
                <div
                  style={{
                    background: "#FCF1DC",
                    border: "1px solid #E8A33D",
                    borderRadius: 4,
                    padding: "8px 12px",
                    ...MONO_CAPS,
                    fontSize: 9.5,
                    color: "#7E5212",
                    letterSpacing: "0.14em",
                    fontWeight: 800,
                  }}
                >
                  {t("page_report.follow_up_required")}
                </div>
              )}
            </div>
          ) : (
            <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              {t("page_report.empty_capture")}
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard style={{ marginTop: 16 }}>
        <SectionTitle>{t("page_report.ball_log_section", { count: ballTimeline.length })}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ballTimeline.length === 0 && (
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              {t("page_report.empty_history")}
            </div>
          )}
          {ballTimeline.map((b, i) => <BallRow key={i} b={b} />)}
        </div>
      </SectionCard>

      {(threads.shared_message_count != null ||
        threads.internal_message_count != null) && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle>{t("page_report.section_communication")}</SectionTitle>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Stat label={t("page_report.stat_shared_thread")} value={threads.shared_message_count ?? 0} />
            {threads.internal_message_count != null && (
              <Stat
                label={t("page_report.stat_internal_thread")}
                value={threads.internal_message_count}
                hint={t("page_report.internal_thread_hint")}
              />
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard padding={0} style={{ marginTop: 16 }}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <SectionTitle marginBottom={4}>{t("page_report.section_deliveries")}</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {deliveries.length}{" "}
            <span style={{ color: "#3D4A66", fontWeight: 500 }}>
              {t(deliveries.length === 1 ? "page_report.deliveries_count_one" : "page_report.deliveries_count_other")}
            </span>
          </div>
        </header>
        <div>
          {deliveries.length === 0 && (
            <div style={{ padding: "16px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              {t("page_report.empty_deliveries")}
            </div>
          )}
          {deliveries.map((d, i) => <DeliveryRow key={i} d={d} />)}
        </div>
      </SectionCard>

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        {t("page_report.footer_version_label", { version: report.version })} · {t("page_report.footer_generated", { age: formatAge(report.generated_at) })} · {t("page_report.footer_supersedes", { prev: report.supersedes_id ? t("page_report.supersedes_prev") : t("page_report.supersedes_none") })}
      </p>
    </div>
  );
}

/* ─── Building blocks ──────────────────────────────────────────── */

function ChannelLink({ href, label, external }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: "#FFFFFF",
        color: "#3D4A66",
        border: "1.5px solid #C8CDD8",
        borderRadius: 6,
        textDecoration: "none",
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#0A1628";
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.background = "#F4F6F8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#3D4A66";
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      {label}
    </a>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 600 }}>{value}</div>
      {hint && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 16,
          fontWeight: 800,
          color: "#0A1628",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <p
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#0A1628",
          whiteSpace: "pre-line",
          fontWeight: 500,
          lineHeight: 1.55,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function SlaMetric({ label, ok, deadlineIso, actualIso, marginMinutes }) {
  const { t } = useTranslation("common");
  const hasData = deadlineIso || actualIso;
  const dotColor = ok === true ? "#16A34A" : ok === false ? "#DC2626" : "#C8CDD8";
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>{label}</span>
      </div>
      {!hasData && (
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>—</div>
      )}
      {deadlineIso && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#8B95A8", fontWeight: 500 }}>
          {t("page_report.sla_deadline", { date: new Date(deadlineIso).toLocaleString() })}
        </div>
      )}
      {actualIso && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#0A1628", fontWeight: 600 }}>
          {t("page_report.sla_actual", { date: new Date(actualIso).toLocaleString() })}
        </div>
      )}
      {marginMinutes != null && (
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            letterSpacing: "0.14em",
            marginTop: 4,
            color: marginMinutes >= 0 ? "#0A6131" : "#991B1B",
            fontWeight: 800,
          }}
        >
          {t("page_report.sla_margin", { sign: marginMinutes >= 0 ? "+" : "", minutes: marginMinutes })}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ t: ev }) {
  const { t } = useTranslation("common");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "8px 12px",
      }}
    >
      <div
        style={{
          width: 3,
          flexShrink: 0,
          alignSelf: "stretch",
          background: "#0A1628",
          borderRadius: 2,
          marginTop: 2,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
            {ev.label || ev.kind}
          </span>
          {ev.from_status && ev.to_status && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", fontWeight: 600 }}>
              {ev.from_status} → {ev.to_status}
            </span>
          )}
          {ev.ball_side && (
            <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {t("page_report.timeline_ball_prefix", { side: ev.ball_side })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          {ev.actor_name && (
            <span style={{ fontFamily: JAKARTA, fontSize: 12, color: "#3D4A66", fontWeight: 600 }}>
              {ev.actor_name}
            </span>
          )}
          {ev.ts && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", fontWeight: 500 }}>
              {new Date(ev.ts).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BallRow({ b }) {
  const sideColor = b.side === "client" ? "#7E5212" : b.side === "tech" ? "#1E40AF" : "#3D4A66";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "6px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: sideColor, letterSpacing: "0.12em", fontWeight: 800 }}>
          {b.side}
        </span>
        {b.reason && (
          <span style={{ fontFamily: JAKARTA, fontSize: 12.5, color: "#3D4A66", fontWeight: 500 }}>{b.reason}</span>
        )}
      </div>
      <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
        {b.since ? new Date(b.since).toLocaleString() : ""}
        {b.duration_minutes != null && <> · {b.duration_minutes}min</>}
      </span>
    </div>
  );
}

function DeliveryRow({ d }) {
  const { t } = useTranslation("common");
  const statusColor =
    d.status === "delivered"
      ? "#0A6131"
      : d.status === "failed"
      ? "#991B1B"
      : d.status === "queued"
      ? "#7E5212"
      : "#3D4A66";
  return (
    <div
      style={{
        padding: "10px 18px",
        borderBottom: "1px solid #F0F2F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
            {d.channel}
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: statusColor, letterSpacing: "0.12em", fontWeight: 800 }}>
            · {d.status}
          </span>
          {d.attempts != null && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", fontWeight: 600 }}>
              {t("page_report.delivery_attempts", { count: d.attempts })}
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#0A1628",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 600,
          }}
        >
          {d.target}
        </div>
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", flexShrink: 0 }}>
        {d.enqueued_at ? t("page_report.delivery_ago", { age: formatAge(d.enqueued_at) }) : "—"}
      </div>
    </div>
  );
}

function Centered({ text }) {
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

/* ─── Actions ──────────────────────────────────────────────────── */

function GhostBtn({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: "#FFFFFF",
        color: "#3D4A66",
        border: "1.5px solid #C8CDD8",
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#0A1628";
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.background = "#F4F6F8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#3D4A66";
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      {label}
    </button>
  );
}

function RegenerateAction({ wo_id, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo_id}/report/regenerate`, {});
    reload();
  }

  return (
    <>
      <GhostBtn onClick={() => setOpen(true)} label={t("page_report.btn_regenerate")} />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("page_report.regenerate_title")}
        subtitle={t("page_report.regenerate_subtitle")}
        submitLabel={t("page_report.btn_regenerate")}
        onSubmit={submit}
      >
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          {t("page_report.regenerate_explainer")}
        </p>
      </ActionDialog>
    </>
  );
}

function DispatchEmailAction({ wo_id, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");

  async function submit() {
    const body = {
      to: to.trim(),
      cc: cc.split(",").map((s) => s.trim()).filter(Boolean),
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
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        {t("page_report.dispatch_email_btn")}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("page_report.dispatch_email_title")}
        subtitle={t("page_report.dispatch_email_subtitle")}
        submitLabel={t("page_report.dispatch_submit_enqueue")}
        submitDisabled={!to.trim()}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="em-to">{t("page_report.email_label_to")}</DialogLabel>
          <DialogInput
            id="em-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t("page_report.email_placeholder_to")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="em-cc" optional>
            {t("page_report.email_label_cc")}
          </DialogLabel>
          <DialogInput
            id="em-cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder={t("page_report.email_placeholder_cc")}
          />
        </div>
        <div>
          <DialogLabel htmlFor="em-subj" optional>
            {t("page_report.email_label_subject")}
          </DialogLabel>
          <DialogInput
            id="em-subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("page_report.email_placeholder_subject")}
          />
        </div>
      </ActionDialog>
    </>
  );
}

function DispatchWebhookAction({ wo_id, reload }) {
  const { t } = useTranslation("common");
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
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        {t("page_report.dispatch_webhook_btn")}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("page_report.dispatch_webhook_title")}
        subtitle={t("page_report.dispatch_webhook_subtitle")}
        submitLabel={t("page_report.dispatch_submit_enqueue")}
        submitDisabled={!url.trim().startsWith("http")}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="wh-url">{t("page_report.webhook_label_url")}</DialogLabel>
          <DialogInput
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("page_report.webhook_placeholder_url")}
            required
          />
        </div>
        <DialogCheckbox
          id="wh-html"
          label={t("page_report.webhook_label_include_html")}
          checked={includeHtml}
          onChange={setIncludeHtml}
        />
      </ActionDialog>
    </>
  );
}

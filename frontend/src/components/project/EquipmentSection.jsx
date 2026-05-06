/**
 * EquipmentSection · v2 paleta F (Iter 2.32).
 *
 * Plan vs Scan reconciliation por project (Modo 2 Decision #4). Resuelve
 * el caos upstream (Excel cliente / email / portal / scan tech) corriéndolo
 * contra la realidad scaneada on-site. 5 estatus de cierre:
 *
 *   match        planned serial scaneado en el site correcto
 *   substituted  planned no encontrado, equivalente make+model scaneado
 *   missing      planned pero nadie lo escaneó
 *   sin_plan     scaneado sin plan (bonus / equipamiento no declarado)
 *   conflicto    planned para site A, scaneado en site B
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog from "../ui/ActionDialog";
import { formatAge } from "../ui/Badges";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

const STATUS_STYLES = {
  planned:     { dot: "#C8CDD8", color: "#8B95A8", labelKey: "comp_equipment.status_planned" },
  match:       { dot: "#16A34A", color: "#0A6131", labelKey: "comp_equipment.status_match" },
  substituted: { dot: "#1E3A8A", color: "#1E40AF", labelKey: "comp_equipment.status_substituted" },
  missing:     { dot: "#E8A33D", color: "#7E5212", labelKey: "comp_equipment.status_missing" },
  sin_plan:    { dot: "#0A1628", color: "#0A1628", labelKey: "comp_equipment.status_sin_plan" },
  conflicto:   { dot: "#DC2626", color: "#991B1B", labelKey: "comp_equipment.status_conflicto" },
};

const COUNT_ORDER = ["match", "substituted", "missing", "conflicto", "sin_plan", "planned"];

export default function EquipmentSection({ project, isSrs }) {
  const { t } = useTranslation("common");
  const { data, loading, error, reload } = useFetch(
    `/projects/${project.id}/reconciliation`,
    { deps: [project.id] }
  );

  const planEntries = data?.plan_entries || [];
  const counts = data?.counts || {};
  const isRollout = project.type === "rollout";

  const lastReconciledAt = useMemo(() => {
    if (!planEntries.length) return null;
    let max = null;
    for (const pe of planEntries) {
      if (pe.reconciled_at) {
        const t = new Date(pe.reconciled_at).getTime();
        if (!isNaN(t) && (max == null || t > max)) max = t;
      }
    }
    return max ? new Date(max).toISOString() : null;
  }, [planEntries]);

  if (!isRollout && planEntries.length === 0) return null;

  return (
    <SectionCard padding={0}>
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
          <SectionTitle marginBottom={4}>{t("comp_equipment.section_title")}</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {planEntries.length}{" "}
            <span style={{ color: "#3D4A66", fontWeight: 500 }}>
              {t(planEntries.length === 1 ? "comp_equipment.items_planned_one" : "comp_equipment.items_planned_other")}
            </span>
            {lastReconciledAt && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginLeft: 10 }}>
                {t("comp_equipment.reconciled_ago", { age: formatAge(lastReconciledAt) })}
              </span>
            )}
          </div>
        </div>
        {isSrs && <ReconcileAction project={project} reload={reload} />}
      </header>

      {/* Counts strip */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {COUNT_ORDER.filter((k) => (counts[k] || 0) > 0).map((k) => (
          <CountPill key={k} status={k} count={counts[k]} />
        ))}
        {Object.keys(counts).length === 0 && (
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
            {t("comp_equipment.empty_no_plan")}
          </div>
        )}
      </div>

      {/* Table */}
      {planEntries.length > 0 && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 3fr 3fr 2fr 2fr",
              gap: 12,
              padding: "10px 18px",
              background: "#F4F6F8",
              borderBottom: "1px solid #E2E5EC",
              ...MONO_CAPS,
              fontSize: 9.5,
              color: "#3D4A66",
              letterSpacing: "0.14em",
            }}
          >
            <div>{t("comp_equipment.col_status")}</div>
            <div>{t("comp_equipment.col_serial")}</div>
            <div>{t("comp_equipment.col_make_model")}</div>
            <div>{t("comp_equipment.col_site")}</div>
            <div style={{ textAlign: "right" }}>{t("comp_equipment.col_source")}</div>
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {planEntries.map((pe) => <PlanRow key={pe.id} pe={pe} />)}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: "12px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          {t("common.loading")}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 18px", fontFamily: JAKARTA, fontSize: 13, color: "#991B1B", fontWeight: 500 }}>
          error · {error.message}
        </div>
      )}
    </SectionCard>
  );
}

function CountPill({ status, count }) {
  const { t } = useTranslation("common");
  const s = STATUS_STYLES[status] || STATUS_STYLES.planned;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
      <div>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: s.color, letterSpacing: "0.12em" }}>
          {t(s.labelKey)}
        </div>
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 16,
            fontWeight: 800,
            color: "#0A1628",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function PlanRow({ pe }) {
  const { t } = useTranslation("common");
  const s = STATUS_STYLES[pe.status] || STATUS_STYLES.planned;
  const makeModel = [pe.make, pe.model].filter(Boolean).join(" · ") || "—";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 3fr 3fr 2fr 2fr",
        gap: 12,
        padding: "12px 18px",
        borderBottom: "1px solid #F0F2F7",
        alignItems: "flex-start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
        <span
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            color: s.color,
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t(s.labelKey)}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            color: pe.serial_number ? "#0A1628" : "#8B95A8",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pe.serial_number || "—"}
        </div>
        {pe.asset_tag && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              color: "#8B95A8",
              fontWeight: 500,
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("comp_equipment.tag_prefix", { tag: pe.asset_tag })}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#0A1628",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {makeModel}
        </div>
        {pe.category && (
          <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 1 }}>
            {pe.category}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: pe.site_id ? "#3D4A66" : "#8B95A8",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pe.site_id ? shortId(pe.site_id) : "—"}
        </div>
        {pe.reconciled_at && (
          <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {formatAge(pe.reconciled_at)} ago
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.12em" }}>
          {pe.source || "—"}
        </div>
        {pe.reconciliation_note && (
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 11,
              color: "#8B95A8",
              fontWeight: 500,
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {pe.reconciliation_note}
          </div>
        )}
      </div>
    </div>
  );
}

function ReconcileAction({ project, reload }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);

  async function submit() {
    const r = await api.post(`/projects/${project.id}/reconcile`, {});
    setResult(r);
    reload();
  }

  function close() {
    setOpen(false);
    setResult(null);
  }

  const sinPlanCount = result?.sin_plan_asset_ids?.length || 0;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        {t("comp_equipment.btn_run")}
      </button>
      <ActionDialog
        open={open}
        onClose={close}
        title={t("comp_equipment.modal_title")}
        subtitle={t("comp_equipment.modal_subtitle")}
        submitLabel={result ? t("comp_equipment.btn_close") : t("comp_equipment.btn_reconcile")}
        onSubmit={result ? close : submit}
      >
        {!result && (
          <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
            {t("comp_equipment.modal_intro")}
          </p>
        )}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 500 }}>
              {t("comp_equipment.result_completed", { plan: result.plan_count, scan: result.scan_count })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {COUNT_ORDER.filter((k) => (result.counts?.[k] || 0) > 0).map((k) => (
                <CountPill key={k} status={k} count={result.counts[k]} />
              ))}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              {t(sinPlanCount === 1 ? "comp_equipment.result_sin_plan_one" : "comp_equipment.result_sin_plan_other", { count: sinPlanCount })}
            </div>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function shortId(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}

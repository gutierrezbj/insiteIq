/**
 * IntakeWorkOrderAction — SRS arranca una WO nueva desde la UI.
 * Backend POST /work-orders requires: organization_id, site_id,
 * service_agreement_id, reference, title + optional rest.
 *
 * UX:
 * - Paso 1: pick org + agreement + site (filtrado por org)
 * - Paso 2: reference + title + description + severity
 * - Paso 3: (colapsado) assigned_tech + NOC + onsite_resident
 * - Submit -> POST /work-orders -> navigate al detalle del nuevo WO
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
  DialogTextarea,
} from "../ui/ActionDialog";

const SEVERITY_OPTIONS = [
  { v: "low", l: "low" },
  { v: "normal", l: "normal (default)" },
  { v: "high", l: "high" },
  { v: "critical", l: "critical" },
];

export default function IntakeWorkOrderAction({ onCreated, renderTrigger }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [orgId, setOrgId] = useState("");
  const [agreementId, setAgreementId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [assignedTechId, setAssignedTechId] = useState("");
  const [nocId, setNocId] = useState("");
  const [residentId, setResidentId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data sources (lazy-loaded once dialog opens)
  const { data: orgs } = useFetch(open ? "/organizations" : null, {
    auto: open,
    deps: [open],
  });
  const { data: agreements } = useFetch(open ? "/service-agreements" : null, {
    auto: open,
    deps: [open],
  });
  const { data: sites } = useFetch(open ? "/sites" : null, {
    auto: open,
    deps: [open],
  });
  const { data: users } = useFetch(open ? "/users" : null, {
    auto: open,
    deps: [open],
  });

  // Filter orgs to those that can be clients (have active client role)
  const clientOrgs = useMemo(() => {
    return (orgs || []).filter(
      (o) =>
        (o.active_roles || []).includes("client") ||
        (o.active_roles || []).includes("prime_contractor") ||
        (o.active_roles || []).includes("channel_partner")
    );
  }, [orgs]);

  const orgAgreements = useMemo(() => {
    if (!agreementId && !orgId) return [];
    return (agreements || []).filter(
      (a) => !orgId || a.organization_id === orgId
    );
  }, [agreements, orgId]);

  const orgSites = useMemo(() => {
    return (sites || []).filter((s) => !orgId || s.organization_id === orgId);
  }, [sites, orgId]);

  const techs = useMemo(
    () =>
      (users || []).filter((u) =>
        (u.memberships || []).some(
          (m) => m.space === "tech_field" && m.active
        )
      ),
    [users]
  );
  const srsUsers = useMemo(
    () =>
      (users || []).filter((u) =>
        (u.memberships || []).some(
          (m) => m.space === "srs_coordinators" && m.active
        )
      ),
    [users]
  );

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (agreementId) {
      const a = (agreements || []).find((x) => x.id === agreementId);
      if (a && orgId && a.organization_id !== orgId) setAgreementId("");
    }
    if (siteId) {
      const s = (sites || []).find((x) => x.id === siteId);
      if (s && orgId && s.organization_id !== orgId) setSiteId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function reset() {
    setOrgId("");
    setAgreementId("");
    setSiteId("");
    setReference("");
    setTitle("");
    setDescription("");
    setSeverity("normal");
    setAssignedTechId("");
    setNocId("");
    setResidentId("");
    setShowAdvanced(false);
  }

  const canSubmit =
    orgId &&
    agreementId &&
    siteId &&
    reference.trim().length > 0 &&
    title.trim().length > 0;

  async function submit() {
    const body = {
      organization_id: orgId,
      site_id: siteId,
      service_agreement_id: agreementId,
      reference: reference.trim(),
      title: title.trim(),
      description: description.trim() || null,
      severity,
      assigned_tech_user_id: assignedTechId || null,
      noc_operator_user_id: nocId || null,
      onsite_resident_user_id: residentId || null,
    };
    const created = await api.post("/work-orders", body);
    reset();
    setOpen(false);
    onCreated?.(created);
    if (created?.id) {
      navigate(`/srs/ops/${created.id}`);
    }
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
          + Nueva WO
        </button>
      )}

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_intake.modal_title")}
        subtitle={t("wo_intake.modal_subtitle")}
        submitLabel={t("wo_intake.submit_create")}
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        {/* Paso 1: Cliente + contrato + site */}
        <DialogPanel label={t("wo_intake.panel_client_contract_site")}>
          <div>
            <DialogLabel htmlFor="int-org">{t("wo_intake.label_client_org")}</DialogLabel>
            <DialogSelect
              id="int-org"
              value={orgId}
              onChange={setOrgId}
              options={[
                { v: "", l: "— elegir —" },
                ...clientOrgs.map((o) => ({
                  v: o.id,
                  l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
                })),
              ]}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="int-agreement">{t("wo_intake.label_service_agreement")}</DialogLabel>
              <DialogSelect
                id="int-agreement"
                value={agreementId}
                onChange={setAgreementId}
                disabled={!orgId}
                options={[
                  { v: "", l: orgId ? "— elegir —" : "(elegí org primero)" },
                  ...orgAgreements.map((a) => ({
                    v: a.id,
                    l: `${a.title} · ${a.shield_level}`,
                  })),
                ]}
                required
              />
            </div>
            <div>
              <DialogLabel htmlFor="int-site">{t("wo_intake.label_site")}</DialogLabel>
              <DialogSelect
                id="int-site"
                value={siteId}
                onChange={setSiteId}
                disabled={!orgId}
                options={[
                  { v: "", l: orgId ? "— elegir —" : "(elegí org primero)" },
                  ...orgSites.map((s) => ({
                    v: s.id,
                    l: `${s.code ? s.code + " · " : ""}${s.name}${
                      s.country ? ` · ${s.country}` : ""
                    }`,
                  })),
                ]}
                required
              />
            </div>
          </div>
        </DialogPanel>

        {/* Paso 2: identidad del ticket */}
        <div>
          <DialogLabel htmlFor="int-ref">{t("wo_intake.label_reference")}</DialogLabel>
          <DialogInput
            id="int-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t("wo_intake.placeholder_reference")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-title">{t("wo_intake.label_title")}</DialogLabel>
          <DialogInput
            id="int-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("wo_intake.placeholder_title")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-desc" optional>
            {t("page_wo_detail.section_description") /* reuse */}
          </DialogLabel>
          <DialogTextarea
            id="int-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("wo_intake.placeholder_description")}
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-sev">{t("wo_intake.label_severity")}</DialogLabel>
          <DialogSelect
            id="int-sev"
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_OPTIONS}
          />
        </div>

        {/* Paso 3: opcional — assignment */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            width: "100%",
            textAlign: "left",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: 10,
            color: "#3D4A66",
            background: "transparent",
            border: "none",
            padding: "6px 0",
            cursor: "pointer",
            transition: "color 160ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0A1628")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3D4A66")}
        >
          {showAdvanced ? "▼" : "▶"} Asignación (opcional)
        </button>
        {showAdvanced && (
          <DialogPanel>
            <div>
              <DialogLabel htmlFor="int-tech" optional>
                Tech asignado
              </DialogLabel>
              <DialogSelect
                id="int-tech"
                value={assignedTechId}
                onChange={setAssignedTechId}
                options={[
                  { v: "", l: "— sin asignar aun —" },
                  ...techs.map((t) => ({
                    v: t.id,
                    l: `${t.full_name} · ${t.employment_type || "—"}`,
                  })),
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <DialogLabel htmlFor="int-noc" optional>
                  NOC Operator
                </DialogLabel>
                <DialogSelect
                  id="int-noc"
                  value={nocId}
                  onChange={setNocId}
                  options={[
                    { v: "", l: "— default remoto —" },
                    ...srsUsers.map((u) => ({
                      v: u.id,
                      l: u.full_name || u.email,
                    })),
                  ]}
                />
              </div>
              <div>
                <DialogLabel htmlFor="int-res" optional>
                  Onsite resident
                </DialogLabel>
                <DialogSelect
                  id="int-res"
                  value={residentId}
                  onChange={setResidentId}
                  options={[
                    { v: "", l: "— no aplica —" },
                    ...srsUsers.map((u) => ({
                      v: u.id,
                      l: u.full_name || u.email,
                    })),
                  ]}
                />
              </div>
            </div>
          </DialogPanel>
        )}
      </ActionDialog>
    </>
  );
}

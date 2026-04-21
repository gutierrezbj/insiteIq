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
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

const SEVERITY_OPTIONS = [
  { v: "low", l: "low" },
  { v: "normal", l: "normal (default)" },
  { v: "high", l: "high" },
  { v: "critical", l: "critical" },
];

export default function IntakeWorkOrderAction({ onCreated }) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + Nueva WO
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva Work Order"
        subtitle="Intake · SLA + Shield snapshot se hace al crear segun el agreement"
        submitLabel="Crear WO"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        {/* Paso 1: Cliente + contrato + site */}
        <div className="bg-surface-base rounded-sm p-3 space-y-2">
          <div className="label-caps">Cliente · contrato · site</div>
          <div>
            <DialogLabel htmlFor="int-org">Organizacion cliente</DialogLabel>
            <Select
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
              <DialogLabel htmlFor="int-agreement">Service agreement</DialogLabel>
              <Select
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
              <DialogLabel htmlFor="int-site">Site</DialogLabel>
              <Select
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
        </div>

        {/* Paso 2: identidad del ticket */}
        <div>
          <DialogLabel htmlFor="int-ref">Reference cliente</DialogLabel>
          <DialogInput
            id="int-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="CS-0123456, INC-0001, WO-202604…"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-title">Titulo</DialogLabel>
          <DialogInput
            id="int-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: switch port down / impresora no conecta"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-desc" optional>
            Descripcion
          </DialogLabel>
          <DialogTextarea
            id="int-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto del cliente, sintomas reportados, urgencia…"
          />
        </div>
        <div>
          <DialogLabel htmlFor="int-sev">Severity</DialogLabel>
          <Select
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
          className="w-full text-left font-mono text-2xs uppercase tracking-widest-srs text-text-secondary hover:text-text-primary py-1"
        >
          {showAdvanced ? "▼" : "▶"} Asignacion (opcional)
        </button>
        {showAdvanced && (
          <div className="bg-surface-base rounded-sm p-3 space-y-2">
            <div>
              <DialogLabel htmlFor="int-tech" optional>
                Tech asignado
              </DialogLabel>
              <Select
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
                <Select
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
                <Select
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
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function Select({ id, value, onChange, options, disabled, required }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      required={required}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}

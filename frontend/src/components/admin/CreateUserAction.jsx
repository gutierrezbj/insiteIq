/**
 * CreateUserAction — SRS owner/director crea un user nuevo.
 *
 * Backend genera temp_password (12 chars URL-safe). Se muestra una sola
 * vez post-submit (dialog en modo "success" con boton copy). Despues de
 * cerrar, no hay forma de recuperarlo sin resetear.
 */
import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
} from "../ui/ActionDialog";

const AUTHORITY_OPTIONS = [
  { v: "reports_only", l: "reports_only (read-only observer)" },
  { v: "contractor", l: "contractor (external exec)" },
  { v: "approval_on_site", l: "approval_on_site (LCON)" },
  { v: "mid_manager", l: "mid_manager (default)" },
  { v: "director", l: "director" },
  { v: "owner", l: "owner" },
];

const EMPLOYMENT_OPTIONS = [
  { v: "plantilla", l: "plantilla (SRS staff)" },
  { v: "external_sub", l: "external_sub (contractor)" },
];

export default function CreateUserAction({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [employmentType, setEmploymentType] = useState("plantilla");
  const [emailProvisioned, setEmailProvisioned] = useState(false);
  const [space, setSpace] = useState("srs_coordinators");
  const [role, setRole] = useState("");
  const [authority, setAuthority] = useState("mid_manager");
  const [orgId, setOrgId] = useState("");

  const [created, setCreated] = useState(null); // holds response with temp_password
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Load orgs for client_coordinator scope
  const { data: orgs } = useFetch(open ? "/organizations" : null, {
    auto: open,
    deps: [open],
  });

  const needsOrg = space === "client_coordinator" || space === "tech_field";

  const filteredOrgs = useMemo(() => {
    if (!orgs) return [];
    if (space === "client_coordinator") {
      return orgs.filter((o) =>
        (o.active_roles || []).some((r) =>
          ["client", "prime_contractor", "channel_partner"].includes(r)
        )
      );
    }
    return orgs;
  }, [orgs, space]);

  function reset() {
    setEmail("");
    setFullName("");
    setPhone("");
    setCountry("");
    setEmploymentType("plantilla");
    setEmailProvisioned(false);
    setSpace("srs_coordinators");
    setRole("");
    setAuthority("mid_manager");
    setOrgId("");
    setCreated(null);
    setCopyFeedback(null);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
    onCreated?.();
  }

  const canSubmit =
    email.trim().length > 3 &&
    email.includes("@") &&
    fullName.trim().length > 0 &&
    role.trim().length > 0 &&
    (!needsOrg || !!orgId);

  async function submit() {
    const body = {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      country: country.trim().toUpperCase() || null,
      employment_type: employmentType,
      email_provisioned_by_srs: emailProvisioned,
      memberships: [
        {
          space,
          role: role.trim(),
          authority_level: authority,
          organization_id: needsOrg ? orgId : null,
          active: true,
        },
      ],
    };
    const res = await api.post("/users", body);
    setCreated(res);
    onCreated?.(res);
  }

  async function copyTemp() {
    if (!created?.temp_password) return;
    try {
      await navigator.clipboard.writeText(created.temp_password);
      setCopyFeedback("copiada");
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {
      setCopyFeedback("no se pudo copiar");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-trigger-v2"
      >
        + Add user
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={created ? "Usuario creado" : "Crear usuario"}
        subtitle={
          created
            ? "Copia la contrasena temporal — solo se muestra una vez"
            : "Password temporal se genera automaticamente. Rotacion forzada al primer login."
        }
        submitLabel={created ? "Cerrar" : "Crear"}
        submitDisabled={!canSubmit && !created}
        onSubmit={created ? close : submit}
      >
        {!created && (
          <>
            <div>
              <DialogLabel htmlFor="cu-email">Email</DialogLabel>
              <DialogInput
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@systemrapid.com"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <DialogLabel htmlFor="cu-name">Nombre completo</DialogLabel>
              <DialogInput
                id="cu-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Maria Lopez Torres"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <DialogLabel htmlFor="cu-phone" optional>Phone</DialogLabel>
                <DialogInput
                  id="cu-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 ..."
                />
              </div>
              <div>
                <DialogLabel htmlFor="cu-country" optional>Country (ISO)</DialogLabel>
                <DialogInput
                  id="cu-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  placeholder="ES"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <DialogLabel htmlFor="cu-emp">Employment type</DialogLabel>
              <DialogSelect
                id="cu-emp"
                value={employmentType}
                onChange={setEmploymentType}
                options={EMPLOYMENT_OPTIONS}
              />
            </div>
            {employmentType === "external_sub" && (
              <DialogCheckbox
                id="cu-prov"
                label="Email @systemrapid.com provisionado por contrato"
                checked={emailProvisioned}
                onChange={setEmailProvisioned}
              />
            )}

            <DialogPanel label="Membership">
              <div>
                <DialogLabel htmlFor="cu-space">Space</DialogLabel>
                <DialogSelect
                  id="cu-space"
                  value={space}
                  onChange={setSpace}
                  options={[
                    { v: "srs_coordinators", l: "SRS Coordinators" },
                    { v: "tech_field", l: "Tech Field" },
                    { v: "client_coordinator", l: "Client Coordinator" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DialogLabel htmlFor="cu-role">Role label</DialogLabel>
                  <DialogInput
                    id="cu-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="ops_lead / tech_senior / finance / account_lead"
                    required
                  />
                </div>
                <div>
                  <DialogLabel htmlFor="cu-auth">Authority level</DialogLabel>
                  <DialogSelect
                    id="cu-auth"
                    value={authority}
                    onChange={setAuthority}
                    options={AUTHORITY_OPTIONS}
                  />
                </div>
              </div>
              {needsOrg && (
                <div>
                  <DialogLabel htmlFor="cu-org">Organización (requerida)</DialogLabel>
                  <DialogSelect
                    id="cu-org"
                    value={orgId}
                    onChange={setOrgId}
                    options={[
                      { v: "", l: "— elegir —" },
                      ...filteredOrgs.map((o) => ({
                        v: o.id,
                        l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
                      })),
                    ]}
                    required
                  />
                </div>
              )}
            </DialogPanel>
          </>
        )}

        {created && (
          <div className="space-y-3">
            <DialogPanel label="Email">
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  color: "#0A1628",
                  fontWeight: 600,
                }}
              >
                {created.email}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9.5,
                  color: "#3D4A66",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                Temp password
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    border: "1px solid #C8CDD8",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: "#0A1628",
                    fontWeight: 700,
                    userSelect: "all",
                  }}
                >
                  {created.temp_password}
                </code>
                <button
                  type="button"
                  onClick={copyTemp}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "8px 12px",
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
                  {copyFeedback || "copy"}
                </button>
              </div>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9.5,
                  color: "#8B95A8",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                forced rotation on first login
              </p>
            </DialogPanel>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

// Local Select removed in Iter 2.34 — use DialogSelect from ActionDialog.

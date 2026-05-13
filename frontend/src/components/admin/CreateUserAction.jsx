/**
 * CreateUserAction — SRS owner/director crea un user nuevo.
 *
 * Backend genera temp_password (12 chars URL-safe). Se muestra una sola
 * vez post-submit (dialog en modo "success" con boton copy). Despues de
 * cerrar, no hay forma de recuperarlo sin resetear.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogCheckbox,
  DialogCountrySelect,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
} from "../ui/ActionDialog";

const AUTHORITY_KEYS = [
  { v: "reports_only", k: "modal_create_user.auth_reports_only" },
  { v: "contractor", k: "modal_create_user.auth_contractor" },
  { v: "approval_on_site", k: "modal_create_user.auth_approval_on_site" },
  { v: "mid_manager", k: "modal_create_user.auth_mid_manager" },
  { v: "director", k: "modal_create_user.auth_director" },
  { v: "owner", k: "modal_create_user.auth_owner" },
];

const EMPLOYMENT_KEYS = [
  { v: "plantilla", k: "modal_create_user.emp_plantilla" },
  { v: "external_sub", k: "modal_create_user.emp_external_sub" },
];

export default function CreateUserAction({ onCreated }) {
  const { t } = useTranslation("common");
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
      setCopyFeedback(t("modal_create_user.copy_success"));
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {
      setCopyFeedback(t("modal_create_user.copy_error"));
    }
  }

  const authorityOptions = AUTHORITY_KEYS.map((o) => ({ v: o.v, l: t(o.k) }));
  const employmentOptions = EMPLOYMENT_KEYS.map((o) => ({ v: o.v, l: t(o.k) }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-trigger-v2"
      >
        {t("modal_create_user.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={created ? t("modal_create_user.title_created") : t("modal_create_user.title_create")}
        subtitle={
          created
            ? t("modal_create_user.subtitle_created")
            : t("modal_create_user.subtitle_create")
        }
        submitLabel={created ? t("modal_create_user.btn_close") : t("modal_create_user.btn_create")}
        submitDisabled={!canSubmit && !created}
        onSubmit={created ? close : submit}
      >
        {!created && (
          <>
            <div>
              <DialogLabel htmlFor="cu-email">{t("modal_create_user.label_email")}</DialogLabel>
              <DialogInput
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("modal_create_user.placeholder_email")}
                autoComplete="off"
                required
              />
            </div>
            <div>
              <DialogLabel htmlFor="cu-name">{t("modal_create_user.label_name")}</DialogLabel>
              <DialogInput
                id="cu-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("modal_create_user.placeholder_name")}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <DialogLabel htmlFor="cu-phone" optional>{t("modal_create_user.label_phone")}</DialogLabel>
                <DialogInput
                  id="cu-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("modal_create_user.placeholder_phone")}
                />
              </div>
              <div>
                <DialogLabel htmlFor="cu-country" optional>{t("modal_create_user.label_country")}</DialogLabel>
                <DialogCountrySelect
                  id="cu-country"
                  value={country}
                  onChange={setCountry}
                />
              </div>
            </div>
            <div>
              <DialogLabel htmlFor="cu-emp">{t("modal_create_user.label_employment")}</DialogLabel>
              <DialogSelect
                id="cu-emp"
                value={employmentType}
                onChange={setEmploymentType}
                options={employmentOptions}
              />
            </div>
            {employmentType === "external_sub" && (
              <DialogCheckbox
                id="cu-prov"
                label={t("modal_create_user.checkbox_provisioned")}
                checked={emailProvisioned}
                onChange={setEmailProvisioned}
              />
            )}

            <DialogPanel label={t("modal_create_user.panel_membership")}>
              <div>
                <DialogLabel htmlFor="cu-space">{t("modal_create_user.label_space")}</DialogLabel>
                <DialogSelect
                  id="cu-space"
                  value={space}
                  onChange={setSpace}
                  options={[
                    { v: "srs_coordinators", l: t("modal_create_user.space_srs") },
                    { v: "tech_field", l: t("modal_create_user.space_tech") },
                    { v: "client_coordinator", l: t("modal_create_user.space_client") },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DialogLabel htmlFor="cu-role">{t("modal_create_user.label_role")}</DialogLabel>
                  <DialogInput
                    id="cu-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder={t("modal_create_user.placeholder_role")}
                    required
                  />
                </div>
                <div>
                  <DialogLabel htmlFor="cu-auth">{t("modal_create_user.label_authority")}</DialogLabel>
                  <DialogSelect
                    id="cu-auth"
                    value={authority}
                    onChange={setAuthority}
                    options={authorityOptions}
                  />
                </div>
              </div>
              {needsOrg && (
                <div>
                  <DialogLabel htmlFor="cu-org">{t("modal_create_user.label_org")}</DialogLabel>
                  <DialogSelect
                    id="cu-org"
                    value={orgId}
                    onChange={setOrgId}
                    options={[
                      { v: "", l: t("modal_create_user.option_choose") },
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
            <DialogPanel label={t("modal_create_user.panel_email")}>
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
                {t("modal_create_user.label_temp_password")}
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
                  {copyFeedback || t("modal_create_user.btn_copy")}
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
                {t("modal_create_user.footer_rotation")}
              </p>
            </DialogPanel>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

// Local Select removed in Iter 2.34 — use DialogSelect from ActionDialog.

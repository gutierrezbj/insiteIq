/**
 * EditUserAction — SRS owner/director edita un user existente.
 *
 * Backend PATCH /api/users/{id} acepta full_name, phone, country, is_active,
 * employment_type, memberships, notes + (Iter 2.63c) tz/tz_label/role_title/
 * display_name/work_start/work_end.
 *
 * Además: Reset password action separado (POST /api/users/{id}/reset-password)
 * que muestra el temp_pwd inline como CreateUserAction.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCheckbox,
  DialogCountrySelect,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
  DialogTimezoneSelect,
} from "../ui/ActionDialog";

const EMPLOYMENT_OPTIONS = [
  { v: "plantilla", l_key: "modal_edit_user.emp_plantilla" },
  { v: "external_sub", l_key: "modal_edit_user.emp_external_sub" },
];

export default function EditUserAction({ user, onSaved }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  // Editable fields (initialized from user prop on open)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [employmentType, setEmploymentType] = useState("plantilla");
  // Cross-vista profile
  const [tz, setTz] = useState("");
  const [tzLabel, setTzLabel] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");

  // Reset password state (separate sub-flow within same dialog)
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(null); // { temp_password }
  const [resetBusy, setResetBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);

  const [error, setError] = useState(null);

  // Hydrate state from user prop when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.full_name || "");
    setPhone(user.phone || "");
    setCountry(user.country || "");
    setIsActive(user.is_active !== false);
    setEmploymentType(user.employment_type || "plantilla");
    setTz(user.tz || "");
    setTzLabel(user.tz_label || "");
    setRoleTitle(user.role_title || "");
    setDisplayName(user.display_name || "");
    setWorkStart(user.work_start != null ? String(user.work_start) : "");
    setWorkEnd(user.work_end != null ? String(user.work_end) : "");
    setResetConfirm(false);
    setResetDone(null);
    setError(null);
  }, [open, user]);

  function close() {
    setOpen(false);
    setTimeout(() => {
      setResetConfirm(false);
      setResetDone(null);
      setError(null);
    }, 300);
    onSaved?.();
  }

  const canSubmit = fullName.trim().length > 0 && !resetBusy;

  async function submit() {
    setError(null);
    const body = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      country: country.trim().toUpperCase() || null,
      is_active: isActive,
      employment_type: employmentType,
      tz: tz.trim() || null,
      tz_label: tzLabel.trim() || null,
      role_title: roleTitle.trim() || null,
      display_name: displayName.trim() || null,
      work_start: workStart === "" ? null : parseInt(workStart, 10),
      work_end: workEnd === "" ? null : parseInt(workEnd, 10),
    };
    try {
      await api.patch(`/users/${user.id}`, body);
      close();
    } catch (err) {
      setError(t("modal_edit_user.toast_save_error", { message: err.message || err }));
    }
  }

  async function doReset() {
    setError(null);
    setResetBusy(true);
    try {
      const res = await api.post(`/users/${user.id}/reset-password`, {});
      setResetDone(res);
    } catch (err) {
      setError(t("modal_edit_user.toast_reset_error", { message: err.message || err }));
    } finally {
      setResetBusy(false);
    }
  }

  async function copyTemp() {
    if (!resetDone?.temp_password) return;
    try {
      await navigator.clipboard.writeText(resetDone.temp_password);
      setCopyFeedback(t("modal_edit_user.copy_success"));
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {
      setCopyFeedback(t("modal_edit_user.copy_error"));
    }
  }

  const employmentOptions = EMPLOYMENT_OPTIONS.map((o) => ({ v: o.v, l: t(o.l_key) }));

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#3D4A66",
          background: "transparent",
          border: "1px solid #C8CDD8",
          borderRadius: 4,
          padding: "4px 8px",
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
          e.currentTarget.style.background = "transparent";
        }}
        title={t("modal_edit_user.btn_trigger_tooltip")}
      >
        {t("modal_edit_user.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={resetDone ? t("modal_edit_user.title_reset_done") : t("modal_edit_user.title_edit")}
        subtitle={
          resetDone
            ? t("modal_edit_user.subtitle_reset_done")
            : t("modal_edit_user.subtitle_edit", { email: user.email })
        }
        submitLabel={resetDone ? t("modal_edit_user.btn_close") : t("modal_edit_user.btn_save")}
        submitDisabled={!resetDone && !canSubmit}
        onSubmit={resetDone ? close : submit}
      >
        {!resetDone && (
          <>
            {/* Email read-only · no se cambia */}
            <div>
              <DialogLabel htmlFor="eu-email">{t("modal_edit_user.label_email_readonly")}</DialogLabel>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: "#3D4A66",
                  fontWeight: 500,
                  padding: "8px 12px",
                  background: "#F4F6F8",
                  border: "1px solid #E2E5EC",
                  borderRadius: 6,
                }}
              >
                {user.email}
              </div>
            </div>

            <div>
              <DialogLabel htmlFor="eu-name">{t("modal_edit_user.label_name")}</DialogLabel>
              <DialogInput
                id="eu-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <DialogLabel htmlFor="eu-phone" optional>{t("modal_edit_user.label_phone")}</DialogLabel>
                <DialogInput
                  id="eu-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <DialogLabel htmlFor="eu-country" optional>{t("modal_edit_user.label_country")}</DialogLabel>
                <DialogCountrySelect
                  id="eu-country"
                  value={country}
                  onChange={setCountry}
                />
              </div>
            </div>

            <div>
              <DialogLabel htmlFor="eu-emp">{t("modal_edit_user.label_employment")}</DialogLabel>
              <DialogSelect
                id="eu-emp"
                value={employmentType}
                onChange={setEmploymentType}
                options={employmentOptions}
              />
            </div>

            <DialogCheckbox
              id="eu-active"
              label={t("modal_edit_user.label_active")}
              checked={isActive}
              onChange={setIsActive}
            />
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                color: isActive ? "#0A6131" : "#991B1B",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginTop: -8,
                marginBottom: 4,
              }}
            >
              {isActive ? t("modal_edit_user.active_hint_yes") : t("modal_edit_user.active_hint_no")}
            </div>

            <DialogPanel label={t("modal_edit_user.panel_profile")}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DialogLabel htmlFor="eu-tz" optional>{t("modal_edit_user.label_tz")}</DialogLabel>
                  <DialogTimezoneSelect
                    id="eu-tz"
                    value={tz}
                    onChange={setTz}
                    onChangeLabel={setTzLabel}
                  />
                </div>
                <div>
                  <DialogLabel htmlFor="eu-tzlabel" optional>{t("modal_edit_user.label_tz_label")}</DialogLabel>
                  <DialogInput
                    id="eu-tzlabel"
                    value={tzLabel}
                    onChange={(e) => setTzLabel(e.target.value)}
                    placeholder={t("modal_edit_user.placeholder_tz_label")}
                  />
                </div>
              </div>
              <div>
                <DialogLabel htmlFor="eu-role" optional>{t("modal_edit_user.label_role_title")}</DialogLabel>
                <DialogInput
                  id="eu-role"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder={t("modal_edit_user.placeholder_role_title")}
                />
              </div>
              <div>
                <DialogLabel htmlFor="eu-display" optional>{t("modal_edit_user.label_display_name")}</DialogLabel>
                <DialogInput
                  id="eu-display"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("modal_edit_user.placeholder_display_name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DialogLabel htmlFor="eu-wstart" optional>{t("modal_edit_user.label_work_start")}</DialogLabel>
                  <DialogInput
                    id="eu-wstart"
                    type="number"
                    min={0}
                    max={23}
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    placeholder="9"
                  />
                </div>
                <div>
                  <DialogLabel htmlFor="eu-wend" optional>{t("modal_edit_user.label_work_end")}</DialogLabel>
                  <DialogInput
                    id="eu-wend"
                    type="number"
                    min={0}
                    max={23}
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    placeholder="18"
                  />
                </div>
              </div>
            </DialogPanel>

            <DialogPanel label={t("modal_edit_user.panel_reset")}>
              <p
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12.5,
                  color: "#3D4A66",
                  fontWeight: 500,
                  lineHeight: 1.55,
                }}
              >
                {t("modal_edit_user.reset_explainer")}
              </p>
              {!resetConfirm ? (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "8px 12px",
                    background: "#FFFFFF",
                    color: "#7E5212",
                    border: "1.5px solid #E8A33D",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 160ms",
                    alignSelf: "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FCF1DC";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                >
                  {t("modal_edit_user.reset_btn")}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 12.5,
                      color: "#7E5212",
                      fontWeight: 700,
                    }}
                  >
                    {t("modal_edit_user.reset_confirm_body", { email: user.email })}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={doReset}
                      disabled={resetBusy}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        padding: "8px 14px",
                        background: "#7E5212",
                        color: "#FFFFFF",
                        border: "1.5px solid #7E5212",
                        borderRadius: 6,
                        cursor: resetBusy ? "not-allowed" : "pointer",
                        opacity: resetBusy ? 0.5 : 1,
                      }}
                    >
                      {resetBusy ? t("modal_edit_user.reset_btn_busy") : t("modal_edit_user.reset_confirm_yes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      disabled={resetBusy}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        padding: "8px 14px",
                        background: "transparent",
                        color: "#3D4A66",
                        border: "1.5px solid #C8CDD8",
                        borderRadius: 6,
                        cursor: resetBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      {t("modal_edit_user.reset_confirm_no")}
                    </button>
                  </div>
                </div>
              )}
            </DialogPanel>

            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderLeft: "3px solid #DC2626",
                  color: "#991B1B",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderRadius: 4,
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        {resetDone && (
          <div className="space-y-3">
            <DialogPanel label={t("modal_edit_user.reset_done_label")}>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  color: "#0A1628",
                  fontWeight: 600,
                }}
              >
                {resetDone.email}
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
                  {resetDone.temp_password}
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
                  {copyFeedback || t("modal_edit_user.btn_copy")}
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
                {t("modal_edit_user.reset_done_hint")}
              </p>
            </DialogPanel>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

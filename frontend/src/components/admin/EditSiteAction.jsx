/**
 * EditSiteAction — SRS owner/director edita un site existente.
 *
 * PATCH /api/sites/{id} acepta code, name, country, city, address, timezone,
 * onsite_contact, has_physical_resident, default_noc_operator_user_id,
 * access_notes, status, notes.
 *
 * NO permite cambiar organization_id (se borra y se vuelve a crear si fue
 * un error de asignación · prevenir cross-tenant leaks).
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
  DialogTextarea,
} from "../ui/ActionDialog";

const STATUS_KEYS = [
  { v: "active",   k: "modal_edit_site.status_active" },
  { v: "inactive", k: "modal_edit_site.status_inactive" },
  { v: "archived", k: "modal_edit_site.status_archived" },
];

export default function EditSiteAction({ site, onSaved }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [tz, setTz] = useState("");
  const [statusValue, setStatusValue] = useState("active");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [hasResident, setHasResident] = useState(false);
  const [nocId, setNocId] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  // Load SRS users (only) para el select de default NOC operator
  const { data: users } = useFetch(open ? "/users" : null, {
    auto: open,
    deps: [open],
  });

  const srsUsers = useMemo(
    () =>
      (users || []).filter((u) =>
        (u.memberships || []).some(
          (m) => m.space === "srs_coordinators" && m.active
        )
      ),
    [users]
  );

  useEffect(() => {
    if (!open || !site) return;
    setCode(site.code || "");
    setName(site.name || "");
    setCountry(site.country || "");
    setCity(site.city || "");
    setAddress(site.address || "");
    setTz(site.timezone || "");
    setStatusValue(site.status || "active");
    const c = site.onsite_contact || {};
    setContactName(c.name || "");
    setContactPhone(c.phone || "");
    setContactEmail(c.email || "");
    setContactRole(c.role || "");
    setHasResident(!!site.has_physical_resident);
    setNocId(site.default_noc_operator_user_id || "");
    setAccessNotes(site.access_notes || "");
    setNotes(site.notes || "");
    setError(null);
  }, [open, site]);

  function close() {
    setOpen(false);
    setTimeout(() => setError(null), 300);
    onSaved?.();
  }

  const canSubmit = name.trim().length > 0 && country.trim().length > 0;

  async function submit() {
    setError(null);
    const onsiteContact = contactName.trim()
      ? {
          name: contactName.trim(),
          phone: contactPhone.trim() || null,
          email: contactEmail.trim() || null,
          role: contactRole.trim() || null,
        }
      : null;

    const body = {
      code: code.trim() || null,
      name: name.trim(),
      country: country.trim().toUpperCase() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      timezone: tz.trim() || null,
      onsite_contact: onsiteContact,
      has_physical_resident: hasResident,
      default_noc_operator_user_id: nocId || null,
      access_notes: accessNotes.trim() || null,
      status: statusValue,
      notes: notes.trim() || null,
    };
    try {
      await api.patch(`/sites/${site.id}`, body);
      close();
    } catch (err) {
      setError(t("modal_edit_site.toast_save_error", { message: err.message || err }));
    }
  }

  const statusOptions = STATUS_KEYS.map((s) => ({ v: s.v, l: t(s.k) }));

  if (!site) return null;

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
        title={t("modal_edit_site.btn_trigger_tooltip")}
      >
        {t("modal_edit_site.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={t("modal_edit_site.title")}
        subtitle={t("modal_edit_site.subtitle", { name: site.name || site.code || "—" })}
        submitLabel={t("modal_edit_site.btn_save")}
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="es-code" optional>
              {t("modal_edit_site.label_code")}
            </DialogLabel>
            <DialogInput
              id="es-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("modal_edit_site.placeholder_code")}
            />
          </div>
          <div>
            <DialogLabel htmlFor="es-status">{t("modal_edit_site.label_status")}</DialogLabel>
            <DialogSelect
              id="es-status"
              value={statusValue}
              onChange={setStatusValue}
              options={statusOptions}
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="es-name">{t("modal_edit_site.label_name")}</DialogLabel>
          <DialogInput
            id="es-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="es-country">{t("modal_edit_site.label_country")}</DialogLabel>
            <DialogInput
              id="es-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="es-city" optional>
              {t("modal_edit_site.label_city")}
            </DialogLabel>
            <DialogInput
              id="es-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="es-address" optional>
            {t("modal_edit_site.label_address")}
          </DialogLabel>
          <DialogInput
            id="es-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <DialogLabel htmlFor="es-tz" optional>
            {t("modal_edit_site.label_tz")}
          </DialogLabel>
          <DialogInput
            id="es-tz"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder={t("modal_edit_site.placeholder_tz")}
          />
        </div>

        <DialogPanel label={t("modal_edit_site.panel_contact")}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="es-cname" optional>
                {t("modal_edit_site.contact_name")}
              </DialogLabel>
              <DialogInput
                id="es-cname"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="es-crole" optional>
                {t("modal_edit_site.contact_role")}
              </DialogLabel>
              <DialogInput
                id="es-crole"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder={t("modal_edit_site.contact_role_placeholder")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="es-cphone" optional>
                {t("modal_edit_site.contact_phone")}
              </DialogLabel>
              <DialogInput
                id="es-cphone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="es-cemail" optional>
                {t("modal_edit_site.contact_email")}
              </DialogLabel>
              <DialogInput
                id="es-cemail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
        </DialogPanel>

        <DialogPanel label={t("modal_edit_site.panel_closure")}>
          <DialogCheckbox
            id="es-resident"
            label={t("modal_edit_site.label_resident")}
            checked={hasResident}
            onChange={setHasResident}
          />
          <div>
            <DialogLabel htmlFor="es-noc" optional>
              {t("modal_edit_site.label_default_noc")}
            </DialogLabel>
            <DialogSelect
              id="es-noc"
              value={nocId}
              onChange={setNocId}
              options={[
                { v: "", l: t("modal_edit_site.noc_none") },
                ...srsUsers.map((u) => ({
                  v: u.id,
                  l: u.display_name || u.full_name || u.email,
                })),
              ]}
            />
          </div>
        </DialogPanel>

        <div>
          <DialogLabel htmlFor="es-access" optional>
            {t("modal_edit_site.label_access_notes")}
          </DialogLabel>
          <DialogTextarea
            id="es-access"
            rows={2}
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder={t("modal_edit_site.placeholder_access_notes")}
          />
        </div>
        <div>
          <DialogLabel htmlFor="es-notes" optional>
            {t("modal_edit_site.label_notes")}
          </DialogLabel>
          <DialogTextarea
            id="es-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

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
      </ActionDialog>
    </>
  );
}

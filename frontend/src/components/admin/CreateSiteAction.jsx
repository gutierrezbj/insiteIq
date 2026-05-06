/**
 * CreateSiteAction — SRS owner/director crea un site nuevo bajo una org.
 * Domain 10 Site Bible completo (known_issues, device_bible refs) sigue en Fase 5.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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

export default function CreateSiteAction({ onCreated }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [tz, setTz] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [hasResident, setHasResident] = useState(false);
  const [accessNotes, setAccessNotes] = useState("");

  const { data: orgs } = useFetch(open ? "/organizations" : null, {
    auto: open,
    deps: [open],
  });

  const clientOrgs = useMemo(() => {
    return (orgs || []).filter((o) =>
      (o.active_roles || []).some((r) =>
        ["client", "prime_contractor", "channel_partner", "end_client_metadata"].includes(r)
      )
    );
  }, [orgs]);

  function reset() {
    setOrgId("");
    setCode("");
    setName("");
    setCountry("");
    setCity("");
    setAddress("");
    setTz("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setContactRole("");
    setHasResident(false);
    setAccessNotes("");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  const canSubmit =
    orgId &&
    name.trim().length > 0 &&
    country.trim().length === 2;

  async function submit() {
    const contact =
      contactName.trim().length > 0
        ? {
            name: contactName.trim(),
            phone: contactPhone.trim() || null,
            email: contactEmail.trim() || null,
            role: contactRole.trim() || null,
          }
        : null;
    const body = {
      organization_id: orgId,
      code: code.trim() || null,
      name: name.trim(),
      country: country.trim().toUpperCase(),
      city: city.trim() || null,
      address: address.trim() || null,
      timezone: tz.trim() || null,
      onsite_contact: contact,
      has_physical_resident: hasResident,
      access_notes: accessNotes.trim() || null,
    };
    const res = await api.post("/sites", body);
    onCreated?.(res);
    close();
    if (res?.id) navigate(`/srs/sites/${res.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-trigger-v2"
      >
        {t("modal_create_site.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={t("modal_create_site.title")}
        subtitle={t("modal_create_site.subtitle")}
        submitLabel={t("modal_create_site.btn_submit")}
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cs-org">{t("modal_create_site.label_org")}</DialogLabel>
          <DialogSelect
            id="cs-org"
            value={orgId}
            onChange={setOrgId}
            options={[
              { v: "", l: t("modal_create_site.option_choose") },
              ...clientOrgs.map((o) => ({
                v: o.id,
                l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
              })),
            ]}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <DialogLabel htmlFor="cs-code" optional>{t("modal_create_site.label_code")}</DialogLabel>
            <DialogInput
              id="cs-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("modal_create_site.placeholder_code")}
            />
          </div>
          <div className="col-span-2">
            <DialogLabel htmlFor="cs-name">{t("modal_create_site.label_name")}</DialogLabel>
            <DialogInput
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("modal_create_site.placeholder_name")}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <DialogLabel htmlFor="cs-country">{t("modal_create_site.label_country")}</DialogLabel>
            <DialogInput
              id="cs-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder={t("modal_create_site.placeholder_country")}
              maxLength={2}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-city" optional>{t("modal_create_site.label_city")}</DialogLabel>
            <DialogInput
              id="cs-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("modal_create_site.placeholder_city")}
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-tz" optional>{t("modal_create_site.label_tz")}</DialogLabel>
            <DialogInput
              id="cs-tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder={t("modal_create_site.placeholder_tz")}
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="cs-addr" optional>{t("modal_create_site.label_address")}</DialogLabel>
          <DialogInput
            id="cs-addr"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("modal_create_site.placeholder_address")}
          />
        </div>

        <DialogPanel label={t("modal_create_site.panel_contact")}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="cs-cn" optional>{t("modal_create_site.label_contact_name")}</DialogLabel>
              <DialogInput
                id="cs-cn"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("modal_create_site.placeholder_contact_name")}
              />
            </div>
            <div>
              <DialogLabel htmlFor="cs-cr" optional>{t("modal_create_site.label_contact_role")}</DialogLabel>
              <DialogInput
                id="cs-cr"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder={t("modal_create_site.placeholder_contact_role")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="cs-cp" optional>{t("modal_create_site.label_contact_phone")}</DialogLabel>
              <DialogInput
                id="cs-cp"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="cs-ce" optional>{t("modal_create_site.label_contact_email")}</DialogLabel>
              <DialogInput
                id="cs-ce"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
        </DialogPanel>

        <DialogCheckbox
          id="cs-resident"
          label={t("modal_create_site.checkbox_resident")}
          checked={hasResident}
          onChange={setHasResident}
        />

        <div>
          <DialogLabel htmlFor="cs-access" optional>
            {t("modal_create_site.label_access")}
          </DialogLabel>
          <DialogTextarea
            id="cs-access"
            rows={3}
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder={t("modal_create_site.placeholder_access")}
          />
        </div>
      </ActionDialog>
    </>
  );
}

// Local Select removed in Iter 2.34 — use DialogSelect from ActionDialog.

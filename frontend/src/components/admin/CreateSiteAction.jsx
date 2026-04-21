/**
 * CreateSiteAction — SRS owner/director crea un site nuevo bajo una org.
 * Domain 10 Site Bible completo (known_issues, device_bible refs) sigue en Fase 5.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

export default function CreateSiteAction({ onCreated }) {
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
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + New site
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title="Crear site"
        subtitle="Site Bible completo (known_issues, device_bible, confidence) expande en Fase 5."
        submitLabel="Crear"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cs-org">Organizacion</DialogLabel>
          <Select
            id="cs-org"
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
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <DialogLabel htmlFor="cs-code" optional>Code</DialogLabel>
            <DialogInput
              id="cs-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ZARA-TAL-01"
            />
          </div>
          <div className="col-span-2">
            <DialogLabel htmlFor="cs-name">Nombre</DialogLabel>
            <DialogInput
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ZARA Mall Plaza Trebol"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <DialogLabel htmlFor="cs-country">Country (ISO-2)</DialogLabel>
            <DialogInput
              id="cs-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="CL"
              maxLength={2}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-city" optional>City</DialogLabel>
            <DialogInput
              id="cs-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Talcahuano"
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-tz" optional>Timezone (IANA)</DialogLabel>
            <DialogInput
              id="cs-tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="America/Santiago"
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="cs-addr" optional>Address</DialogLabel>
          <DialogInput
            id="cs-addr"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Av Colon 4000, Talcahuano"
          />
        </div>

        <div className="bg-surface-base rounded-sm p-3 space-y-2">
          <div className="label-caps">Contacto onsite (opcional)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="cs-cn" optional>Nombre</DialogLabel>
              <DialogInput
                id="cs-cn"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Pedro Castro"
              />
            </div>
            <div>
              <DialogLabel htmlFor="cs-cr" optional>Rol</DialogLabel>
              <DialogInput
                id="cs-cr"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="store_manager"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="cs-cp" optional>Phone</DialogLabel>
              <DialogInput
                id="cs-cp"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="cs-ce" optional>Email</DialogLabel>
              <DialogInput
                id="cs-ce"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogCheckbox
          id="cs-resident"
          label="Residente fisico (DC / 24x7 staffed)"
          checked={hasResident}
          onChange={setHasResident}
        />

        <div>
          <DialogLabel htmlFor="cs-access" optional>
            Access notes
          </DialogLabel>
          <DialogTextarea
            id="cs-access"
            rows={3}
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder="Horarios, instrucciones de ingreso, parking, security desk, QR locks…"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function Select({ id, value, onChange, options, required }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      required={required}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}

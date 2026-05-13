/**
 * Tech Field · WO Detail mobile-first (Iter 2.63h · 2026-05-10).
 *
 * NO es el WorkOrderDetailPage del SRS desktop (ese sigue para Andros y
 * compañía). Esta es la pieza operativa pensada para Agustin/Hugo/Arlindo
 * en plena calle con cliente al lado. Una pantalla · una acción grande ·
 * el resto a un tap.
 *
 * Flow forzado por status:
 *   triage / pre_flight / dispatched  → [ SALÍ HACIA EL SITIO ]
 *   en_route                          → [ LLEGUÉ AL SITIO ]
 *   on_site                           → form capture + [ TERMINÉ ]
 *   resolved                          → "Esperando validación del CAU"
 *   closed                            → "Cerrado · gracias"
 *
 * Dictado del owner (2026-05-10):
 *   "saliendo al sitio, llegue al sitio, alimenta la intervencion, fotos,
 *    texto, terminé, valide con un video, firmo el responsable, CAU valida
 *    la intervencion, saliendo del site, fin"
 *   "el tecnico recibe la orden en su movil, detalles, lugar, persona
 *    contacto, telefono, coordenadas para ponerlas en el google y una
 *    opcion para abrir google maps"
 *
 * MVP Iter 2.63h: foto + texto + advance status + tap-to-call + tap-to-maps
 * Phase 2 (después de validación owner): video + signature del cliente +
 * offline cache.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadFile } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../contexts/AuthContext";

// ─── Palette F mobile · navy + amber ─────────────────────────────────
const NAVY = "#0A1628";
const AMBER = "#D97706";
const SOFT = "#F4F6F8";
const BORDER = "#E2E5EC";
const TEXT_MID = "#3D4A66";
const TEXT_DIM = "#8B95A8";
const SUCCESS = "#0A6131";
const SUCCESS_BG = "#D9F1E5";
const WARN = "#7E5212";
const WARN_BG = "#FCF1DC";
const DANGER = "#991B1B";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

// ─── Status → próxima acción del tech ────────────────────────────────
const ACTION_BY_STATUS = {
  intake:     { label: "Aún no asignado · esperando triaje", disabled: true },
  triage:     { label: "Aún en triaje · esperando dispatch", disabled: true },
  pre_flight: { label: "SALÍ HACIA EL SITIO", target: "en_route", needsRoute: true },
  dispatched: { label: "SALÍ HACIA EL SITIO", target: "en_route" },
  en_route:   { label: "LLEGUÉ AL SITIO",     target: "on_site"  },
  on_site:    { label: "TERMINÉ LA INTERVENCIÓN", target: "resolved", needsCapture: true },
  resolved:   { label: "Esperando validación del CAU", disabled: true, waiting: true },
  closed:     { label: "Cerrado · buen trabajo", disabled: true, done: true },
  cancelled:  { label: "Cancelado", disabled: true, done: true },
};

export default function TechWoDetailPage() {
  const { wo_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: wo, loading: woLoading, error: woError, reload: reloadWo } =
    useFetch(`/work-orders/${wo_id}`, { deps: [wo_id] });
  const { data: site } = useFetch(wo?.site_id ? `/sites/${wo.site_id}` : null, {
    deps: [wo?.site_id],
  });
  const { data: briefing, reload: reloadBriefing } = useFetch(
    `/work-orders/${wo_id}/briefing`,
    { deps: [wo_id] }
  );

  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [error, setError] = useState(null);

  const action = wo ? ACTION_BY_STATUS[wo.status] || ACTION_BY_STATUS.intake : null;
  const isWorking = wo?.status === "on_site";
  const isDone = wo?.status === "closed" || wo?.status === "cancelled";

  async function handleAdvance() {
    if (!action || action.disabled || !action.target) return;
    if (action.needsCapture && !canAdvanceToResolved) {
      setError("Antes de terminar tenés que llenar la nota y subir al menos una foto.");
      return;
    }
    setError(null);
    setAdvanceBusy(true);
    try {
      // Si hay capture pendiente y el tech está terminando, lo enviamos primero
      if (action.target === "resolved" && captureDirty) {
        await submitCapture();
      }
      await api.post(`/work-orders/${wo_id}/advance`, {
        target_status: action.target,
        notes: action.target === "en_route" ? "Tech salió hacia el sitio" : null,
      });
      await reloadWo();
    } catch (e) {
      setError(e.message || "No se pudo avanzar el WO");
    } finally {
      setAdvanceBusy(false);
    }
  }

  // ─── Capture state (solo cuando on_site) ─────────────────────────
  const { data: existingCapture, reload: reloadCapture } = useFetch(
    isWorking || wo?.status === "resolved" || wo?.status === "closed"
      ? `/work-orders/${wo_id}/capture`
      : null,
    { deps: [wo_id, wo?.status] }
  );

  const [whatFound, setWhatFound] = useState("");
  const [whatDid, setWhatDid] = useState("");
  const [photos, setPhotos] = useState([]); // [{upload_id, url, kind}]
  const [captureDirty, setCaptureDirty] = useState(false);

  useEffect(() => {
    if (existingCapture) {
      setWhatFound(existingCapture.what_found || "");
      setWhatDid(existingCapture.what_did || "");
      setPhotos(existingCapture.photos || []);
      setCaptureDirty(false);
    }
  }, [existingCapture]);

  const canAdvanceToResolved = whatDid.trim().length > 5 && photos.length >= 1;

  async function submitCapture() {
    const body = {
      what_found: whatFound.trim() || null,
      what_did: whatDid.trim() || null,
      photos: photos,
      time_on_site_minutes: null,
    };
    await api.post(`/work-orders/${wo_id}/capture`, body);
    setCaptureDirty(false);
    await reloadCapture();
  }

  async function ackBriefing() {
    try {
      // Endpoint no acepta body · solo path param
      await api.post(`/work-orders/${wo_id}/briefing/acknowledge`, {});
      await reloadBriefing();
    } catch (e) {
      setError(e.message || "No se pudo confirmar el briefing");
    }
  }

  if (woLoading) {
    return <Centered text="Cargando..." />;
  }
  if (woError) {
    return <Centered text={`Error: ${woError.message || woError}`} danger />;
  }
  if (!wo) {
    return <Centered text="Work Order no encontrada" danger />;
  }

  const briefingPending =
    briefing?.exists && briefing.status === "assembled";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 100 }}>
      {/* Top: back + WO ref + status */}
      <HeaderRow wo={wo} onBack={() => navigate("/tech")} />

      {/* Título del WO */}
      <h1
        style={{
          fontFamily: JAKARTA,
          fontSize: 22,
          fontWeight: 800,
          color: NAVY,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          margin: "4px 0 0 0",
        }}
      >
        {wo.title}
      </h1>
      {wo.description && (
        <p style={{ fontFamily: JAKARTA, fontSize: 14, color: TEXT_MID, lineHeight: 1.55, margin: 0 }}>
          {wo.description}
        </p>
      )}

      {/* Lugar · dirección + coords + tap-to-Maps */}
      {site && <LocationBlock site={site} />}

      {/* Contacto onsite · nombre + cargo + teléfono tap-to-call */}
      {site?.onsite_contact && <ContactBlock contact={site.onsite_contact} />}

      {/* Nota del coord (briefing) */}
      {briefing?.exists && (
        <BriefingBlock
          briefing={briefing}
          pending={briefingPending}
          onAck={ackBriefing}
        />
      )}

      {/* Capture form · solo cuando on_site o más adelante */}
      {(isWorking || wo.status === "resolved" || isDone) && (
        <InterventionBlock
          whatFound={whatFound}
          setWhatFound={(v) => { setWhatFound(v); setCaptureDirty(true); }}
          whatDid={whatDid}
          setWhatDid={(v) => { setWhatDid(v); setCaptureDirty(true); }}
          photos={photos}
          setPhotos={(p) => { setPhotos(p); setCaptureDirty(true); }}
          locked={isDone}
          onSave={async () => {
            await submitCapture();
          }}
          dirty={captureDirty}
        />
      )}

      {/* Action button gigante · DEPENDS on status */}
      <ActionButton
        action={action}
        busy={advanceBusy}
        disabled={action?.disabled || (action?.needsCapture && !canAdvanceToResolved)}
        onClick={handleAdvance}
      />

      {/* Hint contextual debajo del botón */}
      {action?.needsCapture && !canAdvanceToResolved && (
        <p
          style={{
            fontFamily: JAKARTA,
            fontSize: 12,
            color: WARN,
            textAlign: "center",
            margin: "-6px 0 0 0",
            fontWeight: 600,
          }}
        >
          Antes de terminar: escribí qué hiciste + subí al menos 1 foto
        </p>
      )}

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderLeft: `3px solid ${DANGER}`,
            color: DANGER,
            fontFamily: JAKARTA,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 14px",
            borderRadius: 6,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* Chat con SRS · al final · siempre disponible */}
      <ChatLink wo_id={wo_id} />

      {/* Reference + timestamps · footer info */}
      <FooterMeta wo={wo} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function HeaderRow({ wo, onBack }) {
  const pillColor = STATUS_PILL[wo.status] || STATUS_PILL.intake;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 700,
          color: TEXT_MID,
          background: "transparent",
          border: "none",
          padding: "8px 0",
          cursor: "pointer",
          letterSpacing: "0.06em",
        }}
      >
        ← Volver
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: TEXT_DIM, letterSpacing: "0.08em" }}>
          {wo.reference}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 800,
            background: pillColor.bg,
            color: pillColor.fg,
            padding: "4px 10px",
            borderRadius: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {wo.status}
        </span>
      </div>
    </div>
  );
}

const STATUS_PILL = {
  intake:     { bg: SOFT,       fg: TEXT_MID },
  triage:     { bg: "#E8EDF5",  fg: NAVY },
  pre_flight: { bg: "#FEF3C7",  fg: WARN },
  dispatched: { bg: "#FEF3C7",  fg: WARN },
  en_route:   { bg: "#DBEAFE",  fg: "#1E40AF" },
  on_site:    { bg: "#D9F1E5",  fg: SUCCESS },
  resolved:   { bg: WARN_BG,    fg: WARN },
  closed:     { bg: SOFT,       fg: TEXT_DIM },
  cancelled:  { bg: "#FEF2F2",  fg: DANGER },
};

function Block({ kicker, children, accent = NAVY }) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      {kicker && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            color: TEXT_DIM,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {kicker}
        </div>
      )}
      {children}
    </section>
  );
}

function LocationBlock({ site }) {
  const hasCoords = site.lat != null && site.lng != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [site.address, site.city, site.country].filter(Boolean).join(", ")
      )}`;
  return (
    <Block kicker="Lugar">
      <div style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
        {site.name}
      </div>
      {(site.address || site.city) && (
        <div style={{ fontFamily: JAKARTA, fontSize: 13.5, color: TEXT_MID, lineHeight: 1.45, marginBottom: 8 }}>
          {[site.address, site.city, site.country].filter(Boolean).join(", ")}
        </div>
      )}
      {hasCoords && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            color: TEXT_DIM,
            marginBottom: 10,
            userSelect: "all",
          }}
        >
          {site.lat.toFixed(6)}, {site.lng.toFixed(6)}
        </div>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: JAKARTA,
          fontSize: 14,
          fontWeight: 700,
          color: "#FFFFFF",
          background: NAVY,
          padding: "10px 16px",
          borderRadius: 8,
          textDecoration: "none",
          letterSpacing: "0.02em",
        }}
      >
        📍 Abrir en Google Maps
      </a>
    </Block>
  );
}

function ContactBlock({ contact }) {
  return (
    <Block kicker="Contacto onsite">
      <div style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: 700, color: NAVY }}>
        {contact.name}
      </div>
      {contact.role && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.08em", marginTop: 2, textTransform: "uppercase" }}>
          {contact.role}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: JAKARTA,
              fontSize: 15,
              fontWeight: 700,
              color: "#FFFFFF",
              background: SUCCESS,
              padding: "12px 16px",
              borderRadius: 8,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            📞 Llamar · {contact.phone}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              padding: "8px 0",
              textDecoration: "none",
            }}
          >
            ✉ {contact.email}
          </a>
        )}
      </div>
    </Block>
  );
}

function BriefingBlock({ briefing, pending, onAck }) {
  return (
    <Block kicker="Nota del coordinador" accent={pending ? AMBER : NAVY}>
      {briefing.coordinator_notes ? (
        <p style={{ fontFamily: JAKARTA, fontSize: 14, color: NAVY, lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
          {briefing.coordinator_notes}
        </p>
      ) : (
        <p style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.1em" }}>
          — sin nota del coord —
        </p>
      )}
      {briefing.site_bible && (
        <div
          style={{
            marginTop: 12,
            background: SOFT,
            borderRadius: 6,
            padding: 10,
            fontFamily: JAKARTA,
            fontSize: 13,
            color: TEXT_MID,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: "0.14em", marginBottom: 6, textTransform: "uppercase" }}>
            Site Bible · resumen
          </div>
          {briefing.site_bible.summary || "—"}
        </div>
      )}
      {pending && (
        <button
          type="button"
          onClick={onAck}
          style={{
            marginTop: 14,
            width: "100%",
            height: 52,
            fontFamily: JAKARTA,
            fontSize: 14,
            fontWeight: 800,
            color: "#FFFFFF",
            background: AMBER,
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          He leído y entendí
        </button>
      )}
      {!pending && briefing.status === "acknowledged" && (
        <div
          style={{
            marginTop: 12,
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 700,
            color: SUCCESS,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          ✓ Acknowledged
        </div>
      )}
    </Block>
  );
}

function InterventionBlock({
  whatFound, setWhatFound,
  whatDid, setWhatDid,
  photos, setPhotos,
  locked,
  onSave,
  dirty,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadFile(file);
      const newPhoto = {
        upload_id: res.id || res._id,
        url: res.url,
        kind: file.type.startsWith("image/") ? "image" : "other",
        added_at: new Date().toISOString(),
      };
      setPhotos([...photos, newPhoto]);
    } catch (err) {
      setUploadError(err.message || "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(idx) {
    setPhotos(photos.filter((_, i) => i !== idx));
  }

  return (
    <Block kicker="Intervención" accent={AMBER}>
      <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
        ¿Qué encontraste?
      </label>
      <textarea
        value={whatFound}
        onChange={(e) => setWhatFound(e.target.value)}
        disabled={locked}
        rows={3}
        placeholder="Router LED rojo · sin conexión a internet · cable WAN suelto..."
        style={fieldStyle}
      />

      <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 6, marginTop: 14 }}>
        ¿Qué hiciste? <span style={{ color: WARN }}>(obligatorio para terminar)</span>
      </label>
      <textarea
        value={whatDid}
        onChange={(e) => setWhatDid(e.target.value)}
        disabled={locked}
        rows={4}
        placeholder="Reseteé router · verificado cable WAN · ping a 1.1.1.1 estable · cliente confirmó OK..."
        style={fieldStyle}
      />

      <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: TEXT_DIM, letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginBottom: 8, marginTop: 14 }}>
        Fotos <span style={{ color: WARN }}>(min 1 para terminar · max 15MB c/u)</span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, marginBottom: 10 }}>
        {photos.map((p, i) => (
          <div
            key={p.upload_id || i}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              borderRadius: 6,
              overflow: "hidden",
              background: SOFT,
              border: `1px solid ${BORDER}`,
            }}
          >
            {p.url ? (
              <img src={p.url} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 10, color: TEXT_DIM }}>
                📷
              </div>
            )}
            {!locked && (
              <button
                type="button"
                onClick={() => removePhoto(i)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.65)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!locked && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: JAKARTA,
            fontSize: 14,
            fontWeight: 700,
            color: "#FFFFFF",
            background: NAVY,
            padding: "12px 18px",
            borderRadius: 8,
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.5 : 1,
            letterSpacing: "0.02em",
          }}
        >
          📷 {uploading ? "Subiendo..." : "Tomar foto · subir"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePick}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      )}
      {uploadError && (
        <p style={{ fontFamily: JAKARTA, fontSize: 12, color: DANGER, marginTop: 8 }}>
          {uploadError}
        </p>
      )}

      {dirty && !locked && (
        <button
          type="button"
          onClick={onSave}
          style={{
            marginTop: 16,
            width: "100%",
            height: 44,
            fontFamily: JAKARTA,
            fontSize: 13,
            fontWeight: 700,
            color: NAVY,
            background: "#FFFFFF",
            border: `2px solid ${NAVY}`,
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Guardar borrador
        </button>
      )}
    </Block>
  );
}

const fieldStyle = {
  width: "100%",
  fontFamily: JAKARTA,
  fontSize: 15,
  color: NAVY,
  background: "#FFFFFF",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "10px 12px",
  outline: "none",
  resize: "vertical",
  lineHeight: 1.5,
  boxSizing: "border-box",
};

function ActionButton({ action, busy, disabled, onClick }) {
  if (!action) return null;
  if (action.done) {
    return (
      <div
        style={{
          height: 64,
          background: SOFT,
          color: TEXT_DIM,
          fontFamily: JAKARTA,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${BORDER}`,
        }}
      >
        ✓ {action.label}
      </div>
    );
  }
  if (action.waiting) {
    return (
      <div
        style={{
          minHeight: 64,
          background: WARN_BG,
          color: WARN,
          fontFamily: JAKARTA,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.02em",
          textAlign: "center",
          borderRadius: 12,
          padding: "16px 20px",
          border: `2px dashed ${WARN}`,
          lineHeight: 1.5,
        }}
      >
        ⏳ {action.label}
        <div style={{ fontFamily: MONO, fontSize: 11, color: WARN, fontWeight: 700, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          puedes salir del sitio
        </div>
      </div>
    );
  }
  const isDisabled = disabled || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: "100%",
        height: 64,
        fontFamily: JAKARTA,
        fontSize: 16,
        fontWeight: 800,
        color: "#FFFFFF",
        background: isDisabled ? "#C8CDD8" : NAVY,
        border: "none",
        borderRadius: 12,
        cursor: isDisabled ? "not-allowed" : "pointer",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        boxShadow: isDisabled ? "none" : "0 4px 12px rgba(10, 22, 40, 0.25)",
        transition: "all 160ms",
      }}
    >
      {busy ? "Procesando..." : action.label}
    </button>
  );
}

function ChatLink({ wo_id }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/tech/ops/${wo_id}/threads`)}
      style={{
        width: "100%",
        height: 48,
        fontFamily: JAKARTA,
        fontSize: 14,
        fontWeight: 700,
        color: NAVY,
        background: "#FFFFFF",
        border: `1.5px solid ${BORDER}`,
        borderRadius: 10,
        cursor: "pointer",
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      💬 Chat con SRS
    </button>
  );
}

function FooterMeta({ wo }) {
  const items = [
    { label: "Severity", value: wo.severity },
    { label: "Abierta", value: wo.created_at ? new Date(wo.created_at).toLocaleString() : "—" },
    { label: "Deadline", value: wo.deadline_resolve_at ? new Date(wo.deadline_resolve_at).toLocaleString() : "—" },
  ];
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {it.label}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_MID, fontWeight: 600 }}>
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Centered({ text, danger }) {
  return (
    <div
      style={{
        padding: "48px 20px",
        textAlign: "center",
        fontFamily: JAKARTA,
        fontSize: 14,
        color: danger ? DANGER : TEXT_MID,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}

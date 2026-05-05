/**
 * CaptureSection · v2 paleta F (Iter 2.37).
 *
 * Tech Capture submitted por WO (Domain 10.4). SRS + tech asignado ven.
 * Cliente 403. Renders what_found / what_did / new_about_site +
 * time_on_site + follow_up + photos grid con lightbox + devices.
 */
import { useState } from "react";
import { useFetch } from "../../lib/useFetch";
import AuthImage from "../ui/AuthImage";
import { formatAge } from "../ui/Badges";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

export default function CaptureSection({ wo, isSrs, isAssignedTech }) {
  if (!isSrs && !isAssignedTech) return null;

  const { data, loading, error } = useFetch(`/work-orders/${wo.id}/capture`, {
    deps: [wo.id],
  });

  const [lightbox, setLightbox] = useState(null);

  if (loading) {
    return (
      <SectionCard style={{ marginTop: 16 }}>
        <SectionTitle marginBottom={4}>Tech Capture</SectionTitle>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          cargando…
        </div>
      </SectionCard>
    );
  }

  if (error) return null;

  if (!data?.exists) {
    return (
      <SectionCard style={{ marginTop: 16 }}>
        <SectionTitle marginBottom={4}>Tech Capture</SectionTitle>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          Sin capture submitted aún. El tech lo registra estando{" "}
          <span style={{ fontFamily: MONO, color: "#0A1628", fontWeight: 700 }}>on_site</span>{" "}
          antes de marcar resolved.
        </p>
      </SectionCard>
    );
  }

  const cap = data;
  const photos = cap.photos || [];
  const devices = cap.devices_touched || [];

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <SectionTitle marginBottom={4}>Tech Capture</SectionTitle>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          Submitted{" "}
          <span style={{ color: "#3D4A66", fontWeight: 500 }}>
            {cap.submitted_at ? formatAge(cap.submitted_at) + " ago" : ""}
          </span>
        </div>
      </header>

      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <CaptureBlock label="Qué encontró" text={cap.what_found || "—"} />
        <CaptureBlock label="Qué hizo" text={cap.what_did || "—"} />
        {cap.anything_new_about_site && (
          <CaptureBlock label="Nuevo sobre el site" text={cap.anything_new_about_site} />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            paddingTop: 4,
          }}
        >
          <MiniStat
            label="Time on site"
            value={cap.time_on_site_minutes != null ? `${cap.time_on_site_minutes}min` : "—"}
          />
          <MiniStat label="Devices touched" value={devices.length} />
          <MiniStat label="Photos" value={photos.length} />
        </div>

        {cap.follow_up_needed && (
          <div
            style={{
              background: "#FCF1DC",
              border: "1px solid #E8A33D",
              borderLeft: "3px solid #7E5212",
              borderRadius: 4,
              padding: "10px 14px",
            }}
          >
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#7E5212", letterSpacing: "0.14em", marginBottom: 4 }}>
              Follow-up required
            </div>
            {cap.follow_up_notes && (
              <p
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#0A1628",
                  whiteSpace: "pre-line",
                  fontWeight: 500,
                  lineHeight: 1.55,
                }}
              >
                {cap.follow_up_notes}
              </p>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
              Evidencia · {photos.length} archivo{photos.length === 1 ? "" : "s"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 8,
              }}
            >
              {photos.map((p, i) => (
                <PhotoTile key={i} photo={p} onOpen={() => setLightbox(p)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </SectionCard>
  );
}

function CaptureBlock({ label, text }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <p
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#0A1628",
          whiteSpace: "pre-line",
          fontWeight: 500,
          lineHeight: 1.55,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function PhotoTile({ photo, onOpen }) {
  const isImage =
    photo.kind === "image" || (photo.url || "").match(/\.(jpe?g|png|webp|heic|heif)$/i);
  if (isImage) {
    return (
      <button
        type="button"
        onClick={onOpen}
        style={{
          background: "#F4F6F8",
          border: "1px solid #E2E5EC",
          borderRadius: 4,
          overflow: "hidden",
          aspectRatio: "1 / 1",
          padding: 0,
          cursor: "pointer",
          transition: "border-color 160ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0A1628")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E2E5EC")}
      >
        <AuthImage src={photo.url} alt={photo.label} thumb className="w-full h-full object-cover" />
      </button>
    );
  }
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noreferrer"
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        aspectRatio: "1 / 1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        textAlign: "center",
        ...MONO_CAPS,
        fontSize: 9.5,
        color: "#3D4A66",
        letterSpacing: "0.12em",
        textDecoration: "none",
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.color = "#0A1628";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E5EC";
        e.currentTarget.style.color = "#3D4A66";
      }}
    >
      {photo.label || "file ↗"}
    </a>
  );
}

function Lightbox({ photo, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(10, 22, 40, 0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "#FFFFFF",
          border: "1.5px solid #FFFFFF",
          borderRadius: 6,
          padding: "8px 12px",
          ...MONO_CAPS,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "#0A1628",
          cursor: "pointer",
        }}
      >
        cerrar
      </button>
      <div
        style={{
          maxWidth: "1100px",
          maxHeight: "90vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AuthImage
          src={photo.url}
          alt={photo.label}
          className="max-w-full max-h-[80vh] object-contain rounded"
        />
        {photo.label && (
          <div
            style={{
              marginTop: 8,
              ...MONO_CAPS,
              fontSize: 10,
              color: "#C8CDD8",
              letterSpacing: "0.14em",
            }}
          >
            {photo.label}
            {photo.size_bytes != null && <> · {formatBytes(photo.size_bytes)}</>}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 16,
          fontWeight: 800,
          color: "#0A1628",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

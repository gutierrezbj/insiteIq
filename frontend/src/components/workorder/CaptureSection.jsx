/**
 * CaptureSection — Tech Capture submitted por WO (Domain 10.4).
 * SRS + tech asignado ven. Cliente 403 (cliente consume intervention_report final).
 *
 * Renders:
 * - what_found / what_did / anything_new_about_site
 * - time_on_site + follow_up flag
 * - photos grid con AuthImage (click → lightbox full size)
 * - devices_touched resumen
 */
import { useState } from "react";
import { useFetch } from "../../lib/useFetch";
import AuthImage from "../ui/AuthImage";
import { formatAge } from "../ui/Badges";

export default function CaptureSection({ wo, isSrs, isAssignedTech }) {
  // Clients don't see this
  if (!isSrs && !isAssignedTech) return null;

  const { data, loading, error } = useFetch(`/work-orders/${wo.id}/capture`, {
    deps: [wo.id],
  });

  const [lightbox, setLightbox] = useState(null);

  if (loading) {
    return (
      <section className="bg-surface-raised accent-bar rounded-sm mt-4 p-4">
        <div className="label-caps mb-1">Tech Capture</div>
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          cargando…
        </div>
      </section>
    );
  }

  if (error) {
    // 403 para cliente: silent. 404/other: silent. No mostrar section si no hay data.
    return null;
  }

  if (!data?.exists) {
    // Still render a slim placeholder so SRS sees the slot exists
    return (
      <section className="bg-surface-raised accent-bar rounded-sm mt-4 p-4">
        <div className="label-caps mb-1">Tech Capture</div>
        <p className="font-body text-sm text-text-secondary">
          Sin capture submitted aun. El tech lo registra estando{" "}
          <span className="font-mono">on_site</span> antes de marcar resolved.
        </p>
      </section>
    );
  }

  const cap = data;
  const photos = cap.photos || [];
  const devices = cap.devices_touched || [];

  return (
    <section className="bg-surface-raised accent-bar rounded-sm mt-4">
      <header className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps">Tech Capture</div>
        <h2 className="font-display text-base text-text-primary leading-tight">
          Submitted {cap.submitted_at ? formatAge(cap.submitted_at) + " ago" : ""}
        </h2>
      </header>

      <div className="px-4 py-3 space-y-3">
        <div>
          <div className="label-caps mb-1">Que encontro</div>
          <p className="font-body text-sm text-text-primary whitespace-pre-line">
            {cap.what_found || "—"}
          </p>
        </div>
        <div>
          <div className="label-caps mb-1">Que hizo</div>
          <p className="font-body text-sm text-text-primary whitespace-pre-line">
            {cap.what_did || "—"}
          </p>
        </div>
        {cap.anything_new_about_site && (
          <div>
            <div className="label-caps mb-1">Nuevo sobre el site</div>
            <p className="font-body text-sm text-text-primary whitespace-pre-line">
              {cap.anything_new_about_site}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <MiniStat
            label="Time on site"
            value={
              cap.time_on_site_minutes != null
                ? `${cap.time_on_site_minutes}min`
                : "—"
            }
          />
          <MiniStat label="Devices touched" value={devices.length} />
          <MiniStat label="Photos" value={photos.length} />
        </div>

        {cap.follow_up_needed && (
          <div className="bg-warning-muted rounded-sm px-3 py-2 border-l-2 border-warning">
            <div className="label-caps mb-0.5 text-warning">Follow-up required</div>
            {cap.follow_up_notes && (
              <p className="font-body text-sm text-text-primary whitespace-pre-line">
                {cap.follow_up_notes}
              </p>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <div className="label-caps mb-2">
              Evidencia · {photos.length} archivo{photos.length === 1 ? "" : "s"}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {photos.map((p, i) => (
                <PhotoTile
                  key={i}
                  photo={p}
                  onOpen={() => setLightbox(p)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
    </section>
  );
}

function PhotoTile({ photo, onOpen }) {
  const isImage = photo.kind === "image" || (photo.url || "").match(/\.(jpe?g|png|webp|heic|heif)$/i);
  if (isImage) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="bg-surface-base rounded-sm overflow-hidden aspect-square hover:ring-1 hover:ring-primary transition-all duration-fast"
      >
        <AuthImage
          src={photo.url}
          alt={photo.label}
          thumb
          className="w-full h-full object-cover"
        />
      </button>
    );
  }
  // non-image: show file label pill
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noreferrer"
      className="bg-surface-base rounded-sm aspect-square flex items-center justify-center p-2 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-secondary hover:text-primary-light hover:ring-1 hover:ring-primary transition-all duration-fast"
    >
      {photo.label || "file ↗"}
    </a>
  );
}

function Lightbox({ photo, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 bg-surface-base/90 rounded-sm px-3 py-2 font-mono text-2xs uppercase tracking-widest-srs text-text-primary hover:text-primary-light"
      >
        cerrar
      </button>
      <div
        className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthImage
          src={photo.url}
          alt={photo.label}
          className="max-w-full max-h-[80vh] object-contain rounded-sm"
        />
        {photo.label && (
          <div className="mt-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {photo.label}
            {photo.size_bytes != null && (
              <> · {formatBytes(photo.size_bytes)}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface-base rounded-sm px-3 py-2">
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-display text-base text-text-primary leading-none">
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

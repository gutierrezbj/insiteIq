import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Phone, User, Clock, Camera,
  CheckCircle2, Navigation, Building2, Wrench, AlertTriangle,
} from "lucide-react";

const STATUS_FLOW = ["assigned", "accepted", "en_route", "on_site", "in_progress", "completed"];
const STATUS_LABEL = {
  assigned: "Asignada", accepted: "Aceptada", en_route: "En camino",
  on_site: "En sitio", in_progress: "En progreso", completed: "Completada",
};
const NEXT_ACTION = {
  assigned: { label: "Aceptar trabajo", next: "accepted", color: "bg-cyan-600" },
  accepted: { label: "Salir hacia sitio", next: "en_route", color: "bg-yellow-500" },
  en_route: { label: "Llegue al sitio", next: "on_site", color: "bg-purple-600" },
  on_site: { label: "Iniciar trabajo", next: "in_progress", color: "bg-amber-600" },
  in_progress: { label: "Completar trabajo", next: "completed", color: "bg-green-600" },
};

export default function TechJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [job, setJob] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resolution, setResolution] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    setLoading(true);
    try {
      const res = await api.get(`/interventions/${id}`);
      const iv = res.data;
      setJob(iv);
      if (iv.site_id) {
        const s = await api.get(`/sites/${iv.site_id}`).catch(() => null);
        if (s?.data) setSite(s.data);
      }
    } catch {
      toast.error("Error cargando trabajo");
    } finally {
      setLoading(false);
    }
  }

  async function advanceStatus() {
    if (!job) return;
    const action = NEXT_ACTION[job.status];
    if (!action) return;

    if (action.next === "completed") {
      setShowComplete(true);
      return;
    }

    setUpdating(true);
    try {
      await api.post(`/interventions/${id}/timeline`, {
        event: `status_change`,
        description: `${STATUS_LABEL[job.status]} → ${STATUS_LABEL[action.next]}`,
        user: "tech",
      });
      await api.patch(`/interventions/${id}`, { status: action.next });
      toast.success(`Estado: ${STATUS_LABEL[action.next]}`);
      await loadJob();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function completeJob() {
    setUpdating(true);
    try {
      await api.post(`/interventions/${id}/complete`, {
        summary: resolution || "Trabajo completado",
        resolved: true,
      });
      toast.success("Trabajo completado");
      setShowComplete(false);
      await loadJob();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function uploadPhoto(type) {
    fileRef.current?.click();
    fileRef.current.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("photo_type", type);
        fd.append("description", type === "arrival" ? "Foto de llegada" : type === "completion" ? "Foto de cierre" : "Foto de trabajo");
        await api.upload(`/interventions/${id}/proof`, fd);
        toast.success("Foto subida");
        await loadJob();
      } catch (e) {
        toast.error(e.message);
      } finally {
        setUploading(false);
        fileRef.current.value = "";
      }
    };
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>;
  }

  if (!job) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Trabajo no encontrado</div>;
  }

  const action = NEXT_ACTION[job.status];
  const currentStep = STATUS_FLOW.indexOf(job.status);
  const address = site?.address || "";

  return (
    <div className="pb-6">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" />

      {/* Back header */}
      <div className="sticky top-[53px] z-sticky bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/tech")} className="p-1 rounded-md hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-sm truncate">{job.reference}</h2>
          <p className="text-2xs text-gray-400">{STATUS_LABEL[job.status]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-4">
        <div className="flex gap-1">
          {STATUS_FLOW.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Site info */}
      <div className="px-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Building2 size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{site?.name || job.site_name || "Sitio"}</p>
              <p className="text-xs text-gray-500">{site?.client || ""}</p>
            </div>
          </div>

          {address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-primary hover:underline"
            >
              <MapPin size={18} />
              <span className="text-sm">{address}</span>
              <Navigation size={14} className="ml-auto" />
            </a>
          )}

          {site?.contact && (
            <a href={`tel:${site.contact.phone}`} className="flex items-center gap-3 text-gray-600">
              <Phone size={18} className="text-gray-400" />
              <div>
                <p className="text-sm">{site.contact.name}</p>
                <p className="text-xs text-gray-400">{site.contact.phone}</p>
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Scope */}
      <div className="px-4 mb-4">
        <h3 className="text-2xs font-mono uppercase tracking-widest-srs text-gray-400 mb-2">Trabajo</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Wrench size={14} className="text-gray-400" />
            <span className="capitalize">{job.type}</span>
            {(job.priority === "critical" || job.priority === "high") && (
              <span className="flex items-center gap-1 text-2xs text-red-500">
                <AlertTriangle size={12} /> {job.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{job.description || "Sin descripcion"}</p>
          {job.scheduled_date && (
            <p className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={12} />
              {new Date(job.scheduled_date).toLocaleDateString("es", {
                weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Photos section — visible when on_site or in_progress */}
      {(job.status === "on_site" || job.status === "in_progress") && (
        <div className="px-4 mb-4">
          <h3 className="text-2xs font-mono uppercase tracking-widest-srs text-gray-400 mb-2">Fotos</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "arrival", label: "Llegada", photo: job.proof_of_work?.arrival_photo },
              { type: "work", label: "Trabajo", photo: job.proof_of_work?.work_photos?.[0] },
              { type: "completion", label: "Cierre", photo: job.proof_of_work?.completion_photo },
            ].map(({ type, label, photo }) => (
              <button
                key={type}
                onClick={() => uploadPhoto(type)}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-primary flex flex-col items-center justify-center gap-1 transition-colors bg-gray-50 overflow-hidden"
              >
                {photo?.url ? (
                  <img src={photo.url} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={20} className="text-gray-400" />
                    <span className="text-2xs text-gray-400">{label}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {job.timeline?.length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-2xs font-mono uppercase tracking-widest-srs text-gray-400 mb-2">Actividad</h3>
          <div className="space-y-2">
            {job.timeline.slice(-5).reverse().map((ev, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{ev.description || ev.event}</p>
                  <p className="text-gray-400">
                    {ev.timestamp && new Date(ev.timestamp).toLocaleString("es", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion modal */}
      {showComplete && (
        <div className="fixed inset-0 z-modal bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-bottom">
            <h3 className="font-display font-semibold text-lg">Completar trabajo</h3>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Resumen del trabajo realizado..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowComplete(false)}
                className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={completeJob}
                disabled={updating}
                className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                {updating ? "Guardando..." : "Completar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action button — fixed bottom */}
      {action && job.status !== "completed" && (
        <div className="fixed bottom-16 inset-x-0 px-4 pb-3 safe-area-bottom">
          <button
            onClick={advanceStatus}
            disabled={updating}
            className={`w-full py-4 rounded-xl ${action.color} text-white font-semibold text-sm shadow-lg active:scale-[0.98] transition-transform duration-fast flex items-center justify-center gap-2`}
          >
            {updating ? "Actualizando..." : action.label}
          </button>
        </div>
      )}
    </div>
  );
}

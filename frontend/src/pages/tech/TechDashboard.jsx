import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { MapPin, Clock, ChevronRight, AlertTriangle } from "lucide-react";

const STATUS_LABEL = {
  assigned: "Asignada",
  accepted: "Aceptada",
  en_route: "En camino",
  on_site: "En sitio",
  in_progress: "En progreso",
  completed: "Completada",
};

const STATUS_COLOR = {
  assigned: "bg-cyan-100 text-cyan-700",
  accepted: "bg-cyan-50 text-cyan-600",
  en_route: "bg-yellow-100 text-yellow-700",
  on_site: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

const PRIORITY_ICON = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-gray-400",
};

export default function TechDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    if (!user?.technician_id) return;
    setLoading(true);
    const params = new URLSearchParams({ technician_id: user.technician_id, per_page: "50" });
    if (filter === "active") {
      // Fetch all non-completed
    }
    api
      .get(`/interventions?${params}`)
      .then((res) => {
        const items = res.data || [];
        if (filter === "active") {
          setJobs(items.filter((j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "failed"));
        } else {
          setJobs(items.filter((j) => j.status === "completed"));
        }
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [user, filter]);

  const activeCount = jobs.length;

  return (
    <div className="px-4 py-5">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-lg font-display font-semibold text-gray-900">
          Hola, {user?.name?.split(" ")[0] || "Tecnico"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {activeCount} {filter === "active" ? "trabajo(s) activo(s)" : "completado(s)"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "active", label: "Activos" },
          { key: "completed", label: "Historial" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-fast ${
              filter === t.key
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm">
            {filter === "active" ? "Sin trabajos asignados" : "Sin historial"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/tech/job/${job.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all duration-fast active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-2xs font-medium ${STATUS_COLOR[job.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[job.status] || job.status}
                    </span>
                    {(job.priority === "critical" || job.priority === "high") && (
                      <AlertTriangle size={14} className={PRIORITY_ICON[job.priority]} />
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 truncate">
                    {job.reference}
                  </h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {job.description || job.type}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 mt-1 flex-shrink-0" />
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.site_name || "Sitio"}
                </span>
                {job.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(job.scheduled_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

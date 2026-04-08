import { useParams, Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { ArrowLeft, Clock, CheckCircle, Upload, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { toast } from "sonner";

const statusColors = {
  created: "bg-surface-overlay text-text-secondary",
  assigned: "bg-info-muted text-info",
  accepted: "bg-info-muted text-info",
  en_route: "bg-warning-muted text-warning",
  on_site: "bg-info-muted text-info",
  in_progress: "bg-primary-muted text-primary-light",
  completed: "bg-success-muted text-success",
  cancelled: "bg-surface-overlay text-text-tertiary",
  failed: "bg-danger-muted text-danger",
};

export default function InterventionDetailPage() {
  const { id } = useParams();
  const { data, loading, refetch } = useFetch(`/interventions/${id}`);
  const [uploading, setUploading] = useState(false);

  const iv = data?.data;
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function generateReport(premium = false) {
    setGenerating(true);
    try {
      const res = await api.post(`/ai/reports/${id}/generate?premium=${premium}`, {});
      setReport(res.report);
      toast.success(premium ? "Premium report generated" : "Report generated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(newStatus) {
    try {
      await api.patch(`/interventions/${id}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleProofUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("photo_type", type);
      await api.upload(`/interventions/${id}/proof`, formData);
      toast.success("Photo uploaded");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-text-tertiary">Loading...</p>;
  if (!iv) return <p className="text-text-tertiary">Intervention not found</p>;

  const nextStatuses = {
    created: ["assigned"],
    assigned: ["accepted", "cancelled"],
    accepted: ["en_route"],
    en_route: ["on_site"],
    on_site: ["in_progress"],
    in_progress: ["completed", "failed"],
  };

  const allowedNext = nextStatuses[iv.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/interventions" className="text-text-secondary hover:text-text-primary transition-all duration-fast ease-out-expo"><ArrowLeft size={20} /></Link>
        <h2 className="text-xl font-bold text-text-primary font-mono">{iv.reference}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[iv.status]}`}>{iv.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 space-y-3 accent-bar">
          <h3 className="label-caps">Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-text-tertiary">Site:</span> <span className="text-text-primary">{iv.site_name || iv.client || "—"}</span></p>
            {iv.technician_name && <p><span className="text-text-tertiary">Technician:</span> <span className="text-text-primary">{iv.technician_name}</span></p>}
            <p><span className="text-text-tertiary">Type:</span> <span className="text-text-primary">{iv.type}</span></p>
            <p><span className="text-text-tertiary">Priority:</span> <span className="text-text-primary">{iv.priority}</span></p>
            <p><span className="text-text-tertiary">Description:</span> <span className="text-text-primary">{iv.description}</span></p>
          </div>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 space-y-3 accent-bar">
          <h3 className="label-caps">SLA</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-text-tertiary">Response:</span> <span className="text-text-primary font-mono">{iv.sla?.response_minutes}min</span></p>
            <p><span className="text-text-tertiary">Resolution:</span> <span className="text-text-primary font-mono">{iv.sla?.resolution_minutes}min</span></p>
            {iv.sla?.deadline_at && <p><span className="text-text-tertiary">Deadline:</span> <span className="text-text-primary font-mono">{new Date(iv.sla.deadline_at).toLocaleString()}</span></p>}
            {iv.sla?.breached && <p className="text-danger font-medium font-mono">SLA BREACHED</p>}
          </div>
        </div>
      </div>

      {allowedNext.length > 0 && (
        <div className="flex gap-2">
          {allowedNext.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-fast ease-out-expo ${
                s === "completed" ? "bg-success hover:shadow-glow-success text-text-inverse" :
                s === "cancelled" || s === "failed" ? "bg-danger hover:shadow-glow-danger text-text-inverse" :
                "bg-primary hover:bg-primary-dark hover:shadow-glow-primary text-text-inverse"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
        <h3 className="label-caps mb-3">Timeline</h3>
        <div className="space-y-3">
          {iv.timeline?.map((event, i) => {
            const label = event.event || event.status || "update";
            return (
              <div key={i} className="flex items-start gap-3 stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mt-0.5">
                  {label === "completed" ? (
                    <CheckCircle size={16} className="text-success" />
                  ) : (
                    <Clock size={16} className="text-text-tertiary" />
                  )}
                </div>
                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[label] || "bg-surface-overlay text-text-secondary"}`}>{label.replace("_", " ")}</span>
                  {event.actor && <span className="text-xs text-text-tertiary ml-2">{event.actor}</span>}
                  <p className="text-xs text-text-tertiary mt-0.5 font-mono">{new Date(event.timestamp).toLocaleString()}</p>
                  {event.note && <p className="text-sm text-text-secondary mt-0.5">{event.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="label-caps">Proof of Work</h3>
          <label className="flex items-center gap-1.5 bg-surface-overlay hover:bg-surface-border text-text-secondary px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-fast ease-out-expo">
            <Upload size={14} /> {uploading ? "Uploading..." : "Upload Photo"}
            <input type="file" accept="image/*" onChange={(e) => handleProofUpload(e, "work")} className="hidden" />
          </label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {iv.proof_of_work?.arrival_photo && (
            <div className="aspect-square bg-surface-overlay rounded-md overflow-hidden relative">
              <img src={iv.proof_of_work.arrival_photo.url} alt="Arrival" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-black/70 text-xs text-text-primary px-1 rounded">Arrival</span>
            </div>
          )}
          {iv.proof_of_work?.work_photos?.map((p, i) => (
            <div key={i} className="aspect-square bg-surface-overlay rounded-md overflow-hidden">
              <img src={p.url} alt={p.description || "Work"} className="w-full h-full object-cover" />
            </div>
          ))}
          {iv.proof_of_work?.completion_photo && (
            <div className="aspect-square bg-surface-overlay rounded-md overflow-hidden relative">
              <img src={iv.proof_of_work.completion_photo.url} alt="Completion" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-black/70 text-xs text-text-primary px-1 rounded">Completion</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
        <div className="flex items-center justify-between mb-3">
          <h3 className="label-caps flex items-center gap-2"><Sparkles size={14} className="text-primary" /> AI Report</h3>
          <div className="flex gap-2">
            <button
              onClick={() => generateReport(false)}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg text-sm bg-primary hover:bg-primary-dark hover:shadow-glow-primary text-text-inverse transition-all duration-fast ease-out-expo disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Report"}
            </button>
            <button
              onClick={() => generateReport(true)}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg text-sm bg-surface-overlay hover:bg-surface-border text-text-secondary transition-all duration-fast ease-out-expo disabled:opacity-50"
              title="Usa Claude Sonnet (facturable add-on)"
            >
              Premium
            </button>
          </div>
        </div>
        {report && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="label-caps mb-1">Executive Summary</p>
              <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{report.executive_summary}</p>
            </div>
            {report.actions_taken?.length > 0 && (
              <div>
                <p className="label-caps mb-1">Actions Taken</p>
                <ul className="list-disc list-inside text-text-secondary space-y-0.5">
                  {report.actions_taken.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {report.client_email_draft && (
              <div className="bg-surface-overlay rounded-md p-3">
                <p className="label-caps mb-1">Client Email Draft</p>
                <p className="text-xs text-text-tertiary mb-1">Subject: {report.client_email_draft.subject}</p>
                <p className="text-text-primary text-xs whitespace-pre-wrap font-mono">{report.client_email_draft.body}</p>
              </div>
            )}
            {report.kb_candidate?.should_create && (
              <p className="text-xs text-warning">→ KB candidate suggested ({report.kb_candidate.category})</p>
            )}
          </div>
        )}
      </div>

      {iv.resolution && (
        <div className="bg-success-muted border border-success/30 rounded-lg p-4 accent-bar-success">
          <h3 className="label-caps text-success mb-2">Resolution</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-text-secondary">Problem:</span> <span className="text-text-primary">{iv.resolution.problem_found}</span></p>
            <p><span className="text-text-secondary">Solution:</span> <span className="text-text-primary">{iv.resolution.solution_applied}</span></p>
            <p><span className="text-text-secondary">Duration:</span> <span className="text-text-primary font-mono">{iv.resolution.duration_minutes} min</span></p>
            <p><span className="text-text-secondary">Category:</span> <span className="text-text-primary">{iv.resolution.category}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

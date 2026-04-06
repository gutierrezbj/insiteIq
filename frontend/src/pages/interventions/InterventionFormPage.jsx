import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function InterventionFormPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [techs, setTechs] = useState([]);
  const [form, setForm] = useState({
    site_id: "",
    technician_id: "",
    type: "reactive",
    priority: "normal",
    description: "",
    sla: { response_minutes: 240, resolution_minutes: 480 },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/sites?per_page=100").then((d) => setSites(d.data || []));
    api.get("/technicians?per_page=100").then((d) => setTechs(d.data || []));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.site_id) { toast.error("Select a site"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.technician_id) delete payload.technician_id;
      const res = await api.post("/interventions", payload);
      toast.success("Intervention created");
      navigate(`/interventions/${res.data.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/interventions" className="text-text-secondary hover:text-text-primary transition-all duration-fast ease-out-expo"><ArrowLeft size={20} /></Link>
        <h2 className="text-xl font-bold text-text-primary font-display">New Intervention</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Site</label>
          <select value={form.site_id} onChange={(e) => set("site_id", e.target.value)} required className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo">
            <option value="">Select site...</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.client}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Technician (optional)</label>
          <select value={form.technician_id} onChange={(e) => set("technician_id", e.target.value)} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo">
            <option value="">Assign later...</option>
            {techs.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.city}, {t.country}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo">
              <option value="reactive">Reactive</option>
              <option value="preventive">Preventive</option>
              <option value="install">Install</option>
              <option value="audit">Audit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary resize-none transition-all duration-fast ease-out-expo" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">SLA Response (min)</label>
            <input type="number" value={form.sla.response_minutes} onChange={(e) => setForm((f) => ({ ...f, sla: { ...f.sla, response_minutes: parseInt(e.target.value) || 240 } }))} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">SLA Resolution (min)</label>
            <input type="number" value={form.sla.resolution_minutes} onChange={(e) => setForm((f) => ({ ...f, sla: { ...f.sla, resolution_minutes: parseInt(e.target.value) || 480 } }))} className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark hover:shadow-glow-primary disabled:opacity-50 text-text-inverse px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast ease-out-expo">
          {saving ? "Creating..." : "Create Intervention"}
        </button>
      </form>
    </div>
  );
}

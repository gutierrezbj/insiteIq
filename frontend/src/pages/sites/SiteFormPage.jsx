import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function SiteFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    client: "",
    address: "",
    country: "",
    city: "",
    region: "",
    access_instructions: "",
    contact: { name: "", phone: "", email: "", available_hours: "" },
    location: { type: "Point", coordinates: [0, 0] },
    tags: "",
    quirks: "",
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setContact(field, value) {
    setForm((f) => ({ ...f, contact: { ...f.contact, [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
        quirks: form.quirks ? form.quirks.split("\n").filter(Boolean) : [],
      };
      const res = await api.post("/sites", payload);
      toast.success("Site created");
      navigate(`/sites/${res.data.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/sites" className="text-text-secondary hover:text-text-primary transition-all duration-fast ease-out-expo"><ArrowLeft size={20} /></Link>
        <h2 className="text-xl font-bold text-text-primary font-display">New Site</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={form.name} onChange={(v) => set("name", v)} required />
          <Input label="Client" value={form.client} onChange={(v) => set("client", v)} required />
        </div>
        <Input label="Address" value={form.address} onChange={(v) => set("address", v)} required />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Country" value={form.country} onChange={(v) => set("country", v)} />
          <Input label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Input label="Region" value={form.region} onChange={(v) => set("region", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Longitude" type="number" value={form.location.coordinates[0]} onChange={(v) => setForm((f) => ({ ...f, location: { type: "Point", coordinates: [parseFloat(v) || 0, f.location.coordinates[1]] } }))} />
          <Input label="Latitude" type="number" value={form.location.coordinates[1]} onChange={(v) => setForm((f) => ({ ...f, location: { type: "Point", coordinates: [f.location.coordinates[0], parseFloat(v) || 0] } }))} />
        </div>

        <h3 className="label-caps pt-2">Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={form.contact.name} onChange={(v) => setContact("name", v)} />
          <Input label="Phone" value={form.contact.phone} onChange={(v) => setContact("phone", v)} />
          <Input label="Email" value={form.contact.email} onChange={(v) => setContact("email", v)} />
          <Input label="Hours" value={form.contact.available_hours} onChange={(v) => setContact("available_hours", v)} />
        </div>

        <Textarea label="Access Instructions" value={form.access_instructions} onChange={(v) => set("access_instructions", v)} />
        <Input label="Tags (comma separated)" value={form.tags} onChange={(v) => set("tags", v)} />
        <Textarea label="Quirks (one per line)" value={form.quirks} onChange={(v) => set("quirks", v)} />

        <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark hover:shadow-glow-primary disabled:opacity-50 text-text-inverse px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast ease-out-expo">
          {saving ? "Creating..." : "Create Site"}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={type === "number" ? "any" : undefined}
        className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary resize-none transition-all duration-fast ease-out-expo"
      />
    </div>
  );
}

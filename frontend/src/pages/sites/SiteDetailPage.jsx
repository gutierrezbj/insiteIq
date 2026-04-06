import { useParams, Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { ArrowLeft, Upload, MapPin } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { toast } from "sonner";

export default function SiteDetailPage() {
  const { id } = useParams();
  const { data, loading, refetch } = useFetch(`/sites/${id}`);
  const { data: kbData } = useFetch(`/kb/site/${id}`);
  const [uploading, setUploading] = useState(false);

  const site = data?.data;
  const kbEntries = kbData?.data || [];

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("photo_type", "other");
      await api.upload(`/sites/${id}/photos`, formData);
      toast.success("Photo uploaded");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-text-tertiary">Loading...</p>;
  if (!site) return <p className="text-text-tertiary">Site not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/sites" className="text-text-secondary hover:text-text-primary transition-all duration-fast ease-out-expo"><ArrowLeft size={20} /></Link>
        <h2 className="text-xl font-bold text-text-primary font-display">{site.name}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 space-y-3 accent-bar">
          <h3 className="label-caps">General</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-text-tertiary">Client:</span> <span className="text-text-primary">{site.client}</span></p>
            <p className="flex items-center gap-1"><MapPin size={12} className="text-text-tertiary" /> <span className="text-text-primary">{site.address}</span></p>
            <p><span className="text-text-tertiary">Region:</span> <span className="text-text-primary">{site.city}, {site.region}, {site.country}</span></p>
            <p><span className="text-text-tertiary">Interventions:</span> <span className="text-text-primary font-mono">{site.intervention_count}</span></p>
          </div>
          {site.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {site.tags.map((t) => <span key={t} className="bg-surface-overlay text-text-secondary text-xs px-2 py-0.5 rounded">{t}</span>)}
            </div>
          )}
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 space-y-3 accent-bar">
          <h3 className="label-caps">Contact</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-text-tertiary">Name:</span> <span className="text-text-primary">{site.contact?.name}</span></p>
            <p><span className="text-text-tertiary">Phone:</span> <span className="text-text-primary">{site.contact?.phone}</span></p>
            <p><span className="text-text-tertiary">Email:</span> <span className="text-text-primary">{site.contact?.email}</span></p>
            <p><span className="text-text-tertiary">Hours:</span> <span className="text-text-primary">{site.contact?.available_hours}</span></p>
          </div>
        </div>
      </div>

      {site.access_instructions && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
          <h3 className="label-caps mb-2">Access Instructions</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{site.access_instructions}</p>
        </div>
      )}

      {site.quirks?.length > 0 && (
        <div className="bg-warning-muted border border-warning/30 rounded-lg p-4 accent-bar-warning">
          <h3 className="label-caps text-warning mb-2">Quirks</h3>
          <ul className="list-disc list-inside text-sm text-warning space-y-1">
            {site.quirks.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>
      )}

      {site.equipment?.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
          <h3 className="label-caps mb-3">Equipment</h3>
          <div className="space-y-2">
            {site.equipment.map((eq, i) => (
              <div key={i} className="bg-surface-overlay rounded-md px-3 py-2 text-sm stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="text-text-primary font-medium">{eq.brand} {eq.model}</span>
                <span className="text-text-secondary"> — {eq.type}</span>
                {eq.location_in_site && <span className="text-text-tertiary"> ({eq.location_in_site})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface-raised border border-surface-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="label-caps">Photos ({site.photos?.length || 0})</h3>
          <label className="flex items-center gap-1.5 bg-surface-overlay hover:bg-surface-border text-text-secondary px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-fast ease-out-expo">
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
        {site.photos?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {site.photos.map((p, i) => (
              <div key={i} className="aspect-square bg-surface-overlay rounded-md overflow-hidden">
                <img src={p.url} alt={p.description || `Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-tertiary text-sm">No photos yet</p>
        )}
      </div>

      {kbEntries.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
          <h3 className="label-caps mb-3">Knowledge Base ({kbEntries.length})</h3>
          <div className="space-y-2">
            {kbEntries.map((e, i) => (
              <div key={e.id} className="bg-surface-overlay rounded-md p-3 stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="text-sm text-danger">Problem: {e.problem}</p>
                <p className="text-sm text-success mt-1">Solution: {e.solution}</p>
                <span className="label-caps">{e.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { Sparkles, Mail, Send } from "lucide-react";
import { api } from "../../api/client";
import { toast } from "sonner";

export default function AIOpsPage() {
  const { data: usage } = useFetch("/ai/usage/summary?days=30");
  const { data: queue, refetch: refetchQueue } = useFetch("/ai/intake/queue");
  const [pasting, setPasting] = useState(false);
  const [raw, setRaw] = useState("");
  const [subject, setSubject] = useState("");

  async function ingest() {
    if (!raw.trim()) return;
    setPasting(true);
    try {
      const res = await api.post("/ai/intake/email", { body: raw, subject, source: "manual" });
      toast.success(`Parsed (confidence ${(res.confidence * 100).toFixed(0)}%)`);
      setRaw(""); setSubject("");
      refetchQueue();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPasting(false);
    }
  }

  const totals = usage?.totals || {};
  const breakdown = usage?.breakdown || [];
  const items = queue?.data || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
        <Sparkles size={20} className="text-primary" /> AI Operations
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Calls (30d)", value: totals.calls || 0 },
          { label: "Tokens In", value: (totals.tokens_in || 0).toLocaleString() },
          { label: "Tokens Out", value: (totals.tokens_out || 0).toLocaleString() },
          { label: "Errors", value: totals.errors || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-surface-raised border border-surface-border rounded-lg p-3 accent-bar">
            <p className="label-caps">{s.label}</p>
            <p className="text-2xl font-bold text-text-primary font-mono mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
          <h3 className="label-caps mb-3 flex items-center gap-2"><Mail size={14} /> Email Intake (manual paste)</h3>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-text-primary text-sm mb-2 focus:outline-none focus:border-primary"
          />
          <textarea
            placeholder="Pega el cuerpo del email aquí..."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-xs font-mono focus:outline-none focus:border-primary"
          />
          <button
            onClick={ingest}
            disabled={pasting || !raw.trim()}
            className="mt-2 flex items-center gap-1.5 bg-primary hover:bg-primary-dark hover:shadow-glow-primary text-text-inverse px-3 py-1.5 rounded-lg text-sm transition-all duration-fast ease-out-expo disabled:opacity-50"
          >
            <Send size={14} /> {pasting ? "Parsing..." : "Parse with AI"}
          </button>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
          <h3 className="label-caps mb-3">Tier Breakdown (30d)</h3>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {breakdown.length === 0 && <p className="text-xs text-text-tertiary">No usage yet</p>}
            {breakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-surface-overlay rounded px-2 py-1.5">
                <div>
                  <span className="font-mono text-primary-light">{b._id?.tier || "—"}</span>
                  <span className="text-text-tertiary mx-1">·</span>
                  <span className="text-text-secondary">{b._id?.task}</span>
                  {b._id?.client && <span className="text-text-tertiary"> · {b._id.client}</span>}
                </div>
                <div className="flex gap-3 text-text-tertiary font-mono">
                  <span>{b.calls}c</span>
                  <span>{b.tokens_in}/{b.tokens_out}t</span>
                  {b.errors > 0 && <span className="text-danger">{b.errors}e</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
        <h3 className="label-caps mb-3">Intake Queue · needs review ({items.length})</h3>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-xs text-text-tertiary">Empty</p>}
          {items.map((m, i) => (
            <div key={m.id} className="bg-surface-overlay rounded-md p-3 stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{m.subject || "(no subject)"}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{m.sender}</p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning-muted text-warning">
                  {(m.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {m.parsed && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-text-secondary">
                  {m.parsed.client && <span><span className="text-text-tertiary">Client:</span> {m.parsed.client}</span>}
                  {m.parsed.external_reference && <span><span className="text-text-tertiary">Ref:</span> {m.parsed.external_reference}</span>}
                  {m.parsed.site_name && <span><span className="text-text-tertiary">Site:</span> {m.parsed.site_name}</span>}
                  {m.parsed.service_date && <span><span className="text-text-tertiary">Date:</span> {m.parsed.service_date}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import { Globe, Clock, User, Radio, Moon, MapPin } from "lucide-react";

/* ── Role config ─────────────────────────────────────────────────── */
const ROLE_CONFIG = {
  owner:          { label: "OWNER",    color: "text-primary",    dot: "bg-primary" },
  lead:           { label: "LEAD",     color: "text-primary",    dot: "bg-primary" },
  coordinator:    { label: "COORD",    color: "text-blue-400",   dot: "bg-blue-400" },
  pm:             { label: "PM",       color: "text-cyan-400",   dot: "bg-cyan-400" },
  field_engineer: { label: "FE",       color: "text-green-400",  dot: "bg-green-400" },
};

/* ── Status config ───────────────────────────────────────────────── */
const STATUS_CONFIG = {
  available:  { label: "Available",  color: "text-green-400",  dot: "bg-green-500" },
  on_mission: { label: "On mission", color: "text-amber-400",  dot: "bg-amber-500" },
  busy:       { label: "Busy",       color: "text-blue-400",   dot: "bg-blue-500" },
  offline:    { label: "Offline",    color: "text-stone-500",  dot: "bg-stone-500" },
};

/* ── Member row ──────────────────────────────────────────────────── */
function TeamMemberRow({ member }) {
  const role = ROLE_CONFIG[member.role] || { label: member.role, color: "text-text-tertiary", dot: "bg-stone-400" };
  const status = STATUS_CONFIG[member.current_status] || STATUS_CONFIG.available;
  const isOff = !member.on_shift;

  return (
    <div className={`flex items-center gap-2.5 py-1.5 ${isOff ? "opacity-40" : ""}`}>
      {/* Shift indicator */}
      <div className="relative flex-shrink-0">
        <div className={`w-7 h-7 rounded-full ${member.on_shift ? "bg-surface-overlay" : "bg-surface-base"} border ${member.on_shift ? "border-surface-border" : "border-surface-border/50"} flex items-center justify-center`}>
          <User size={12} className={member.on_shift ? "text-text-secondary" : "text-text-tertiary"} />
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${member.on_shift ? status.dot : "bg-stone-600"} border-2 border-surface-raised`} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary truncate">{member.name}</span>
          <span className={`text-2xs font-mono font-bold ${role.color}`}>{role.label}</span>
        </div>
        <div className="flex items-center gap-2 text-2xs text-text-tertiary">
          <span className="flex items-center gap-0.5">
            <MapPin size={8} />
            {member.city}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock size={8} />
            <span className="font-mono tabular-nums">{member.local_time}</span>
          </span>
          {isOff && <Moon size={8} className="text-stone-500" />}
        </div>
      </div>

      {/* Regions */}
      {member.covers_regions?.length > 0 && (
        <div className="flex-shrink-0 hidden xl:block">
          <span className="text-2xs font-mono text-text-tertiary">{member.covers_regions[0]}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN: ActiveTeamPanel — shows team members with timezone/shift
   ══════════════════════════════════════════════════════════════════════ */
export default function ActiveTeamPanel({ compact = false }) {
  const [members, setMembers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, on_shift: 0, off_shift: 0 });

  const fetchTeam = useCallback(async () => {
    try {
      const res = await api.get("/team/active");
      setMembers(res.data || []);
      setCounts(res.counts || { total: 0, on_shift: 0, off_shift: 0 });
    } catch (e) {
      console.error("[Team] fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
    const id = setInterval(fetchTeam, 60_000);
    return () => clearInterval(id);
  }, [fetchTeam]);

  if (compact) {
    // Compact mode for sidebar — just on-shift members
    const onShift = members.filter((m) => m.on_shift);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs mb-1.5">
          <span className="flex items-center gap-1"><Radio size={10} className="text-green-400" /><span className="font-mono text-green-400">{counts.on_shift}</span><span className="text-text-tertiary">on shift</span></span>
          <span className="text-text-tertiary">·</span>
          <span className="flex items-center gap-1"><Moon size={10} className="text-stone-500" /><span className="font-mono text-text-tertiary">{counts.off_shift}</span></span>
        </div>
        {onShift.map((m) => (
          <TeamMemberRow key={m.id} member={m} />
        ))}
        {onShift.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 py-1">
            <Moon size={12} />
            <span className="font-medium">No one on shift</span>
          </div>
        )}
      </div>
    );
  }

  // Full mode — all members
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 text-xs mb-2">
        <span className="flex items-center gap-1.5"><Radio size={10} className="text-green-400" /><span className="font-mono text-text-primary">{counts.on_shift}</span><span className="text-text-tertiary">on shift</span></span>
        <span className="flex items-center gap-1.5"><Moon size={10} className="text-stone-500" /><span className="font-mono text-text-primary">{counts.off_shift}</span><span className="text-text-tertiary">off</span></span>
        <span className="flex items-center gap-1.5"><Globe size={10} className="text-text-tertiary" /><span className="font-mono text-text-primary">{counts.total}</span><span className="text-text-tertiary">total</span></span>
      </div>
      {members.map((m) => (
        <TeamMemberRow key={m.id} member={m} />
      ))}
    </div>
  );
}

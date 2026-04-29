/**
 * InterventionsKanbanPage — Kanban de Intervenciones (Fase Epsilon · DS v1.7)
 *
 * Refactor 1:1 del mock mocks/insiteiq_kanban_v2_static.html.
 *
 * Layout:
 *   [Filter bar: search + dropdowns + toggle Canceladas + CTA]
 *   [Kanban board horizontal scroll · 5 columnas + Canceladas toggle]
 *   [WoStageModal context-aware al click en card]
 *
 * Drag & drop nativo HTML5:
 *   - dragstart en card → marca is-dragging + body.drag-active
 *   - dragover en columna → preventDefault + visual is-drop-target
 *   - drop → llama API advance + actualiza estado local + toast
 *
 * Mapeo de stages a columnas:
 *   intake/triage → Solicitadas
 *   pre_flight/dispatched/assigned → Preparando
 *   en_route/on_site/in_progress → En campo
 *   resolved/in_closeout → Cerrando
 *   closed/completed → Cerradas
 *   cancelled → Canceladas (toggle)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { useRefresh } from "../../../contexts/RefreshContext";
import { Icon, ICONS } from "../../../lib/icons";
import WoKanbanCard from "../../../components/kanban-v2/WoKanbanCard";
import KanbanColumn from "../../../components/kanban-v2/KanbanColumn";
import WoStageModal from "../../../components/kanban-v2/WoStageModal";
import MultiSelectDropdown from "../../../components/kanban-v2/MultiSelectDropdown";
import { SkeletonKanbanCard } from "../../../components/v2-shared/Skeleton";

const STAGE_TO_COL = {
  intake:       "solicitadas",
  triage:       "solicitadas",
  pre_flight:   "preparando",
  dispatched:   "preparando",
  assigned:     "preparando",
  en_route:     "en_campo",
  on_site:      "en_campo",
  in_progress:  "en_campo",
  resolved:     "cerrando",
  in_closeout:  "cerrando",
  closed:       "cerradas",
  completed:    "cerradas",
  cancelled:    "canceladas",
};

// Stage default al hacer drop en una columna (el upstream del flujo)
const COL_DEFAULT_STAGE = {
  solicitadas: "intake",
  preparando:  "pre_flight",
  en_campo:    "en_route",
  cerrando:    "resolved",
  cerradas:    "closed",
  canceladas:  "cancelled",
};

const COLUMNS = [
  { id: "solicitadas", title: "Solicitadas" },
  { id: "preparando",  title: "Preparando" },
  { id: "en_campo",    title: "En campo" },
  { id: "cerrando",    title: "Cerrando" },
  { id: "cerradas",    title: "Cerradas" },
  { id: "canceladas",  title: "Canceladas", hidden: true },
];

const COL_LABEL = COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: c.title }), {});

export default function InterventionsKanbanPage() {
  const { markRefreshing, markFresh } = useRefresh();
  const [wos, setWos] = useState([]);
  const [sites, setSites] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrio, setFilterPrio] = useState(new Set());
  const [filterClient, setFilterClient] = useState(new Set());
  const [filterShield, setFilterShield] = useState(new Set());
  const [filterTech, setFilterTech] = useState(new Set());
  const [modalWoId, setModalWoId] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const draggedRef = useRef(null);

  /* ─────────────────────── Data fetch ─────────────────────── */
  const load = useCallback(async () => {
    markRefreshing();
    try {
      const [woList, siteList, orgList, userList] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/sites?limit=500"),
        api.get("/organizations?limit=500").catch(() => []),
        api.get("/users?limit=500").catch(() => []),
      ]);
      setWos(Array.isArray(woList) ? woList : woList?.items || []);
      setSites(Array.isArray(siteList) ? siteList : siteList?.items || []);
      setOrgs(Array.isArray(orgList) ? orgList : orgList?.items || []);
      setUsers(Array.isArray(userList) ? userList : userList?.items || []);
    } catch (e) {
      // silent — keep previous data
    } finally {
      setHasLoadedOnce(true);
      markFresh();
    }
  }, [markRefreshing, markFresh]);

  useEffect(() => {
    load();
    const int = setInterval(load, 45000);
    return () => clearInterval(int);
  }, [load]);

  const siteMap = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  /* ─────────────────────── Filter dropdown options ─────────────────────── */
  const prioOptions = useMemo(
    () => [
      { value: "critical", label: "Urgente" },
      { value: "high", label: "Alta" },
      { value: "medium", label: "Normal" },
      { value: "low", label: "Baja" },
    ],
    []
  );

  const clientOptions = useMemo(() => {
    const seen = new Map();
    wos.forEach((w) => {
      const o = orgMap[w.organization_id];
      if (o && !seen.has(o.id)) seen.set(o.id, { value: o.id, label: o.name || o.id });
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [wos, orgMap]);

  const shieldOptions = useMemo(
    () => [
      { value: "gold", label: "Gold" },
      { value: "silver", label: "Silver" },
      { value: "bronze_plus", label: "Bronze+" },
      { value: "bronze", label: "Bronze" },
    ],
    []
  );

  const techOptions = useMemo(() => {
    const seen = new Map();
    seen.set("__unassigned__", { value: "__unassigned__", label: "Sin asignar" });
    wos.forEach((w) => {
      const tid = w.assigned_tech_user_id || w.assignment?.tech_user_id;
      if (!tid) return;
      const u = userMap[tid];
      if (u && !seen.has(tid)) seen.set(tid, { value: tid, label: u.full_name || u.email });
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [wos, userMap]);

  /* ─────────────────────── Combined filters (search + prio + client + shield + tech) ─────────────────────── */
  const filteredWos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return wos.filter((wo) => {
      const site = siteMap[wo.site_id];
      const client = orgMap[wo.organization_id];
      const techId = wo.assigned_tech_user_id || wo.assignment?.tech_user_id;
      const tech = techId ? userMap[techId] : null;

      // Prioridad
      if (filterPrio.size > 0 && !filterPrio.has(wo.severity)) return false;

      // Cliente (organization_id)
      if (filterClient.size > 0 && !filterClient.has(wo.organization_id)) return false;

      // Shield (level del agreement asociado al site/wo)
      if (filterShield.size > 0) {
        const shield = site?.shield_level || wo.shield_level;
        if (!shield || !filterShield.has(shield)) return false;
      }

      // Técnico
      if (filterTech.size > 0) {
        const tid = techId || "__unassigned__";
        if (!filterTech.has(tid)) return false;
      }

      // Search libre
      if (q) {
        const haystack = [
          wo.id,
          wo.code,
          wo.description,
          wo.intervention_type,
          site?.name,
          site?.city,
          client?.name,
          tech?.full_name || tech?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [wos, searchTerm, siteMap, orgMap, userMap, filterPrio, filterClient, filterShield, filterTech]);

  /* ─────────────────────── Distribución por columna ─────────────────────── */
  const wosByColumn = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    filteredWos.forEach((wo) => {
      const colId = STAGE_TO_COL[wo.status] || "solicitadas";
      if (map[colId]) map[colId].push(wo);
    });
    return map;
  }, [filteredWos]);

  /* ─────────────────────── Drag & drop handlers ─────────────────────── */
  const handleDragStart = useCallback((woId, e) => {
    draggedRef.current = woId;
    if (e.currentTarget) {
      e.currentTarget.classList.add("is-dragging");
    }
    document.body.classList.add("drag-active");
  }, []);

  const handleDragEnd = useCallback((e) => {
    draggedRef.current = null;
    document.body.classList.remove("drag-active");
    document.querySelectorAll(".wo-kanban-card.is-dragging").forEach((el) => {
      el.classList.remove("is-dragging");
    });
    document.querySelectorAll(".kanban-col.is-drop-target").forEach((el) => {
      el.classList.remove("is-drop-target");
    });
  }, []);

  const handleDrop = useCallback(
    async (targetColId, e) => {
      const woId = e.dataTransfer.getData("text/plain") || draggedRef.current;
      if (!woId) return;
      const wo = wos.find((w) => w.id === woId);
      if (!wo) return;
      const currentColId = STAGE_TO_COL[wo.status];
      if (currentColId === targetColId) return;

      const newStage = COL_DEFAULT_STAGE[targetColId];

      // Optimistic update
      setWos((prev) => prev.map((w) => (w.id === woId ? { ...w, status: newStage } : w)));

      // API call
      try {
        await api.post(`/work-orders/${woId}/advance`, { to_status: newStage });
        toast.success(
          `${wo.code || woId.slice(-8).toUpperCase()} movida: ${COL_LABEL[currentColId]} → ${COL_LABEL[targetColId]}`
        );
        // Re-fetch para sincronizar timestamps + ball-in-court actualizados
        load();
      } catch (err) {
        // Rollback
        setWos((prev) => prev.map((w) => (w.id === woId ? { ...w, status: wo.status } : w)));
        toast.error(`No se pudo mover ${wo.code || ""}: ${err?.message || "error servidor"}`);
      }
    },
    [wos, load]
  );

  /* ─────────────────────── Modal handlers ─────────────────────── */
  const modalWo = useMemo(
    () => (modalWoId ? wos.find((w) => w.id === modalWoId) : null),
    [wos, modalWoId]
  );
  const modalSite = modalWo ? siteMap[modalWo.site_id] : null;
  const modalClient = modalWo ? orgMap[modalWo.organization_id] : null;
  const modalTech = modalWo
    ? userMap[modalWo.assigned_tech_user_id || modalWo.assignment?.tech_user_id]
    : null;

  const handleAdvance = useCallback(
    async (toStatus, action) => {
      if (action === "download") {
        toast.info(`Descargando informe ${modalWo?.code || ""}...`);
        return;
      }
      if (!toStatus || !modalWo) return;
      const fromStatus = modalWo.status;
      // Optimistic
      setWos((prev) =>
        prev.map((w) => (w.id === modalWo.id ? { ...w, status: toStatus } : w))
      );
      setModalWoId(null);
      try {
        await api.post(`/work-orders/${modalWo.id}/advance`, { to_status: toStatus });
        toast.success(`${modalWo.code || ""} avanzada a ${toStatus}`);
        load();
      } catch (err) {
        setWos((prev) =>
          prev.map((w) => (w.id === modalWo.id ? { ...w, status: fromStatus } : w))
        );
        toast.error(`No se pudo avanzar: ${err?.message || "error servidor"}`);
      }
    },
    [modalWo, load]
  );

  /* ─────────────────────── Render ─────────────────────── */
  return (
    <div className="px-6 py-4 flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
      {/* Filter bar */}
      <section className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Icon
            icon={ICONS.search}
            size={16}
            color="#6B7280"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Buscar WO, site, cliente, técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-wr-surface border border-wr-border focus:border-wr-amber rounded-full text-[13px] text-wr-text"
            style={{
              height: 36,
              width: 320,
              paddingLeft: 36,
              paddingRight: 12,
              outline: "none",
            }}
          />
        </div>

        {/* Filter dropdowns funcionales · multi-select con popover */}
        <MultiSelectDropdown
          label="Prioridad"
          options={prioOptions}
          selected={filterPrio}
          onChange={setFilterPrio}
        />
        <MultiSelectDropdown
          label="Cliente"
          options={clientOptions}
          selected={filterClient}
          onChange={setFilterClient}
        />
        <MultiSelectDropdown
          label="Shield"
          options={shieldOptions}
          selected={filterShield}
          onChange={setFilterShield}
        />
        <MultiSelectDropdown
          label="Técnico"
          options={techOptions}
          selected={filterTech}
          onChange={setFilterTech}
        />

        <div className="flex-1" />

        {/* Toggle canceladas */}
        <label className="flex items-center gap-2 text-[12px] text-wr-text-mid cursor-pointer">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="accent-wr-amber"
          />
          Ver canceladas
        </label>

        {/* Refresh */}
        <button
          onClick={load}
          className="h-9 w-9 flex items-center justify-center text-wr-text-mid border border-wr-border rounded-full hover:border-wr-border-strong transition"
          title="Refrescar"
        >
          <Icon icon={ICONS.refresh} size={14} />
        </button>

        {/* CTA primary */}
        <button
          className="h-9 px-4 flex items-center gap-2 text-[13px] font-medium text-white bg-wr-amber hover:brightness-110 rounded-full transition"
          onClick={() => toast.info("Crear nueva solicitud · disponible en próxima fase")}
        >
          + Nueva solicitud
        </button>
      </section>

      {/* Kanban board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden wr-scroll" style={{ paddingBottom: 8 }}>
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {COLUMNS.filter((c) => !c.hidden || (c.id === "canceladas" && showCancelled)).map(
            (col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                count={hasLoadedOnce ? (wosByColumn[col.id]?.length || 0) : 0}
                onDrop={handleDrop}
              >
                {!hasLoadedOnce ? (
                  // Skeleton state durante primer load · 2 cards por columna
                  <>
                    <SkeletonKanbanCard />
                    <SkeletonKanbanCard />
                  </>
                ) : (
                  wosByColumn[col.id]?.map((wo) => {
                    const site = siteMap[wo.site_id];
                    const client = orgMap[wo.organization_id];
                    const techId = wo.assigned_tech_user_id || wo.assignment?.tech_user_id;
                    const tech = techId ? userMap[techId] : null;
                    return (
                      <WoKanbanCard
                        key={wo.id}
                        wo={wo}
                        site={site}
                        tech={tech}
                        client={client}
                        onClick={() => setModalWoId(wo.id)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    );
                  })
                )}
              </KanbanColumn>
            )
          )}
        </div>
      </main>

      {/* Modal context-aware */}
      <WoStageModal
        wo={modalWo}
        site={modalSite}
        tech={modalTech}
        client={modalClient}
        open={!!modalWoId}
        onClose={() => setModalWoId(null)}
        onAdvance={handleAdvance}
      />
    </div>
  );
}

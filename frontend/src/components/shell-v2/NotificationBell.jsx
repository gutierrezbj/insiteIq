/**
 * NotificationBell — campanita del header (Sprint Afinar B2 · 2026-08-31).
 *
 * "Somos muchos y no sabemos ni nos notifican" — este es el fix visible.
 *
 * - Polling 30s de GET /notifications/unread-count (badge)
 * - Click → dropdown con el feed (GET /notifications?limit=20)
 * - Click en una notif → POST /{id}/read + navigate(cta_url)
 * - "Marcar todas" → POST /read-all
 * - Las ball_to_me llevan borde amber (requieren acción tuya)
 *
 * Polling hoy · WebSocket en iter B4 (el componente no cambia · solo la
 * fuente del refresh).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { Icon, ICONS } from "../../lib/icons";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

function timeAgo(iso, lang = "es") {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const en = lang === "en";
  if (s < 60) return en ? "now" : "ahora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = no cargado aún
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await api.get("/notifications/unread-count");
      setUnread(r?.unread ?? 0);
    } catch {
      /* silencioso · el badge no debe romper el header */
    }
  }, []);

  // Polling 30s + fetch inicial
  useEffect(() => {
    fetchCount();
    const int = setInterval(fetchCount, 30000);
    return () => clearInterval(int);
  }, [fetchCount]);

  // Cargar feed al abrir
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    api
      .get("/notifications?limit=20")
      .then((list) => alive && setItems(list || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open]);

  // Click-fuera cierra
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function onItemClick(n) {
    setOpen(false);
    if (!n.read_at) {
      // Optimista: baja el badge ya · el POST confirma detrás
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.cta_url) navigate(n.cta_url);
  }

  async function onReadAll() {
    setUnread(0);
    setItems((prev) =>
      (prev || []).map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    api.post("/notifications/read-all").catch(() => {});
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("notifications.title", { defaultValue: "Notificaciones" })}
        style={{
          position: "relative",
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? "#0A1628" : "#FFFFFF",
          color: open ? "#FFFFFF" : "#3D4A66",
          border: `1px solid ${open ? "#0A1628" : "#C8CDD8"}`,
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 140ms",
        }}
      >
        <Icon icon={ICONS.bell} size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              background: "#D97706",
              color: "#FFFFFF",
              borderRadius: 9,
              fontFamily: MONO,
              fontVariantNumeric: "tabular-nums",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 5px -1px rgba(217,119,6,0.5)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            width: 380,
            maxHeight: 480,
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            borderRadius: 10,
            boxShadow: "0 20px 44px -8px rgba(10,22,40,0.28)",
            zIndex: 600,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #E2E5EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#3D4A66",
              }}
            >
              {t("notifications.title", { defaultValue: "Notificaciones" })}
              {unread > 0 && <span style={{ color: "#D97706" }}> · {unread}</span>}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={onReadAll}
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#3D4A66",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
              >
                {t("notifications.mark_all", { defaultValue: "Marcar todas leídas" })}
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && !items && (
              <div style={{ padding: 20, fontFamily: JAKARTA, fontSize: 12, color: "#8B95A8" }}>
                {t("common.loading")}
              </div>
            )}
            {items && items.length === 0 && (
              <div
                style={{
                  padding: "28px 20px",
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#8B95A8",
                  textAlign: "center",
                }}
              >
                {t("notifications.empty", { defaultValue: "Sin notificaciones · todo al día" })}
              </div>
            )}
            {(items || []).map((n) => {
              const isUnread = !n.read_at;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 16px",
                    background: isUnread ? "#F7F8FA" : "#FFFFFF",
                    border: "none",
                    borderBottom: "1px solid #EEF0F4",
                    borderLeft: n.ball_to_me
                      ? "3px solid #D97706"
                      : isUnread
                        ? "3px solid #0A1628"
                        : "3px solid transparent",
                    cursor: "pointer",
                    transition: "background 140ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EEF2F6")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isUnread ? "#F7F8FA" : "#FFFFFF")
                  }
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: JAKARTA,
                        fontSize: 13,
                        fontWeight: isUnread ? 800 : 600,
                        color: "#0A1628",
                        lineHeight: 1.3,
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 10,
                        color: "#8B95A8",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(n.created_at, i18n.language)}
                    </span>
                  </div>
                  {n.body && (
                    <div
                      style={{
                        fontFamily: JAKARTA,
                        fontSize: 11.5,
                        color: "#3D4A66",
                        marginTop: 2,
                        lineHeight: 1.35,
                      }}
                    >
                      {n.body}
                    </div>
                  )}
                  {n.ball_to_me && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 5,
                        fontFamily: MONO,
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        color: "#9A5A05",
                        background: "#FEF3E2",
                        padding: "2px 7px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("notifications.ball_to_me", { defaultValue: "Te toca a ti" })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

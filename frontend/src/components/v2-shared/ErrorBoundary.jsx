/**
 * V2ErrorBoundary — fallback UI cuando algo se rompe en runtime.
 *
 * Envuelve V2CockpitPage / V2EspacioOpsPage / V2InterventionsKanbanPage para
 * que un crash de un componente no tire toda la app.
 *
 * React no tiene hook nativo para error boundaries — requiere component clase.
 *
 * Props:
 *   - children
 *   - fallback (opcional): node alternativo en lugar del fallback por default
 */

import { Component } from "react";
import i18n from "../../i18n";
import { Icon, ICONS } from "../../lib/icons";

export default class V2ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // SIEMPRE imprimir a consola · DEV + PROD · necesario para diagnosticar
    // bugs reportados por el equipo (Andros, Adriana, Iduber, Agustín, etc).
    // En el futuro · postear a /api/errors o Sentry para tracking centralizado.
    // eslint-disable-next-line no-console
    console.error("V2ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const t = i18n.t.bind(i18n);
    const errorMsg = this.state.error?.message || t("error.unknown");

    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - 200px)", padding: 24 }}
      >
        <div
          className="rounded-md"
          style={{
            padding: 28,
            maxWidth: 480,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            borderLeft: "4px solid #D63944",
            boxShadow: "0 16px 32px -4px rgba(10, 22, 40, 0.16)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon icon={ICONS.dangerTriangle} size={24} color="#D63944" />
            <h2
              className="font-jakarta text-[18px] m-0"
              style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}
            >
              {t("error.boundary_title")}
            </h2>
          </div>

          <p className="text-[13px] leading-relaxed m-0 mb-3" style={{ color: "#3D4A66", fontWeight: 500 }}>
            {t("error.boundary_subtitle")}
          </p>

          {/* Detalle del error · SIEMPRE visible (DEV + PROD) para que el
              owner/equipo lo pueda copiar y reportar sin abrir DevTools.
              Collapsible por default · click expande. */}
          <details
            className="mb-4 wr-scroll"
            style={{ maxHeight: 200, overflowY: "auto" }}
          >
            <summary
              className="cursor-pointer text-[11px] font-mono transition"
              style={{ letterSpacing: "0.06em", color: "#3D4A66" }}
            >
              Ver detalle técnico del error (copiar y mandar)
            </summary>
            <pre
              className="mt-2 text-[11px] font-mono leading-snug"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#3D4A66", background: "#F4F6F8", padding: 8, borderRadius: 4 }}
            >
              {errorMsg}
              {this.state.error?.stack && `\n\n${this.state.error.stack}`}
            </pre>
          </details>

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="cursor-pointer transition rounded-sm font-jakarta"
              style={{
                height: 36,
                padding: "0 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#3D4A66",
                background: "#FFFFFF",
                border: "1px solid #C8CDD8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F4F6F8";
                e.currentTarget.style.color = "#0A1628";
                e.currentTarget.style.borderColor = "#0A1628";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.color = "#3D4A66";
                e.currentTarget.style.borderColor = "#C8CDD8";
              }}
            >
              {t("error.retry")}
            </button>
            {/* Recargar app · ORANGE escaso (decisión con urgencia · "el sistema falló") */}
            <button
              onClick={this.handleReload}
              className="cursor-pointer transition rounded-sm flex items-center gap-1.5 font-jakarta"
              style={{
                height: 36,
                padding: "0 16px",
                fontSize: 12,
                fontWeight: 700,
                color: "#FFFFFF",
                background: "#FF6B35",
                border: "1px solid #FF6B35",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                boxShadow: "0 2px 6px -1px rgba(255, 107, 53, 0.32)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#C5481E";
                e.currentTarget.style.borderColor = "#C5481E";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FF6B35";
                e.currentTarget.style.borderColor = "#FF6B35";
              }}
            >
              <Icon icon={ICONS.refresh} size={13} />
              {t("error.reload_app")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

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
    // En dev mode mostramos el error en consola para debug rápido.
    // En prod (fase Eta) esto debería postear a /api/errors o Sentry.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("V2ErrorBoundary caught:", error, errorInfo);
    }
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

    const errorMsg = this.state.error?.message || "Error desconocido";

    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - 200px)", padding: 24 }}
      >
        <div
          className="bg-wr-surface border border-wr-border rounded-md"
          style={{ padding: 24, maxWidth: 480, width: "100%" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon icon={ICONS.dangerTriangle} size={24} color="#DC2626" />
            <h2
              className="font-display text-[16px] font-semibold text-wr-text m-0"
              style={{ letterSpacing: "0.02em" }}
            >
              Algo se rompió en esta vista
            </h2>
          </div>

          <p className="text-[13px] text-wr-text-mid leading-relaxed m-0 mb-3">
            La app no perdió tu sesión. Solo este panel falló al renderizar.
            Puedes intentar recargar o volver al cockpit.
          </p>

          {import.meta.env.DEV && (
            <details
              className="mb-4 wr-scroll"
              style={{ maxHeight: 160, overflowY: "auto" }}
            >
              <summary
                className="cursor-pointer text-[11px] font-mono text-wr-text-dim hover:text-wr-amber transition"
                style={{ letterSpacing: "0.06em" }}
              >
                Detalle técnico (solo dev)
              </summary>
              <pre
                className="mt-2 text-[11px] text-wr-text-dim font-mono leading-snug"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {errorMsg}
                {this.state.error?.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="cursor-pointer transition rounded-sm"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 500,
                color: "#9CA3AF",
                background: "transparent",
                border: "1px solid #2A2A2A",
                fontFamily: "JetBrains Mono, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Reintentar
            </button>
            <button
              onClick={this.handleReload}
              className="cursor-pointer transition rounded-sm flex items-center gap-1.5"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#0A0A0A",
                background: "#F59E0B",
                border: "1px solid #F59E0B",
                fontFamily: "JetBrains Mono, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <Icon icon={ICONS.refresh} size={13} />
              Recargar app
            </button>
          </div>
        </div>
      </div>
    );
  }
}

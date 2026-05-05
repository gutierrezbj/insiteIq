/**
 * BriefingSection · v2 paleta F (Iter 2.35).
 *
 * Copilot Briefing per WO (Domain 10.5). SRS assembla / edita coordinator_
 * notes. Tech lee + acknowledge inline. AI summary (Y-c) + Site Bible +
 * History + Similar cases (Y-a) + Site metrics. Cliente no lo ve.
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatAge } from "../ui/Badges";
import ActionDialog, {
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

export default function BriefingSection({ wo, isSrs, isAssignedTech }) {
  const { data, loading, error, reload } = useFetch(
    `/work-orders/${wo.id}/briefing`,
    { deps: [wo.id] }
  );

  if (!isSrs && !isAssignedTech) return null;

  if (loading) {
    return (
      <SectionWrapper>
        <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          cargando…
        </div>
      </SectionWrapper>
    );
  }

  if (error) {
    return (
      <SectionWrapper>
        <div style={{ padding: "20px 18px", fontFamily: JAKARTA, fontSize: 13, color: "#991B1B", fontWeight: 500 }}>
          error · {error.message}
        </div>
      </SectionWrapper>
    );
  }

  const exists = data?.exists;

  if (!exists) {
    return (
      <SectionWrapper>
        <div
          style={{
            padding: "20px 18px",
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#3D4A66",
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          Aún no hay briefing ensamblado.{" "}
          <span style={{ color: "#8B95A8" }}>
            {isSrs
              ? "El briefing compila Site Bible + historial + device bible. Tech debe ACK antes de en_route (o emergency override)."
              : "Pedile a SRS que lo prepare antes de salir."}
          </span>
        </div>
        {isSrs && (
          <div style={{ padding: "0 18px 18px" }}>
            <AssembleAction wo={wo} reload={reload} firstTime />
          </div>
        )}
      </SectionWrapper>
    );
  }

  const briefing = data;
  const acked = briefing.status === "acknowledged";

  return (
    <SectionWrapper>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                ...MONO_CAPS,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 9.5,
                color: acked ? "#0A6131" : "#7E5212",
                letterSpacing: "0.12em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: acked ? "#16A34A" : "#E8A33D",
                }}
              />
              {briefing.status}
            </span>
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              · assembled {formatAge(briefing.assembled_at)} ago
            </span>
            {acked && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                · acked {formatAge(briefing.acknowledged_at)} ago
              </span>
            )}
          </div>
          {briefing.supersedes_id && (
            <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 4 }}>
              supersedes previous version
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isSrs && <AssembleAction wo={wo} reload={reload} />}
          {isSrs && <EditNotesAction wo={wo} briefing={briefing} reload={reload} />}
          {isAssignedTech && !acked && <AckInlineAction wo={wo} reload={reload} />}
        </div>
      </div>

      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <AiSummaryBlock briefing={briefing} />
        <SiteBible s={briefing.site_bible_summary} />
        {briefing.coordinator_notes && (
          <div>
            <Label>Notas del coordinator</Label>
            <div
              style={{
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "10px 12px",
                fontFamily: JAKARTA,
                fontSize: 13,
                color: "#0A1628",
                whiteSpace: "pre-line",
                fontWeight: 500,
                lineHeight: 1.55,
              }}
            >
              {briefing.coordinator_notes}
            </div>
          </div>
        )}
        <History history={briefing.history || []} />
        <SimilarCrossSite list={briefing.similar_cross_site || []} />
        <SiteMetrics m={briefing.site_metrics} />
        {(briefing.device_bible?.length || 0) === 0 &&
          (briefing.parts_estimate?.length || 0) === 0 && (
            <div
              style={{
                ...MONO_CAPS,
                fontSize: 9.5,
                color: "#8B95A8",
                letterSpacing: "0.14em",
                borderTop: "1px solid #E2E5EC",
                paddingTop: 12,
              }}
            >
              Device Bible + parts_estimate · placeholder Fase 5 (Domain 10 Knowledge)
            </div>
          )}
      </div>
    </SectionWrapper>
  );
}

function SectionWrapper({ children }) {
  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <SectionTitle marginBottom={4}>Copilot Briefing</SectionTitle>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          Tech lee antes de salir — Decision #8 WhatsApp kill
        </div>
      </header>
      {children}
    </SectionCard>
  );
}

function Label({ children }) {
  return (
    <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function AiSummaryBlock({ briefing }) {
  const text = briefing.ai_summary;
  const model = briefing.ai_summary_model;
  const generatedAt = briefing.ai_summary_generated_at;
  const error = briefing.ai_summary_error;
  const tokensIn = briefing.ai_summary_tokens_in;
  const tokensOut = briefing.ai_summary_tokens_out;

  if (!text && !error) return null;

  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 6,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
          SRS Copilot · AI brief
        </span>
        {model && (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · {model}
          </span>
        )}
        {tokensIn != null && tokensOut != null && (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · {tokensIn}→{tokensOut} tok
          </span>
        )}
        {generatedAt && (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · {formatAge(generatedAt)} ago
          </span>
        )}
      </div>
      {text ? (
        <p
          style={{
            fontFamily: JAKARTA,
            fontSize: 13.5,
            color: "#0A1628",
            whiteSpace: "pre-line",
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          {text}
        </p>
      ) : (
        <p style={{ ...MONO_CAPS, fontSize: 10, color: "#991B1B", letterSpacing: "0.14em" }}>
          error: {error}
        </p>
      )}
      <p style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 8 }}>
        Y-c Fase 1 · basado en site history + similar cases + metrics · el sistema aprende
      </p>
    </div>
  );
}

function SiteBible({ s }) {
  if (!s || Object.keys(s).length === 0) {
    return (
      <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        — sin site bible resumen —
      </div>
    );
  }
  return (
    <div>
      <Label>Site bible · resumen</Label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderRadius: 4,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 14,
              fontWeight: 700,
              color: "#0A1628",
              lineHeight: 1.2,
            }}
          >
            {s.site_name || "—"}
          </div>
          {s.address && (
            <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 4, fontWeight: 500 }}>
              {s.address}
              {s.city && <>, {s.city}</>}
            </div>
          )}
          <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 4 }}>
            {s.country || "—"}
            {s.timezone && <> · {s.timezone}</>}
          </div>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, letterSpacing: "0.12em", marginTop: 8 }}>
            {s.has_physical_resident ? (
              <span style={{ color: "#1E40AF", fontWeight: 800 }}>· residente físico</span>
            ) : (
              <span style={{ color: "#8B95A8" }}>NOC remoto</span>
            )}
            {s.confidence && (
              <span style={{ marginLeft: 8, color: "#8B95A8" }}>· confidence {s.confidence}</span>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderRadius: 4,
            padding: "10px 12px",
          }}
        >
          <Label>Contacto onsite</Label>
          {s.onsite_contact ? (
            <div>
              <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 600 }}>
                {s.onsite_contact.name}
                {s.onsite_contact.role && (
                  <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginLeft: 8 }}>
                    · {s.onsite_contact.role}
                  </span>
                )}
              </div>
              {s.onsite_contact.phone && (
                <div style={{ fontFamily: MONO, fontSize: 13, color: "#0A1628", fontWeight: 600, marginTop: 2 }}>
                  {s.onsite_contact.phone}
                </div>
              )}
              {s.onsite_contact.email && (
                <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", fontWeight: 500 }}>
                  {s.onsite_contact.email}
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin contacto —
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Label>Access notes</Label>
            {s.access_notes ? (
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#0A1628",
                  whiteSpace: "pre-line",
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {s.access_notes}
              </div>
            ) : (
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
                — sin notas —
              </div>
            )}
          </div>
        </div>
      </div>

      {(s.known_issues?.length || 0) > 0 && (
        <div style={{ marginTop: 14 }}>
          <Label>Known issues</Label>
          <ul style={{ display: "flex", flexDirection: "column", gap: 4, listStyle: "none", padding: 0 }}>
            {s.known_issues.map((issue, i) => (
              <li
                key={i}
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#0A1628",
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                · {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function History({ history }) {
  return (
    <div>
      <Label>Histórico · últimas {history.length} intervenciones mismo site</Label>
      {history.length === 0 && (
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          — sin historial previo aquí —
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((h) => <HistoryRow key={h.work_order_id} h={h} />)}
      </div>
    </div>
  );
}

function HistoryRow({ h }) {
  const hasCapture = h.what_found_snippet || h.what_did_snippet;
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {h.reference}
            {h.status && <span style={{ marginLeft: 8, color: "#3D4A66", fontWeight: 700 }}>· {h.status}</span>}
            {h.after_hours && <span style={{ marginLeft: 8, color: "#7E5212", fontWeight: 800 }}>· after-hours</span>}
            {h.time_on_site_minutes != null && (
              <span style={{ marginLeft: 8, color: "#3D4A66", fontWeight: 700 }}>
                · {h.time_on_site_minutes}min on site
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 600,
              color: "#0A1628",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 2,
            }}
          >
            {h.title}
          </div>
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", flexShrink: 0 }}>
          {h.closed_at ? formatAge(h.closed_at) + " ago" : "—"}
        </div>
      </div>
      {hasCapture && (
        <div
          style={{
            marginTop: 8,
            paddingLeft: 10,
            borderLeft: "1px solid #E2E5EC",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {h.what_found_snippet && (
            <div>
              <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>found:</span>{" "}
              <span style={{ fontFamily: JAKARTA, fontSize: 12.5, color: "#0A1628", fontWeight: 500 }}>
                {h.what_found_snippet}
              </span>
            </div>
          )}
          {h.what_did_snippet && (
            <div>
              <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>did:</span>{" "}
              <span style={{ fontFamily: JAKARTA, fontSize: 12.5, color: "#0A1628", fontWeight: 500 }}>
                {h.what_did_snippet}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimilarCrossSite({ list }) {
  if (!list || list.length === 0) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <Label>Similar cases · mismo cliente otros sites</Label>
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", textTransform: "none", fontWeight: 700 }}>
          · Y-a · sistema que aprende
        </span>
      </div>
      <p style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 8 }}>
        Keyword overlap · usá lo que ya se hizo antes antes de improvisar
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((s) => (
          <div
            key={s.work_order_id}
            style={{
              background: "#F4F6F8",
              border: "1px solid #E2E5EC",
              borderRadius: 4,
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
                    score {s.match_score}
                  </span>
                  <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                    {s.reference}
                  </span>
                  {s.site_name && (
                    <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.12em" }}>
                      @ {s.site_name}
                    </span>
                  )}
                  {s.severity && (
                    <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                      · {s.severity}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0A1628",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 2,
                  }}
                >
                  {s.title}
                </div>
                {s.matched_terms && s.matched_terms.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {s.matched_terms.map((t) => (
                      <span
                        key={t}
                        style={{
                          ...MONO_CAPS,
                          background: "#E8EDF5",
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 9,
                          color: "#0A1628",
                          letterSpacing: "0.12em",
                          fontWeight: 800,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  ...MONO_CAPS,
                  fontSize: 9,
                  color: "#8B95A8",
                  letterSpacing: "0.12em",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {s.closed_at ? formatAge(s.closed_at) + " ago" : "—"}
                {s.time_on_site_minutes != null && <div>{s.time_on_site_minutes}min</div>}
              </div>
            </div>
            {(s.what_found_snippet || s.what_did_snippet) && (
              <div
                style={{
                  marginTop: 8,
                  paddingLeft: 10,
                  borderLeft: "2px solid #0A1628",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {s.what_found_snippet && (
                  <div>
                    <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>found:</span>{" "}
                    <span style={{ fontFamily: JAKARTA, fontSize: 12.5, color: "#0A1628", fontWeight: 500 }}>
                      {s.what_found_snippet}
                    </span>
                  </div>
                )}
                {s.what_did_snippet && (
                  <div>
                    <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>did:</span>{" "}
                    <span style={{ fontFamily: JAKARTA, fontSize: 12.5, color: "#0A1628", fontWeight: 500 }}>
                      {s.what_did_snippet}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteMetrics({ m }) {
  if (!m || !m.window_days) return null;
  const warning = (m.after_hours_pct ?? 0) >= 30 || (m.repeat_count_30d ?? 0) >= 3;
  return (
    <div>
      <Label>Site metrics · últimos {m.window_days}d</Label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        <MetricCard label="WOs" value={m.wo_count_90d ?? 0} hint="en 90d" />
        <MetricCard
          label="Avg resolve"
          value={m.avg_resolution_minutes != null ? formatMin(m.avg_resolution_minutes) : "—"}
          hint="closed → created"
        />
        <MetricCard
          label="Repeat 30d"
          value={m.repeat_count_30d ?? 0}
          hint="posible root-cause"
          tone={(m.repeat_count_30d ?? 0) >= 3 ? "warning" : "default"}
        />
        <MetricCard
          label="After-hours"
          value={`${m.after_hours_pct ?? 0}%`}
          hint="noches/fines"
          tone={(m.after_hours_pct ?? 0) >= 30 ? "warning" : "default"}
        />
      </div>
      {warning && (
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#7E5212", letterSpacing: "0.14em", marginTop: 8, fontWeight: 800 }}>
          · señal: site con patrón anormal — revisar root cause o scheduling
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, tone = "default" }) {
  const valueColor = tone === "warning" ? "#7E5212" : tone === "danger" ? "#991B1B" : "#0A1628";
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 18,
          fontWeight: 800,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function formatMin(m) {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/* ─── Actions ──────────────────────────────────────────────────── */

function ActionBtn({ onClick, label, tone = "default" }) {
  const styles = {
    default: { bg: "#FFFFFF", color: "#3D4A66", border: "#C8CDD8", hoverColor: "#0A1628", hoverBorder: "#0A1628", hoverBg: "#F4F6F8" },
    primary: { bg: "#0A1628", color: "#FFFFFF", border: "#0A1628", hoverBg: "#1A2640", shadow: "rgba(10, 22, 40, 0.32)" },
  };
  const s = styles[tone] || styles.default;
  const isPrimary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: s.bg,
        color: s.color,
        border: `1.5px solid ${s.border}`,
        borderRadius: 6,
        cursor: "pointer",
        boxShadow: isPrimary ? `0 2px 6px -1px ${s.shadow}` : "none",
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        if (isPrimary) {
          e.currentTarget.style.background = s.hoverBg;
          e.currentTarget.style.borderColor = s.hoverBg;
          e.currentTarget.style.boxShadow = `0 4px 12px -2px ${s.shadow}`;
        } else {
          e.currentTarget.style.color = s.hoverColor;
          e.currentTarget.style.borderColor = s.hoverBorder;
          e.currentTarget.style.background = s.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = s.bg;
        e.currentTarget.style.color = s.color;
        e.currentTarget.style.borderColor = s.border;
        if (isPrimary) e.currentTarget.style.boxShadow = `0 2px 6px -1px ${s.shadow}`;
      }}
    >
      {label}
    </button>
  );
}

function AssembleAction({ wo, reload, firstTime }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/assemble`, {});
    reload();
  }

  return (
    <>
      <ActionBtn
        onClick={() => setOpen(true)}
        label={firstTime ? "Assemble briefing" : "Re-assemble"}
        tone={firstTime ? "primary" : "default"}
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={firstTime ? "Assemble briefing" : "Re-assemble briefing"}
        subtitle={
          firstTime
            ? "Genera briefing con site summary + historial. Tech recibe para leer antes de en_route."
            : "Supersede la versión actual. Útil si cambió el contexto del site o hay nueva info."
        }
        submitLabel={firstTime ? "Assemble" : "Re-assemble"}
        onSubmit={submit}
      >
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          La versión actual (si existe) queda marcada superseded y el ack previo pierde validez —
          el tech tiene que leer y confirmar de nuevo.
        </p>
      </ActionDialog>
    </>
  );
}

function EditNotesAction({ wo, briefing, reload }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(briefing.coordinator_notes || "");

  useEffect(() => {
    setNotes(briefing.coordinator_notes || "");
  }, [briefing.coordinator_notes]);

  async function submit() {
    await api.patch(`/work-orders/${wo.id}/briefing`, {
      coordinator_notes: notes.trim() || null,
    });
    reload();
  }

  return (
    <>
      <ActionBtn
        onClick={() => setOpen(true)}
        label={briefing.coordinator_notes ? "Editar notas" : "+ notas"}
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Notas del coordinator"
        subtitle="Contexto adicional para el tech — va arriba del briefing"
        submitLabel="Guardar"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="brief-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="brief-notes"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cliente pidió específicamente X · OJO con el acceso sábado · confirmar badge el día antes…"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function AckInlineAction({ wo, reload }) {
  const [open, setOpen] = useState(false);

  async function submit() {
    await api.post(`/work-orders/${wo.id}/briefing/acknowledge`, {});
    reload();
  }

  return (
    <>
      <ActionBtn onClick={() => setOpen(true)} label="Acknowledge" tone="primary" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Acknowledge briefing"
        subtitle="Confirmás que lo leíste. Desbloquea en_route."
        submitLabel="Confirmar"
        onSubmit={submit}
      >
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          Queda registrado con tu user_id + timestamp en audit_log. Si el SRS re-assembla con cambios,
          el ack vuelve a pedirse.
        </p>
      </ActionDialog>
    </>
  );
}

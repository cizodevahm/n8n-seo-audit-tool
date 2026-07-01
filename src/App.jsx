import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Search, CheckCircle, XCircle, Globe, Link2, Image, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

const WEBHOOK_URL = "http://localhost:5678/webhook-test/firebase-website-audit";

const C = {
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderHover: "#CBD5E1",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  accentBorder: "#C7D2FE",
  pass: "#16A34A",
  passLight: "#F0FDF4",
  passBorder: "#BBF7D0",
  fail: "#DC2626",
  failLight: "#FEF2F2",
  failBorder: "#FECACA",
  warn: "#D97706",
  warnLight: "#FFFBEB",
  warnBorder: "#FDE68A",
  chart: ["#4F46E5", "#0D9488", "#DC2626", "#F59E0B", "#7C3AED"],
};

const INSET = "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)";

function StatusDot({ pass }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
      background: pass ? C.pass : C.fail,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {pass
        ? <CheckCircle size={12} color="white" strokeWidth={3} />
        : <XCircle size={12} color="white" strokeWidth={3} />}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", color: C.textMuted, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, padding: "14px 18px",
      boxShadow: CARD_SHADOW, flex: "1 1 120px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.textPrimary, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function IssueGroup({ label, items, color, icon: Icon }) {
  const [open, setOpen] = useState(false);
  
  const cleanItems = Array.isArray(items) ? items : [];
  if (!cleanItems.length) return null;

  return (
    <div style={{
      background: C.surface, borderRadius: 10, overflow: "hidden",
      border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <Icon size={15} color={color} strokeWidth={2} />
        <span style={{ fontSize: 13, fontWeight: 600, color, flex: 1 }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px",
          background: color + "18", color, borderRadius: 20,
        }}>{cleanItems.length}</span>
        {open ? <ChevronUp size={14} color={C.textMuted} /> : <ChevronDown size={14} color={C.textMuted} />}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {cleanItems.map((item, i) => (
            <div key={i} style={{
              fontSize: 12, fontFamily: "monospace", color: C.textSecondary,
              padding: "5px 8px", background: C.bg, borderRadius: 6,
              wordBreak: "break-all", display: "flex", alignItems: "flex-start", gap: 6,
            }}>
              <ExternalLink size={11} color={C.textMuted} style={{ flexShrink: 0, marginTop: 2 }} />
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 14px", boxShadow: CARD_SHADOW, fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.textSecondary }}>{payload[0].value?.toLocaleString()}</div>
    </div>
  );
};

function truncateTab(url) {
  try {
    const p = new URL(url);
    const path = p.pathname;
    if (path === "/" || !path) return p.hostname.replace("www.", "");
    if (path.length > 26) return "…" + path.slice(-24);
    return path;
  } catch {
    return url.length > 28 ? url.slice(0, 26) + "…" : url;
  }
}

function normalizeUrl(raw) {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export default function SEOAuditor() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);

  const handleAudit = async () => {
    const val = url.trim();
    if (!val) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizeUrl(val) }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status} — verify that n8n is listening for a test event.`);
      
      const data = await res.json();
      const pages = Array.isArray(data) ? data : [data];
      setResults(pages);
      setActiveTab(0);
    } catch (err) {
      setError(err.message || "Could not reach the audit service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const page = results?.[activeTab] ?? null;

  const checkSummary = (keyword, targetString) => {
    if (!page?.summary) return false;
    const found = page.summary.find(s => s.toLowerCase().includes(keyword.toLowerCase()));
    return found ? found.toLowerCase().includes(targetString.toLowerCase()) : false;
  };

  const checks = page ? [
    {
      label: "H1 tag",
      pass: checkSummary("H1", "has H1") && !checkSummary("H1", "has no H1"),
      ok: "H1 tag present",
      bad: "No H1 tag found — add one for standard SEO validation",
    },
    {
      label: "Single H1",
      pass: checkSummary("only one", "only one H1 tag"),
      ok: "Only one H1 layout asset (recommended)",
      bad: "Multiple H1 tags detected on this endpoint",
    },
    {
      label: "H2 tags",
      pass: checkSummary("H2", "has H2"),
      ok: "H2 section headings present",
      bad: "No H2 structural tags discovered",
    },
    {
      label: "Content length",
      pass: checkSummary("length", "length is good"),
      ok: "Content structure layout is sufficient",
      bad: "Content target metric too short",
    },
    {
      label: "Robots.txt",
      pass: checkSummary("Robots.txt", "found") && !checkSummary("Robots.txt", "not found"),
      ok: "robots.txt configuration file active",
      bad: "No robots.txt profile visible",
    },
  ] : [];

  const passCount = checks.filter(c => c.pass).length;
  const failCount = checks.length - passCount;

  const wordsCount = page?.metrics?.wordsCount || 0;
  const totalLinks = page?.metrics?.linksCount || 0;
  const brokenLinksCount = page?.metrics?.brokenLinksCount || 0;
  const extBrokenLinksCount = page?.metrics?.externalBrokenLinksCount || 0;
  const unoptImagesCount = page?.metrics?.notOptimizedImagesCount || 0;

  const chartData = page ? [
    { name: "Word count", value: wordsCount, color: C.chart[0] },
    { name: "Total links", value: totalLinks, color: C.chart[1] },
    { name: "Broken links", value: brokenLinksCount, color: C.chart[2] },
    { name: "Ext. broken", value: extBrokenLinksCount, color: C.chart[3] },
    { name: "Unopt. images", value: unoptImagesCount, color: C.chart[4] },
  ] : [];

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: C.textPrimary,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-out {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-btn:hover { background: #F8FAFC !important; }
        .run-btn:not(:disabled):hover { background: #4338CA !important; }
        .run-btn:not(:disabled):active { transform: scale(0.99); }
        .run-btn { transition: background 0.15s, transform 0.1s; }
        .check-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06) !important; }
        .check-card { transition: box-shadow 0.15s; }
      `}</style>

      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "14px 24px", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Search size={16} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.2px" }}>SEO Auditor</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Powered by Apify & n8n Agent Node</div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px 64px" }}>

        <div style={{
          background: C.surface, borderRadius: 14, padding: "24px 24px 22px",
          boxShadow: CARD_SHADOW, marginBottom: 24,
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px", marginBottom: 6, margin: 0 }}>
            Website SEO Audit
          </h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20, marginTop: 6, lineHeight: 1.6 }}>
            Enter a URL to crawl all pages and check for SEO issues, broken links, and content quality.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", position: "relative" }}>
              <Globe
                size={16} color={inputFocused ? C.accent : C.textMuted}
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", transition: "color 0.15s", pointerEvents: "none" }}
              />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && handleAudit()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  background: C.bg,
                  border: `1.5px solid ${inputFocused ? C.accent : C.border}`,
                  borderRadius: 9,
                  fontSize: 14,
                  color: C.textPrimary,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  boxShadow: inputFocused ? `0 0 0 3px ${C.accentLight}` : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              />
            </div>
            <button
              className="run-btn"
              onClick={handleAudit}
              disabled={loading || !url.trim()}
              style={{
                padding: "11px 22px",
                background: loading || !url.trim() ? C.border : C.accent,
                color: loading || !url.trim() ? C.textMuted : "white",
                border: "none", borderRadius: 9,
                fontSize: 14, fontWeight: 600,
                cursor: loading || !url.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 14, height: 14,
                    border: `2px solid ${C.textMuted}`, borderTopColor: C.accent,
                    borderRadius: "50%", animation: "spin 0.7s linear infinite",
                  }} />
                  Auditing Pages...
                </>
              ) : (
                <>
                  <Search size={14} strokeWidth={2.5} />
                  Run Audit
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: C.failLight, border: `1px solid ${C.failBorder}`,
              borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <AlertCircle size={15} color={C.fail} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: C.fail }}>{error}</span>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 18px", position: "relative" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `2px solid ${C.accent}`, opacity: 0,
                  animation: "pulse-out 1.8s ease-out infinite",
                  animationDelay: `${i * 0.6}s`,
                }} />
              ))}
              <div style={{
                position: "absolute", inset: 20,
                background: C.accent, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Search size={12} color="white" strokeWidth={2.5} />
              </div>
            </div>
            <div style={{ fontSize: 14, color: C.textSecondary, fontWeight: 500 }}>Executing sync dataset crawl across structural nodes...</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Apify runtime can require up to 60 seconds to process dependencies</div>
          </div>
        )}

        {!results && !loading && !error && (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 16px",
              background: C.accentLight, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Search size={24} color={C.accent} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>System local instance synced</div>
            <div style={{ fontSize: 14, color: C.textMuted }}>Provide an active web endpoint target above to populate layout cards.</div>
          </div>
        )}

        {results && !loading && (
          <div style={{ animation: "slide-in 0.3s ease" }}>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label="Endpoints Audited" value={results.length} color={C.accent} />
              <StatCard label="Checks Passed" value={passCount} color={C.pass} />
              <StatCard label="Issues Isolated" value={failCount + brokenLinksCount + extBrokenLinksCount + unoptImagesCount} color={failCount > 0 ? C.warn : C.pass} />
              <StatCard label="Total Page Words" value={wordsCount.toLocaleString()} />
            </div>

            <div style={{ overflowX: "auto", paddingBottom: 0 }}>
              <div style={{ display: "flex", gap: 2, minWidth: "max-content" }}>
                {results.map((p, i) => {
                  const active = activeTab === i;
                  return (
                    <button
                      key={i}
                      className="tab-btn"
                      onClick={() => setActiveTab(i)}
                      title={p.url}
                      style={{
                        padding: "9px 16px",
                        background: active ? C.surface : "transparent",
                        border: `1px solid ${active ? C.border : "transparent"}`,
                        borderBottom: active ? `1px solid ${C.surface}` : `1px solid transparent`,
                        borderRadius: "8px 8px 0 0",
                        color: active ? C.accent : C.textMuted,
                        fontWeight: active ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        position: "relative",
                        zIndex: active ? 2 : 1,
                        transition: "color 0.15s",
                      }}
                    >
                      {active && (
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: 2,
                          background: C.accent, borderRadius: "8px 8px 0 0",
                        }} />
                      )}
                      {truncateTab(p.url)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "0 12px 12px 12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", background: C.accentLight,
                border: `1px solid ${C.accentBorder}`, borderRadius: 20,
                fontSize: 12, color: C.accent, fontFamily: "monospace",
                wordBreak: "break-all", marginBottom: 22, maxWidth: "100%",
              }}>
                <Globe size={12} />
                {page?.url}
              </div>

              <SectionLabel>SEO Validation Filters</SectionLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 10, marginBottom: 28,
              }}>
                {checks.map((c, i) => (
                  <div
                    key={i}
                    className="check-card"
                    style={{
                      padding: "12px 14px",
                      background: c.pass ? C.passLight : C.failLight,
                      border: `1px solid ${c.pass ? C.passBorder : C.failBorder}`,
                      borderRadius: 10,
                      display: "flex", gap: 10, alignItems: "flex-start",
                      boxShadow: INSET,
                    }}
                  >
                    <StatusDot pass={c.pass} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 3 }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: 12, color: c.pass ? "#166534" : "#991B1B", lineHeight: 1.4 }}>
                        {c.pass ? c.ok : c.bad}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {page?.details && (
                <>
                  <SectionLabel>Isolated Anomalies</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    <IssueGroup label="Internal Broken Links" items={page.details.brokenLinks} color={C.fail} icon={Link2} />
                    <IssueGroup label="External Broken Links" items={page.details.externalBrokenLinks} color={C.warn} icon={ExternalLink} />
                    <IssueGroup label="Unoptimized Image Elements" items={page.details.notOptimizedImages} color="#7C3AED" icon={Image} />
                    <IssueGroup label="Broken Image Elements" items={page.details.brokenImages} color="#0891B2" icon={Image} />
                  </div>
                </>
              )}

              <SectionLabel>Core Metrics Spectrum</SectionLabel>
              {chartData.length > 0 && (
                <div style={{ width: "100%", height: 220, marginTop: 4 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: C.textMuted, fontSize: 11 }}
                        axisLine={{ stroke: C.border }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: C.textMuted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,0.05)" }} />
                      <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={52}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{
                display: "flex", flexWrap: "wrap", gap: "8px 16px",
                marginTop: 14, justifyContent: "center",
              }}>
                {chartData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSecondary }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    {d.name}
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
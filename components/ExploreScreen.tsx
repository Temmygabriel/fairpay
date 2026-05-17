"use client";
// FairPay — Explore Screen
// FOLDER: components/ExploreScreen.tsx
//
// Two tabs:
//   1. Search — enter role + location → get_global_stats → show aggregate data
//   2. Recent  — get_recent_submissions(20) → anonymous feed of completed verdicts
//
// global_stats key format: role.lower() + ":" + location.lower()
// Returns: { count, salary_sum, verdict_counts: { UNDERPAID, MARKET RATE, OVERPAID } }

import { useState, useEffect } from "react";
import { GlobalStats, RecentSubmission, Verdict } from "../types";
import { getGlobalStats, getRecentSubmissions } from "../lib/contract";

interface ExploreProps {
  onBack: () => void;
}

type Tab = "search" | "recent";

// ----------------------------------------------------------------
// Verdict display helpers
// ----------------------------------------------------------------
function verdictColor(v: Verdict): string {
  if (v === "UNDERPAID")   return "var(--underpaid)";
  if (v === "MARKET RATE") return "var(--market)";
  if (v === "OVERPAID")    return "var(--overpaid)";
  return "var(--text-muted)";
}

function verdictPillClass(v: Verdict): string {
  if (v === "UNDERPAID")   return "verdict-pill--underpaid";
  if (v === "MARKET RATE") return "verdict-pill--market";
  if (v === "OVERPAID")    return "verdict-pill--overpaid";
  return "verdict-pill--pending";
}

function verdictEmoji(v: Verdict): string {
  if (v === "UNDERPAID")   return "📉";
  if (v === "MARKET RATE") return "✅";
  if (v === "OVERPAID")    return "📈";
  return "❓";
}

// ----------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------
function fmtAvg(salary_sum: number, count: number, currency: string): string {
  if (count === 0) return "—";
  const avg = Math.round(salary_sum / count);
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₦";
  if (avg >= 1_000_000) return `${sym}${(avg / 1_000_000).toFixed(1)}m`;
  if (avg >= 1_000)     return `${sym}${Math.round(avg / 1_000)}k`;
  return `${sym}${avg.toLocaleString()}`;
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

// ----------------------------------------------------------------
// Stats panel — shown after a successful search
// ----------------------------------------------------------------
function StatsPanel({
  stats,
  role,
  location,
}: {
  stats: GlobalStats;
  role: string;
  location: string;
}) {
  const total      = stats.count;
  const underpaid  = stats.verdict_counts["UNDERPAID"]    ?? 0;
  const marketRate = stats.verdict_counts["MARKET RATE"]  ?? 0;
  const overpaid   = stats.verdict_counts["OVERPAID"]     ?? 0;

  if (total === 0) {
    return (
      <div className="empty-state" style={{ padding: "20px 0" }}>
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</div>
        <div>No data yet for <strong style={{ color: "var(--text-primary)" }}>{role}</strong> in <strong style={{ color: "var(--text-primary)" }}>{location}</strong>.</div>
        <div style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-muted)" }}>
          Be the first to submit for this role and location.
        </div>
      </div>
    );
  }

  // Dominant verdict
  const dominant = underpaid >= marketRate && underpaid >= overpaid
    ? "UNDERPAID"
    : overpaid >= marketRate && overpaid >= underpaid
    ? "OVERPAID"
    : "MARKET RATE";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Header */}
      <div
        style={{
          background:   "var(--bg-card)",
          border:       "1px solid var(--border)",
          borderRadius: "12px",
          padding:      "16px",
          display:      "flex",
          flexDirection:"column",
          gap:          "6px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Community data for
        </div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
          {role}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{location}</div>
      </div>

      {/* Summary tiles */}
      <div className="stats-grid-2">
        <div className="stat-tile">
          <div className="stat-tile-label">Submissions</div>
          <div className="stat-tile-value">{total}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">Avg Salary</div>
          <div className="stat-tile-value" style={{ fontSize: "1.6rem" }}>
            {fmtAvg(stats.salary_sum, total, "USD")}
          </div>
          <div className="stat-tile-sub">across all currencies</div>
        </div>
      </div>

      {/* Dominant verdict */}
      <div
        style={{
          background:   "var(--bg-card)",
          border:       `1px solid ${verdictColor(dominant as Verdict)}33`,
          borderRadius: "12px",
          padding:      "14px 16px",
          display:      "flex",
          alignItems:   "center",
          gap:          "12px",
        }}
      >
        <span style={{ fontSize: "1.8rem" }}>{verdictEmoji(dominant as Verdict)}</span>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Most common verdict
          </div>
          <div
            style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "1.4rem",
              letterSpacing: "0.06em",
              color:         verdictColor(dominant as Verdict),
            }}
          >
            {dominant}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: verdictColor(dominant as Verdict) }}>
            {pct(
              dominant === "UNDERPAID" ? underpaid : dominant === "OVERPAID" ? overpaid : marketRate,
              total
            )}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>of submissions</div>
        </div>
      </div>

      {/* Verdict breakdown bars */}
      <div
        style={{
          background:   "var(--bg-card)",
          border:       "1px solid var(--border)",
          borderRadius: "12px",
          padding:      "16px",
        }}
      >
        <div className="section-label" style={{ marginBottom: "12px" }}>Verdict breakdown</div>
        <div className="verdict-breakdown">
          {[
            { label: "Underpaid",   count: underpaid,  fillClass: "vb-bar-fill--underpaid", color: "var(--underpaid)"  },
            { label: "Market Rate", count: marketRate, fillClass: "vb-bar-fill--market",    color: "var(--market)"     },
            { label: "Overpaid",    count: overpaid,   fillClass: "vb-bar-fill--overpaid",  color: "var(--overpaid)"   },
          ].map(({ label, count, fillClass, color }) => (
            <div className="vb-row" key={label}>
              <span className="vb-label" style={{ color, fontSize: "12px" }}>{label}</span>
              <div className="vb-bar-track">
                <div
                  className={`vb-bar-fill ${fillClass}`}
                  style={{ width: `${pct(count, total)}%` }}
                />
              </div>
              <span className="vb-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------------------
// Recent submission row
// ----------------------------------------------------------------
function RecentRow({ sub }: { sub: RecentSubmission }) {
  return (
    <div
      style={{
        background:   "var(--bg-card)",
        border:       "1px solid var(--border)",
        borderRadius: "10px",
        padding:      "12px 14px",
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
      }}
    >
      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>
        {verdictEmoji(sub.verdict)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize:     "13px",
            fontWeight:   600,
            color:        "var(--text-primary)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {sub.job_title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {sub.industry} · {sub.location} · {sub.years_experience} yrs
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <span className={`verdict-pill ${verdictPillClass(sub.verdict)}`}>
          {sub.verdict}
        </span>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>
          {sub.currency}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Main screen
// ----------------------------------------------------------------
export default function ExploreScreen({ onBack }: ExploreProps) {
  const [tab, setTab]               = useState<Tab>("search");

  // Search tab state
  const [role, setRole]             = useState("");
  const [location, setLocation]     = useState("");
  const [stats, setStats]           = useState<GlobalStats | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]     = useState("");
  const [searched, setSearched]     = useState(false);

  // Recent tab state
  const [recent, setRecent]         = useState<RecentSubmission[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError]     = useState("");

  // Load recent when tab switches to "recent"
  useEffect(() => {
    if (tab !== "recent" || recent.length > 0) return;

    async function loadRecent() {
      setRecentLoading(true);
      setRecentError("");
      try {
        const data = await getRecentSubmissions(20);
        setRecent(data);
      } catch {
        setRecentError("Could not load recent submissions.");
      } finally {
        setRecentLoading(false);
      }
    }

    loadRecent();
  }, [tab, recent.length]);

  async function handleSearch() {
    if (!role.trim() || !location.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearched(true);
    try {
      const data = await getGlobalStats(role.trim(), location.trim());
      setStats(data);
    } catch {
      setSearchError("Could not fetch data. Try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="screen fadeIn">

      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="screen-title">Explore Data</h2>
      <p className="screen-sub">
        Aggregate salary intelligence from the community —
        fully anonymous, permanently on-chain.
      </p>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === "search" ? "tab-btn--active" : ""}`}
          onClick={() => setTab("search")}
        >
          🔍 Search Role
        </button>
        <button
          className={`tab-btn ${tab === "recent" ? "tab-btn--active" : ""}`}
          onClick={() => setTab("recent")}
        >
          🌍 Recent Verdicts
        </button>
      </div>

      {/* ── Search tab ── */}
      {tab === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                value={role}
                onChange={(e) => { setRole(e.target.value); setSearched(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Location</label>
              <input
                type="text"
                placeholder="e.g. Lagos"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setSearched(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={searchLoading || !role.trim() || !location.trim()}
          >
            {searchLoading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Searching…
              </span>
            ) : (
              "Search"
            )}
          </button>

          {searchError && <p className="error-text">{searchError}</p>}

          {searched && !searchLoading && stats && (
            <StatsPanel stats={stats} role={role.trim()} location={location.trim()} />
          )}

          {!searched && (
            <div
              style={{
                background:   "rgba(255,255,255,0.02)",
                border:       "1px solid var(--border)",
                borderRadius: "10px",
                padding:      "16px",
                fontSize:     "13px",
                color:        "var(--text-muted)",
                lineHeight:   1.7,
                textAlign:    "center",
              }}
            >
              Enter a job title and location to see aggregate salary data
              from all FairPay submissions for that role.
            </div>
          )}

        </div>
      )}

      {/* ── Recent verdicts tab ── */}
      {tab === "recent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {recentLoading ? (
            <div className="loading-state">
              <span className="spinner" />
              <span>Loading from chain…</span>
            </div>
          ) : recentError ? (
            <p className="error-text">{recentError}</p>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🌐</div>
              <div>No submissions on-chain yet.</div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>
                Be the first — submit your salary now.
              </div>
            </div>
          ) : (
            <>
              <div className="section-label">
                {recent.length} recent completed {recent.length === 1 ? "verdict" : "verdicts"}
              </div>
              {recent.map((sub) => (
                <RecentRow key={sub.id} sub={sub} />
              ))}
            </>
          )}

        </div>
      )}

    </div>
  );
}

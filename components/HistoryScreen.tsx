"use client";
// FairPay — History Screen
// FOLDER: components/HistoryScreen.tsx
//
// Reads get_my_submissions(address) — returns all submissions for this
// wallet address, most recent first. Fetches full submission objects
// and renders them inline with verdict chips, market range, confidence.
// Tapping a completed submission navigates to ResultScreen.

import { useState, useEffect } from "react";
import { Submission, Verdict, Confidence } from "../types";
import { getMySubmissions } from "../lib/contract";

interface HistoryProps {
  playerAddress: string;
  onBack: () => void;
  onViewSubmission: (sub: Submission) => void;
}

// ----------------------------------------------------------------
// Verdict pill colour map
// ----------------------------------------------------------------
function verdictPillClass(verdict: Verdict | null): string {
  if (verdict === "UNDERPAID")    return "verdict-pill--underpaid";
  if (verdict === "MARKET RATE")  return "verdict-pill--market";
  if (verdict === "OVERPAID")     return "verdict-pill--overpaid";
  return "verdict-pill--pending";
}

function verdictLabel(verdict: Verdict | null, status: string): string {
  if (status === "pending")  return "Pending";
  if (status === "judging")  return "Evaluating…";
  if (verdict === "UNDERPAID")   return "Underpaid";
  if (verdict === "MARKET RATE") return "Market Rate";
  if (verdict === "OVERPAID")    return "Overpaid";
  return "Unknown";
}

function verdictRowClass(verdict: Verdict | null, status: string): string {
  if (status !== "completed") return "history-row history-row--pending";
  if (verdict === "UNDERPAID")   return "history-row history-row--underpaid";
  if (verdict === "MARKET RATE") return "history-row history-row--market";
  if (verdict === "OVERPAID")    return "history-row history-row--overpaid";
  return "history-row";
}

// ----------------------------------------------------------------
// Confidence colour helper
// ----------------------------------------------------------------
function confColor(conf: Confidence | null): string {
  if (conf === "HIGH")   return "var(--conf-high)";
  if (conf === "MEDIUM") return "var(--conf-medium)";
  if (conf === "LOW")    return "var(--conf-low)";
  return "var(--text-muted)";
}

// ----------------------------------------------------------------
// Currency symbol
// ----------------------------------------------------------------
function symbol(currency: string): string {
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  if (currency === "NGN") return "₦";
  return "";
}

function fmtSalary(n: string, currency: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num)) return `${n} ${currency}`;
  const sym = symbol(currency);
  if (num >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}m`;
  if (num >= 1_000)     return `${sym}${Math.round(num / 1_000)}k`;
  return `${sym}${num.toLocaleString()}`;
}

function fmtRange(low: number | null, high: number | null, currency: string): string {
  if (!low || !high) return "—";
  const sym = symbol(currency);
  const fmtN = (n: number) => n >= 1_000 ? `${sym}${Math.round(n / 1_000)}k` : `${sym}${n}`;
  return `${fmtN(low)} – ${fmtN(high)}`;
}

// ----------------------------------------------------------------
// Single submission row — expanded card
// ----------------------------------------------------------------
function SubmissionCard({
  sub,
  onView,
}: {
  sub: Submission;
  onView: (sub: Submission) => void;
}) {
  const isCompleted = sub.status === "completed";
  const isPending   = sub.status === "pending" || sub.status === "judging";

  return (
    <div
      className={verdictRowClass(sub.verdict, sub.status)}
      onClick={() => isCompleted && onView(sub)}
      style={{ cursor: isCompleted ? "pointer" : "default" }}
    >
      {/* ── Top row: job + verdict pill ── */}
      <div className="history-row-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="history-job" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sub.job_title}
          </div>
          <div className="history-meta">
            {sub.industry} · {sub.location}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <span className={`verdict-pill ${verdictPillClass(sub.verdict)}`}>
            {verdictLabel(sub.verdict, sub.status)}
          </span>
        </div>
      </div>

      {/* ── Detail row: salary + market range + confidence ── */}
      <div
        style={{
          display:       "flex",
          gap:           "10px",
          flexWrap:      "wrap",
          alignItems:    "center",
          paddingTop:    "2px",
          borderTop:     "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Your salary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Your salary
          </span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", letterSpacing: "0.06em", color: "var(--amber)" }}>
            {fmtSalary(sub.current_salary, sub.currency)} {sub.currency}
          </span>
        </div>

        {/* Market range — only if completed */}
        {isCompleted && sub.market_range_low && sub.market_range_high && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Market range
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
              {fmtRange(sub.market_range_low, sub.market_range_high, sub.currency)}
            </span>
          </div>
        )}

        {/* Confidence — only if completed */}
        {isCompleted && sub.confidence && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Confidence
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: confColor(sub.confidence) }}>
              {sub.confidence}
            </span>
          </div>
        )}

        {/* Pending spinner */}
        {isPending && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span className="spinner" style={{ borderTopColor: "var(--indigo)" }} />
            AI evaluating…
          </div>
        )}

        {/* Submission ID */}
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <span className="history-id">{sub.id}</span>
        </div>
      </div>

      {/* ── Reasoning snippet — only if completed ── */}
      {isCompleted && sub.reasoning && (
        <div
          style={{
            fontSize:   "12px",
            color:      "var(--text-muted)",
            fontStyle:  "italic",
            lineHeight: 1.6,
            paddingTop: "6px",
            borderTop:  "1px solid rgba(255,255,255,0.04)",
          }}
        >
          "{sub.reasoning}"
        </div>
      )}

      {/* ── Tap hint for completed ── */}
      {isCompleted && (
        <div
          style={{
            fontSize:  "11px",
            color:     "var(--text-muted)",
            textAlign: "right",
          }}
        >
          Tap to view full result →
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Main screen
// ----------------------------------------------------------------
export default function HistoryScreen({
  playerAddress,
  onBack,
  onViewSubmission,
}: HistoryProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!playerAddress) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getMySubmissions(playerAddress);
        setSubmissions(data);
      } catch {
        setError("Could not load submissions. Check your connection.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [playerAddress]);

  // ----------------------------------------------------------------
  // Summary stats from loaded submissions
  // ----------------------------------------------------------------
  const completed  = submissions.filter((s) => s.status === "completed");
  const underpaid  = completed.filter((s) => s.verdict === "UNDERPAID").length;
  const marketRate = completed.filter((s) => s.verdict === "MARKET RATE").length;
  const overpaid   = completed.filter((s) => s.verdict === "OVERPAID").length;

  return (
    <div className="screen fadeIn">

      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="screen-title">My Submissions</h2>
      <p className="screen-sub">
        All salary evaluations from this device, most recent first.
        Your wallet address is the only link — no account required.
      </p>

      {/* ── Summary strip — only if there are completed submissions ── */}
      {completed.length > 0 && (
        <div className="stats-grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {[
            { label: "Underpaid",   count: underpaid,  color: "var(--underpaid)" },
            { label: "Market Rate", count: marketRate, color: "var(--market)"    },
            { label: "Overpaid",    count: overpaid,   color: "var(--overpaid)"  },
          ].map(({ label, count, color }) => (
            <div className="stat-tile" key={label} style={{ textAlign: "center" }}>
              <div className="stat-tile-label">{label}</div>
              <div className="stat-tile-value" style={{ color, fontSize: "1.8rem" }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>Loading from chain…</span>
        </div>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : submissions.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📭</div>
          <div>No submissions yet from this wallet.</div>
          <div style={{ fontSize: "13px", marginTop: "6px" }}>
            Submit your salary to see your history here.
          </div>
        </div>
      ) : (
        <div className="history-list">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onView={onViewSubmission}
            />
          ))}
        </div>
      )}

      {/* ── Address note ── */}
      {!loading && (
        <p
          style={{
            fontSize:   "11px",
            color:      "var(--text-muted)",
            textAlign:  "center",
            lineHeight: 1.6,
            padding:    "0 8px",
          }}
        >
          Showing submissions for wallet{" "}
          <span style={{ fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {playerAddress.slice(0, 10)}…{playerAddress.slice(-6)}
          </span>
        </p>
      )}

    </div>
  );
}

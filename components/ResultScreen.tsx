"use client";
// FairPay — Result Screen
// FOLDER: components/ResultScreen.tsx
//
// Verdict card layout (top to bottom):
//   1. Submission metadata (ID, role, location)
//   2. Large Bebas Neue verdict word — colour-coded
//   3. Confidence badge — FIRST CLASS, not small print
//   4. LOW confidence notice (only when confidence === "LOW")
//   5. SalaryBar — market range visualisation
//   6. Reasoning sentence
//   7. Market range numbers (text fallback)
//   8. Actions: Submit Another + Home

import SalaryBar from "./SalaryBar";
import { Submission, Verdict, Confidence } from "../types";

interface ResultProps {
  submission:      Submission;
  onHome:          () => void;
  onSubmitAnother: () => void;
}

// ----------------------------------------------------------------
// Verdict config
// ----------------------------------------------------------------
const VERDICT_CONFIG: Record<
  Verdict,
  { emoji: string; label: string; cardClass: string; wordClass: string; description: string }
> = {
  UNDERPAID: {
    emoji:       "📉",
    label:       "UNDERPAID",
    cardClass:   "verdict-card--underpaid",
    wordClass:   "verdict-word--underpaid",
    description: "Your salary is below 85% of the market median for this role.",
  },
  "MARKET RATE": {
    emoji:       "✅",
    label:       "MARKET RATE",
    cardClass:   "verdict-card--market",
    wordClass:   "verdict-word--market",
    description: "Your salary is within the fair range for this role and location.",
  },
  OVERPAID: {
    emoji:       "📈",
    label:       "OVERPAID",
    cardClass:   "verdict-card--overpaid",
    wordClass:   "verdict-word--overpaid",
    description: "Your salary is above 120% of the market median for this role.",
  },
};

// ----------------------------------------------------------------
// Confidence badge config
// ----------------------------------------------------------------
const CONF_CONFIG: Record<
  Confidence,
  { badgeClass: string; dot: string; label: string; subLabel: string }
> = {
  HIGH: {
    badgeClass: "confidence-badge--high",
    dot:        "var(--conf-high)",
    label:      "HIGH CONFIDENCE",
    subLabel:   "Strong market data",
  },
  MEDIUM: {
    badgeClass: "confidence-badge--medium",
    dot:        "var(--conf-medium)",
    label:      "MEDIUM CONFIDENCE",
    subLabel:   "Limited market data for this region",
  },
  LOW: {
    badgeClass: "confidence-badge--low",
    dot:        "var(--conf-low)",
    label:      "LOW CONFIDENCE",
    subLabel:   "Sparse data — verdict is indicative only",
  },
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function symbol(currency: string): string {
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  if (currency === "NGN") return "₦";
  return "";
}

function fmtSalary(n: number, currency: string): string {
  const sym = symbol(currency);
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `${sym}${Math.round(n / 1_000).toLocaleString()}k`;
  return `${sym}${n.toLocaleString()}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function shareText(sub: Submission): string {
  const verdict = sub.verdict ?? "evaluated";
  const role    = sub.job_title;
  const loc     = sub.location;
  return `I just found out I'm ${verdict} as a ${role} in ${loc}. Check your salary anonymously at FairPay — ${window.location.href}`;
}

// ----------------------------------------------------------------
// Experience band display helper
// ----------------------------------------------------------------
function fmtExperience(band: string): string {
  if (band === "0-1")  return "0–1 yrs exp";
  if (band === "1-3")  return "1–3 yrs exp";
  if (band === "3-5")  return "3–5 yrs exp";
  if (band === "5-10") return "5–10 yrs exp";
  if (band === "10+")  return "10+ yrs exp";
  return band;
}

export default function ResultScreen({
  submission,
  onHome,
  onSubmitAnother,
}: ResultProps) {
  const verdict    = submission.verdict    as Verdict;
  const confidence = submission.confidence as Confidence;
  const currency   = submission.currency;

  const vc = VERDICT_CONFIG[verdict]     ?? VERDICT_CONFIG["MARKET RATE"];
  const cc = CONF_CONFIG[confidence]     ?? CONF_CONFIG["LOW"];

  const hasSalaryBar =
    submission.market_range_low  !== null &&
    submission.market_range_high !== null &&
    submission.market_median     !== null;

  const currentSalaryNum = parseInt(submission.current_salary, 10);

  return (
    <div className="screen fadeIn">

      {/* ── Submission metadata strip ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            "10px",
        }}
      >
        <div>
          <div
            style={{
              fontSize:      "13px",
              fontWeight:    700,
              color:         "var(--text-primary)",
              marginBottom:  "2px",
            }}
          >
            {submission.job_title}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {submission.industry} · {submission.location} ·{" "}
            {fmtExperience(submission.years_experience)} ·{" "}
            {submission.employment_type}
          </div>
        </div>
        {/* Submission ID — copy */}
        <button
          className="sub-id-copy"
          onClick={() => copyToClipboard(submission.id)}
          title="Copy submission ID"
          style={{ flexShrink: 0 }}
        >
          {submission.id}
        </button>
      </div>

      {/* ── Main verdict card ── */}
      <div className={`verdict-card ${vc.cardClass}`}>

        {/* Verdict emoji + word */}
        <div>
          <div style={{ fontSize: "2.2rem", marginBottom: "6px" }}>{vc.emoji}</div>
          <div className={`verdict-word ${vc.wordClass}`}>{vc.label}</div>
          <div
            style={{
              fontSize:   "13px",
              color:      "var(--text-secondary)",
              marginTop:  "4px",
              lineHeight: 1.5,
            }}
          >
            {vc.description}
          </div>
        </div>

        {/* ── 1. Confidence badge — FIRST CLASS ── */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className={`confidence-badge ${cc.badgeClass}`}>
            <span className="conf-dot" style={{ background: cc.dot }} />
            <span>{cc.label}</span>
            <span
              style={{
                fontSize:    "11px",
                fontWeight:  400,
                opacity:     0.85,
                marginLeft:  "2px",
              }}
            >
              — {cc.subLabel}
            </span>
          </div>
        </div>

        {/* ── 2. LOW confidence notice — sits here, not buried ── */}
        {confidence === "LOW" && (
          <div className="confidence-notice">
            <strong>⚠ Limited data notice</strong>
            Market data for this specific role and location is limited.
            This verdict is a directional estimate, not a precise benchmark.
          </div>
        )}

        {/* ── 3. Salary bar — directly below confidence ── */}
        {hasSalaryBar && !isNaN(currentSalaryNum) ? (
          <div>
            <div
              style={{
                fontSize:     "10px",
                fontWeight:   700,
                letterSpacing:"0.12em",
                textTransform:"uppercase",
                color:        "var(--text-muted)",
                marginBottom: "10px",
                textAlign:    "left",
              }}
            >
              Market Range — {currency}
            </div>
            <SalaryBar
              current={currentSalaryNum}
              low={submission.market_range_low!}
              median={submission.market_median!}
              high={submission.market_range_high!}
              currency={currency}
            />
          </div>
        ) : (
          /* Text fallback when bar data is missing */
          submission.market_range_low && submission.market_range_high && (
            <div
              style={{
                display:       "flex",
                justifyContent:"space-between",
                padding:       "10px 14px",
                background:    "rgba(255,255,255,0.03)",
                borderRadius:  "8px",
                fontSize:      "13px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Market range</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {fmtSalary(submission.market_range_low, currency)}
                {" — "}
                {fmtSalary(submission.market_range_high, currency)}
              </span>
            </div>
          )
        )}

        {/* ── 4. Reasoning sentence ── */}
        {submission.reasoning && (
          <div
            style={{
              fontSize:    "14px",
              color:       "var(--text-secondary)",
              lineHeight:  1.7,
              textAlign:   "left",
              borderTop:   "1px solid rgba(255,255,255,0.06)",
              paddingTop:  "14px",
              fontStyle:   "italic",
            }}
          >
            "{submission.reasoning}"
          </div>
        )}

      </div>

      {/* ── Market range numbers (detailed, outside card) ── */}
      {hasSalaryBar && (
        <div
          style={{
            display:       "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap:           "8px",
          }}
        >
          {[
            { label: "Low",    value: submission.market_range_low!,  color: "#FF4D6D" },
            { label: "Median", value: submission.market_median!,     color: "var(--text-primary)" },
            { label: "High",   value: submission.market_range_high!, color: "var(--overpaid)"    },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background:   "var(--bg-card)",
                border:       "1px solid var(--border)",
                borderRadius: "10px",
                padding:      "12px",
                textAlign:    "center",
              }}
            >
              <div
                style={{
                  fontSize:      "10px",
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:         "var(--text-muted)",
                  marginBottom:  "4px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily:    "'Bebas Neue', sans-serif",
                  fontSize:      "1.4rem",
                  letterSpacing: "0.04em",
                  color,
                  lineHeight:    1,
                }}
              >
                {fmtSalary(value, currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Your submitted salary ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "12px 16px",
          background:     "var(--bg-card)",
          border:         "1px solid var(--border)",
          borderRadius:   "10px",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Your submitted salary
        </span>
        <span
          style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      "1.3rem",
            letterSpacing: "0.04em",
            color:         "var(--amber)",
          }}
        >
          {symbol(currency)}{parseInt(submission.current_salary, 10).toLocaleString()} {currency}
        </span>
      </div>

      {/* ── Share button ── */}
      <button
        className="btn-outline"
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: "FairPay — My Salary Verdict",
              text:  shareText(submission),
            }).catch(() => {});
          } else {
            copyToClipboard(shareText(submission));
            alert("Share text copied to clipboard!");
          }
        }}
      >
        🔗 &nbsp;Share My Result
      </button>

      {/* ── Actions ── */}
      <button className="btn-amber" onClick={onSubmitAnother}>
        ⚖️ &nbsp;Check Another Salary
      </button>
      <button className="btn-ghost" onClick={onHome}>
        ← Back to Home
      </button>

      {/* ── On-chain note ── */}
      <p
        style={{
          fontSize:   "12px",
          color:      "var(--text-muted)",
          textAlign:  "center",
          lineHeight: 1.6,
          padding:    "0 8px",
        }}
      >
        📦 &nbsp;Submission{" "}
        <strong style={{ color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
          {submission.id}
        </strong>{" "}
        is stored on-chain permanently. Retrieve it any time from the home screen.
      </p>

    </div>
  );
}

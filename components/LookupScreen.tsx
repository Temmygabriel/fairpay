"use client";
// FairPay — Lookup Screen
// FOLDER: components/LookupScreen.tsx
//
// Mirrors NYP RejoinScreen exactly in role.
// User enters a submission ID (e.g. SUB000012).
// Contract is called once — if completed, onLookup navigates to ResultScreen.
// If still judging/pending, onLookup navigates to JudgingScreen and polls.
//
// Pre-fills from sessionStorage "fp_lookup_prefill" if set by LandingScreen.

import { useState, useEffect } from "react";

interface LookupProps {
  onLookup: (submissionId: string) => void;
  onBack:   () => void;
  loading:  boolean;
  error:    string;
}

type LookupState = "idle" | "loading" | "error";

// ----------------------------------------------------------------
// Validation — SUB + 6 digits minimum
// ----------------------------------------------------------------
function isValidId(id: string): boolean {
  return /^SUB\d{6,}$/.test(id.trim().toUpperCase());
}

export default function LookupScreen({
  onLookup,
  onBack,
  loading,
  error,
}: LookupProps) {
  const [submissionId, setSubmissionId] = useState("");
  const [localState, setLocalState]     = useState<LookupState>("idle");

  // Pre-fill from sessionStorage if LandingScreen set it
  useEffect(() => {
    const prefill = sessionStorage.getItem("fp_lookup_prefill");
    if (prefill) {
      setSubmissionId(prefill);
      sessionStorage.removeItem("fp_lookup_prefill");
    }
  }, []);

  // Sync loading state from App
  useEffect(() => {
    if (loading) setLocalState("loading");
    else if (error) setLocalState("error");
    else setLocalState("idle");
  }, [loading, error]);

  function handleLookup() {
    const clean = submissionId.trim().toUpperCase();
    if (!isValidId(clean)) return;
    setLocalState("loading");
    onLookup(clean);
  }

  const isValid = isValidId(submissionId);

  return (
    <div className="screen fadeIn">

      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="screen-title">Look Up Result</h2>
      <p className="screen-sub">
        Enter your submission ID to retrieve your salary verdict.
        Results are stored on-chain permanently — you can look them up any time.
      </p>

      {/* ── Input row ── */}
      <div className="field-group">
        <label className="field-label">Submission ID</label>
        <div className="lookup-input-row">
          <input
            type="text"
            placeholder="SUB000001"
            value={submissionId}
            onChange={(e) => setSubmissionId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleLookup()}
            disabled={loading}
            maxLength={12}
            style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "1.2rem",
              letterSpacing: "0.1em",
            }}
          />
          <button
            className="lookup-btn"
            onClick={handleLookup}
            disabled={!isValid || loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" style={{ borderTopColor: "#fff" }} />
              </span>
            ) : (
              "Look Up"
            )}
          </button>
        </div>

        {/* Inline format hint */}
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Format: SUB followed by 6 digits — e.g. SUB000012
        </span>
      </div>

      {/* ── Error ── */}
      {localState === "error" && error && (
        <div
          style={{
            background:   "rgba(255,107,107,0.08)",
            border:       "1px solid rgba(255,107,107,0.25)",
            borderRadius: "10px",
            padding:      "12px 16px",
            fontSize:     "13px",
            color:        "var(--underpaid)",
            lineHeight:   1.6,
          }}
        >
          ⚠ &nbsp;{error}
        </div>
      )}

      {/* ── How submission IDs work ── */}
      <div
        style={{
          background:   "var(--bg-card)",
          border:       "1px solid var(--border)",
          borderRadius: "12px",
          padding:      "16px 18px",
          display:      "flex",
          flexDirection:"column",
          gap:          "10px",
        }}
      >
        <div className="section-label">Where to find your submission ID</div>

        {[
          {
            icon:  "⚖️",
            title: "After submitting",
            desc:  "Your ID is shown on the waiting screen immediately after you submit your salary.",
          },
          {
            icon:  "📋",
            title: "In My History",
            desc:  "Every submission made from this device is listed in My History with its ID.",
          },
          {
            icon:  "📦",
            title: "Permanent on-chain",
            desc:  "IDs are sequential — SUB000001, SUB000002 — and never change or expire.",
          },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            style={{
              display:    "flex",
              alignItems: "flex-start",
              gap:        "12px",
            }}
          >
            <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                {title}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Privacy note ── */}
      <p
        style={{
          fontSize:   "12px",
          color:      "var(--text-muted)",
          textAlign:  "center",
          lineHeight: 1.6,
        }}
      >
        🔒 &nbsp;Anyone with a submission ID can look up that result.
        Share your ID only with people you want to share your result with.
      </p>

    </div>
  );
}

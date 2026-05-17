"use client";
// FairPay — Judging Screen
// FOLDER: components/JudgingScreen.tsx
//
// Shown immediately after submit_salary confirms.
// Polls via App.tsx — this screen is purely display.
// Shows submission ID prominently so user can save it and come back.
// If submission prop arrives as completed, calls onResult immediately.

import { useEffect } from "react";
import { Submission } from "../types";

interface JudgingProps {
  submissionId: string;
  submission: Submission | null;
  onResult: (sub: Submission) => void;
  onHome: () => void;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function JudgingScreen({
  submissionId,
  submission,
  onResult,
  onHome,
}: JudgingProps) {
  // If polling has already completed by the time we render, jump straight to result
  useEffect(() => {
    if (submission?.status === "completed") {
      onResult(submission);
    }
  }, [submission, onResult]);

  return (
    <div className="screen screen--centered fadeIn">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          width: "100%",
          maxWidth: "460px",
        }}
      >

        {/* ── AI evaluation block ── */}
        <div className="judging-block">
          <div className="judging-icon">⚖️</div>
          <div className="judging-title">AI Evaluating</div>
          <p className="judging-sub">
            Our AI is searching real-world salary data — job boards, industry
            reports, and regional benchmarks — to evaluate your submission.
          </p>
          <div className="ai-dots" style={{ margin: "4px 0" }}>
            <span /><span /><span />
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            This usually takes{" "}
            <strong style={{ color: "var(--indigo-light)" }}>3–5 minutes</strong>.
            Keep this tab open or save your submission ID below.
          </p>
        </div>

        {/* ── Submission ID — save this ── */}
        {submissionId && (
          <div
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-mid)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Your Submission ID — Save This
            </div>

            {/* ID + copy button */}
            <div className="sub-id-banner" style={{ background: "var(--bg-raised)" }}>
              <div style={{ flex: 1 }}>
                <div className="sub-id-label">Submission ID</div>
                <div className="sub-id-value">{submissionId}</div>
              </div>
              <button
                className="sub-id-copy"
                onClick={() => copyToClipboard(submissionId)}
              >
                Copy
              </button>
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                textAlign: "left",
              }}
            >
              Can't wait? Close this tab and return later. Enter this ID on
              the home screen under{" "}
              <strong style={{ color: "var(--text-secondary)" }}>
                "Look up your result"
              </strong>{" "}
              to retrieve your verdict anytime.
            </p>
          </div>
        )}

        {/* ── What the AI is checking ── */}
        <div
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            What the AI checks
          </div>
          {[
            ["📊", "Live job board data for your role and location"],
            ["📈", "Industry salary reports and benchmarks"],
            ["🌍", "Regional cost-of-living adjustments"],
            ["💼", "Employment type and experience band adjustments"],
            ["🎯", "85% / 120% of median thresholds for verdict"],
          ].map(([icon, text]) => (
            <div
              key={String(text)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontSize: "15px", flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* ── Home escape hatch ── */}
        <button
          className="btn-ghost"
          onClick={onHome}
          style={{ width: "100%", fontSize: "0.88rem" }}
        >
          ← Back to Home
        </button>

      </div>
    </div>
  );
}

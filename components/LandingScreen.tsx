"use client";
// FairPay — Landing Screen
// FOLDER: components/LandingScreen.tsx
//
// v2.0 — "Supports USD, GBP, NGN" -> "Supports USD, GBP". NGN dropped
// entirely rather than shipped with a quietly-faked or quietly-worse
// experience. See fairpay.py module docstring for why.
//
// Hero + anonymous value prop + primary CTA + submission ID lookup
// + nav links to History and Explore.
// No wallet connect, no login — address is identity.

import { useState } from "react";
import { Screen } from "../types";

interface LandingProps {
  onNavigate: (screen: Screen) => void;
  onStartSubmit: () => void;
}

const VERDICT_EXAMPLES = [
  { verdict: "UNDERPAID", color: "var(--underpaid)", role: "Senior Engineer", loc: "Lagos" },
  { verdict: "MARKET RATE", color: "var(--market)", role: "Product Manager", loc: "London" },
  { verdict: "OVERPAID", color: "var(--overpaid)", role: "Data Analyst", loc: "New York" },
];

export default function LandingScreen({ onNavigate, onStartSubmit }: LandingProps) {
  const [lookupId, setLookupId] = useState("");

  function handleLookup() {
    const trimmed = lookupId.trim().toUpperCase();
    if (!trimmed.startsWith("SUB") || trimmed.length < 9) return;
    // Pass to App via navigate — LookupScreen reads from URL-like state
    // We store it in sessionStorage so LookupScreen can pre-fill
    sessionStorage.setItem("fp_lookup_prefill", trimmed);
    onNavigate("lookup");
  }

  return (
    <div className="fadeIn">

      {/* ── Hero ── */}
      <div className="hero-section">
        <div className="hero-inner">

          <div className="hero-eyebrow">Anonymous · On-Chain · AI-Powered</div>

          <h1 className="hero-title">
            KNOW<br />
            YOUR<br />
            <span className="highlight-amber">WORTH</span>
          </h1>

          <p className="hero-subtitle">
            Submit your salary anonymously. Our AI fetches live wage data for
            your exact role and tells you exactly where you stand —
            permanently recorded on-chain.
          </p>

          {/* Live verdict ticker */}
          <div className="hero-chips">
            {VERDICT_EXAMPLES.map((ex) => (
              <div className="hero-chip" key={ex.role}>
                <span
                  className="chip-dot"
                  style={{ background: ex.color }}
                />
                <span style={{ color: ex.color, fontWeight: 700, fontSize: "11px" }}>
                  {ex.verdict}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {ex.role} · {ex.loc}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Body ── */}
      <div className="landing-body">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Primary CTA */}
          <button className="btn-amber" onClick={onStartSubmit}>
            ⚖️ &nbsp; CHECK MY SALARY
          </button>

          {/* Lookup by submission ID */}
          <div className="landing-section-label" style={{ marginTop: "6px" }}>
            Already submitted? Look up your result
          </div>
          <div className="lookup-input-row">
            <input
              type="text"
              placeholder="Submission ID — e.g. SUB000012"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em" }}
            />
            <button
              className="lookup-btn"
              onClick={handleLookup}
              disabled={lookupId.trim().length < 9}
            >
              Look Up
            </button>
          </div>

          {/* Secondary nav */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <button
              className="btn-ghost"
              onClick={() => onNavigate("history")}
              style={{ fontSize: "0.88rem" }}
            >
              📋 &nbsp;My History
            </button>
            <button
              className="btn-ghost"
              onClick={() => onNavigate("explore")}
              style={{ fontSize: "0.88rem" }}
            >
              🌍 &nbsp;Explore Data
            </button>
          </div>

          {/* How it works */}
          <div style={{ marginTop: "8px" }}>
            <div className="landing-section-label">How it works</div>
            <div
              className="card"
              style={{ marginTop: "8px", padding: "4px 16px" }}
            >
              <div className="steps-list">
                {[
                  {
                    n: "01",
                    title: "Submit anonymously",
                    desc: "Pick your role and enter your details. No name, no email, no account — your wallet address is your identity.",
                  },
                  {
                    n: "02",
                    title: "AI fetches live data",
                    desc: "Our AI fetches a verified, current wage-data source for your exact role and cites the figure it finds — not a guess from training data.",
                  },
                  {
                    n: "03",
                    title: "Get your verdict",
                    desc: "UNDERPAID, MARKET RATE, or OVERPAID. With a market range, a confidence score, and the live figure it was based on.",
                  },
                  {
                    n: "04",
                    title: "Stored on-chain forever",
                    desc: "Your result is written to GenLayer permanently. Come back any time with your submission ID.",
                  },
                ].map((step) => (
                  <div className="step-row" key={step.n}>
                    <div className="step-num">{step.n}</div>
                    <div className="step-body">
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported currencies */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              padding: "14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              marginTop: "4px",
            }}
          >
            {["🇺🇸 USD", "🇬🇧 GBP"].map((c) => (
              <span key={c} style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>
                {c}
              </span>
            ))}
          </div>

          {/* Privacy note */}
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              textAlign: "center",
              lineHeight: 1.6,
              padding: "0 8px",
            }}
          >
            🔒 &nbsp;Your salary is never linked to your name or email.
            Your wallet address is the only identifier — and it stays yours.
          </p>

        </div>
      </div>

    </div>
  );
}

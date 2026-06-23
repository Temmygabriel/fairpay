"use client";
// FairPay — Submit Screen
// FOLDER: components/SubmitScreen.tsx
//
// v2.0 — job title is now a curated dropdown populated from get_roles(),
// not free text. This is what makes the AI's web fetch load-bearing rather
// than decorative — see fairpay.py module docstring for the full reasoning.
//
// Currency is USD or GBP only (NGN dropped — no verified live source).
// When GBP is selected and the chosen role's gbp_specific is false, we show
// a small honest note that the verdict will lean on a broader UK estimate
// rather than implying parity with the US source.

import { useState, useEffect, useMemo } from "react";
import { Role, SubmitFormData, Currency, ExperienceBand, EmploymentType } from "../types";
import { getRoles } from "../lib/contract";

interface SubmitProps {
  onSubmit: (form: SubmitFormData) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}

const EXPERIENCE_OPTIONS: { value: ExperienceBand; label: string }[] = [
  { value: "0-1",  label: "0–1 years" },
  { value: "1-3",  label: "1–3 years" },
  { value: "3-5",  label: "3–5 years" },
  { value: "5-10", label: "5–10 years" },
  { value: "10+",  label: "10+ years" },
];

const EMPLOYMENT_OPTIONS: EmploymentType[] = ["Full-time", "Contract", "Part-time", "Remote"];

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "🇺🇸 USD — US Dollar" },
  { value: "GBP", label: "🇬🇧 GBP — British Pound" },
];

export default function SubmitScreen({ onSubmit, onBack, loading, error }: SubmitProps) {
  const [roles, setRoles]               = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError]     = useState("");

  const [roleId, setRoleId]                   = useState("");
  const [industry, setIndustry]               = useState("");
  const [location, setLocation]               = useState("");
  const [yearsExperience, setYearsExperience] = useState<ExperienceBand>("1-3");
  const [currentSalary, setCurrentSalary]     = useState("");
  const [currency, setCurrency]               = useState<Currency>("USD");
  const [employmentType, setEmploymentType]   = useState<EmploymentType>("Full-time");

  const [formError, setFormError] = useState("");

  // Load curated role list on mount
  useEffect(() => {
    async function loadRoles() {
      setRolesLoading(true);
      setRolesError("");
      try {
        const data = await getRoles();
        setRoles(data);
        if (data.length > 0) setRoleId(data[0].id);
      } catch {
        setRolesError("Could not load role list. Check your connection and try again.");
      } finally {
        setRolesLoading(false);
      }
    }
    loadRoles();
  }, []);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === roleId) || null,
    [roles, roleId]
  );

  // Honest note shown only when it's actually relevant — GBP selected and
  // this specific role doesn't have a named figure on the UK source.
  const showGbpBroadNote = currency === "GBP" && selectedRole && !selectedRole.gbp_specific;

  function validate(): string {
    if (!roleId) return "Please select a role.";
    if (!industry.trim()) return "Please enter an industry.";
    if (!location.trim()) return "Please enter a location.";
    const salaryNum = parseInt(currentSalary, 10);
    if (!currentSalary.trim() || isNaN(salaryNum) || salaryNum <= 0) {
      return "Please enter a valid salary amount.";
    }
    return "";
  }

  function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError("");
    onSubmit({
      role_id: roleId,
      industry: industry.trim(),
      location: location.trim(),
      years_experience: yearsExperience,
      current_salary: parseInt(currentSalary, 10).toString(),
      currency,
      employment_type: employmentType,
    });
  }

  const displayError = formError || error;

  return (
    <div className="screen fadeIn">

      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="screen-title">Check Your Salary</h2>
      <p className="screen-sub">
        Select your role and enter your details. Our AI fetches live wage
        data for your exact role and grounds its verdict in what it actually
        finds — not a guess from memory.
      </p>

      {/* ── Role dropdown ── */}
      <div className="field-group">
        <label className="field-label">Role</label>
        {rolesLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            <span>Loading roles…</span>
          </div>
        ) : rolesError ? (
          <p className="error-text">{rolesError}</p>
        ) : (
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Roles are curated to a list with a verified live wage-data source —
          this is what lets the AI cite a real figure instead of guessing.
        </span>
      </div>

      {/* ── Industry + Location ── */}
      <div className="form-grid-2">
        <div className="field-group">
          <label className="field-label">Industry</label>
          <input
            type="text"
            placeholder="e.g. Fintech, Healthcare"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <input
            type="text"
            placeholder="e.g. London, New York"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      {/* ── Experience + Employment type ── */}
      <div className="form-grid-2">
        <div className="field-group">
          <label className="field-label">Years of Experience</label>
          <select
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value as ExperienceBand)}
          >
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Employment Type</label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
          >
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Salary + Currency ── */}
      <div className="form-grid-2">
        <div className="field-group">
          <label className="field-label">Current Salary (annual)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 85000"
            value={currentSalary}
            onChange={(e) => setCurrentSalary(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Honest GBP-tier note — only shown when actually relevant ── */}
      {showGbpBroadNote && (
        <div
          style={{
            background:   "var(--conf-medium-dim)",
            border:       "1px solid var(--conf-medium-border)",
            borderRadius: "10px",
            padding:      "12px 16px",
            fontSize:     "12px",
            color:        "var(--conf-medium)",
            lineHeight:   1.6,
          }}
        >
          ℹ️ &nbsp;The UK data source doesn't publish a figure specific to
          this role — the AI will ground its estimate in the broader UK
          earnings figure on the page instead, and confidence will reflect that.
        </div>
      )}

      {/* ── Error ── */}
      {displayError && <p className="error-text">{displayError}</p>}

      {/* ── Submit ── */}
      <button
        className="btn-amber"
        onClick={handleSubmit}
        disabled={loading || rolesLoading || !!rolesError}
      >
        {loading ? (
          <span className="btn-loading">
            <span className="spinner" />
            Submitting…
          </span>
        ) : (
          "⚖️ Get My Verdict"
        )}
      </button>

      {/* ── Privacy note ── */}
      <p
        style={{
          fontSize:   "12px",
          color:      "var(--text-muted)",
          textAlign:  "center",
          lineHeight: 1.6,
          padding:    "0 8px",
        }}
      >
        🔒 &nbsp;No name, no email. Your wallet address is the only identifier,
        generated automatically on this device.
      </p>

    </div>
  );
}

"use client";
// FairPay — Submit Screen
// FOLDER: components/SubmitScreen.tsx
//
// 7-field form: job_title, industry, location, years_experience,
// current_salary, currency, employment_type.
// All values stored as strings — matches contract parameter types exactly.
// Salary field strips commas/symbols before submitting.

import { useState } from "react";
import { SubmitFormData, Currency, EmploymentType, ExperienceBand } from "../types";

interface SubmitProps {
  onSubmit: (form: SubmitFormData) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}

// ----------------------------------------------------------------
// Static option lists — match contract constants exactly
// ----------------------------------------------------------------
const CURRENCIES: { value: Currency; label: string; flag: string }[] = [
  { value: "USD", label: "US Dollar", flag: "🇺🇸" },
  { value: "GBP", label: "British Pound", flag: "🇬🇧" },
  { value: "NGN", label: "Nigerian Naira", flag: "🇳🇬" },
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "Full-time", label: "Full-time" },
  { value: "Contract",  label: "Contract"  },
  { value: "Part-time", label: "Part-time" },
  { value: "Remote",    label: "Remote"    },
];

const EXPERIENCE_BANDS: { value: ExperienceBand; label: string }[] = [
  { value: "0-1",  label: "0–1 years"   },
  { value: "1-3",  label: "1–3 years"   },
  { value: "3-5",  label: "3–5 years"   },
  { value: "5-10", label: "5–10 years"  },
  { value: "10+",  label: "10+ years"   },
];

const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Marketing & Advertising",
  "Engineering",
  "Legal",
  "Consulting",
  "Sales",
  "Design & Creative",
  "Operations",
  "Human Resources",
  "Product Management",
  "Data & Analytics",
  "Media & Entertainment",
  "Retail & E-commerce",
  "Real Estate",
  "Manufacturing",
  "Non-profit",
  "Government & Public Sector",
  "Other",
];

// ----------------------------------------------------------------
// Currency symbol helper
// ----------------------------------------------------------------
function currencySymbol(c: Currency): string {
  if (c === "USD") return "$";
  if (c === "GBP") return "£";
  if (c === "NGN") return "₦";
  return "";
}

// ----------------------------------------------------------------
// Form validation
// ----------------------------------------------------------------
interface FormErrors {
  job_title?:       string;
  industry?:        string;
  location?:        string;
  current_salary?:  string;
}

function validate(form: SubmitFormData): FormErrors {
  const errs: FormErrors = {};
  if (!form.job_title.trim())
    errs.job_title = "Job title is required";
  if (!form.industry)
    errs.industry = "Select an industry";
  if (!form.location.trim())
    errs.location = "Location is required";
  const salaryNum = Number(form.current_salary.replace(/[^0-9.]/g, ""));
  if (!form.current_salary.trim() || isNaN(salaryNum) || salaryNum <= 0)
    errs.current_salary = "Enter a valid salary amount";
  return errs;
}

export default function SubmitScreen({ onSubmit, onBack, loading, error }: SubmitProps) {
  const [form, setForm] = useState<SubmitFormData>({
    job_title:        "",
    industry:         "",
    location:         "",
    years_experience: "3-5",
    current_salary:   "",
    currency:         "USD",
    employment_type:  "Full-time",
  });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function update<K extends keyof SubmitFormData>(key: K, value: SubmitFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear field error on change
    if (fieldErrors[key as keyof FormErrors]) {
      setFieldErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  function handleBlur(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function handleSalaryInput(raw: string) {
    // Allow digits, one decimal point, commas (stripped on submit)
    const cleaned = raw.replace(/[^0-9.,]/g, "");
    update("current_salary", cleaned);
  }

  function handleSubmit() {
    // Mark all fields touched to show errors
    setTouched({ job_title: true, industry: true, location: true, current_salary: true });
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Strip formatting from salary before passing to contract
    const cleanSalary = form.current_salary.replace(/[^0-9.]/g, "").replace(/\..*/, "");

    onSubmit({ ...form, current_salary: cleanSalary });
  }

  const sym = currencySymbol(form.currency);

  function fieldError(key: keyof FormErrors) {
    return touched[key] ? fieldErrors[key] : undefined;
  }

  return (
    <div className="screen fadeIn">

      {/* Header */}
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="screen-title">Check My Salary</h2>
      <p className="screen-sub">
        All fields are anonymous. We only use this data to evaluate your salary
        — nothing is linked to your identity.
      </p>

      {/* ── Field: Job Title ── */}
      <div className="field-group">
        <label className="field-label">Job Title</label>
        <input
          type="text"
          placeholder="e.g. Senior Software Engineer"
          value={form.job_title}
          onChange={(e) => update("job_title", e.target.value)}
          onBlur={() => handleBlur("job_title")}
          maxLength={80}
          disabled={loading}
        />
        {fieldError("job_title") && (
          <span className="error-text">{fieldError("job_title")}</span>
        )}
      </div>

      {/* ── Field: Industry ── */}
      <div className="field-group">
        <label className="field-label">Industry</label>
        <div style={{ position: "relative" }}>
          <select
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            onBlur={() => handleBlur("industry")}
            disabled={loading}
          >
            <option value="" disabled>Select your industry...</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        {fieldError("industry") && (
          <span className="error-text">{fieldError("industry")}</span>
        )}
      </div>

      {/* ── Field: Location ── */}
      <div className="field-group">
        <label className="field-label">Location</label>
        <input
          type="text"
          placeholder="e.g. Lagos, London, New York"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          onBlur={() => handleBlur("location")}
          maxLength={80}
          disabled={loading}
        />
        {fieldError("location") && (
          <span className="error-text">{fieldError("location")}</span>
        )}
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Be specific — city-level gives the most accurate result
        </span>
      </div>

      {/* ── Fields: Experience + Employment (2-col grid) ── */}
      <div className="form-grid-2">
        <div className="field-group">
          <label className="field-label">Experience</label>
          <select
            value={form.years_experience}
            onChange={(e) => update("years_experience", e.target.value as ExperienceBand)}
            disabled={loading}
          >
            {EXPERIENCE_BANDS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Employment</label>
          <select
            value={form.employment_type}
            onChange={(e) => update("employment_type", e.target.value as EmploymentType)}
            disabled={loading}
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Fields: Salary + Currency ── */}
      <div className="field-group">
        <label className="field-label">Current Salary (annual)</label>

        {/* Currency picker — tab-style above the salary input */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          {CURRENCIES.map((c) => (
            <button
              key={c.value}
              onClick={() => update("currency", c.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: form.currency === c.value
                  ? "var(--indigo)"
                  : "var(--border)",
                background: form.currency === c.value
                  ? "var(--indigo-dim)"
                  : "var(--bg-input)",
                color: form.currency === c.value
                  ? "var(--indigo-light)"
                  : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {c.flag} {c.value}
            </button>
          ))}
        </div>

        {/* Salary input with currency symbol prefix */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.15rem",
              color: "var(--text-muted)",
              pointerEvents: "none",
              letterSpacing: "0.04em",
            }}
          >
            {sym}
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="85,000"
            value={form.current_salary}
            onChange={(e) => handleSalaryInput(e.target.value)}
            onBlur={() => handleBlur("current_salary")}
            disabled={loading}
            maxLength={12}
            style={{ paddingLeft: sym ? "2rem" : "1rem" }}
          />
        </div>

        {fieldError("current_salary") && (
          <span className="error-text">{fieldError("current_salary")}</span>
        )}
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Enter your gross annual salary in {form.currency}
        </span>
      </div>

      {/* ── Privacy reminder ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "12px 14px",
          background: "var(--indigo-dim)",
          border: "1px solid rgba(108,99,255,0.18)",
          borderRadius: "10px",
          fontSize: "12px",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontSize: "16px", flexShrink: 0 }}>🔒</span>
        <span>
          Your submission is <strong style={{ color: "var(--text-primary)" }}>completely anonymous</strong>.
          No name, no email, no employer. Your wallet address is the only
          identifier and it stays in your browser.
        </span>
      </div>

      {/* ── Submit button ── */}
      <button
        className="btn-amber"
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginTop: "4px" }}
      >
        {loading ? (
          <span className="btn-loading">
            <span className="spinner" style={{ borderTopColor: "#070912" }} />
            Submitting to chain...
          </span>
        ) : (
          "⚖️ \u00A0 EVALUATE MY SALARY"
        )}
      </button>

      {/* ── Timing notice ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px 14px",
          fontSize: "12px",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        ⏱ &nbsp;AI evaluation takes <strong style={{ color: "var(--text-secondary)" }}>3–5 minutes</strong>.
        You'll get a submission ID — save it to check results later.
      </div>

      {error && <p className="error-text" style={{ textAlign: "center" }}>{error}</p>}

    </div>
  );
}

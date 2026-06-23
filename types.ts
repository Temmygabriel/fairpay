// FairPay — Shared Types
// Every string here must match the contract contract exactly — copy-pasted, not retyped.
//
// v2.0 — role_id replaces free-text job_title. Currency drops NGN.
// See fairpay.py module docstring for why.

// ----------------------------------------------------------------
// Screen routing
// ----------------------------------------------------------------
export type Screen =
  | "landing"
  | "submit"
  | "judging"
  | "result"
  | "history"
  | "explore"
  | "lookup";

// ----------------------------------------------------------------
// Contract value types — match contract constants verbatim
// ----------------------------------------------------------------
export type Verdict    = "UNDERPAID" | "MARKET RATE" | "OVERPAID";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Currency   = "USD" | "GBP"; // NGN dropped — no verified live source, see fairpay.py

export type EmploymentType = "Full-time" | "Contract" | "Part-time" | "Remote";
export type ExperienceBand = "0-1" | "1-3" | "3-5" | "5-10" | "10+";

export type SubmissionStatus = "pending" | "judging" | "completed";

// ----------------------------------------------------------------
// Role — curated, verified list from get_roles(). Replaces free-text
// job_title. id is what's sent to the contract; label is what's shown.
// gbp_specific tells the UI whether GBP confidence can realistically be
// HIGH for this role, or whether it's always capped lower because the UK
// source falls back to a broader occupational bucket.
// ----------------------------------------------------------------
export interface Role {
  id: string;
  label: string;
  gbp_specific: boolean;
}

// ----------------------------------------------------------------
// Core submission object — mirrors contract submission JSON exactly
// ----------------------------------------------------------------
export interface Submission {
  id: string;                        // "SUB000001"
  submitter: string;                 // wallet address
  role_id: string;                   // curated role id, e.g. "software_developer"
  job_title: string;                 // human label, denormalized from role at submit time
  industry: string;
  location: string;
  years_experience: ExperienceBand;  // always string band
  current_salary: string;            // always string — the number as string
  currency: Currency;
  employment_type: EmploymentType;
  status: SubmissionStatus;
  verdict: Verdict | null;
  market_range_low: number | null;
  market_range_high: number | null;
  market_median: number | null;
  reasoning: string | null;
  confidence: Confidence | null;
  source_note: string | null;        // what was actually found on the fetched page
  block_number: number;
}

// ----------------------------------------------------------------
// Global stats — returned by get_global_stats
// ----------------------------------------------------------------
export interface GlobalStats {
  count: number;
  salary_sum: number;
  verdict_counts: {
    UNDERPAID: number;
    "MARKET RATE": number;
    OVERPAID: number;
  };
}

// ----------------------------------------------------------------
// Stripped submission returned by get_recent_submissions
// (no submitter address — anonymous feed)
// ----------------------------------------------------------------
export interface RecentSubmission {
  id: string;
  job_title: string;
  industry: string;
  location: string;
  years_experience: string;
  verdict: Verdict;
  currency: Currency;
  block_number: number;
}

// ----------------------------------------------------------------
// Form data shape — what SubmitScreen collects
// ----------------------------------------------------------------
export interface SubmitFormData {
  role_id: string;
  industry: string;
  location: string;
  years_experience: ExperienceBand;
  current_salary: string;
  currency: Currency;
  employment_type: EmploymentType;
}

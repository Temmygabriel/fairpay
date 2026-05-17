"use client";
// FairPay — Salary Bar Component
// FOLDER: components/SalaryBar.tsx
//
// Pure CSS horizontal bar. No charting library.
// Three zones: under (red) | fair (dark, bordered) | over (teal)
// A marker (triangle + line) shows where current salary sits.
// Marker is clamped to [2%, 98%] so it never clips off the edge.
//
// Props:
//   current  — the user's current salary (number)
//   low      — market_range_low from AI
//   median   — market_median from AI
//   high     — market_range_high from AI
//   currency — "USD" | "GBP" | "NGN"

interface SalaryBarProps {
  current:  number;
  low:      number;
  median:   number;
  high:     number;
  currency: string;
}

// ----------------------------------------------------------------
// Formatting helpers
// ----------------------------------------------------------------
function symbol(currency: string): string {
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  if (currency === "NGN") return "₦";
  return "";
}

function fmt(n: number, currency: string): string {
  const sym = symbol(currency);
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${n.toLocaleString()}`;
}

// ----------------------------------------------------------------
// Marker position calculation
//
// The bar spans from (low - buffer) to (high + buffer).
// buffer = 15% of the low-high spread — gives visual breathing room
// so the marker isn't jammed against the edge when at low or high.
//
// Marker left% = (current - rangeStart) / (rangeEnd - rangeStart) * 100
// Clamped to [2, 98] so the label always stays inside the bar container.
// ----------------------------------------------------------------
function calcMarkerPosition(
  current: number,
  low: number,
  high: number
): {
  leftPct: number;       // 0-100, clamped
  isBelow: boolean;      // current < low
  isAbove: boolean;      // current > high
  isInside: boolean;
} {
  const spread  = high - low;
  const buffer  = Math.max(spread * 0.15, 1); // never zero
  const rangeStart = low  - buffer;
  const rangeEnd   = high + buffer;
  const totalRange = rangeEnd - rangeStart;

  const rawPct = ((current - rangeStart) / totalRange) * 100;
  const leftPct = Math.min(98, Math.max(2, rawPct));

  return {
    leftPct,
    isBelow:  current < low,
    isAbove:  current > high,
    isInside: current >= low && current <= high,
  };
}

// ----------------------------------------------------------------
// Zone widths
//
// Under zone width  = buffer / totalRange * 100  (% of track)
// Fair zone width   = spread  / totalRange * 100
// Over zone width   = buffer / totalRange * 100
// They always sum to 100%.
// ----------------------------------------------------------------
function calcZoneWidths(low: number, high: number): {
  underPct: number;
  fairPct:  number;
  overPct:  number;
} {
  const spread  = high - low;
  const buffer  = Math.max(spread * 0.15, 1);
  const total   = spread + buffer * 2;

  return {
    underPct: (buffer / total) * 100,
    fairPct:  (spread / total) * 100,
    overPct:  (buffer / total) * 100,
  };
}

// ----------------------------------------------------------------
// Median marker position (within the fair zone)
// medianPct is relative to the full bar width
// ----------------------------------------------------------------
function calcMedianPosition(low: number, median: number, high: number): number {
  const spread  = high - low;
  const buffer  = Math.max(spread * 0.15, 1);
  const total   = spread + buffer * 2;
  return ((buffer + (median - low)) / total) * 100;
}

export default function SalaryBar({
  current,
  low,
  median,
  high,
  currency,
}: SalaryBarProps) {
  // Guard: if range is degenerate, show a simple fallback
  if (!low || !high || low >= high) {
    return (
      <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
        Market range data unavailable
      </div>
    );
  }

  const { leftPct, isBelow, isAbove } = calcMarkerPosition(current, low, high);
  const { underPct, fairPct, overPct } = calcZoneWidths(low, high);
  const medianPct = calcMedianPosition(low, median, high);

  // Marker colour
  const markerColor = isBelow
    ? "#FF4D6D"
    : isAbove
    ? "var(--overpaid)"
    : "var(--text-primary)";

  // "You" label
  const youLabel = `You — ${fmt(current, currency)}`;

  return (
    <div className="salary-bar-wrap">

      {/* ── Track ── */}
      <div style={{ position: "relative" }}>
        {/* Zone track */}
        <div className="salary-bar-track">
          <div
            className="salary-bar-under"
            style={{ width: `${underPct}%` }}
          />
          <div
            className="salary-bar-fair"
            style={{ width: `${fairPct}%` }}
          />
          <div
            className="salary-bar-over"
            style={{ width: `${overPct}%` }}
          />
        </div>

        {/* Median tick — a thin vertical line inside the fair zone */}
        <div
          style={{
            position: "absolute",
            left:   `${medianPct}%`,
            top:    0,
            height: "36px",
            width:  "2px",
            background: "rgba(255,255,255,0.25)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        {/* Current salary marker */}
        <div
          className="salary-bar-marker"
          style={{
            left:  `${leftPct}%`,
            color: markerColor,
          }}
        >
          {/* Triangle pointing down onto the bar */}
          <div
            className="salary-bar-marker-triangle"
            style={{ borderTopColor: markerColor }}
          />
          {/* Vertical line through the bar */}
          <div className="salary-bar-marker-line" />
          {/* Label below the bar */}
          <div className="salary-bar-marker-label">{youLabel}</div>
        </div>
      </div>

      {/* ── Axis labels ── */}
      {/*
        We render three labels: left (low), centre (median), right (high).
        Using a flex row with justify-content: space-between.
        The centre label is absolutely positioned to align with medianPct.
      */}
      <div style={{ position: "relative", height: "32px", marginTop: "8px" }}>
        {/* Low — left */}
        <div
          style={{
            position: "absolute",
            left: `${underPct}%`,
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
            {fmt(low, currency)}
          </div>
        </div>

        {/* Median — centre of fair zone */}
        <div
          style={{
            position: "absolute",
            left: `${medianPct}%`,
            transform: "translateX(-50%)",
            textAlign: "center",
            minWidth: "60px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 700 }}>
            {fmt(median, currency)}
          </div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            median
          </div>
        </div>

        {/* High — right */}
        <div
          style={{
            position: "absolute",
            left: `${100 - overPct}%`,
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
            {fmt(high, currency)}
          </div>
        </div>
      </div>

      {/* ── Zone legend ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "var(--text-muted)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          padding: "0 2px",
          marginTop: "2px",
        }}
      >
        <span style={{ color: "#FF4D6D" }}>Below market</span>
        <span>Fair zone</span>
        <span style={{ color: "var(--overpaid)" }}>Above market</span>
      </div>

    </div>
  );
}

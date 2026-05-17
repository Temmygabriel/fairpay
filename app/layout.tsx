// FairPay — Root Layout
// FOLDER: app/layout.tsx
// Metadata only. suppressHydrationWarning on html + body prevents
// React hydration errors from browser extensions injecting DOM attributes.

import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "FairPay — Know Your Worth",
  description:
    "Submit your salary anonymously. AI evaluates whether you are UNDERPAID, MARKET RATE, or OVERPAID based on real market data. No accounts. No login. On-chain.",
  openGraph: {
    title: "FairPay — Know Your Worth",
    description:
      "Anonymous on-chain salary intelligence. AI judges your pay against real market data.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

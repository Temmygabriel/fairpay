"use client";
// FairPay — Page Entry Point
// FOLDER: app/page.tsx
//
// This file is a thin wrapper only — no logic ever goes here.
// dynamic({ ssr: false }) prevents genlayer-js from running server-side.
// genlayer-js references window/navigator at module level — SSR crashes Node.js.
// The "use client" directive is required for dynamic() in Next.js 15 App Router.

import dynamic from "next/dynamic";

const App = dynamic(() => import("./App"), { ssr: false });

export default function Page() {
  return <App />;
}

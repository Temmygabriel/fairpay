"use client";
// FairPay — Main Orchestrator
// FOLDER: app/App.tsx
//
// All screen state, polling, and contract calls live here.
// Polling pattern copied exactly from NYP — do not deviate.
// localStorage keys use "fp_" prefix (fairpay) to avoid collisions with NYP.

import { useState, useEffect, useRef, useCallback } from "react";
import { Screen, Submission, SubmitFormData } from "../types";
import {
  makeAccount,
  submitSalary,
  calculateResult,
  getSubmission,
} from "../lib/contract";

// Screens — imported in Sessions 4-6, stubbed here so App compiles now
import LandingScreen    from "../components/LandingScreen";
import SubmitScreen     from "../components/SubmitScreen";
import JudgingScreen    from "../components/JudgingScreen";
import ResultScreen     from "../components/ResultScreen";
import HistoryScreen    from "../components/HistoryScreen";
import ExploreScreen    from "../components/ExploreScreen";
import LookupScreen     from "../components/LookupScreen";

// ----------------------------------------------------------------
// Constants — same as NYP
// ----------------------------------------------------------------
const POLL_INTERVAL = 3000; // ms between chain polls

export default function App() {
  // ----------------------------------------------------------------
  // Screen + submission state
  // ----------------------------------------------------------------
  const [screen, setScreen]           = useState<Screen>("landing");
  const [submission, setSubmission]   = useState<Submission | null>(null);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [error, setError]             = useState<string>("");
  const [loading, setLoading]         = useState<string>("");

  // ----------------------------------------------------------------
  // Refs — used inside polling closure to always read current values
  // If these were state, the poll closure would capture stale values.
  // ----------------------------------------------------------------
  const accountRef         = useRef<ReturnType<typeof makeAccount> | null>(null);
  const playerAddressRef   = useRef<string>("");
  const screenRef          = useRef<Screen>("landing");
  const submissionIdRef    = useRef<string>("");   // current submission being polled
  const calculatingRef     = useRef(false);        // mutex — prevents calculate_result double-fire
  const pollTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ----------------------------------------------------------------
  // localStorage guard — exact pattern from NYP build guide
  // Handles: "undefined" string, null, bad key, makeAccount throwing
  // ----------------------------------------------------------------
  useEffect(() => {
    let acc: ReturnType<typeof makeAccount>;
    const savedKey = localStorage.getItem("fp_private_key");

    try {
      if (
        savedKey &&
        savedKey !== "undefined" &&
        savedKey !== "null" &&
        savedKey.startsWith("0x")
      ) {
        acc = makeAccount(savedKey as `0x${string}`);
      } else {
        // Bad or missing key — clear stale data and generate fresh
        if (savedKey !== null) {
          localStorage.removeItem("fp_private_key");
          localStorage.removeItem("fp_address");
        }
        acc = makeAccount();
        localStorage.setItem("fp_private_key", acc.privateKey);
      }
    } catch {
      // makeAccount threw on saved key — nuclear clear and start fresh
      localStorage.removeItem("fp_private_key");
      localStorage.removeItem("fp_address");
      acc = makeAccount();
      localStorage.setItem("fp_private_key", acc.privateKey);
    }

    accountRef.current       = acc;
    playerAddressRef.current = acc.address;
    localStorage.setItem("fp_address", acc.address);
  }, []);

  // Keep screenRef in sync with screen state
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ----------------------------------------------------------------
  // Polling — identical pattern to NYP
  // ----------------------------------------------------------------
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((sid: string) => {
    stopPolling();
    submissionIdRef.current = sid;

    const poll = async () => {
      // Bail if user navigated away from an active submission screen
      if (!submissionIdRef.current) return;
      if (!["judging"].includes(screenRef.current)) return;

      try {
        const data: Submission = await getSubmission(submissionIdRef.current);

        // Error response from contract
        if ((data as any).error) return;

        setSubmission(data);

        if (data.status === "pending") {
          // submit_salary confirmed but calculate_result not yet fired —
          // fire it now. calculatingRef mutex prevents double-fire.
          if (!calculatingRef.current) {
            calculatingRef.current = true;
            try {
              await calculateResult(accountRef.current!, submissionIdRef.current);
            } catch {
              calculatingRef.current = false;
            }
          }
          return;
        }

        if (data.status === "judging") {
          // AI is running — keep polling, nothing to do on frontend
          return;
        }

        if (data.status === "completed") {
          // Done — stop polling, show result
          stopPolling();
          setScreen("result");
        }
      } catch {
        // Network blip — silent, poll again next tick
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL);
  }, [stopPolling]);

  // Clean up polling on unmount
  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  // ----------------------------------------------------------------
  // Account helper — ensures account is always available
  // ----------------------------------------------------------------
  function getAccount() {
    if (!accountRef.current) {
      const savedKey = localStorage.getItem("fp_private_key");
      try {
        if (
          savedKey &&
          savedKey !== "undefined" &&
          savedKey !== "null" &&
          savedKey.startsWith("0x")
        ) {
          accountRef.current = makeAccount(savedKey as `0x${string}`);
        } else {
          accountRef.current = makeAccount();
          localStorage.setItem("fp_private_key", accountRef.current.privateKey);
        }
      } catch {
        localStorage.removeItem("fp_private_key");
        accountRef.current = makeAccount();
        localStorage.setItem("fp_private_key", accountRef.current.privateKey);
      }
      playerAddressRef.current = accountRef.current.address;
      localStorage.setItem("fp_address", playerAddressRef.current);
    }
    return accountRef.current;
  }

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  /**
   * Called by SubmitScreen when the form is submitted.
   * Step 1: submit_salary (writeContractWithReturn — gets submission_id back)
   * Step 2: Navigate to JudgingScreen immediately
   * Step 3: Start polling — poll will fire calculate_result once it sees "pending"
   */
  async function handleSubmit(form: SubmitFormData) {
    setLoading("Submitting...");
    setError("");
    const acc = getAccount();

    try {
      const sid = await submitSalary(
        acc,
        playerAddressRef.current,
        form.job_title,
        form.industry,
        form.location,
        form.years_experience,
        form.current_salary,
        form.currency,
        form.employment_type
      );

      // Got submission_id back — store it everywhere
      setSubmissionId(sid);
      submissionIdRef.current = sid;
      calculatingRef.current  = false; // reset mutex for this new submission

      // Navigate to judging screen immediately
      setScreen("judging");

      // Start polling — poll will fire calculate_result on first "pending" hit
      startPolling(sid);

    } catch (e: any) {
      console.error("submit_salary failed:", e);
      setError("Submission failed. Please try again.");
    } finally {
      setLoading("");
    }
  }

  /**
   * Called by LookupScreen when user enters a submission ID manually.
   * Fetches once — if completed, goes to ResultScreen.
   * If still judging, starts polling.
   */
  async function handleLookup(sid: string) {
    setLoading("Looking up...");
    setError("");

    try {
      const data = await getSubmission(sid.trim().toUpperCase());

      if ((data as any).error) {
        setError("Submission not found. Check the ID and try again.");
        setLoading("");
        return;
      }

      setSubmission(data);
      setSubmissionId(data.id);
      submissionIdRef.current = data.id;

      if (data.status === "completed") {
        stopPolling();
        setScreen("result");
      } else {
        // Still pending or judging — go to judging screen and poll
        calculatingRef.current = false;
        setScreen("judging");
        startPolling(data.id);
      }
    } catch {
      setError("Could not reach the contract. Check your connection.");
    } finally {
      setLoading("");
    }
  }

  /** Reset everything and go home */
  function handleHome() {
    stopPolling();
    setSubmission(null);
    setSubmissionId("");
    setError("");
    setLoading("");
    calculatingRef.current  = false;
    submissionIdRef.current = "";
    setScreen("landing");
  }

  /** Navigate to result from judging when submission completes */
  function handleViewResult(sub: Submission) {
    setSubmission(sub);
    stopPolling();
    setScreen("result");
  }

  // ----------------------------------------------------------------
  // Screen renderer
  // ----------------------------------------------------------------
  const playerAddress = playerAddressRef.current;

  const renderScreen = () => {
    switch (screen) {
      case "landing":
        return (
          <LandingScreen
            onNavigate={setScreen}
            onStartSubmit={() => setScreen("submit")}
          />
        );

      case "submit":
        return (
          <SubmitScreen
            onSubmit={handleSubmit}
            onBack={() => setScreen("landing")}
            loading={loading === "Submitting..."}
            error={error}
          />
        );

      case "judging":
        return (
          <JudgingScreen
            submissionId={submissionId}
            submission={submission}
            onResult={handleViewResult}
            onHome={handleHome}
          />
        );

      case "result":
        if (!submission) return null;
        return (
          <ResultScreen
            submission={submission}
            onHome={handleHome}
            onSubmitAnother={() => {
              stopPolling();
              setSubmission(null);
              setSubmissionId("");
              setScreen("submit");
            }}
          />
        );

      case "history":
        return (
          <HistoryScreen
            playerAddress={playerAddress}
            onBack={() => setScreen("landing")}
            onViewSubmission={(sub) => {
              setSubmission(sub);
              setScreen("result");
            }}
          />
        );

      case "explore":
        return (
          <ExploreScreen
            onBack={() => setScreen("landing")}
          />
        );

      case "lookup":
        return (
          <LookupScreen
            onLookup={handleLookup}
            onBack={() => setScreen("landing")}
            loading={loading === "Looking up..."}
            error={error}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="app-root">
      <div className="app-container">
        {renderScreen()}
      </div>
    </main>
  );
}

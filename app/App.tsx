"use client";
// FairPay — Main Orchestrator
// FOLDER: app/App.tsx
//
// v2.0 — handleSubmit now passes form.role_id to submitSalary instead of
// form.job_title (which no longer exists on SubmitFormData). Everything
// else is unchanged from v1 — polling pattern, account handling, screen
// routing are all identical.

import { useState, useEffect, useRef, useCallback } from "react";
import { Screen, Submission, SubmitFormData } from "../types";
import {
  makeAccount,
  submitSalary,
  calculateResult,
  getSubmission,
} from "../lib/contract";

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
  // ----------------------------------------------------------------
  const accountRef         = useRef<ReturnType<typeof makeAccount> | null>(null);
  const playerAddressRef   = useRef<string>("");
  const screenRef          = useRef<Screen>("landing");
  const submissionIdRef    = useRef<string>("");
  const calculatingRef     = useRef(false);
  const pollTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ----------------------------------------------------------------
  // localStorage guard — exact pattern from NYP build guide
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
        if (savedKey !== null) {
          localStorage.removeItem("fp_private_key");
          localStorage.removeItem("fp_address");
        }
        acc = makeAccount();
        localStorage.setItem("fp_private_key", acc.privateKey);
      }
    } catch {
      localStorage.removeItem("fp_private_key");
      localStorage.removeItem("fp_address");
      acc = makeAccount();
      localStorage.setItem("fp_private_key", acc.privateKey);
    }

    accountRef.current       = acc;
    playerAddressRef.current = acc.address;
    localStorage.setItem("fp_address", acc.address);
  }, []);

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
      if (!submissionIdRef.current) return;
      if (!["judging"].includes(screenRef.current)) return;

      try {
        const data: Submission = await getSubmission(submissionIdRef.current);

        if ((data as any).error) return;

        setSubmission(data);

        if (data.status === "pending") {
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
          return;
        }

        if (data.status === "completed") {
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

  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  // ----------------------------------------------------------------
  // Account helper
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
   * form.role_id is now sent instead of a free-text job title — see
   * SubmitScreen.tsx and fairpay.py for why.
   * Checks for the contract's "ERROR_INVALID_ROLE" / "ERROR_INVALID_CURRENCY"
   * sentinel return values before treating the result as a real submission id.
   */
  async function handleSubmit(form: SubmitFormData) {
    setLoading("Submitting...");
    setError("");
    const acc = getAccount();

    try {
      const sid = await submitSalary(
        acc,
        playerAddressRef.current,
        form.role_id,
        form.industry,
        form.location,
        form.years_experience,
        form.current_salary,
        form.currency,
        form.employment_type
      );

      if (sid === "ERROR_INVALID_ROLE" || sid === "ERROR_INVALID_CURRENCY") {
        setError(
          sid === "ERROR_INVALID_ROLE"
            ? "That role isn't recognised. Please pick one from the list."
            : "That currency isn't supported. Please choose USD or GBP."
        );
        setLoading("");
        return;
      }

      setSubmissionId(sid);
      submissionIdRef.current = sid;
      calculatingRef.current  = false;

      setScreen("judging");
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

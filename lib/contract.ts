// FairPay — GenLayer Contract Utils
// FOLDER: lib/contract.ts
//
// Core functions (writeContract, writeContractWithReturn, readContract)
// are copied exactly from NYP — never change these.
// FairPay-specific wrappers are added at the bottom.

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { Submission, GlobalStats, RecentSubmission } from "../types";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const MAX_ATTEMPTS = 3;

// ----------------------------------------------------------------
// Core client factory — never change
// ----------------------------------------------------------------
function makeClient(account: ReturnType<typeof createAccount>) {
  return createClient({ chain: studionet, account });
}

export function makeAccount(privateKey?: `0x${string}`) {
  return createAccount(privateKey);
}

// ----------------------------------------------------------------
// writeContract — for methods that return nothing (void)
// Copied exactly from NYP — do not modify
// ----------------------------------------------------------------
export async function writeContract(
  account: ReturnType<typeof createAccount>,
  method: string,
  args: unknown[]
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = makeClient(account);
      console.log(`writeContract attempt ${attempt}/${MAX_ATTEMPTS}: ${method}`);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
        account,
        leaderOnly: false,
      } as any);
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 120,
        interval: 4000,
      });
      console.log(`writeContract success: ${method}`);
      return;
    } catch (err: any) {
      console.error(`writeContract ${method} attempt ${attempt} failed:`, err?.message, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw err;
    }
  }
}

// ----------------------------------------------------------------
// writeContractWithReturn — for methods that return a value
// Only used for submit_salary (returns submission_id)
// Copied exactly from NYP — do not modify
// ----------------------------------------------------------------
export async function writeContractWithReturn(
  account: ReturnType<typeof createAccount>,
  method: string,
  args: unknown[]
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = makeClient(account);
      console.log(`writeContractWithReturn attempt ${attempt}/${MAX_ATTEMPTS}: ${method}`);
      const returnValue = await client.simulateWriteContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
      });
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
        account,
        leaderOnly: false,
      } as any);
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 120,
        interval: 4000,
      });
      console.log(`writeContractWithReturn success: ${method}, returned:`, returnValue);
      return returnValue as string;
    } catch (err: any) {
      console.error(`writeContractWithReturn ${method} attempt ${attempt} failed:`, err?.message, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("All attempts failed");
}

// ----------------------------------------------------------------
// readContract — for view methods (free, instant)
// Copied exactly from NYP — do not modify
// ----------------------------------------------------------------
export async function readContract(method: string, args: unknown[]): Promise<string> {
  const account = createAccount();
  const client = makeClient(account);
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  });
  return result as string;
}

// ----------------------------------------------------------------
// FairPay-specific wrappers
// ----------------------------------------------------------------

/**
 * Submit a salary for evaluation.
 * Uses writeContractWithReturn because submit_salary returns the submission_id.
 * All args are strings — matches contract parameter types exactly.
 */
export async function submitSalary(
  account: ReturnType<typeof createAccount>,
  submitterAddress: string,
  jobTitle: string,
  industry: string,
  location: string,
  yearsExperience: string,  // "0-1" | "1-3" | "3-5" | "5-10" | "10+"
  currentSalary: string,    // number as string e.g. "85000"
  currency: string,         // "USD" | "GBP" | "NGN"
  employmentType: string    // "Full-time" | "Contract" | "Part-time" | "Remote"
): Promise<string> {
  return writeContractWithReturn(account, "submit_salary", [
    submitterAddress,
    jobTitle,
    industry,
    location,
    yearsExperience,
    currentSalary,
    currency,
    employmentType,
  ]);
}

/**
 * Trigger AI evaluation for a submission.
 * Called immediately after submit_salary confirms — same pattern as NYP's calculate_results.
 * Contract gates on status === "pending" so double-fire is safe.
 */
export async function calculateResult(
  account: ReturnType<typeof createAccount>,
  submissionId: string
): Promise<void> {
  return writeContract(account, "calculate_result", [submissionId]);
}

/**
 * Read a single submission by ID.
 */
export async function getSubmission(submissionId: string): Promise<Submission> {
  const raw = await readContract("get_submission", [submissionId]);
  return JSON.parse(raw);
}

/**
 * Read all submissions for a wallet address (most recent first).
 */
export async function getMySubmissions(address: string): Promise<Submission[]> {
  const raw = await readContract("get_my_submissions", [address]);
  return JSON.parse(raw);
}

/**
 * Read aggregate stats for a role + location pair.
 */
export async function getGlobalStats(role: string, location: string): Promise<GlobalStats> {
  const raw = await readContract("get_global_stats", [role, location]);
  return JSON.parse(raw);
}

/**
 * Read recent completed submissions (anonymised).
 * limit is passed as string per GenLayer ABI convention.
 */
export async function getRecentSubmissions(limit: number): Promise<RecentSubmission[]> {
  const raw = await readContract("get_recent_submissions", [String(limit)]);
  return JSON.parse(raw);
}

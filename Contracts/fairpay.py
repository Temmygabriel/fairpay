# FairPay — Intelligent Salary Evaluation Contract
# v2.0 — Live web data fetching inside generate() for true GenLayer consensus
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import genlayer.gl as gl
from genlayer import TreeMap, u256
import json

VERDICTS = ["UNDERPAID", "MARKET RATE", "OVERPAID"]
CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"]
CURRENCIES = ["USD", "GBP", "NGN"]
EMPLOYMENT_TYPES = ["Full-time", "Contract", "Part-time", "Remote"]
EXPERIENCE_BANDS = ["0-1", "1-3", "3-5", "5-10", "10+"]


class FairPay(gl.Contract):

    submission_count: u256
    submissions: TreeMap[str, str]          # submission_id -> submission JSON
    address_submissions: TreeMap[str, str]  # address -> JSON list of submission_ids
    global_stats: TreeMap[str, str]         # "role:location" -> aggregate stats JSON

    def __init__(self):
        self.submission_count = u256(0)

    # ----------------------------------------------------------------
    # Internal helpers
    # ----------------------------------------------------------------

    def _read_submission(self, submission_id: str) -> dict:
        return json.loads(self.submissions[submission_id])

    def _write_submission(self, submission_id: str, data: dict) -> None:
        self.submissions[submission_id] = json.dumps(data)

    def _make_submission_id(self) -> str:
        n = int(self.submission_count)
        return "SUB" + str(n).zfill(6)

    def _get_address_submissions(self, address: str) -> list:
        raw = self.address_submissions.get(address)
        if raw is None:
            return []
        return json.loads(raw)

    def _set_address_submissions(self, address: str, ids: list) -> None:
        self.address_submissions[address] = json.dumps(ids)

    def _read_global_stats(self, key: str) -> dict:
        raw = self.global_stats.get(key)
        if raw is None:
            return {
                "count": 0,
                "salary_sum": 0,
                "verdict_counts": {
                    "UNDERPAID": 0,
                    "MARKET RATE": 0,
                    "OVERPAID": 0
                }
            }
        return json.loads(raw)

    def _write_global_stats(self, key: str, stats: dict) -> None:
        self.global_stats[key] = json.dumps(stats)

    # ----------------------------------------------------------------
    # Public write methods
    # ----------------------------------------------------------------

    @gl.public.write
    def submit_salary(
        self,
        submitter_address: str,
        job_title: str,
        industry: str,
        location: str,
        years_experience: str,
        current_salary: str,
        currency: str,
        employment_type: str,
    ) -> str:
        self.submission_count = u256(int(self.submission_count) + 1)
        submission_id = self._make_submission_id()

        submission = {
            "id": submission_id,
            "submitter": submitter_address,
            "job_title": job_title,
            "industry": industry,
            "location": location,
            "years_experience": years_experience,
            "current_salary": current_salary,
            "currency": currency,
            "employment_type": employment_type,
            "status": "pending",
            "verdict": None,
            "market_range_low": None,
            "market_range_high": None,
            "market_median": None,
            "reasoning": None,
            "confidence": None,
            "block_number": int(self.submission_count),
        }

        self._write_submission(submission_id, submission)

        ids = self._get_address_submissions(submitter_address)
        ids.append(submission_id)
        self._set_address_submissions(submitter_address, ids)

        return submission_id

    @gl.public.write
    def calculate_result(self, submission_id: str) -> None:
        # Gate: only run if still pending — prevents double-fire
        submission = self._read_submission(submission_id)
        if submission["status"] != "pending":
            return

        # Flip to "judging" immediately so a second call hits the gate and returns
        submission["status"] = "judging"
        self._write_submission(submission_id, submission)

        job_title        = submission["job_title"]
        industry         = submission["industry"]
        location         = submission["location"]
        years_experience = submission["years_experience"]
        current_salary   = submission["current_salary"]
        currency         = submission["currency"]
        employment_type  = submission["employment_type"]

        # ── THE KEY GenLayer PATTERN ──────────────────────────────────────────
        # gl.nondet.web.render must be called INSIDE generate() so that every
        # validator independently fetches live data and consensus runs over
        # both the fetched content and the AI verdict together.
        # Fetching outside generate() means validators inherit pre-fetched data
        # — that is NOT consensus-safe and defeats the purpose.

        def generate():
            def safe_fetch(url):
                try:
                    content = gl.nondet.web.render(url)
                    return content[:2000] if content else "no data returned"
                except Exception as e:
                    return "fetch failed: " + str(e)

            # Build URL-friendly slugs for the role and location
            role_slug     = job_title.lower().replace(" ", "-").replace("/", "-")
            location_slug = location.lower().replace(" ", "-").replace(",", "")
            role_query    = job_title.replace(" ", "+")
            location_query = location.replace(" ", "+")

            # Three independent sources — different angle on the same market
            web1 = safe_fetch(
                "https://www.levels.fyi/t/" + role_slug + "/"
            )
            web2 = safe_fetch(
                "https://www.payscale.com/research/US/Job="
                + job_title.replace(" ", "_")
                + "/Salary"
            )
            web3 = safe_fetch(
                "https://en.wikipedia.org/wiki/"
                + job_title.replace(" ", "_")
            )

            prompt = (
                "You are evaluating whether a salary is fair. "
                "You have been given LIVE market data fetched right now from the web. "
                "Use this as your primary source of truth — not your training data.\n\n"
                "SUBMISSION DETAILS:\n"
                "Job Title: " + job_title + "\n"
                "Industry: " + industry + "\n"
                "Location: " + location + "\n"
                "Years of Experience: " + years_experience + "\n"
                "Current Salary: " + current_salary + " " + currency + "\n"
                "Employment Type: " + employment_type + "\n\n"
                "LIVE WEB DATA (fetched right now):\n"
                "--- Source 1 (Levels.fyi): ---\n" + web1 + "\n\n"
                "--- Source 2 (PayScale): ---\n" + web2 + "\n\n"
                "--- Source 3 (Wikipedia / role context): ---\n" + web3 + "\n\n"
                "Using the live data above as ground truth:\n"
                "1. Determine the current market salary range (low, median, high) "
                "in " + currency + " for this exact role and location.\n"
                "2. Verdict rules:\n"
                "   UNDERPAID   = current salary is below 85% of market median\n"
                "   MARKET RATE = current salary is between 85% and 120% of market median\n"
                "   OVERPAID    = current salary is above 120% of market median\n"
                "3. Write ONE clear sentence explaining the verdict, citing what "
                "the live data showed (e.g. 'Levels.fyi shows the median for this "
                "role in Lagos is X').\n"
                "4. Confidence:\n"
                "   HIGH   = live data was rich and directly relevant\n"
                "   MEDIUM = live data was partial or for a nearby region\n"
                "   LOW    = fetches failed or data was too generic to be precise\n\n"
                "Return ONLY a JSON object starting with { and ending with }. "
                "No markdown, no preamble, no explanation outside the JSON.\n"
                'Format: {"verdict": "UNDERPAID", "market_range_low": 95000, '
                '"market_range_high": 130000, "market_median": 112000, '
                '"currency": "' + currency + '", '
                '"reasoning": "one sentence citing live data", "confidence": "HIGH"}'
            )

            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task=(
                "fetch live salary market data from the web and evaluate whether "
                "the submitted salary is UNDERPAID, MARKET RATE, or OVERPAID for "
                "the given role, location, and experience level"
            ),
            criteria=(
                "valid JSON with verdict as one of UNDERPAID/MARKET RATE/OVERPAID, "
                "market_range_low/market_range_high/market_median as integers in the "
                "submitted currency derived from live web data, reasoning as one clear "
                "sentence citing the live sources, and confidence as HIGH/MEDIUM/LOW"
            )
        )

        # ── Defensive JSON parsing ────────────────────────────────────────────
        verdict           = "MARKET RATE"
        market_range_low  = None
        market_range_high = None
        market_median     = None
        reasoning         = "Unable to evaluate at this time."
        confidence        = "LOW"

        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                result_json = json.loads(result_raw[start:end])

                raw_verdict = result_json.get("verdict", "MARKET RATE")
                if raw_verdict in VERDICTS:
                    verdict = raw_verdict

                raw_low  = result_json.get("market_range_low")
                raw_high = result_json.get("market_range_high")
                raw_med  = result_json.get("market_median")

                if isinstance(raw_low, (int, float)):
                    market_range_low = int(raw_low)
                if isinstance(raw_high, (int, float)):
                    market_range_high = int(raw_high)
                if isinstance(raw_med, (int, float)):
                    market_median = int(raw_med)

                raw_reasoning = result_json.get("reasoning", "")
                if raw_reasoning:
                    reasoning = raw_reasoning

                raw_conf = result_json.get("confidence", "LOW")
                if raw_conf in CONFIDENCE_LEVELS:
                    confidence = raw_conf

        except Exception:
            # Fallback: defaults stay — submission always completes, never hangs
            pass

        # Write completed result back
        submission["status"]            = "completed"
        submission["verdict"]           = verdict
        submission["market_range_low"]  = market_range_low
        submission["market_range_high"] = market_range_high
        submission["market_median"]     = market_median
        submission["reasoning"]         = reasoning
        submission["confidence"]        = confidence
        self._write_submission(submission_id, submission)

        # Update global_stats for this role + location
        stats_key = job_title.lower() + ":" + location.lower()
        stats = self._read_global_stats(stats_key)
        stats["count"] = stats["count"] + 1

        try:
            stats["salary_sum"] = stats["salary_sum"] + int(current_salary)
        except Exception:
            pass

        if verdict in stats["verdict_counts"]:
            stats["verdict_counts"][verdict] = stats["verdict_counts"][verdict] + 1

        self._write_global_stats(stats_key, stats)

    # ----------------------------------------------------------------
    # Public view methods
    # ----------------------------------------------------------------

    @gl.public.view
    def get_submission(self, submission_id: str) -> str:
        raw = self.submissions.get(submission_id)
        if raw is None:
            return json.dumps({"error": "Submission not found"})
        return raw

    @gl.public.view
    def get_my_submissions(self, address: str) -> str:
        ids = self._get_address_submissions(address)
        if not ids:
            return json.dumps([])

        results = []
        for sid in ids:
            raw = self.submissions.get(sid)
            if raw is not None:
                results.append(json.loads(raw))

        results.reverse()
        return json.dumps(results)

    @gl.public.view
    def get_global_stats(self, role: str, location: str) -> str:
        stats_key = role.lower() + ":" + location.lower()
        raw = self.global_stats.get(stats_key)
        if raw is None:
            return json.dumps({
                "count": 0,
                "salary_sum": 0,
                "verdict_counts": {
                    "UNDERPAID": 0,
                    "MARKET RATE": 0,
                    "OVERPAID": 0
                }
            })
        return raw

    @gl.public.view
    def get_recent_submissions(self, limit: str) -> str:
        try:
            n = int(limit)
        except Exception:
            n = 10

        n = max(1, min(n, 50))

        total = int(self.submission_count)
        results = []

        for i in range(total, max(0, total - n * 3), -1):
            if len(results) >= n:
                break
            padded = str(i).zfill(6)
            sid = "SUB" + padded
            raw = self.submissions.get(sid)
            if raw is None:
                continue
            sub = json.loads(raw)
            if sub.get("status") == "completed":
                results.append({
                    "id":               sub["id"],
                    "job_title":        sub["job_title"],
                    "industry":         sub["industry"],
                    "location":         sub["location"],
                    "years_experience": sub["years_experience"],
                    "verdict":          sub["verdict"],
                    "currency":         sub["currency"],
                    "block_number":     sub["block_number"],
                })

        return json.dumps(results)

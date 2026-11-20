# RISE scanner: the numbers

> Don't trust our words. Trust our results.

**In one line.** RISE read 40 million lines from 339 repositories in 84 seconds and missed no real S3 call. On the same code it is hundreds of times faster than Claude and OpenAI Codex, with 0 AI tokens. On 6 new repositories it now finds 45 of 45 S3 calls; Codex finds 43. On 26 more fresh repositories, RISE Fast found 41 of 42 in 79 ms; Codex found 42 in 20 s.

All figures were measured on 20 Nov 2026, on one 16-core laptop. Download time is not included. The raw data is in [results.json](results.json) and [results2.json](results2.json), and the method is in [README.md](README.md).

## 1. 339 real repositories

| | |
|---|---|
| Repositories read | **339** public GitHub repos (29 large projects + 310 S3 repos in 17 languages) |
| Code read | **207,301 files · 40,122,401 lines** |
| Time to scan all 339 | **83.7 seconds** (about **480,000 lines per second** on a busy laptop; an earlier run of 185 repos took 40 s) |
| S3 calls found, each with `file:line` | **12,958**, in 223 repositories |
| Storage calls RISE has no test for, flagged | **6,951** |
| Official S3 API calls checked | **14,887**, against all 116 operations of the official S3 API |
| Real S3 calls missed | **0** (259 leftovers reviewed by hand, none is S3) |

**Largest repositories:**

| Repository | Lines | Scan time |
|---|---|---|
| Sentry | 3.7 M | **1.3 s** |
| Discourse | 2.7 M | 2.3 s |
| Airflow | 2.3 M | 3.1 s |
| aws-cli | 2.2 M | 2.9 s |
| Superset | 2.16 M | 1.0 s |
| Ray | 1.66 M | 1.2 s |

**How "0 missed" is checked.** The check does not use RISE's own rules:
- It takes every operation of the official S3 API (116, from AWS's botocore).
- It looks for those calls in every spelling and in every file.
- Of 14,887 calls found, 259 were neither read nor flagged by RISE. A person reviewed each one: none is S3 (JDBC `getObject`, web `create_session`, Azure/GCS/Swift/B2 backends and similar).
- The real gaps found on the way (4 calls in 3 repos: a client returned by a call, the .NET library SimpleS3, hand-signed SigV4 requests in Swift) were fixed and are now regression tests.

## 2. RISE against Claude

The test used the same 20 small repositories (61,856 lines, 5 languages) and the same task: find every S3 call. Claude ran as 4 Claude Sonnet agents in parallel, with search and read tools.

| | Claude | RISE |
|---|---|---|
| Time | ~4.5 min (11 min of agent time) | **0.77 s** |
| AI tokens | ~564,000 | **0** |
| Same answer every run | not guaranteed | **always** |
| Every answer points to `file:line` | mostly | **always** |
| Fits a big repo | no: 38 of the 185 large-batch repos are over ~1 M tokens | **yes**: Sentry (3.7 M lines) in 1.3–4.2 s |

**At the same pace (estimate),** reading all 40 million lines would cost Claude about **365 million tokens (≈ $730 at $2 per million input tokens) and over 100 hours of agent time**. RISE does it in **84 seconds, with 0 tokens**.

**What we do not claim.** RISE did not beat Claude on accuracy by a clean count:
- Claude correctly skipped text that only looks like a call.
- Claude also listed call sites of wrapper functions.

The win is **speed, cost, repeatability and scale**. RISE gives the AI only ~40 redacted evidence lines (~3,700 tokens per analysis), so the AI never reads the code.

## 3. RISE against OpenAI Codex

Codex ran as OpenAI agents with local search and read tools. OpenRouter was not used.

### Same 20 repositories (61,856 lines)

Data: [codex-vs-rise.json](codex-vs-rise.json).

| | OpenAI Codex | RISE |
|---|---|---|
| Reference call sites found (±2 lines) | 306 / 373 | **373 / 373** |
| Repositories with more coverage | 0 | **10** (10 ties) |
| Time, 5-repo timed subset | ≥ 93 s | **0.236 s** (≥ **390× faster**) |

The reference is a pattern list built from the official S3 API (botocore), and RISE reads that same pattern list. So this is coverage of that list, not of every possible S3 call. The list also holds some lines that are not real calls, such as error text and server internals, and this favours RISE.

### 6 new repositories, never used before (3,543 lines)

Data: [holdout-codex-vs-rise.json](holdout-codex-vs-rise.json) and [holdout-rise-after.json](holdout-rise-after.json). Codex built the reference here by reviewing every line by hand.

| | RISE before | **RISE after the fixes** | OpenAI Codex |
|---|---|---|---|
| S3 call sites found | 34 / 45 (76%) | **45 / 45 (100%)** | 43 / 45 (96%) |
| False alarms | 16 | **1** | 0 |
| Critical operations found | 15 / 18 | **18 / 18** | 17 / 18 |
| Time | 92 ms | **164 ms** | 19.8 s (**~120× slower**) |

**What the fixes added:**
- version listing pagination;
- operations on boto3 resources;
- S3 requests made straight from the browser;
- imports and mocks no longer counted as calls.

Operations RISE finds but cannot test yet, such as the browser's presigned POST, are reported as untested.

Honest note: the "after" column is a regression result. The same 6 repositories were used to make the fixes. The "before" column (34/45 in 92 ms) is the only blind result.

### RISE Fast: 26 fresh repositories, no changes during the trial (10,465 lines)

Data: [scanner-fresh-vs-codex.json](scanner-fresh-vs-codex.json). It records pinned commits and the scanner hash.

**RISE Fast** is the discovery engine: the deterministic scanner plus an optional **1.3 KB local model**.
- The model reviews ambiguous S3 calls in Python and JS/TS.
- It runs offline on the CPU.
- It learns only from reviewed feedback (`--feedback`).

| | RISE Fast scanner | RISE Fast + local model | OpenAI Codex |
|---|---|---|---|
| S3 call sites found | 41 / 42 | 41 / 42 | **42 / 42** |
| Alerts outside the reference | 1 | 1 | 0 |
| Time | **79 ms** | 118 ms | 20.05 s (**~250× slower**) |

This is a blind result: the scanner did not change during the trial. Codex was 1 call more accurate, and RISE was about 250 times faster with 0 AI tokens. Only 11 of the 26 repositories had S3 calls. One reviewer built the reference. On this sample the model kept the scanner's coverage; it did not raise it.

## 4. What the comparisons improved

- **Call names inside strings are no longer counted.** Error text such as `"S3::putObject(): failed"` used to count as a call. A test now covers it.
- **More languages.** RISE now reads Scala, Swift, Dart, C++ and Elixir as well. That is 15 languages: Python, JavaScript, TypeScript, Go, Java, Kotlin, PHP, Ruby, C#, Rust, Scala, Swift, Dart, C++ and Elixir.
- **RISE Fast local model.** The 1.3 KB model reviews ambiguous calls and learns from confirmed feedback.
- **119 automated tests pass.** They include a corpus covering 24 SDK styles.

## 5. Limits

- **What "0 missed" covers.** It covers calls to official S3 API names. Code that reaches S3 through a raw HTTP request to a hand-built URL is outside the check.
- **The table in section 1 predates the string fix.** It was measured before calls inside strings were dropped, so the call count may fall slightly on a re-run. "0 missed" is unaffected. Re-run with `python scripts/benchmark.py`.
- **The Claude comparison was a one-off run.** It was not repeated, and the extrapolation to 40 M lines is an estimate.
- **Clojure is not read.** Its call style, `(aws/invoke s3 {:op ...})`, is not a method call.

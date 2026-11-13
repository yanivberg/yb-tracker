# BLUE — YB TRACKER · HANDOFF
Updated: 14/11/2026. Repo-native working memory. Principle: pointers + currently-load-bearing dated facts only, one page, hard cap. Detail lives in SESSION-LOG.md (append-only journal — read the last ~3 blocks at bootstrap). Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · Components: single-file index.html (GitHub Pages) · Google Apps Script backend · Cloudflare Worker (Caspit proxy).
Current deployed: **HTML v1005** (14/11/26, edit today's time on a project card + End Day crash fix; v1004 23/09/26 = quotation button goes through the briefing gate; v1003 21/09/26 = survey Content-Type fix) · **AS deployment Version 364 = AS v234** (15/08/26) · **Worker v30**.
[14/11/26 — HTML v1005 commit `2c93adc` verified byte-identical to the tested build, and verified live (page title + app-info line). AS and Worker are **repo-derived, NOT re-probed** — the container proxy 403s `script.google.com`, so the backend version must be read from the GAS editor.]
⚠ **The v1003/v1004/v1005 changelogs say "AS v235" / "AS v236" and nothing backs either up**: newest mirror is `apps-script-v234.js`, the app-info panel still reads Version 364, and the v1003 fix needed no backend change (v234 already parses `request.postData.contents` regardless of Content-Type). Verify in the GAS editor before trusting any v235 claim — and if a v235 really shipped, the version-cap number below is one higher.

## Bootstrap (three reads, nothing more)
1. This file. 2. Tail of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker `?action=health` · the AS mirrors in this repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.

## Key identifiers
- Sheet: `1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA` ("project list")
- Worker: `https://yb-caspit-proxy.sunroof-dictate-39.workers.dev`
- AS /exec (stable — always "New version" on the EXISTING deployment): `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw`
- GAS project: `script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c`
  ⚠ TWO projects named "YB Tracker Main" — verify the Deployment ID in Manage deployments matches the /exec above BEFORE editing; the other is a decoy. Read it from the DOM, not a screenshot (8-vs-9 is ambiguous in pixels).
  ⚠ **Version cap: 194/200 as of 15/08/26** (195 if an AS v235 was in fact deployed — unverified) (warning shown in Manage deployments) — ~6 deploys of headroom, and shrinking. Pruning old versions from Project history is IRREVERSIBLE and is Yaniv's to do.
- Accountant inbox (monthly docs + quote copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact (ALL API tests, ₪1, cancel after — never real clients): "בדיקות מערכת — לא לקוח (TEST)", ContactId `YB-CONTACT-1783772031444`, #44 [10/07/26]

## The GAS project has FIVE files — all mirrored 14/08/26 [FACT 14/08/26]
Every mirror before 14/08/26 tracked only Code.gs; the other four had never been in the repo.
Newest Code.gs mirror: **`apps-script-v234.js`** (342,684 bytes, **107 actions** — `aiAsk` was the 107th; the guardrail is that `grep -c "action === '"` never decreases). Baseline mirror `apps-script-v226b.js` (320,112 bytes, 106 actions) · `general-expenses.gs` (**v5**, 17,561) · `gmail-po-import.gs` (16,145) · `AuthHelper.gs` (194) · `appsscript.json` (694).
All five SHA-256-verified against the live editor after commit, and acorn-clean (ecmaVersion 2020).
⚠ **Code.gs's own header still says `v224`** although v226 shipped (`/* v226: general-expenses.gs owns a few actions of its own` at line 158). The changelog-first version discipline (§3 of the skill) is applied to the HTML but has NOT been applied to the backend — do not trust the backend header as a version signal; trust the deployment Version number.

## Deployment — Claude deploys, one approval each [since 10/07/26]
**HTML:** since v985 the commits come from `github-deploy-tool.html` (token + GitHub API, commit message `Deploy vNNN — <date, time>`), not the browser-injection flow. Both work; the tool is faster.
**Browser-injection flow (still valid, and the only way to move big files out of the GAS editor):** GitHub `/edit/` page → CodeMirror injection (`.cm-content`.cmView.view → `view.dispatch`) → commit. Rules: (a) digest the editor's base and confirm it equals the COMMITTED file before injecting — a stale editor tab silently reverts other sessions' work; (b) gate the dispatch on the result digest matching the local build; (c) screenshot to confirm the commit dialog actually opened BEFORE typing; (d) confirm the page navigates to `/blob/` after commit; (e) verify live: title + scriptCount>0 + screenshot.
**AS:** GAS editor monaco injection (verify byte-identical BEFORE save) → Manage deployments → New version → POST-probe /exec (write actions live in doPost — GET returns 'OK' for anything). **Worker:** user pastes in Cloudflare dashboard → `?action=health`. iOS manual checklists = fallback.

### Getting a large file OUT of the GAS editor and INTO GitHub [FACT 14/08/26 — proven on 313KB]
The v206 attempt died because a 254KB single paste froze GitHub's new-file CodeMirror. This route avoids both that and Claude's context:
1. GAS tab must be the ACTIVE tab (`document.hasFocus()` true, else `NotAllowedError`) → `navigator.clipboard.writeText(model.getValue())`.
2. On the GitHub `/upload/main` tab, `navigator.clipboard.readText()` **hangs the CDP call for 45s** on a permission prompt — do NOT use it. Instead append a plain `<textarea>`, focus it, send a real `cmd+v` keystroke (a genuine paste needs no permission), read `.value`.
3. Build `File` objects → `DataTransfer` → assign to `input[type=file].files` → dispatch `change`. GitHub consumes and clears the input, so reading `input.files` back returns `[]` — **that is success**; confirm via screenshot of the staged list.
4. SHA-256 both ends. Multiple files can go in one commit by JSON-bundling the small ones through the same clipboard hop.
5. ⚠ Page-triggered blob downloads to ~/Downloads **silently never landed** (0 of 6 attempts, no error). Do not rely on them.
6. ⚠ Commit-silently-no-ops, second form: after files stage, GitHub inserts a "ProTip!" line that shifts the Commit button ~14px down. Re-screenshot immediately before clicking.

## Working style [observed 10/07/26, re-confirmed 14/08/26]
Quick Hebrew/English with typos — read intent generously. Spec-first (what/why/files/impact) → approval → build; preview HTML only for major visual redesigns. Trust is method-scoped: proven technique + "go" = proceed; new kinds of side effects = fresh ask. Asks "what do you suggest?" and expects a ranked recommendation with a reason, not a menu. Chat concise; requested analyses = deep .md files → Desktop → time tracker app; builds → claude-builds/vNNN. [CONSTRAINT] Accounting correctness is law (locked invoices, credit notes, verify against real Caspit output).

## Load-bearing Caspit facts [dated 10–11/07/26 — re-probe before relying]
TrxTypeId 16 quote / 1 invoice / 2 receipt (disabled) / 3 combined. Line Details↔ProductName auto-fill at CREATE (whitespace trimmed; only follow-up PUT `Details:''` clears; PDF prints "Name / Details" when both set; free-text ProductName does not survive Caspit-UI re-saves → app stores descriptions Details-first). Tokens live 10 min — cache ≤8 (AS v202). EmailDocument API 500s always (never worked) → RESOLVED v203 [11/07/26 verified]: quote PDFs emailed via Gmail (GmailApp) + worker getDocPdf, fired AFTER the line-Details cleanup PUT resolves. Shared AS helper `emailQuotePdfViaGmail(docId,docNum,to)`; HTML calls it via `_emailCleanedQuote`. Covers all 3 quote paths. `emailQuote` docNum must be the FULL branch-prefixed number (`01/900195`) — a bare number 404s [21/07/26]. Cloudflare IPs blocked on app.caspit.biz → worker uses app1/app2; Google IPs fine. PUT computed fields → 400. `CustomerId` alone doesn't populate the doc header — send CustomerOsekMorshe/Address/City/Phone/Email.

## PO import (gmail-po-import.gs) [fixed & verified 12/07/26]
Reads Gmail PO PDFs → parses line items → adds jobs to GOLMAT/ROLLMAT/PAL-YAM sheets. Manual (app Setup → PO Import → scanPOEmails preview → runPOImport). Live PO PDF facts: line = `<row> <SKU> <desc> <qty> יח' <unitPrice> <ILS|ש"ח> <lineTotal>` (NO date column). GOLMAT/ROLLMAT PO# prints digits-first `2601776POG` → normalize to `POG…`; currency ILS; SKU uppercase. PAL-YAM: pure-digit PO#, currency `ש"ח`, lowercase SKU, email layout varies every time (PDF layout constant) → search by content not subject. POGETTHREADS searches by attachment filename, NOT email subject (POs are forwarded w/ arbitrary subjects). Guard skips non-PO PDFs BEFORE Drive conversion (scan ~28s vs 240s timeout). PODETECTCLIENT keys off PDF text (פל ים/ט.פ.י/t-p-y/tax 513327064 → PAL-YAM; רולמט/POR → ROLLMAT; else GOLMAT).

## Expenses & billing [dated 18/07/26 — load-bearing]
Expenses sheet columns per LIVE `getExpenses`: A=jobId B=client C=date D=category E=desc F=amount G=createdAt **H=link** I=(unread) **J=invoicedDoc**. Col J = a `yyyy-MM-dd` "billed-on" stamp written by `createExpenseRow` via `_stampExpensesBilled`. **Informational only.**
⚠ The double-billing guard is NOT the stamp — it is v204's `_syncExpenseRollup` **set-to-total**: re-invoicing overwrites the client-sheet line to the job's full expense total; it never stacks. (Pre-v204 it appended — that is the bug people remember.)
⚠ Do NOT teach `_syncExpenseRollup` to skip stamped rows — it would recompute from unbilled rows only and erase already-billed money from the client sheet.
AS v208 [21/07/26]: `getExpenses` also returns `invoiced: true/false` per expense (rollup row shows `יצאה חש`; matched by `SRC:<jobId>` in notes, fallback `desc == "הוצאות "+jobTitle`); wrapped in try/catch, defaults false.

## General Expenses — separate module [12/08/26, HTML v985–v988 / general-expenses.gs]
Overhead expenses NOT tied to a project (💸 in the drawer). Stored in **two dedicated sheets of its own, with no client column and no jobId** — a general expense structurally cannot reach a client invoice. Append-only; delete marks, never removes. Amount entered is the paid (incl-VAT) figure; the module derives pre-VAT (18% or exempt) and stores/report the **pre-VAT** number as the real cost. Perf facts: Apps Script serialises requests per user, so three parallel calls returned an HTML error page instead of JSON (v986 → one call); v987 renders from localStorage first and refreshes in background; v988 pre-warms 9s after app load — deliberately delayed, an earlier call slowed the main screen (this is also why iPhone feels slower than the Mac).

## Client ↔ Caspit + reports [dated 19/07/26 — load-bearing]
- **Client↔Caspit pairing** = Clients sheet **col I** (`caspitId`); `_buildMatchMap()` uses it as PRIMARY (before exact-name, then fuzzy ≥75). v941: an EXPLICIT contact pick persists via `_persistCaspitPair`. ⚠ Fuzzy auto-match writes NOTHING — never cement a guess. ⚠ v975: pairing is NOT persisted when Sheet Client = "occasional client" (shared tab for one-off clients; the contact is incidental to that job).
- **Pre-quotation briefing (survey)** in localStorage `preProjectSurveys` + `Pre-Project Surveys` sheet; shown read-only as a "📋 תדריך" accordion (v942). ⚠ `getSurveyData` omits jobId → no server fallback; a survey from another device shows "לא נמצא תדריך". 1-line fix if needed: add `jobId: row[1]`.
- **Gross-profit report** (drawer 💰): `period=day|week|month|**year**|all` (year added AS v231); filters by תאריך סיום falling back to תאריך התחלה; dateless rows go to an `undated` bucket, SURFACED not dropped. Week starts Sunday. HTML v995 adds a "full picture" block: gross profit, of which client expense reimbursement (shown as detail only — it is ALREADY inside gross profit, subtracting it would double-count), general expenses (pre-VAT, because VAT is offset and not a cost), and estimated net.
  - **`scope=toinvoice|done`** (AS v232, HTML v1001): `toinvoice` = the original `invoice === 'להוציא חש'` filter; `done` = every row with status `בוצע` whatever its invoice state. "How much did the business gross this year" is `done`.
  - **`undated=include|separate`** (AS v234, HTML v1002, OFF by default): folds dateless completed jobs into the total. `result.undated` / `result.undatedJobs` are returned either way. ⚠ Meaningful for year/all; on day/week it inflates a short window.
  - ⚠ `_geWindow` in general-expenses.gs must accept every period the gross report accepts. An unknown period hits `default: return null` = ALL-TIME overhead subtracted from ONE period's gross. This is what general-expenses v5 fixed for `year`.

## Work-day timer — load-bearing facts [14/11/26, HTML v1005]
Per project: `totalMs` = today, `prevMs` = previous days (seeded from the sheet's שעות בפועל), `active`/`activeStart` = running, `sessions[]` = measured runs (timeline only — never the source of truth for totals), `adjustments[]` = manual edits (v1005).
- ✏️ on running/paused cards edits **`totalMs` only**. If the timer is running, the run so far is pushed to `sessions` and `activeStart` restarts — do not "simplify" this into a negative `totalMs`; new-day carry-over and history both test `totalMs > 0`.
- **Day total is clock-based** (`dayEnd − dayStart`), not a sum. Editing a project changes worked time only.
- The 1-second tick re-renders every card. Anything with an open input must be added to the guard in the tick (`isTypingNote || anyExpenseOpen || window.__progDrag || _teOpen()`), or it is wiped once a second.
- ⚠ Sheet sync writes `Math.max(local, sheet)` hours. A lowered time does NOT reach the sheet if the job was already synced higher (✓ → un-✓ → lower). Not fixed.
- Local headless testing: the login gate is only an overlay + `visibility:hidden` on `.screen`; with all network aborted, un-hide and call `showScreen('day'); startMainLoop(); renderProjectBtns()`.

## In-app AI assistant (`aiAsk`) [AS v227→v230, HTML v996–v999]
Read-only by construction — the `aiAsk` branch contains no write path. Gemini 2.5 Flash, key in Script Properties (`GEMINI_API_KEY`), `thinkingBudget:0`, `deadline:30`. **Free tier = 20 requests/day shared across ALL AI actions**, including price suggestions — a chatty afternoon can starve the quote form.
⚠ **A model cannot sum hundreds of rows.** v228 answered GOLMAT gross ₪397,822 against a true ₪527,767 — confident, plausible, ₪130k wrong. The fix was code, not prompting: **v229 computes EXACT TOTALS in `ybFullDump` and forbids the model from adding rows.** Never remove that and never try to solve it with a better prompt.
⚠ Rule 9 (no numbers you did not compute) must stay scoped to NUMBERS — v230 applied it broadly and the assistant refused planning questions in a loop. Fixed v231.
Other load-bearing bits: `ybCachePutBig` chunks at 30,000 chars because CacheService caps one value at 100KB and Hebrew is 2 bytes/char · `ybPDate` (v230) parses `d.m.yy`, `yyyy-mm-dd` and RTL-marked strings · Apps Script **serialises requests per user**, so a second concurrent request returns an HTML error page, not JSON — hence the auto-retry.
🤖 The floating button is **hidden** (`display:none` on `#ybAiFab`, v999). The assistant, its panel and `aiAsk` are untouched; un-hiding is deleting that one declaration.

## AI price suggestion — known broken comparables [FACT 15/08/26, NOT fixed]
`getAIPriceSuggestion` and `getAIPriceRows` both filter similar jobs with `['הצעה ניתנה','בתהליך ביצוע','הסתיים'].indexOf(jStat2) === -1 → continue`. **Two of those three strings do not exist in the sheets** — the real values are `בוצע` and `ניתנה הצעה`. GOLMAT therefore returns 2 comparables out of 266 rows; ROLLMAT returns 0 out of 320. The engine is pricing almost entirely from `PRICING_PHILOSOPHY_PROMPT` (one-man operation · ₪500/hr anchor · materials excluded by default · market-equivalent hours × ₪500 × complexity multiplier +0%/+15–25%/+30–50%) with no history behind it.
Fix = two string swaps in each of the two functions. Offered twice, deferred both times — do not ship it without a fresh ask.
⚠ `var workers2 = parseInt(e.parameter.workers || '1')` is read and **never used again**. The worker-count selector in the quote form is wired to nothing.

## Open items
⚠️ YANIV-ONLY (touches real billing data, carried since v931): (1) acceptance test of the 5-step ✕-delete flow on a SCRATCH job/client — never a real one; (2) acceptance test of the v205 billed-stamp on a SCRATCH job — expect the rollup line to BECOME the full job total on re-invoice (one line), not to gain a second line.
  ✅ `repairExpenseRollups(true)` dry run — CLOSED 14/08/26: 0 duplicates, 0 price corrections, 0 deletions, only 7 unresolved legacy lines. The damage everyone assumed was on the sheets does not exist. **Do NOT run the apply path** — and if it is ever needed, fix it first: it deletes with `sh.deleteRow(r2+1)` against a pre-loop snapshot with no offset counter (same trap as v931) and rewrites prices without checking invoice status.
⚠️ YANIV-ONLY: **118 completed jobs worth ~₪319k have no date in the sheet at all** — both date cells empty, not a parsing failure. Any period total understates reality until they are filled. The v1002 `undated` toggle is a workaround.
⚠ **AS v235 / v236 are unverified** — see the trap at the top. Read the Code.gs header and the current deployment Version before any backend work.
⚠ **GAS version pruning** — 194/200, irreversible, Yaniv's to do. This is now the binding constraint on backend work.
⚠ **Code.gs header bump** — backend is not following the changelog-first version discipline (header stuck at v224).
⚠ **Worker still has no repo mirror** — the only unmirrored component left.
⚠ **AI price comparables are broken** (see section above) — deferred, needs a fresh ask.
⚠ Weekly planner: planning is poor because of DATA (23 open jobs inside 866 status-less rows, ~22% dated, no due dates/priority/site grouping), not prompting. A code-computed planner is the fix. Deferred.
📱 UNVERIFIED: the v1005 ✏️ time-edit panel on the iPhone (numeric keypad, grayscale paused card).
📱 UNVERIFIED: the iOS execCommand fallback for 📋 העתק never ran in testing.
Also open: cancel test quotes 900182/83/85/86 (+87) · v92x localStorage backup (spec pending approval) · Bitter-Lesson Phases 0–3 · repo `pairs.json` — appeared from another session's deploy tooling; confirm intentional or delete.
RETIRED: bank-deposit Gmail importer [deleted by Yaniv 10/07/26] — see SESSION-LOG tombstones before re-proposing anything.

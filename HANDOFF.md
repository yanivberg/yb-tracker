# BLUE — YB TRACKER · HANDOFF
Updated: 14/08/2026. Repo-native working memory. Principle: pointers + currently-load-bearing dated facts only, one page, hard cap. Detail lives in SESSION-LOG.md (append-only journal — read the last ~3 blocks at bootstrap). Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · Components: single-file index.html (GitHub Pages) · Google Apps Script backend · Cloudflare Worker (Caspit proxy).
Current deployed: **HTML v995** (12–13/08/26, gross-profit "full picture" block) · **AS deployment Version 356** (13/08/26 23:05; Code.gs header still reads v224 — see trap below) · **Worker v30**. [14/08/26 — all three probe-verified live]

## Bootstrap (three reads, nothing more)
1. This file. 2. Tail of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker `?action=health` · the AS mirrors in this repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.

## Key identifiers
- Sheet: `1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA` ("project list")
- Worker: `https://yb-caspit-proxy.sunroof-dictate-39.workers.dev`
- AS /exec (stable — always "New version" on the EXISTING deployment): `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw`
- GAS project: `script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c`
  ⚠ TWO projects named "YB Tracker Main" — verify the Deployment ID in Manage deployments matches the /exec above BEFORE editing; the other is a decoy. Read it from the DOM, not a screenshot (8-vs-9 is ambiguous in pixels).
  ⚠ **Version cap: 188/200 as of 14/08/26** (warning shown in Manage deployments) — ~12 deploys of headroom. Pruning old versions from Project history is IRREVERSIBLE and is Yaniv's to do.
- Accountant inbox (monthly docs + quote copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact (ALL API tests, ₪1, cancel after — never real clients): "בדיקות מערכת — לא לקוח (TEST)", ContactId `YB-CONTACT-1783772031444`, #44 [10/07/26]

## The GAS project has FIVE files — all mirrored 14/08/26 [FACT 14/08/26]
Every mirror before 14/08/26 tracked only Code.gs; the other four had never been in the repo.
`apps-script-v226b.js` (= live Code.gs, 320,112 bytes, **106 actions**) · `general-expenses.gs` (17,251) · `gmail-po-import.gs` (16,145) · `AuthHelper.gs` (194) · `appsscript.json` (694).
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
- **Gross-profit report** (drawer 💰): AS v206 added `period=day|week|month|all`; filters by תאריך סיום falling back to תאריך התחלה; dateless rows go to an `undated` bucket, SURFACED not dropped. Week starts Sunday. HTML v995 adds a "full picture" block: gross profit, of which client expense reimbursement (shown as detail only — it is ALREADY inside gross profit, subtracting it would double-count), general expenses (pre-VAT, because VAT is offset and not a cost), and estimated net.

## Open items
⚠️ YANIV-ONLY (touches real billing data, carried since v931): (1) acceptance test of the 5-step ✕-delete flow on a SCRATCH job/client — never a real one; (2) `repairExpenseRollups(true)` dry-run → review Logger → `repairExpenseRollups(false)` to apply; (3) acceptance test of the v205 billed-stamp on a SCRATCH job — expect the rollup line to BECOME the full job total on re-invoice (one line), not to gain a second line.
⚠ **GAS version pruning** — 188/200, irreversible, Yaniv's to do.
⚠ **Code.gs header bump** — backend is not following the changelog-first version discipline (header stuck at v224).
⚠ **Worker still has no repo mirror** — the only unmirrored component left.
📱 UNVERIFIED: the iOS execCommand fallback for 📋 העתק never ran in testing.
Also open: cancel test quotes 900182/83/85/86 (+87) · v92x localStorage backup (spec pending approval) · Bitter-Lesson Phases 0–3 · repo `pairs.json` — appeared from another session's deploy tooling; confirm intentional or delete.
RETIRED: bank-deposit Gmail importer [deleted by Yaniv 10/07/26] — see SESSION-LOG tombstones before re-proposing anything.

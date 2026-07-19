# BLUE — YB TRACKER · HANDOFF
Updated: 19/07/2026. Repo-native working memory (promoted from the Drive "MASTER HANDOFF v2"; the v800-era doc is historical).
Principle: pointers + currently-load-bearing dated facts only, one page, hard cap. Detail lives in SESSION-LOG.md (append-only journal — read the last ~3 blocks at bootstrap). Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · Components: single-file index.html (GitHub Pages) · Google Apps Script backend · Cloudflare Worker (Caspit proxy).
Current deployed: HTML v943 (gross-profit period filter) · AS deployment Version 336 (Code.gs = v206: getGrossProfitSummary period param) · Worker v30. [19/07/26 — all three probe-verified live]

## Bootstrap (three reads, nothing more)
1. This file. 2. Tail of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker `?action=health` · latest `apps-script-vNNN.js` in this repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.

## Key identifiers
- Sheet: `1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA` ("project list")
- Worker: `https://yb-caspit-proxy.sunroof-dictate-39.workers.dev`
- AS /exec (stable — always "New version" on the EXISTING deployment): `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw`
- GAS project: `script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c`
  ⚠ TWO projects named "YB Tracker Main" — verify Deployment ID matches before editing; the other is a decoy.
  ⚠ Version cap: 195/200 used as of 19/07/26 (warning shown in Manage deployments) — ~5 deploys of headroom. Prune old versions from Project history before the next few deploys.
- Accountant inbox (monthly docs + quote copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact (ALL API tests, ₪1, cancel after — never real clients): "בדיקות מערכת — לא לקוח (TEST)", ContactId `YB-CONTACT-1783772031444`, #44 [10/07/26]

## Deployment — Claude deploys, one approval each [since 10/07/26]
HTML: GitHub `/edit/` page → CodeMirror injection (`.cm-content`.cmView.view → `view.dispatch`) → commit. Rules: (a) digest the editor's base and confirm it equals the COMMITTED file before injecting — a stale editor tab silently reverts other sessions' work; (b) gate the dispatch on the result digest matching the local build; (c) screenshot to confirm the commit dialog actually opened BEFORE typing (a missed dialog types the message into the code); (d) confirm the page navigates to `/blob/` after commit; (e) verify live: title + scriptCount>0 + screenshot. Dead ends: the page CSP blocks fetching `127.0.0.1` (can't pull bytes in), and `file_upload` rejects paths outside session-shared folders — so send small edit PAIRS and apply them in-page. AS: GAS editor monaco injection (verify byte-identical BEFORE save) → Manage deployments → New version → POST-probe /exec (write actions live in doPost — GET returns 'OK' for anything). Worker: user pastes in Cloudflare dashboard → `?action=health`. iOS manual checklists = fallback.

## Working style [observed 10/07/26]
Quick Hebrew/English with typos — read intent generously. Spec-first (what/why/files/impact) → approval → build; preview HTML only for major visual redesigns. Trust is method-scoped: proven technique + "go" = proceed; new kinds of side effects = fresh ask. Chat concise; requested analyses = deep .md files → Desktop → time tracker app; builds → claude-builds/vNNN. [CONSTRAINT] Accounting correctness is law (locked invoices, credit notes, verify against real Caspit output).

## Load-bearing Caspit facts [dated 10/07/26 — re-probe before relying]
TrxTypeId 16 quote / 1 invoice / 2 receipt (disabled) / 3 combined. Line Details↔ProductName auto-fill at CREATE (whitespace trimmed; only follow-up PUT `Details:''` clears; PDF prints "Name / Details" when both set; free-text ProductName does not survive Caspit-UI re-saves → app stores descriptions Details-first). Tokens live 10 min — cache ≤8 (AS v202). EmailDocument API 500s always (never worked) → RESOLVED v203 [11/07/26 verified working]: quote PDFs now emailed via Gmail (GmailApp) + worker getDocPdf, fired AFTER the line-Details cleanup PUT resolves, so the emailed PDF matches the saved doc (description once). Caspit EmailDocument no longer used. Shared AS helper `emailQuotePdfViaGmail(docId,docNum,to)`; HTML calls it via `_emailCleanedQuote`. Covers all 3 quote paths (new / pending / edit); pending-quote path now also emails (previously didn't). Cloudflare IPs blocked on app.caspit.biz → worker uses app1/app2; Google IPs fine. PUT computed fields → 400.

## PO import (gmail-po-import.gs) [fixed & verified 12/07/26]
Reads Gmail PO PDFs → parses line items → adds jobs to GOLMAT/ROLLMAT/PAL-YAM sheets. Manual (app Setup → PO Import → scanPOEmails preview → runPOImport). Live PO PDF facts: line = `<row> <SKU> <desc> <qty> יח' <unitPrice> <ILS|ש"ח> <lineTotal>` (NO date column — old regex required one, broke it). GOLMAT/ROLLMAT PO# prints digits-first `2601776POG` → normalize to `POG…`; currency ILS; SKU uppercase. PAL-YAM: pure-digit PO# (`הזמנת רכש מספר 2601003576`), currency `ש"ח`, lowercase SKU (zzz10), email layout varies every time (PDF layout constant) → search by content not subject. POGETTHREADS searches by attachment filename (`filename:הדפסת` GOLMAT/ROLLMAT) + `"הזמנת רכש" ("פל ים"|"t-p-y")` (Pal-Yam), NOT email subject (POs are forwarded w/ arbitrary subjects). POSCAN_RETURN/POIMPORT_RETURN convert every PDF via Drive (slow, seconds each) → guard skips non-PO PDFs by filename/subject/sender BEFORE conversion (scan ~28s vs 240s timeout). PODETECTCLIENT keys off PDF text (פל ים/ט.פ.י/t-p-y/tax 513327064 → PAL-YAM; רולמט/POR → ROLLMAT; else GOLMAT). POEXTRACTPO returns '' (not '?') on no-match so broad search skips non-POs.

## Expenses & billing [dated 18/07/26 — load-bearing]
Expenses sheet columns per LIVE `getExpenses`: A=jobId B=client C=date D=category E=desc F=amount G=createdAt **H=link** I=(unread) **J=invoicedDoc**.
Col J = a `yyyy-MM-dd` "billed-on" stamp written by `createExpenseRow` via `_stampExpensesBilled`, on BOTH success paths (rollup created, and rollup updated in place). **Informational only.**
⚠ The double-billing guard is NOT the stamp — it is v204's `_syncExpenseRollup` **set-to-total**: `createExpenseRow` delegates to it whenever a rollup line already exists, and it SETS the client-sheet line's price to the job's full expense total instead of appending. Re-invoicing therefore overwrites to the correct figure; it never stacks. (Pre-v204 it appended — that is the bug people remember.)
⚠ Do NOT teach `_syncExpenseRollup` to skip stamped rows. It would recompute the rollup from unbilled rows only, so any later add/delete would erase already-billed money from the client sheet.
From-now-on only: rows predating v205 have an empty col J and bill normally the first time; they simply show unmarked.
HTML surfaces it in two places (v937 daily list, v938 monthly report): billed rows render greyed + ✓ with the date in the tooltip, still deletable. v939 adds a `טרם חויב` subtotal to the monthly total bar. The client-facing copied report text carries no billing marks by design.

## Client ↔ Caspit + reports [dated 19/07/26 — load-bearing]
- **Client↔Caspit pairing** = Clients sheet **col I** (`caspitId`); `getClients&full=1` returns it, `_buildMatchMap()` uses it as PRIMARY (before exact-name, then fuzzy ≥75). AS `updateClientCaspitId` writes it by client name. v941: an EXPLICIT contact pick now persists via shared `_persistCaspitPair` — new-quote form (`#caspitQuoteContact`→`_onQuoteContactPicked`) AND invoice tab (`_caspitSetManualContact`). ⚠ Fuzzy auto-match (`_autoMatchCaspitClient`) writes NOTHING — never cement a guess. ⚠ Clearing is NOT persisted (action rejects empty id); a client with no Clients-sheet row warns, doesn't silently no-op. Pre-v941 it only wrote on new-contact creation → why it always "forgot".
- **Pre-quotation briefing (survey)** saved to localStorage `preProjectSurveys` + POSTed to `Pre-Project Surveys` sheet. v942 shows it read-only (🔧 tools · 📝 steps · 🔑 keys) as a "📋 תדריך" accordion on all 3 project cards (renderSetup main page + renderProjectBtns paused + active). Reads localStorage only (jobId→desc match). ⚠ `getSurveyData` omits jobId (row[1]) → no server fallback; a survey from another device / after cache-clear shows "לא נמצא תדריך". 1-line fix if needed: add `jobId: row[1]`.
- **Gross-profit report** (drawer 💰) = PIPELINE view: rows at invoice status `להוציא חש`, sum רווח גולמי — NOT a period report until v206. AS v206 added `period=day|week|month|all` (default/unknown = `all` = byte-for-byte old behaviour); filters by תאריך סיום, falling back to תאריך התחלה; dateless rows go to an `undated` bucket, SURFACED not dropped (now ₪904 / 4 to-invoice jobs). Week starts Sunday. HTML v943 = segmented control יומי/שבועי/חודשי/הכל in the overlay.

## Open items
⚠️ YANIV-ONLY (touches real billing data, carried since v931): (1) acceptance test of the 5-step ✕-delete flow on a SCRATCH job/client — never a real one; (2) `repairExpenseRollups(true)` dry-run → review Logger → `repairExpenseRollups(false)` to apply (cleans duplicate/stale `הוצאות` rollup lines from the old unconditional-append bug); (3) acceptance test of the v205 billed-stamp on a SCRATCH job — expect the rollup line to BECOME the full job total on re-invoice (one line), not to gain a second line.
📱 UNVERIFIED: the iOS execCommand fallback for 📋 העתק (note→clipboard) never ran in testing — Chrome always took the Clipboard API path. One tap on the iPhone confirms or kills it.
⚠ AS `apps-script-v206.js` mirror NOT committed to repo — the GitHub new-file editor froze rendering the 254KB single paste; v206 is LIVE & correct (Version 336, digest `37 46 80 162 28 140`). Last committed mirror is v205. Retry by pasting in chunks, or accept v205 as the mirror baseline.
cancel test quotes 900182/83/85/86 (+87) · v92x localStorage backup (spec pending approval) · Bitter-Lesson Phases 0–3 (bitter-lesson-harness-analysis.md) · skill v2 install via Settings (yb-tracker-build-deploy-SKILL-v2.md) · repo `pairs.json` — appeared in the repo root from another session's deploy tooling; confirm it's intentional or delete.
DONE 11/07/26: AS v203 clean-email (Gmail+getDocPdf) — shipped & verified working, see Caspit facts above.
RETIRED: bank-deposit Gmail importer [deleted by Yaniv 10/07/26] — see SESSION-LOG tombstones before re-proposing anything.

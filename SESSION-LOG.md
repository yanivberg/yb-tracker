# YB TRACKER — SESSION-LOG

Append-only journal. Newest at top. Bootstrap reads the last ~3 blocks (per HANDOFF.md).
Every block: what shipped, dated facts (with evidence), observed preferences, open threads, retired facts.
This file was referenced by the bootstrap but did not exist until 13/07/2026 — created to close the broken pointer.

---

## 2026-07-20 — v944–v945: Golmat "stuck quotation" — briefing→quote routing + save-for-future
SHIPPED:
- HTML v944 (main squash `4dfaa50`, PR #1) — the pre-quotation briefing's finish button now routes via new `_submitBriefing()` (by `_preSurveyPendingJob._forQuotation`) instead of the runtime onclick-rebind. Quote flow always advances to the Caspit quote form; removed the fragile rebind in `_showAnalysisForm`. Fixes the report where the briefing silently ran the legacy "add to Today" handler.
- HTML v945 (main squash `4f0a945`, PR #2) — `submitQuotationSurvey` now also calls `_saveLessonFromSurvey` (same capture the add-project flow does), so the briefing reaches Lessons Learned; `_doAddJobAsProject` backfills `jobId` onto an orphaned quote-time briefing so 📋 תדריך stays attached even when the sheet desc differs from the quote line.
- Added `.gitignore` for local acorn audit tooling (node_modules, package*.json).
- Diagnosis + guidance delivered (no code): Golmat display-stand quote line items (1-line and 3-line splits) and the Add Job recipe (client גולמט, status `ממתין להצעה`, blank price/qty → Save to Sheet Only) to land it in Pending Quote + the Golmat tab.

FACT (all 20/07/26):
- **Root cause of the "stuck quotation":** the shared briefing body (`_renderPreSurveyBodyAI`) hardcoded its submit button to `submitPreProjectSurvey()` ("✓ Ready — Add to Today") and the quote flow *rebound* it at runtime in `_showAnalysisForm`. A missed rebind ran the add-to-Today handler → project pushed to Today's Projects, no quote opened, no client-sheet row. | evidence: index.html:9703 (button) + :9999 (rebind), matches every reported symptom
- **`openPreProjectSurvey` (the legacy add-project briefing entry) has ZERO callers** — so the only live path to that briefing form is the quotation flow (`_analyzeForQuotation`). That's why the routing bug always surfaced as a broken *quote*. | evidence: `grep -n openPreProjectSurvey index.html` → definition only
- **`_doAddJobAsProject` only READS the sheet** (getJobHours/getJobDetails/getJobNotes) — it never writes a job row. A project created via the survey/add-to-day path exists only in localStorage `projects`, never in the client tab. This is why Golmat was in Today's Projects but not in the Golmat sheet. | evidence: index.html:3213
- The sheet is **one tab per client** (`getSheetByName(client)`); `addJob` writes the row; Pending Quote = status `ממתין להצעה`. | evidence: apps-script-v205.js:543, submitAddJob :4088
- **Server-side reuse map:** `analyzeJobForPreSurvey` reads **Lessons Learned** by category (feeds FUTURE briefings); `analyzeQuotationLines` reads client-sheet done-jobs + **Job Surveys** (feeds FUTURE quotes); the **Pre-Project Surveys** sheet feeds ONLY the current project's live tips (`getSurveyData`→getProjectTips/getAISessionTips). The quote flow saved to Pre-Project Surveys but SKIPPED `_saveLessonFromSurvey`, so the briefing never reached future projects — the exact gap v945 closes. | evidence: apps-script-v205.js:2364 / :2455 / :2326
- **Quote email path:** Caspit's own `EmailDocument` API 500s unconditionally; the app emails the cleaned PDF via Gmail (`emailQuote`→`getDocPdf`→GmailApp) to **yanivberg@icloud.com**, best-effort/silent-on-failure, gated on `d.mailSent`. Still the fragile step. | evidence: index.html:8124 / :8657 / :8699
- **This sandbox's egress policy DENIES `script.google.com` and the worker host** (403 to CONNECT) — cannot call the live AS/worker or write to the sheet from a session. Live-backend probes must be done in-app or via a connected browser. | evidence: proxy `/__agentproxy/status` recentRelayFailures; WebFetch getClients → 403
- **GitHub squash-merge gotcha:** a feature branch that still holds its un-squashed commit conflicts on the NEXT PR from the same branch. Fixed by `git rebase --onto origin/main <old-branch-tip>` before the second merge. | evidence: PR #2 → 405 "merge conflicts"; rebase `9e3e836`→origin/main then force-with-lease resolved it

PREFERENCE:
- 20/07/26 | Yaniv walks his own mental model of a flow ("step by step it does X→Y→Z, am I correct?") and wants an honest true/partial map, not a yes. Delivered as a ✅/⚠️ table (steps 1–4 true, step 5 needed v945). | seen this session
- 20/07/26 | Terse go-aheads ("Yes" / "Go") are the per-deploy approval; still gave spec + audits before each deploy. Wants the fix live, same session.

OPEN:
- 🟢 Golmat still to be done BY Yaniv in-app: Add Job (גולמט / `ממתין להצעה` / full-spec desc → Save to Sheet Only) → then send the quote with the drafted line items. Verify גולמט is in the client dropdown and the Golmat↔Caspit pairing populates the doc header. Then delete the redundant original Golmat Today's-Projects card (jobId='').
- ⚠ v945 saves the quote-time briefing to Lessons Learned via `_saveLessonFromSurvey`, which hardcodes outcome `success` / 0h. Consistent with the existing add-project capture, but pre-work briefings now enter the top-3-by-category pool as "success/0h" — if that pollutes future briefings, add an honest outcome tag (e.g. `quoted`).
- 🟢 The **Skip — Go straight to quotation** path (`_skipToQuotation`) still saves no briefing/lesson by design → skipping the AI step means nothing reaches future projects.
- Carried from 19/07: AS v206 mirror not in repo (editor froze on 254KB paste); prune GAS versions (~5 headroom); `getSurveyData` omits jobId (no cross-device briefing fallback); one real GOLMAT↔גולמט בע"מ pairing pick; iOS execCommand copy unverified.

RETIRED:
- "The pre-quotation survey is saved for future projects" — FALSE before v945: the quote flow wrote only to Pre-Project Surveys (current-project tips only) and skipped Lessons Learned, so no future job ever saw it. Fixed by v945. Killed 20/07/26.
- "A project made through the pre-quotation briefing is written to the client sheet" — FALSE; `_doAddJobAsProject` never writes a row (read-only against the sheet). Killed 20/07/26.

---

## 2026-07-19 — v940–v943 + AS v206: PO line-id, client↔Caspit memory, briefing watch, GP period filter
SHIPPED:
- HTML v940 (commit `5bd3c3d`) — "Attach PO to Existing Project": each PO now shows the picked project's spreadsheet line ID (G0080 / Pal0005) next to the PO number, live as you choose a project, hidden on "New Row". Client-side only — `getPendingQuote` already returned `id`.
- HTML v941 (commit `d887789`) — the sheet-client → Caspit-contact pairing (e.g. GOLMAT → גולמט בע"מ) now PERSISTS to Clients sheet col I on an explicit pick, in both the new-quote form and the invoice tab, via shared `_persistCaspitPair` → existing `updateClientCaspitId`. Fuzzy auto-match writes nothing.
- HTML v942 (commit `ce2f931`) — "📋 תדריך" read-only accordion on all 3 project cards showing the pre-quotation briefing's 🔧 tools / 📝 steps / 🔑 keys, from localStorage `preProjectSurveys`.
- AS v206 → deployment **Version 336** (deployment ID `AKfycbxqbXKwg-Ekbw…`, verified not the decoy) — `getGrossProfitSummary` gained `period=day|week|month|all`. `all` (and any unknown) = byte-for-byte the pre-v206 behaviour. New helper `_gpRowDate` (תאריך סיום → תאריך התחלה). Dateless to-invoice rows summed into an `undated` bucket, surfaced not dropped.
- HTML v943 (commit `011366f`) — segmented control יומי/שבועי/חודשי/הכל in the Gross Profit overlay; header shows the period; orange note surfaces the undated ₪ when a window is active.

FACT (all 19/07/26):
- **The Client↔Caspit pairing store already existed and was simply never written from the picker** — Clients sheet col I (`caspitId`), read by `_buildMatchMap()` as the PRIMARY source, writable via the already-live `updateClientCaspitId`. Before v941 it was only written right after CREATING a new Caspit contact, so a manual pick (`_caspitSetManualContact`) updated only the in-memory `_caspitMatchMap` and was lost on reload → the app "forgot". | evidence: v205 lines 695/1745, HTML 6644-6664
- The v941 safeguard that MATTERS: persist on explicit pick only. `_autoMatchCaspitClient` (fuzzy, score ≥60) still calls the non-persisting `_updateQuoteContactInfo`; without that split, opening a quote form would silently cement whatever the matcher guessed. Verified with a stubbed fetch: auto-match wrote 0 calls, explicit pick wrote exactly 1 with the right URL params. | evidence: live stub test, autoMatchWroteNothing:true
- `updateClientCaspitId` rejects an empty caspitId ({error:'Missing params'}) → CLEARING a pairing can't be persisted (stays in-memory); overwriting with another contact works. A client absent from the Clients sheet → {error:'Client not found'}, surfaced as an orange toast, not a silent no-op. | evidence: server-rejection + network-failure stub tests both toasted
- **`getGrossProfitSummary` is a PIPELINE view, not a period report** — it filters to invoice status `להוציא חש` and had NO date dimension pre-v206. So a day/week/month selector genuinely required an AS change; there was no client-only version. The sheets already carry תאריך סיום + תאריך התחלה, so no new columns. | evidence: v205 handler, findColumns has dateStart/dateEnd
- Dateless rows are a real hazard: **₪904 across 4 to-invoice jobs have no completion OR start date**. A naive period filter would silently drop them from the total. v206 sums them into `undated`/`undatedJobs` and the app shows them in orange. | evidence: live probe period=month → total 4800, undated 904, undatedJobs 4
- `getGrossProfitSummary` period totals verified against the real sheet: all ₪6,204 · month ₪4,800 · day/week ₪1,800 · garbage period → normalized to `all`, total matches. | evidence: 4 live curl probes + driving the deployed UI (חודשי → ₪4,800 + undated note)
- **The GitHub new-file editor FREEZES on a single ~254KB paste** (CodeMirror renders it synchronously; the renderer went unresponsive >60s, CDP eval timed out). This is why the `apps-script-v206.js` mirror is NOT committed. The v205 mirror went in fine at 251KB, so the threshold is near there. Paste large files in chunks, or dispatch via CodeMirror `view.dispatch` instead of ⌘V. | evidence: two Runtime.evaluate 45s timeouts, screenshot injection timeouts
- Commit-message field is interceptable by the password-manager autofill (it polluted the HANDOFF commit `42e0353` with a generated-password prefix). Reliable method, used all of v940–v943: set the field via the native value-setter + input/change events, VERIFY `input.value` exactly, then click Commit. | evidence: all four commit messages landed clean

PREFERENCE:
- 19/07/26 | Yaniv approves each deploy via the one-approval gate, and wants the spec + a recommendation BEFORE building when a request touches a new side effect (writing to the Clients sheet, an AS deploy). Approved "marker only" / "localStorage only" / "keep to-invoice + add periods" when offered the trade-off. | seen this session
- 19/07/26 | "Ask to verify before executing" = give the spec and the AskUserQuestion, do NOT build until answered. Honored for v941, v942, v943.

OPEN:
- ⚠ AS `apps-script-v206.js` mirror not in repo (editor froze on the 254KB paste) — retry in chunks or accept v205 as baseline. v206 is live & digest-recorded.
- ⚠ Prune GAS versions: 195/200, ~5 deploys of headroom.
- 🟢 v942 briefing has no server fallback: `getSurveyData` omits jobId. If a briefing must show on another device, add `jobId: row[1]` to that handler (1 line, +1 AS version).
- 🟢 v941: one real end-to-end pick (GOLMAT + גולמט בע"מ) still to be done by Yaniv — the write path was proven with a stubbed fetch only, to avoid touching the real Clients sheet unwatched.
- 📱 iOS execCommand fallback for 📋 העתק still unverified on a real iPhone.
- Carried: v205 billed-stamp acceptance test on a scratch job; repairExpenseRollups dry-run→apply; 5-step ✕-delete test; cancel test quotes 900182/83/85/86 (+87); `pairs.json` provenance.

RETIRED:
- "The gross-profit drawer is a period/date report" — FALSE; it was a pure pipeline (status `להוציא חש`) sum with no date until v206 added the optional window. Killed 19/07/26.
- "The Client↔Caspit pairing isn't stored anywhere / needs a new sheet column" — FALSE; Clients col I + `updateClientCaspitId` predate this session. v941 only wired the picker to write them. Killed 19/07/26.

---

## 2026-07-18 — v934–v939 + AS v205: survey-first quotes, note clipboard, billed-expense marking
SHIPPED:
- HTML v934 — the journal "💰 הצעה" button now opens the Pre-Quotation Briefing FIRST (the same gate Edit/New Quotation goes through), with line 1 seeded from the note text. v933 called `switchCaspitTab('quote')` and skipped the survey entirely.
- HTML v935 (commit `1f73072`) — FIX: the briefing's "↩️ שוחזר טופס שלא נשמר" restore silently dropped every typed quote line. `_savePreSurveySnapshot` keys id-less fields positionally (`el.id || '_idx'+i` → snapshot held `_idx1`, `_idx2`), but the restore looked fields up with `getElementById` ONLY, so the class-only `.qs-line` inputs never came back and the form reopened blank. Restore now walks `body.querySelectorAll('input, select, textarea')` in the same order save did.
- HTML v936 (commit `bc53e5c`) — "📋 העתק" on every journal note copies the FULL note text (the card clamps to 3 lines). Clipboard API primary, hidden readonly-textarea + `execCommand` fallback for iOS.
- AS v205 → deployment **Version 335** (repo mirror `apps-script-v205.js`) — `getExpenses` returns `invoicedDoc` (Expenses col J); `createExpenseRow` collects the un-stamped rows it summed and stamps them `yyyy-MM-dd` via the new `_stampExpensesBilled`, at BOTH success paths (rollup created / rollup updated in place). The summing loop itself is unchanged — the rollup stays the full job total.
- HTML v937 (commit `e5d6763`) — daily expense list greys out + ✓ already-billed rows, billed date in the tooltip, still deletable.
- HTML v938 (commit `6c56ac0`) — same marker in the Monthly Expenses report. No AS work needed: that report already fetched `getExpenses&allForClient=1`, the exact action v205 extended, and was discarding the field.
- HTML v939 (commit `dd8bfa1`) — monthly report total bar gained a `טרם חויב` subtotal (orange when > 0, green at 0). The client-facing copied report text is unchanged in v938 and v939 by design.

FACT (all 18/07/26):
- **The double-billing bug the pasted v935-expense SPEC existed to fix was ALREADY FIXED in v204** — the SPEC was source-verified against v202. `createExpenseRow` (live line ~3549) delegates to `_syncExpenseRollup` whenever a rollup line exists, and that helper SETS the client-sheet line's price to the job's full expense total (line ~3646) instead of appending. Re-invoicing overwrites to the correct figure; it does not stack. | evidence: live v204 lines 3549 / 3623 / 3646
- Therefore **col J is an informational "billed-on" stamp, NOT the guard.** Implementing the SPEC verbatim would have REGRESSED v204 either way: skip only inside `createExpenseRow` and execution still reaches 3549 and hands off to a helper that sums all rows (the skip changes nothing written, and the returned `total` becomes a lie); teach `_syncExpenseRollup` to skip stamped rows and any later add/delete recomputes the rollup from unbilled rows only, erasing already-billed money from the client sheet. | evidence: `_syncExpenseRollup` sums with no col-J filter, then setValue(total)
- The SPEC's acceptance test step 4 ("rollup adds ₪70 only, not ₪220") encodes the pre-v204 append model and would FAIL on correct behaviour. Correct expectation: the line BECOMES ₪220, and the sheet holds ONE rollup line, not two summing ₪370.
- Expenses columns per LIVE `getExpenses`: A=jobId B=client C=date D=category E=desc F=amount G=createdAt **H=link** I=(unread) — the SPEC's "H unused / I receipt" was wrong. Col J (index 9) was untouched anywhere in v204, so it was safe to claim. | evidence: push object, v204 lines 370–380
- `navigator.clipboard.writeText` requires a **focused document**, not merely a user gesture. In automation an unfocused tab makes the Clipboard API reject AND `execCommand('copy')` return false — a convincing false "the feature is broken" signal. Click the page body first, then the button. | evidence: `fallback:false` while unfocused → `clipboardAPI` success after a body click; readText separately hung the renderer on a permission prompt
- Anchored string pairs MUST assert `count == 1` against the live base: `var total = filtered.reduce(...)` occurs twice — the monthly report's `_afterFetch` AND `_showInvoiceExpenseStep`. The assert aborted the build instead of silently editing a screen nobody asked about; disambiguated by including the following comment line. | evidence: v939 build failed with "count 2", then passed
- Clipboard is a clean way to move a whole file between two browser contexts without transferring bytes through the agent: `navigator.clipboard.writeText(model.getValue())` in the GAS tab → Cmd+V into the GitHub editor moved 251,851 chars exactly. | evidence: apps-script-v205.js pasted at exactly 251,851 chars
- A JS-vs-Python length gap on the same file is a UNIT mismatch, not corruption: JS `String.length` counts UTF-16 units, Python `len()` counts code points, and Code.gs has 2 non-BMP emoji. Settle it with a digest of both sides rstripped. | evidence: 251,851 vs 251,850 but identical SHA-256 `74 24 42 64 190 225`
- GAS project is at **194/200 versions** — warning shown in Manage deployments. | evidence: dialog text, 18/07/26

PREFERENCE:
- 18/07/26 | When a handed-down SPEC's premise has expired against live code, Yaniv wants the contradiction surfaced with a recommendation — not the spec executed as written. He chose "marker only" over the full spec once the v204 conflict was shown. | seen this session
- 18/07/26 | One "commit" = one approval, per deploy, unchanged.

OPEN:
- ⚠️ YANIV-ONLY: acceptance test of the v205 billed-stamp on a SCRATCH job/client — with the corrected step-4 expectation above.
- ⚠️ Prune GAS versions: 194/200, ~6 deploys of headroom.
- 📱 The iOS `execCommand` fallback for 📋 העתק is reasoned but UNVERIFIED on a real iPhone — Chrome always took the Clipboard API path. One tap confirms or kills it.
- Nothing will show ✓ until a job is invoiced under v205 — every existing row has an empty col J. Expected, not a bug.
- Carried: repairExpenseRollups dry-run → apply; 5-step ✕-delete acceptance test; cancel test quotes 900182/83/85/86 (+87); `pairs.json` provenance.

RETIRED:
- "Re-invoicing a job double-bills every earlier expense" — FALSE since v204 (set-to-total). Killed 18/07/26.
- "Repo `apps-script-v204.js` mirror ≠ live; reconcile it" — DONE. `apps-script-v205.js` is a byte-faithful pull of live source; SHA-256 of both sides rstripped = `74 24 42 64 190 225`.
- "The Monthly Expenses report can't show billing status without backend work" — FALSE; it already had the field in its payload.

---

## 2026-07-17 — v933: note→quote shipped (v930 rebased onto v932)
SHIPPED:
- HTML v933 DEPLOYED and VERIFIED LIVE (commit `18fee86a`). "💰 הצעה" button on every journal note on the main page (all 10 — top-5 and the 6–10 accordion). Opens a NEW Caspit quotation with line 1's description prefilled from the note text; reuses the existing `_quotePrefill` mechanism (same shape `_skipToQuotation` uses), so no new Caspit surface. Closes Yaniv's "Add option to make a new quotation from a daily note".
- Also corrected stale app-info facts: Apps Script Version 333→334, Worker v29→v30 (both were wrong on screen; probe-verified).
FACT (all 17/07/26):
- `mcp__claude-in-chrome__javascript_tool` runs in the **MAIN world** on the live github.io app — page globals ARE readable/callable (`SHEETS_URL`, `showToast`, `_escNote`, `_quoteFromNote`, `_yomanItems`, `switchCaspitTab` all resolved; a fetch built on `SHEETS_URL` returned 10 notes). This FALSIFIES the v931-block claim that javascript_tool is isolated — that was a different browser tool, not this one. Injecting functions into the live app and invoking them is therefore a valid pre-deploy test. | evidence: `_quoteFromNote(5)` on live v932 opened the overlay, prefill consumed, line 1 == note #6 text
- Rebase-not-replay: v930's diff was stored as difflib LINE-INDEX opcodes against v929, which are worthless once live moves to v932 (anchors drifted 32 lines). Re-deriving the change as named string anchors with `assert count==1` per anchor survived the rebase with zero manual fixups. Prefer anchored string pairs over line indices for anything that might outlive one deploy. | evidence: all 11 anchors matched first try on the v932 base
- The GitHub `/edit/` page's CSP blocks `fetch('http://127.0.0.1:…')`, and `file_upload` refuses paths outside session-shared folders (both the project dir and the scratchpad were rejected) — so the byte-exact "serve the file locally and pull it in" trick does NOT work. Working method: send the small edit pairs as JSON and apply them in-page, gating the dispatch on a digest match. | evidence: TypeError: Failed to fetch; two file_upload rejections
- Deriving difflib opcodes with context-widening to force uniqueness produces pairs that DON'T round-trip (adjacent edits overlap and clobber each other's anchors). Emit the pairs from the same explicit anchors the build uses, and assert they reproduce the build before shipping them. | evidence: "pairs reproduce v933 locally: False" → fixed by emitting from build's own sub1() calls
PREFERENCE:
- 17/07/26 | Yaniv approved the deploy via the one-approval gate (HANDOFF "Claude deploys, one approval each") — the gate still applies per-deploy even mid-flow. | seen this session
OPEN (unchanged, still Yaniv-only — real billing data):
- ⚠️ ACCEPTANCE TEST (5-step ✕-delete) NOT RUN — needs a scratch job/client.
- ⚠️ repairExpenseRollups(true) dry-run → review Logger → repairExpenseRollups(false) NOT RUN.
- Repo `pairs.json` in the repo root is from another session's tooling — confirm intentional or delete.
RETIRED:
- "javascript_tool on the live github.io app runs in an ISOLATED world; page globals read undefined" — FALSE for claude-in-chrome's javascript_tool. Killed 17/07/26, see tombstones.
- "An undeployed v930 note→quote build needs rebasing before it can ship" — DONE; v930 is now v933 and live. claude-builds/v930 is historical.

---

## 2026-07-17 — v932 HOTFIX: blank-app outage fixed (Cowork)
SHIPPED:
- HTML v932 DEPLOYED and VERIFIED LIVE (app renders: header v932, Today's Projects, Start Work Session). Restores the app after a blank-screen outage.
FACT (all 17/07/26):
- ROOT CAUSE of "index doesn't load" (blank app, scriptCount:0): a **literal `<title>` written inside body text** (the changelog) makes the browser HTML parser treat the rest of the document — including the `<script>` — as inert text. v931 introduced `הוצאות <title>` / `SRC:<jobId>` in the changelog; my first v932 attempt then reintroduced `<title>` in the *fix-description text itself*. Fixed by removing every literal `<`tag`>` from body/changelog text. | evidence: live probe titleTags 2→1, scriptCount 0→1, screenshot renders
- `grep -c "<title>"` counts LINES not occurrences — misled the first check. Verify body tags with `awk 'NR>12' | grep -c "<title>"` (must be 0). | evidence: line 538 slipped past a line-count grep
- GitHub web-upload commit **silently no-ops if neither commit-choice radio is selected** — the "Commit directly to main" radio must be explicitly clicked before the green button fires. Two commits appeared to "not land" for this reason. | evidence: commit a7303b4 was the only one on main until the radio was clicked
LESSON: after any HTML deploy, VERIFY LIVE (scriptCount>0 + screenshot), never assume the commit/parse succeeded.
OPEN (carried from v931 block, still pending Yaniv):
- ⚠️ ACCEPTANCE TEST (5-step ✕-delete) NOT RUN — needs a scratch job/client, not real billing data.
- ⚠️ repairExpenseRollups(true) dry-run → review Logger → repairExpenseRollups(false) NOT RUN.

---

## 2026-07-17 — v931 / AS v204: expense-delete + rollup integrity (Cowork)
SHIPPED:
- AS v204 DEPLOYED (deployment Version 334, same /exec AKfycbxqbXKwg-…). `_syncExpenseRollup(ss,jobId,client,title)` top-level = single source of truth for the client-sheet `הוצאות <title>` rollup line. deleteExpense now calls it (FIXES the billing bug: deletes never synced the rollup → clients may have been billed for deleted expenses). createExpenseRow now idempotent (was: appended a DUPLICATE rollup line every run). Rollup rows carry `SRC:<jobId>` back-ref in notes col. Price-only updates (preserve profit formulas). New `repairExpenseRollups(dryRun)` — dry-run by default.
- HTML v931 DEPLOYED (built on live v929, byte-verified base). ✕ delete button in Monthly Expenses report with two-tap arm (✕→red מחק?→confirm), mandatory `_loadMonthlyExpenses()` re-fetch after delete (deleteRow shifts rows). No console errors; ✕ + handler confirmed in live source.
FACT (all 17/07/26):
- Live AS v203 in the editor was NOT byte-identical to the repo/claude-builds v203 base — another session had edited live (the archived "PO v4: capture quantity + unit price + line total" work near addPONewRow, ~+247 chars, uncommitted). PRESERVED it by applying my 6 edits IN-PLACE to live (fetched pairs.json from repo → decode → replace → setValue), not by overwriting with my base+edits. Mechanism proven: same pairs applied to fetched base reproduce committed v204 byte-for-byte. | evidence: SHA compares + 0 monaco error markers
- createExpenseRow (v203) appended the rollup line UNCONDITIONALLY (no locate-existing rule, rollup id is a throwaway EX####, not the source jobId). So the spec's `_syncExpenseRollup` "use createExpenseRow's locate rule" was impossible as written — redesigned with a SRC back-ref. | evidence: read createExpenseRow in full
- Spec was authored in the v923/v924 era; live had advanced to v929 (+ an undeployed v930 build). Version numbers in specs go stale fast across parallel sessions — always derive live. | evidence: browser title v929, claude-builds/v930 exists
- javascript_tool on the live github.io app runs in an ISOLATED world (page globals like SHEETS_URL read undefined) — do NOT use `typeof <global>` to verify deploys; grep the fetched source instead. | evidence: SHEETS_URL/showToast both undefined on a working app
PREFERENCE:
- 17/07/26 | "go. with it" = proceed with my stated recommendation (design A + separate handling of the pending build), not a blank check. | seen this session
OPEN:
- ⚠️ ACCEPTANCE TEST NOT RUN — the 5-step test mutates real client billing sheets; needs Yaniv to designate a scratch job/client (or run it himself). Code is deployed & audited but not yet functionally exercised on live data.
- ⚠️ repairExpenseRollups(false) NOT RUN — legacy client sheets likely hold duplicate/stale `הוצאות` lines (from the old unconditional-append bug) + delete-drift. Run `repairExpenseRollups(true)` first (dry-run, reads Logger), review, then `repairExpenseRollups(false)`.
- Repo apps-script-v204.js mirror = base+edits; DEPLOYED = base+edits+PO-v4 (the preserved 247-char change). Reconcile the mirror next session by pulling live and re-committing. Repo apps-script-v203.js is also the pre-PO-v4 base.
- Pending undeployed v930 build in claude-builds = "💰 הצעה" note→quote feature, built on v929. Since live is now v931, v930 must be REBASED onto v931 before it can deploy without reverting the expense-delete work.
RETIRED:
- "createExpenseRow appends one rollup line and has an append-vs-skip locate rule" — FALSE; it appends unconditionally (no locate). Killed 17/07/26.

---

## 2026-07-13 — Trust-boundary + memory wiring (Cowork session)
SHIPPED:
- Created this SESSION-LOG.md (bootstrap pointer was dangling).
- Added root CLAUDE.md so Claude Code auto-load fires the existing 3-read bootstrap.
- Added memory/tombstones.md consolidating known falsified facts.
- APPLIED the calibrated .claude/settings.local.json (backup: settings.local.json.bak-2026-07-13). Dropped standing grants: `gh api *`, `python3 -`, `python3 -c ' *`, `cd /tmp *`, `javascript_tool`; collapsed 8 duplicate curls into one scoped pattern.
FACT:
- 2026-07-13 | The Claude Code allowlist had grown by habit: 8 near-duplicate scanPOEmails curls + one-off cp/mkdir, plus wildcards `gh api *`, `python3 -`, `python3 -c ' *`, and `javascript_tool` | evidence: read .claude/settings.local.json | conf:0.95
- 2026-07-13 | HANDOFF.md migration from Drive is DONE (exists, dated 12/07, "promoted from MASTER HANDOFF v2") — the old session's last open thread is closed | evidence: read HANDOFF.md | conf:0.95
PREFERENCE:
- 2026-07-13 | Runs recurring harness meta-audits (Bitter Lesson -> Identity -> Memory -> Trust boundary); wants rigor + a durable artifact each time | seen:>=4 (folder docs) | conf:0.85
SHIPPED (cont.):
- Disconnected "Control your Mac" (osascript) and "Desktop Commander" via Settings -> Connectors [13/07/26].
OPEN:
- Cloudflare: still connected; treat `*_delete` verbs as ask-each-time (not yet scoped).
- Optional: authorize read-only connectors (github/notion/etc.) to cut re-derivation.
RETIRED:
- (none this session)
```
```

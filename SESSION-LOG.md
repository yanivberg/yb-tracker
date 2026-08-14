# YB TRACKER — SESSION-LOG

Append-only journal. Newest at top. Bootstrap reads the last ~3 blocks (per HANDOFF.md).
Every block: what shipped, dated facts (with evidence), observed preferences, open threads, retired facts.
This file was referenced by the bootstrap but did not exist until 13/07/2026 — created to close the broken pointer.

---

## 2026-08-14 (late) — assistant tuned, then hidden; Gemini free-tier ceiling found (Cowork)
SHIPPED:
- **AS v230** (deployment Version 360) + **HTML v998** — day/week/month totals computed in code; text dates parsed; brevity rules; auto-retry on the busy-server HTML page.
- **HTML v999** — 🤖 button hidden at Yaniv's request (`display:none` on `#ybAiFab`). The assistant, its panel and `aiAsk` are untouched and still work; un-hiding is deleting that one declaration. No AS deploy, so no version slot spent.
FACT (all 14/08/26):
- ⚠ **The real ceiling is Google's free tier: 20 requests/day on gemini-2.5-flash** (`generate_content_free_tier_requests, limit: 20`). Every question is one request, and the five older AI actions share the same quota — they just never hit it. Nothing in the app can work around this; it needs billing enabled on the Gemini API key. At ~110k tokens a question that is roughly $0.03 per question. | evidence: live quota error after ~20 questions
- **Weekly totals verified exact after v230:** "כמה הרווחתי השבוע" → **33,913** for the week starting 09/08, matching a hand sum of 15 jobs across GOLMAT+BILLINSKY+ROLLMAT, delta 0. The pre-v230 answer was 3,600. | evidence: two independent computations
- **Text dates were the hidden cause.** The sheets store dates both as real Date cells and as text ('11.8.2026', '10.8.26', RTL-marked '12/8/26'). v229 bucketed only real Dates, so every period total silently undercounted. `ybPDate` now parses both, and an 'undated' line surfaces what still has no usable date. | evidence: v229 reported July 10,650 / Aug 2,945 — too low
- ⚠ **OPEN BUG (live, but currently unreachable since the button is hidden): rule 9 over-applies.** Its escape hatch — "if a total is not in EXACT TOTALS say אין לי את הנתון הזה" — is worded for numbers but the model applies it to PLANNING questions, which need no totals. "תן לי תוכנית עבודה לשבוע הבא" → bare refusal, and "איזה נתון חסר לך?" → the same refusal again, a loop. Fix drafted, NOT deployed: scope the hatch to numeric figures only, state that planning / prioritising / suggesting are always allowed, and forbid a bare refusal without naming what is missing. | evidence: three consecutive refusals in live use
- **Why weekly planning is weak — it is a data problem, not a model problem.** Across the 6 main clients (1,274 rows) only **23 jobs are open** (10 ממתין לביצוע · 4 בתהליך ביצוע · 3 ניתנה הצעה · 6 ממתין להצעה), while **866 rows carry no status at all** — that noise is what the assistant was ranking, which is why it proposed "Testing" and ₪0 jobs. Of the 23 open: 83% have an hours estimate, 87% a price, 61% a PO, but **only 22% have any date**. There is no due date, no promise date, no priority, and `getClientJobs` does not return the location column, so no site grouping — the biggest lever for a one-man field business. | evidence: live probe over all 6 client sheets
- **Recommendation on record (deferred by Yaniv):** build the weekly plan **in code** — rank the 23 open jobs by committed-first (has PO), then ₪ per estimated hour, then age; fit to declared daily hours; show what does not fit. Deterministic, instant, and costs zero Gemini requests. The model should discuss the plan, not generate it. Same lesson as EXACT TOTALS.
PREFERENCE:
- 14/08/26 | "to complicated - make it shorter" — wants the answer, not the working. Applies to the assistant's output AND to Claude's replies.
- 14/08/26 | "it must be accurate!" — correctness outranks latency, cost and version-slot economy.
OPEN:
- **v231 rule-9 fix drafted, not deployed.** Do this before un-hiding the button.
- **GAS versions 192/200** after four deploys today (357–360). ~8 left. Irreversible pruning, Yaniv-only.
- Gemini billing decision — Yaniv's, involves his card; Claude must not touch payment details.
- Weekly planner screen — specced verbally, deferred.
- HTML info panel prints "Version 357"; live is 360. Cosmetic.
RETIRED:
- "The assistant's weak planning is a prompt-quality problem" — FALSE. 866 status-less rows and 22% date coverage; the data has no schedule dimension to plan against. Killed 14/08/26.

---

## 2026-08-14 — In-app AI assistant shipped (HTML v996/v997 · AS v227→v229) (Cowork)
SHIPPED:
- **HTML v996** — floating 🤖 on every screen → Hebrew RTL chat panel (history, 🔄 refresh, clear, data-age line). History in localStorage, replayed to a stateless backend, capped 6 turns / 1800 chars so the GET query string stays sane. **v997** — moved the button up (`bottom: 84px`); v996 put it directly on top of "Start Work Session".
- **AS v227** (deployment Version 357) — new `aiAsk` action in doGet + `ybFullDump()` + chunked cache helpers. **READ-ONLY BY CONSTRUCTION**: the action contains no write path at all, so no prompt can talk it into touching a sheet, Caspit or Gmail.
- **AS v228** (Version 358) — prompt rule 9 after v227 mislabelled a figure (see FACT).
- **AS v229** (Version 359) — **EXACT TOTALS computed in code**; the model is now forbidden from summing rows at all.
- Mirrors committed for all three: `apps-script-v227.js`, `-v228.js`, `-v229.js`. Header discipline resumed (was stuck at v224 through v225/v226).
FACT (all 14/08/26):
- **The whole business fits in one prompt.** 1,705 job rows across 7 client sheets compact to ~110k chars ≈ 6% of Gemini 2.5 Flash's 1M window. No retrieval, no chunked search, no vector store — every question carries everything. | evidence: measured live before designing (GOLMAT 266 · ROLLMAT 320 · BILLINSKY 325 · MODUL PLADA 334 · PAL-YAM 15 · SONIC BEAT 14 · OCCASIONAL 431)
- ⚠ **THE BIG ONE — a model cannot sum hundreds of rows.** v228 told it to compute totals from the raw rows. Asked for GOLMAT's gross profit it answered income 401,199 / costs 3,377 / gross 397,822. Truth: **564,285 / 36,518 / 527,767**. Off by 130k, stated confidently, with a correct-sounding derivation. Prompt wording cannot fix this — only precomputed aggregates can. | evidence: hand-summed the same rows via getClientJobs
- **v229 fix, verified exact:** `ybFullDump` now accumulates per-client, per-category, per-month, whole-business and pipeline totals IN CODE during the pass it already makes, and rule 9 says never add rows up — if a total is not in EXACT TOTALS, answer אין לי את הנתון הזה. Post-deploy: GOLMAT **527,767 / 564,285 / 36,518** and whole business **710,940** — both **delta 0** against an independent hand computation. | evidence: two live probes cross-checked against summed getClientJobs rows
- **ybAIContext declares itself "authoritative" and is not.** It skips every job with `hoursActual < YB_MIN_HOURS` (0.25) and reports trueMargin = gross MINUS job expenses. That is why v227 said GOLMAT 393,822 — a real number under the wrong label (רווח גולמי). Rules 9–10 now demote it to per-hour/target use only, with a mandatory caveat clause. | evidence: read ybAIContext L4426-4435
- **Latency:** cold call (dump rebuild) 26–29s; warm 6.8–10s. Apps Script serialises per user, so a second request while one is in flight returns an **HTML error page, not JSON** — the same trap as v986. The panel disables send while busy, which covers the single-user case.
- Verified correct on: job count **1705** (exact), row lookup **G0393 = ₪2,000** + description (exact), per-client and whole-business totals (exact), monthly totals (July 10,650 / Aug 2,945).
- **GAS deploy dialog does not always paint** — it is present in the DOM (`[role=dialog]`, correct Deployment ID) while the screenshot shows only the editor, so coordinate clicks land on the page beneath and silently do nothing. Drive it from the DOM: click the ✏️ Edit button first (the form is disabled in view mode — that is why fields look stuck), then `combo.click()` → the `New version` `[role=option]`, set the description with the native value setter + `input`/`change` events, and **assert the combobox reads "New version" before clicking Deploy** — one attempt had silently selected Version 356, which would have rolled the endpoint back. | evidence: three failed coordinate passes, then a clean DOM-driven deploy
PREFERENCE:
- 14/08/26 | "it must be accurate!" — correctness of figures outranks latency, cost and version-slot economy. Spend the slot. | seen this session
OPEN:
- **GAS versions now 191/200** after three deploys today. ~9 left. Pruning is irreversible and Yaniv-only.
- Assistant is v1: read-only, no actions, no proactive alerts. Next candidates if wanted: per-period totals beyond month, tag/category deep dives, "what changed since last week".
- Cost: every question ships ~110k chars to Gemini. Fine at Flash pricing, worth watching if usage grows.
- HTML info panel now claims "Version 357"; live is 359. Cosmetic, fix on the next HTML bump.
RETIRED:
- "Prompt rules can make the model's arithmetic reliable" — FALSE, demonstrated at 130k error. Killed 14/08/26.

---

## 2026-08-14 — GAS project fully mirrored to the repo (Cowork)
SHIPPED:
- **All five GAS project files committed to the repo**, each SHA-256-verified against the live editor after the commit landed: `apps-script-v226b.js` (= live Code.gs, 320,112 bytes, sha16 `693aa30d7d14c152`), `general-expenses.gs` (17,251, `8bccf826c95507c6`), `gmail-po-import.gs` (16,145, `acc6138f670be61d`), `AuthHelper.gs` (194, `3f13618f31ba3b8a`), `appsscript.json` (694, `5ce4191bda361533`). All four JS files acorn-clean (ecmaVersion 2020); appsscript.json parses. Action count 106, matching the live editor.
- HANDOFF.md rewritten from live state (was dated 19/07/26 and claimed HTML v943 / AS v206 — two of three numbers wrong).
- This SESSION-LOG block, closing a 24-day gap.
- **`repairExpenseRollups(true)` dry run RUN by Yaniv (15:42) — result: nothing to repair.** Item closed after ~1 month open; `repairExpenseRollups(false)` deliberately NOT run.
FACT (all 14/08/26):
- Live derived at bootstrap: **HTML v995** (title probe + repo commit c950a1a, deployed 13/08 23:44) · **AS deployment Version 356** (13/08 23:05) · **Worker v30** (`?action=health` → `worker-proxy-30`, activeBase app1.caspit.biz). | evidence: title grep, worker health JSON, Manage deployments DOM
- Project identity confirmed: Deployment ID `AKfycbxqbXKwg-EkbwKxtmulN_u_…` read from the DOM — correct project, not the decoy. | evidence: DOM string compare, matchesExpected true
- **Version cap is 188/200**, not at the limit as feared — ~12 deploys of headroom. | evidence: literal warning text in Manage deployments
- **The GAS project has FIVE files, not one.** Every mirror before today tracked only Code.gs; `general-expenses.gs`, `gmail-po-import.gs` and `AuthHelper.gs` had never existed anywhere but inside the editor. | evidence: monaco.editor.getModels() + file tree DOM
- **Code.gs's header still reads `v224`** though v226 shipped (`/* v226: general-expenses.gs owns a few actions of its own` at line 158). The §3 changelog-first version discipline is applied to the HTML but not the backend. Trust the deployment Version number, not the backend header. | evidence: line 1 + line 158 of the live model
- **Large-file transfer out of the GAS editor, proven on 313,422 chars:** clipboard `writeText` in the (focused) GAS tab → on the GitHub `/upload/main` tab append a `<textarea>`, focus, send a real `cmd+v` keystroke → read `.value` → `File` objects → `DataTransfer` → `input[type=file].files` → dispatch `change`. Byte-identical, and it never enters Claude's context. | evidence: SHA-256 equal at both ends
- `navigator.clipboard.readText()` on the GitHub tab **hangs the CDP call for 45s** (permission prompt) — the keystroke paste needs no permission and is the correct route. | evidence: Runtime.evaluate timeout, then success via keystroke
- `clipboard.writeText` throws `NotAllowedError: Document is not focused` unless that tab is the ACTIVE tab. Click the page first. | evidence: failed while a second tab was foreground, succeeded after
- After `input.files = dt.files` + `change`, reading `input.files` back returns `[]` — GitHub's uploader consumes and clears it. **Empty is success**; verify by screenshot of the staged file list, not by the return value. | evidence: 5 files listed in the UI while the read-back was empty
- **Commit-silently-no-ops, second form:** once files stage, GitHub inserts a "ProTip!" line that shifts the Commit button ~14px down; the first click hit dead space. (The known first form is the unselected commit-choice radio.) | evidence: post-click screenshot showed the form still open, second click at the new coordinate navigated to /blob/
- **Page-triggered blob downloads to ~/Downloads silently never landed** — 6 attempts (bundle + 5 individual), no file, no error, directory listing confirms nothing written today. Unexplained; do not rely on page downloads for this workflow. | evidence: device_bash find -newermt on the mounted Downloads folder
- **`file_upload` DOES accept container paths under `/mnt/user-data/outputs/`** — it rejects device paths (`/Users/…`, even in a connected folder) with "only files this session is allowed to read". Write the file in the session workspace, copy it to outputs, upload from there. This is far simpler than the clipboard hop for anything Claude authored itself; the clipboard hop is only needed for bytes that live in the GAS editor. | evidence: /Users path rejected, /mnt/user-data/outputs path accepted, same input, same session
- **`raw.githubusercontent.com` serves a stale cached copy for minutes after a commit** — it reported SESSION-LOG.md unchanged (old hash, 5 blocks) while the commit had in fact landed. Cache-busting query params did NOT defeat it. Verify a fresh commit with `git fetch` + `git show origin/main:<file>`, not raw. | evidence: raw said 12,847 bytes / 5 blocks; git showed 17,783 bytes / 6 blocks, hash matching the local build
- **GitHub's editor internals moved:** `.cm-content` no longer carries `cmView` (only a `cmTile` key), so the HANDOFF-documented `el.cmView.view → view.dispatch` injection path is dead as written. The upload page + `DataTransfer` route is unaffected. | evidence: probed both on /edit/main/SESSION-LOG.md
- **`repairExpenseRollups` dry run: 0 duplicates, 0 price corrections, 0 deletions — 7 UNRESOLVED lines only.** The duplicate/stale rollup damage from the pre-v204 unconditional-append bug **does not exist** on the live sheets. Do not run the apply path; there is nothing for it to write. | evidence: Execution log 14/08 15:42:12, full output
- The 7 unresolved rollup lines are legacy pre-SRC rows, **all `יצאה חש` + `בוצע`** (invoiced and closed): GOLMAT G0375 ₪145, G0394 ₪134; ROLLMAT R0361 ₪1550, R0367 ₪1025, R0375 ₪112, R0376 ₪52, R0378 ₪100. ⚠ "UNRESOLVED" means the function never compared them — they are **unverified, not verified-correct**. Left alone deliberately: backfilling SRC onto issued tax documents buys nothing. | evidence: getClientJobs GOLMAT (266 rows) + ROLLMAT (320 rows), filtered to desc starting 'הוצאות'
- The 3 SRC-tagged rollup lines (G0395→G0393, G0397→G0396, R0379→R0369) came back clean — their prices already equal the Expenses totals. | evidence: no price lines in the dry-run output
- ⚠ **LATENT BUG in `repairExpenseRollups`'s apply path** (never fired, because this run has 0 deletions): it deletes with `sh.deleteRow(r2+1)` using indices from the `dat` snapshot taken at line 3942, with no offset counter. After the first delete every row below shifts up by one, so the next delete and every subsequent price write land on the WRONG row — on client billing sheets. Same row-shift trap as v931. If this function is ever needed, fix it first (iterate bottom-up, or collect and delete in reverse). It also rewrites prices without checking invoice status. | evidence: read lines 3929-3973 of the live source
- Container proxy **403s `script.google.com`** — read-only /exec probes have to run from the browser (fetch inside the live github.io app page works; the app's own origin is fine). | evidence: curl CONNECT tunnel failed 403, in-page fetch returned 266/320 rows
PREFERENCE:
- 14/08/26 | "what u suggest?" / "what todo?" = wants a ranked recommendation with the reason and the trade-off stated, then a single yes/no — not a menu of equal options. | seen twice this session
OPEN:
- ⚠ **GAS version pruning (188/200)** — irreversible, Yaniv-only.
- ⚠ **Code.gs header bump** — backend not following changelog-first discipline.
- ⚠ **Worker has no repo mirror** — now the only unmirrored component.
- Carried, still unrun: 5-step ✕-delete acceptance test on a SCRATCH job · v205 billed-stamp acceptance test · iOS execCommand clipboard fallback · cancel test quotes 900182/83/85/86/87. (`repairExpenseRollups` — CLOSED today, see FACT above.)
- SESSION-LOG has **no blocks for v952 → v995** (~43 HTML versions, 21/07–13/08). This block does not reconstruct them; the changelog in index.html is the only record of that period.
RETIRED:
- "The GAS project is one file (Code.gs) plus config" — FALSE, it is five. Killed 14/08/26.
- "Repo mirror `apps-script-v212.js` is the latest backend source of truth" — superseded by `apps-script-v226b.js`. Killed 14/08/26.
- "Legacy client sheets likely hold duplicate/stale הוצאות rollup lines from the old unconditional-append bug" — FALSE on the live data: the dry run found none. Carried unexamined since 17/07/26. Killed 14/08/26.

---

## 2026-07-21 — AS v208: getExpenses returns `invoiced` (doGet)
SHIPPED:
- **AS v208 DEPLOYED — deployment Version 338, same /exec `AKfycbxqbXKwg-…` (Deployment ID unchanged, "Deployment successfully updated").** `getExpenses` (doGet, `allForClient` branch, reads the global `Expenses` sheet) now returns `invoiced: true/false` per expense. `true` iff the job's `הוצאות …` rollup row on the **client** sheet shows **`יצאה חש`** in the `invoice` column; matched primary by `SRC:<jobId>` in the `notes` column, fallback `desc == "הוצאות "+jobTitle`. The whole addition (a per-request map built from the client sheet + a per-row IIFE) is **wrapped in try/catch and defaults to `false`** — cannot break existing responses. Live PWA (v952) already reads the field and falls back when absent → fully backward-compatible. Only `getExpenses` touched.
- Header bumped v207→v208 (changelog line added; v207 history preserved). Code.gs saved to Drive before deploy.

FACT (all 21/07/26):
- Live derived at start: PWA **v952** (reads `invoiced`, 10 refs), AS **v207**, action count **102**. Post-edit action count **102** (guardrail: unchanged). Syntax gate: V8 `new Function(src)` compiled OK (acorn-in-sandbox not possible — the Cowork output filter blocks pulling .gs source out; `new Function` is the in-page equivalent). | evidence: in-editor probes + Deploy dialog "Version 338"
- `findColumns(data)` takes the **values array** (not the sheet) and returns column indices incl. `.desc .notes .invoice .jobId .headerRow`. Rollup contract confirmed from `_syncExpenseRollup`: `notes`=SRC back-ref, `desc`="הוצאות "+title, `invoice`=stamp (`להוציא חש`→`יצאה חש`). | evidence: findColumns def L3888, _syncExpenseRollup L3629-3638
- VERIFY (GET `?action=getExpenses&allForClient=1&client=GOLMAT`): **15 rows, every one has `invoiced` as a boolean (0 missing).** All 15 = `false`, and that is **provably correct** — an in-page replay of the intended match logic against the live GOLMAT sheet matched the API on all 15 rows (**0 mismatches**). GOLMAT has 3 rollup rows: `G0375` invoice=`יצאה חש` (invoiced, but **no SRC** and its job has no expenses in the set), `G0394` `להוציא חש`, `G0395` `SRC:G0393` `להוציא חש`. So the 3 `G0393` expenses correctly resolve `false` (their rollup isn't invoiced yet); the rest have no rollup → `false`. | evidence: getClientJobs GOLMAT (233 rows) cross-check
- Sample rows (jobId · desc · amount · invoiced → sheet row checked): `G0393 · קרטון גלי לכיסוי רצפה · 82 · false` → GOLMAT rollup `G0395` (`SRC:G0393`, invoice `להוציא חש`); `G0221 · פרופילי מתכת + הובלה · 1422 · false` → no rollup row for G0221; `G0372 · מסלולי וניצב 100 לגבס · 68 · false` → no rollup row for G0372.
- Note: a **`true`** case could not be demonstrated on GOLMAT (its only `יצאה חש` rollup, G0375, has no expenses). The true-path is validated by logic-equivalence, not a live true row — a genuine live `true` would need a client whose invoiced rollup carries a `SRC:` for a job that has expenses.

OPEN:
- ✅ RESOLVED 21/07/26 — repo AS mirror `apps-script-v208.js` committed, byte-identical to live Code.gs (rstripped hash 45c8f945).
- ✅ RESOLVED 21/07/26 — SESSION-LOG evidence copy pushed to yanivberg/yb-tracker (commit 611bb9c); full history preserved.
- Version count now **~185/200** after this deploy (was 184; warning still shown — prune before the cap, not now).

---

## 2026-07-21 — AS v207 verified (no code change needed)
SHIPPED:
- Nothing. **v207 was already implemented AND already deployed** (deployment Version 337, 19/07/26 23:25, desc "v207 - emailQuote optional custom subject + body"). Re-applying the spec would have been a no-op with risk, so it was not applied.
FACT (all 21/07/26):
- Identity confirmed: Deployment ID prefix `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2…` read from the DOM (NOT from a screenshot — 8-vs-9 was ambiguous in pixels). Correct project, not the decoy. | evidence: DOM string compare, matchesExpected true
- Live v207 implements the spec's feature with **different variable names**: `subjArg/bodyArg` (fn params) and `subjEQ/bodyEQ` (handler vars), vs the spec's `subject/subjectEQ`. Functionally identical, 5 args passed, `e.parameter.subject` read, retry present. | evidence: structural regex probes on the monaco model
- **`emailQuote` docNum must be the FULL branch-prefixed number (`01/900195`); a bare `900195` returns 404** ("tried=[doc900195, 900195]"). The spec's own test recipe ("a recent quote number") is misleading. `docId` alone → "Missing docNumber". Working call = docNum FULL + docId. | evidence: three POSTs, only the full-number one returned ok:true
- Custom subject/body verified end-to-end: POST with subject/body בדיקה → `{"ok":true,"mailSent":true}` and the Gmail sent copy shows subject בדיקה; prior-day sends show the default subject, so the fallback is intact. | evidence: Gmail search in:sent, thread 19f82d9d818f0bdf
- Read actions (`searchQuotes`, `debugQuotes`) live in **doGet** and return the literal "OK" if POSTed. Probe reads with GET, writes with POST. | evidence: same action POST→"OK", GET→JSON array
OPEN:
- ⚠️ GAS project at **184 / 200 versions**. ~16 deploys left. Pruning old versions is IRREVERSIBLE — Yaniv to do it in project history.
- Carried: expense-delete acceptance test + `repairExpenseRollups` dry-run→apply, both still unrun.

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

# YB TRACKER — SESSION-LOG

Append-only journal. Newest at top. Bootstrap reads the last ~3 blocks (per HANDOFF.md).
Every block: what shipped, dated facts (with evidence), observed preferences, open threads, retired facts.
This file was referenced by the bootstrap but did not exist until 13/07/2026 — created to close the broken pointer.

---

## 2026-11-14 — v1006: one end-of-project screen, planned vs actual, briefing link · v1007/v1008: quotation tags in a drawer, then on one line · v1009: tags on new job · v1010: duplicate a job (Cowork)
SHIPPED:
- **HTML v1010** (built 14/11/2026; upload to be confirmed) — Job Management: duplicate ONE job. Long-press selects as before; the selection bar shows "📄 שכפל" beside "מחק נבחרים" only when exactly one job is selected (`mjUpdateBulkBar`). `mjDuplicateSelected` → `addJob` (desc + category, status `ממתין לביצוע`, nothing else) → `setJobTags` with the original's tags → `mjRenderList(after)` (new optional callback) → `mjOpenEdit` on the new id. Yaniv's choices, asked first: copy desc+category+tags only (NOT price/qty/hours/PO/quote), status ממתין לביצוע, open the copy for editing, one job at a time.
- 2026-11-14 | v1009 committed (`8007293` index, `0415638` memory files), all byte-identical to the delivered files.
- 2026-11-14 | ⚠ Business-rule tension, flagged to Yaniv not resolved: the new-job form locks `ממתין לביצוע` until price, qty, hours and PO are filled; the duplicate creates a `ממתין לביצוע` job WITHOUT them (his choice). The editor opens immediately so they can be filled.
- 2026-11-14 | **Pre-existing AS bug, not fixed:** `addJob`'s date logic (v84) stamps the start date only for status `'במהלך ביצוע'` — a status that does not exist (the real one is `בתהליך ביצוע`). So a job ADDED directly as in-progress never gets a start date from addJob | evidence: apps-script-v234.js addJob, `status === 'במהלך ביצוע'` | conf:0.85
- **HTML v1009** (built 14/11/2026; upload to be confirmed) — Job Management → new job (`#addJobOverlay`, "Add Project to Sheet"): a REQUIRED tags field at the bottom, just above Save (Yaniv chose: same drawer as the quotation · bottom position · at least one tag). The drawer now has two targets via `_tdMode` ('quote' → `_cqTags[i]`, 'job' → `_ajTags`); `cqTagDrawerClose` always resets to 'quote'. `submitAddJob` stops before `addJob` when `_ajTags` is empty (field turns red, scrolls into view); after `addJob` replies, `_ajSaveTags(reply, client)` sends `setJobTags` — only if the reply looks like a job id (no spaces, no 'not found'/'error'/'<', ≤40 chars), else a delayed warning toast.
- 2026-11-14 | v1008 committed (`f2b6272` index + `6ae334b` HANDOFF/SESSION-LOG), all three byte-identical to the delivered files.
- 2026-11-14 | **Pre-existing, not fixed:** `submitAddJob` shows `'💾 ' + result + ' — saved to sheet'` for ANY reply, so a backend 'Sheet not found: X' is presented as a success. Found while testing v1009 (the v1009 tag warning had to be delayed 2.6 s so this toast doesn't overwrite it).
- **HTML v1008** (built 14/11/2026; upload to be confirmed) — on Yaniv's "Put all tags in the same line" (screenshot of v1007 live with an arrow from line 2's button up beside line 1's): the tags section is now ONE row of chips, one per quotation line, side by side and wrapping only when long. Chip = line number (omitted for a single line) + up to 2 tag names + `+N`, or "הוסף". 3 lines = 26 pt (v1007: ~160 pt; v1006: 78 chips). Drawer, `_cqTags` and the save path unchanged. Interpretation (one row for all lines, not one row per line) was not asked first — the arrow made it clear enough.
  - Same version, on "Reduce the internal reminders space. Minimize it": `#caspitDetails` is `rows=1` and sized by `_cqDetFit` — empty 32 pt, with text 52 pt (two lines, scrolls), while focused grows to fit (64–200 pt) and shrinks back on blur. Every place that fills it by code (briefing steps, sheet notes, restored draft, reset) calls `_cqDetFit` after setting `.value`, because setting `.value` fires no input event.
  - Same version, on "minimize also the notes that are visible to client - and put it above the internal reminders": `#caspitComments` gets the same `_cqDetFit` sizing, and the tags line moved to the TOP of `#caspitNotesArea`, so the order is tags · client notes · internal reminders (the tags line had been sitting between the internal-notes label and its box). This block is the overlay's FIXED footer (`flex-shrink:0`, outside the scroll area), so every pixel saved here is room for the quotation lines: footer with both boxes empty went from 350 pt (live v1007) to 217 pt.
- 2026-11-14 | v1007 committed as `66fcdb7` (11:10 +0200), `index.html` only, byte-identical to the tested build — the two memory files were not part of that upload.
- **HTML v1006** (commit `f8eb006`, 14/11/2026 08:53 +0200, uploaded by Yaniv; SHA-256-identical to the tested build `db8f12c4…`). No Apps Script change.
  - **One end-of-project screen** replaces the two forms in a row (Project Survey, then the "רגע לפני שסיימת" closing capture). `openProjectSurvey(i, {postDone})` is the single entry; `toggleDone` no longer calls `_showClosingCapture` — when a job is marked done from another route (`swApplyStatus('done')`) the same screen opens in `postDone` mode. The old closing-capture overlay and its functions are still in the file but unreachable.
  - **Tools:** the briefing's planned tools first, tagged "תוכנן", unticked. With planned tools present `_refineSurveyTools` (one Gemini request) is NOT called.
  - **Materials:** tappable suggestions from three labelled sources — the briefing, the notes written on the card (line by line, no AI), and the job's expenses in category `חומרים` (with amount). Free text too.
  - **Steps:** the job's own briefing steps (`_briefingStepsFor` — per quotation line when the briefing covered several), else the category list.
  - **Planned vs actual** (`_efCompareData`, computed in code, live): hours vs estimate %, tools/materials planned-not-used and added, profit per hour actual vs by-estimate vs `AVG_PPH_TARGET` (₪500). Profit per hour = the job's gross profit AS THE SHEET HAS IT (`getFullJobInfo.grossProfit`, else income − costs) ÷ hours. No sheet number → "אין נתון", never an invented figure.
  - **Saving:** same two sheets. Lessons Learned `Materials`/`Tools` now = what was actually used; the differences go into `Notes` (`compareNote`, ≤300 chars). A skipped summary writes the plan prefixed `תוכנן (לא אומת): `. Job Surveys `hrs` = total of all days (was the last day's `totalMs`); the POST also carries `materialsUsed`, `successNote`, `compare`, `briefing` — the v234 handler ignores unknown fields, they are there for Stage 2.
  - **Briefing ↔ job link:** one matcher `_briefingMatch(jobId, title)` for the card, the end screen, the pending list and the lesson. `submitQuotationSurvey` stamps `bid`, `blines`, `stepsByLine`; the quotation save calls `_linkBriefingToJobs(bid, jobIds, descs)` → `jobIds[]` on the briefing, so EVERY line's job finds it and a later title edit does not break it (3-hour stale guard; `openQuotationWithSurvey` resets the pending id). A same-client guess (`_briefingAttach`) is flagged `_guess`, shown by name with a "לא זה" button (card + end screen), and `_notFor` prevents guessing it again.
  - **New quotation:** `_loadCatHistory(cat)` puts up to 5 real end-of-project rows of the same category into the briefing screen (existing `getLessons` action, `actualHrs > 0` only, `תוכנן (לא אומת)` values ignored). Tap a chip → added to the briefing. Delayed 600 ms with one retry so it never races the AI call.
  - Projects added from a sheet job now carry `category` (it was never set on the project object).
- **HTML v1007** (built 14/11/2026; see OPEN for the upload) — quotation form: the per-line tag picker moved into a bottom drawer (`cqTagDrawerOpen/Close/Go`, `_cqDrawerRender`). The form keeps one short row per line (chosen tags only + 🏷). New tag = a field in the drawer (the `prompt()` is gone). `_cqTags[lineIndex]` and the save path are unchanged. Three lines went from 78 chips to a ~160 pt section. Two old bugs fixed in the same version on Yaniv's "Fix": deleting a middle row left the tags on the wrong lines (`cqTagsRowRemoved`), and an unsaved quotation's tags stayed for the next quotation (`cqTagsReset` at form build) — both found by reading the code, since `_cqTags` was only ever cleared after a successful save.
FACT:
- 2026-11-14 | **Yaniv read the Code.gs header in the GAS editor: it says v236.** So AS v235 and v236 WERE deployed and the repo has no mirror of either (newest: `apps-script-v234.js`). The deployment Version number and the cap reading are still unknown | evidence: his message "v236" | conf:0.9
- 2026-11-14 | **A browser download of `index.html` onto a Mac that already has one is saved as `index_3.html`, and GitHub commits it under that name** — the app stays on the old version with no error. Happened with v1006 (commit `26d39a2` added `index_3.html`; fixed 4 minutes later by `f8eb006`). `index_3.html` is still in the repo and is served publicly as a second copy of the app | evidence: `git show --stat 26d39a2` | conf:0.98
- 2026-11-14 | **`device_commit_files` reported "written" for an overwrite of `claude-builds/v1008/*` but the Mac still held the previous build** (968,358 vs 969,105 bytes) even after a re-send with `force:true` (mtime changed, content did not). What fixed it: copying the file to a NEW container path (`/mnt/user-data/outputs/<new-folder>/…`) and sending from there — the bridge appears to reuse an earlier copy of the same `stagedPath`. After every bridge write, `device_list_dir` the folder and compare byte sizes with the container copy before telling Yaniv to upload | evidence: list sizes before/after | conf:0.9
- 2026-11-14 | The reliable hand-off is a file written by the device bridge to `~/Downloads/claude-builds/vNNNN/index.html` (exact name, own folder). When the bridge is not available, send ONE zip whose inner files have the exact names | evidence: v1005 (bridge, worked first time) vs v1006 (chat download, renamed) | conf:0.9
- 2026-11-14 | Before v1006 the Lessons Learned row copied the briefing's planned materials and tools as if all had been used, and the end-of-project "Rating" column is hard-coded `''` in the v234 `saveLessonLearned` | evidence: `_saveLessonOnComplete` in v1005, AS v234 line ~300 | conf:0.95
- 2026-11-14 | Project objects never had `category` before v1006 (`_doAddJobAsProject` did not copy it), so `PROCESS_STEPS_BY_CAT[p.category]` and the survey's `cat` were always the default/empty for sheet jobs | evidence: v1005 line 3649 | conf:0.95
- 2026-11-14 | Job Surveys rows only started reaching the sheet on 21/09/2026 (v1003 fix), so same-category history is thin; the v1006 category block reads Lessons Learned, which is older | evidence: v1003 changelog | conf:0.85
- 2026-11-14 | Tested headless (Chromium 390×844, he-IL, backend mocked per action, nothing written to the sheet): v1006 — 8 scenarios incl. full save, skip, no-sheet-job, guess + reject, postDone, quotation link, category block; v1007 — real taps on rows, chips, next line, new tag, backdrop close. v1005 and v1006 suites re-run against v1007: pass. **Neither v1006 nor v1007 was tried on the iPhone by Claude** | evidence: test output | conf:0.9
- 2026-11-14 | An interrupted turn can leave finished code fragments in the scratchpad that the resumed context no longer remembers writing (v1006: four `frag_*.js` files). List the scratchpad before rewriting anything after an interruption | evidence: file mtimes 22:33–22:37 vs rewrite at 22:49 | conf:0.9
PREFERENCE:
- 2026-11-14 | Wants to SEE a UI change before approving it ("Show me the tags section"). A working local copy + two screenshots (in place, and open) got an immediate "Build it" | seen:2 | conf:0.85
- 2026-11-14 | Dictates long requests by voice; the tail can arrive garbled. Ask about the garbled part as one multiple-choice question rather than guessing | seen:1 | conf:0.7
OPEN:
- **Stage 2 (backend, needs the v236 source + a version slot):** briefings readable from any device (the link is still localStorage-only), same-category end-of-project data fed into the AI stage breakdown (`analyzeQuotationLines`), the comparison in its own columns, the rating stored.
- **Mirror AS v235/v236 into the repo.** Asked Yaniv for `pbpaste > ~/Downloads/apps-script-v236.js` + the deployment Version and cap reading; not done yet.
- Delete the stray `index_3.html` from the repo (Yaniv, GitHub UI).
- iPhone checks: v1006 end screen (long form, keyboard over the fields), v1007 drawer (safe-area bottom, scroll inside the sheet).
- Old briefings (before v1006) still match by title only.
- Carried: ✓ → un-✓ → lower-time sync case · pricing comparables filter · 118 dateless completed jobs · weekly planner · worker-count selector on a dead parameter · 🤖 button hidden · GAS version pruning.
RETIRED:
- "AS v235 / v236 are only changelog labels" — FALSE; the live Code.gs header reads v236. Killed 14/11/26.
- "The lesson's Materials / Tools columns hold what was used" — FALSE before v1006 (they held the plan). True from v1006 for summaries filled on the end screen.

---

## 2026-11-13 — v1005: edit today's time on a project card + End Day crash fixed (Cowork)
SHIPPED:
- **HTML v1005** (commit `2c93adc`, 14/11/2026 00:10 +0200, "Add files via upload" — Yaniv uploaded the build himself; the committed file is SHA-256-identical to the tested build, `476c46ff…`; live GitHub Pages title, app-info line and top changelog entry all read v1005 a few minutes after the commit). No Apps Script change, no version slot spent.
  - ✏️ beside the timer on running and paused cards (not on done cards) opens a small panel: −15 / −5 / +5 / +15 minutes, an exact field (accepts `1:40`, `01:40`, `140`, `1.40`; 1–2 bare digits = minutes), Save / Cancel. Closed by default; only the pencil opens it.
  - Edits **today's time only** (`totalMs`). `prevMs` is never touched. Floor at 00:00, no upper cap except 24h (so time worked before pressing Start can be added).
  - Timer running at save: the run so far is pushed to `p.sessions` as a normal record and `activeStart` restarts at now — the timeline stays true and the timer keeps running.
  - Removed time is deleted, not moved to Setup (Yaniv's choice).
  - Every edit is recorded in `p.adjustments[] = {at, dateStr, timeStr, fromMs, toMs}` and printed as `✏️ תיקון ידני` in the text summary (work log / clipboard / `yb_history`), in `yb_sessionHistory`, and on the summary screen.
  - Panel state lives in module variables (`_teProj`, `_teDraft`), not on the project object, so nothing transient is persisted by `saveState()`.
- **End Day fix (pre-existing bug, shipped in the same version on Yaniv's approval):** `renderTimelineSection()` used `totalDay`, a local of `renderSummary()`. Every End Day threw `ReferenceError: totalDay is not defined` and the day-timeline block under the summary never rendered. Saving and sheet sync run before that line, so only the display was lost. Now computed inside the function.
- **Tick fix:** in the "don't re-render" branch of the 1-second tick (typing a note / expense panel open) the big timer was written as today + prev, while the card render shows today only — the number jumped while typing a note. Now today only.
FACT:
- 2026-11-13 | Live before this session was **HTML v1004** (commit `eac1d60`, 23/09/2026, uploaded by Yaniv outside a session): the drawer's "Edit/New Quotation" button now goes through `toggleCaspitAccordion('quote')` so the pre-quotation briefing gate actually opens | evidence: `git log`, changelog | conf:0.95
- 2026-11-13 | The v1003 and v1004 changelogs are labelled "AS v235" and "AS v236". **Still nothing in the repo backs either**: newest mirror is `apps-script-v234.js`, and the app-info panel still reads "Version 364". v1005 carries the "AS v236" label forward only to keep the format; it is NOT a verified backend version | evidence: `ls apps-script-v23*.js`, grep of the info panel | conf:0.9
- 2026-11-13 | **Day total is clock-based**: `totalDay = dayEnd − dayStart`, not a sum of parts. Lowering a project's time shrinks only "worked time"; the removed time shows as a gap in the day. I first told Yaniv the day total would shrink — wrong, corrected in the spec before the build | evidence: `renderSummary`, `autoSaveSummary` | conf:0.95
- 2026-11-13 | `syncJobToSheets` and `syncDoneJobToSheets` write `Math.max(local hours, sheet hours)`. Normally harmless for a downward edit (the sheet still holds only previous days until End Day / ✓). **It bites in one case:** mark ✓ (sheet synced) → un-✓ → lower the time → the sheet keeps the higher number. Left unchanged deliberately; it is a billing-adjacent sync | evidence: lines ~4869–4880 of v1004 | conf:0.9
- 2026-11-13 | The app's login gate is an overlay (`#loginScreen`, z-index 99999) plus `visibility:hidden` on every `.screen`; the app underneath is fully loaded. A headless test of a LOCAL copy with all network aborted can exercise the day screen by un-hiding the screens and calling `showScreen('day'); startMainLoop(); renderProjectBtns()` — no credentials and no backend involved | evidence: Playwright run | conf:0.95
- 2026-11-13 | Tested in headless Chromium (390×844, he-IL, every non-file request aborted): running card, paused card, typing, invalid input, floor at zero, cancel, done card, tick survival, End Day text + history + screen trace, and the outgoing `updateJob` hours (3.6667 = 2h prev + 1:40 today). **Not tested on the iPhone** — the numeric keypad and the paused card's grayscale look are the things to eyeball | evidence: test output | conf:0.9
- 2026-11-13 | Deploy route facts: the Claude-in-Chrome extension was not connected; "Control Chrome" (AppleScript) could open the upload URL but Chrome was **not signed in to GitHub** (redirect to /login); `gh` in the container has no access to the repo (`add_repo` would be needed). `git clone` over HTTPS works. The build was written to the Mac at `~/Downloads/claude-builds/v1005/index.html` (Downloads is the only connected folder) and Yaniv uploaded it | evidence: tool results | conf:0.95
- 2026-11-13 | A tool-call parameter is JSON-decoded before it reaches the shell: a `\uXXXX` typed inside a heredoc arrives as the literal character, including INVISIBLE bidi controls inside a regex class. Build such strings in Python with `chr()` and assert the block contains no U+200E/200F/202A–202E | evidence: `ascii()` dump of the patched file | conf:0.95
PREFERENCE:
- 2026-11-13 | "ask me" — when he says it, he wants multiple-choice questions before a spec, and answers them fast | seen:1 | conf:0.8
- 2026-11-13 | Reads screenshots literally: a screenshot of the panel open read as "it is always open". Send the default (closed) state first, then the interaction | seen:1 | conf:0.7
- 2026-11-13 | Uploads builds himself via the GitHub web UI when the browser route is not ready ("commited") — three versions in a row now | seen:3 | conf:0.85
OPEN:
- **Verify "AS v235 / v236"** in the GAS editor (Code.gs header, current deployment Version, cap warning). Still blocks any backend work.
- iPhone check of the ✏️ panel (keypad, grayscale paused card).
- The ✓ → un-✓ → lower case above, if it ever matters.
- The `HANDOFF.md` / `SESSION-LOG.md` refresh from 22/09 was delivered as files but never committed; this block and that one travel together.
- Carried: pricing comparables filter (deferred again 22/09) · 118 dateless completed jobs · weekly planner · worker-count selector wired to a dead parameter · 🤖 button hidden · GAS version pruning.
RETIRED:
- "Deleting time from a project shortens the day total" — FALSE, the day total is clock-based. Killed 13/11/26.
- "End Day works" — FALSE for v1004: it threw on every run (reproduced on the untouched v1004 file; how many versions back it goes was not checked). Fixed in v1005.

---

## 2026-09-22 — v1003 landed outside a session; repo docs caught up (Cowork)
SHIPPED:
- Nothing deployed. This was a state re-derivation + documentation catch-up. `HANDOFF.md` refreshed to v1003; this block and the 15/08 block below close the gap that ran from v1000.
FACT:
- 2026-09-22 | **Live is HTML v1003** — commit `8ceebc7`, 21/09/2026 20:08 +0300, message "Add files via upload". Uploaded by Yaniv directly through the GitHub web UI, not through a session and not through `github-deploy-tool.html` | evidence: `git log`, live page title probe | conf:0.98
- 2026-09-22 | v1003 is a 12-insertion / 8-deletion diff against v1002 and changes exactly two behaviours plus the version markers. `submitProjectSurvey` and `submitPreProjectSurvey` were POSTing with `Content-Type: application/json`, which triggers a CORS preflight Apps Script never answers; the request failed every time and an empty `.catch(function(){})` swallowed it, so the user saw a success path on every survey while the `Job Surveys` sheet was never created (0 rows, ever). Both now send `text/plain;charset=UTF-8` — the same Content-Type the quote path has always used — and surface a warning toast on failure | evidence: `git diff e4c5d49 8ceebc7` | conf:0.97
- 2026-09-22 | **The v1003 changelog's "AS v235" label has no backing in the repo and no verified backend change behind it.** There is no `apps-script-v235.js` mirror, and the fix needed no backend change: the v234 handlers for both survey actions read `request.postData.contents` and `JSON.parse` it, which is Content-Type-agnostic. Either a v235 was deployed for something unrelated, or the label is decorative | evidence: `ls apps-script-v235.js` (absent); `sed -n '2671,2700p' apps-script-v234.js` | conf:0.85
- 2026-09-22 | HTML v1003's inline JS parses clean (2 inline blocks, 0 failures) | evidence: `new Function()` over both blocks | conf:0.95
- 2026-09-22 | **The container proxy denies `yanivberg.github.io` to `curl` but `WebFetch` reaches it, and `git clone` over HTTPS to `github.com` works.** So a fresh container can bootstrap the HTML side from the repo and confirm the live version via WebFetch, without any browser | evidence: curl exit 56 `connect_rejected` vs. successful clone + WebFetch | conf:0.9
- 2026-09-22 | The `script.google.com` 403 still stands — backend version and deployment Version **cannot** be probed from the container. Any AS claim in this block is repo-derived, not live-verified | evidence: prior session, unchanged | conf:0.9
OPEN:
- **Verify what "AS v235" actually is.** Needs the GAS editor: Code.gs header, Manage deployments → current Version number, and the version-cap warning. If a v235 was deployed, the cap reading below is one higher and the mirror is one behind.
- `HANDOFF.md` had been carrying `repairExpenseRollups(true)` as an open Yaniv-only item for five weeks after the 14/08 block closed it. Removed in this pass. Watch for the same drift on the other two v931 items.
RETIRED:
- (none this session)

---

## 2026-08-15 — gross profit gets a year, a scope and an undated toggle; the pricing filter found broken (Cowork)
SHIPPED:
- **HTML v1000 / AS v231 / general-expenses v5** (deployment Version 361) — `year` period in `getGrossProfitSummary` AND `getAvgProfitPerHour`. ⚠ The load-bearing half was `_geWindow` in general-expenses.gs: without `case 'year'` an unknown period falls to `default: return null` = ALL-TIME overhead subtracted from ONE YEAR's gross. Also scoped `aiAsk` rule 9 to NUMBERS only — it had been producing bare `אין לי את הנתון הזה` refusals on planning questions, which are not numeric claims.
- **HTML v1001 / AS v232** (Version 362) — gross-profit `scope=toinvoice|done`. `toinvoice` keeps the original `invoice === 'להוציא חש'` filter; `done` counts every row with status `בוצע` regardless of invoice state. Yaniv's ask: "how much did my business gross this year", not "what is waiting to be invoiced".
- **AS v233** (Version 363) — `_gpRowDate` delegates to `ybPDate`. The old parser required a 4-digit year, so `1.3.26` and RTL-marked strings counted as undated.
- **HTML v1002 / AS v234** (Version 364) — `undated=include|separate`. Off by default; `result.undated` / `result.undatedJobs` are reported either way so the UI can show how much of a total is dateless.
FACT:
- 2026-08-15 | **I misdiagnosed the undated jobs as a date-parsing problem.** v233 shipped the robust parser and recovered 3 jobs / ₪750. The real number: **95 of GOLMAT's 255 completed jobs have BOTH date cells empty**, ₪300,676; across all clients **118 completed jobs / ~₪319k have no date at all**. Zero unparseable formats. Code cannot fix this — the cells need filling | evidence: direct sheet count via aiAsk dump | conf:0.95
- 2026-08-15 | **The AI price suggestion is running on almost no comparables.** `getAIPriceSuggestion` and `getAIPriceRows` both filter similar jobs with `['הצעה ניתנה','בתהליך ביצוע','הסתיים'].indexOf(jStat2) === -1 → continue`. Two of those three strings do not exist in the sheets: the real values are `בוצע` and `ניתנה הצעה`. Result: GOLMAT returns **2 similar jobs out of 266 rows**, ROLLMAT **0 out of 320** | evidence: read live code + row counts | conf:0.95
- 2026-08-15 | `getAIPriceSuggestion` reads `var workers2 = parseInt(e.parameter.workers || '1')` and **never references it again** (grep count 1). The worker-count selector in the quote form feeds a dead parameter — it cannot be affecting the price | evidence: grep | conf:0.95
- 2026-08-15 | Weekly planning is a **data** problem, not a prompt problem: 23 open jobs are buried in 866 status-less rows, only ~22% of rows carry any date, and there are no due dates, no priority and no site grouping. A code-computed planner is the fix; better prompting is not | evidence: full dump inspection | conf:0.85
PREFERENCE:
- 2026-08-15 | Wants short answers from the assistant and short answers from Claude — "to copmlicated - make it shorter" | seen:>=2 | conf:0.9
- 2026-08-15 | Defers cleanly and often: "Leave it for now" on the weekly planner, the worker-count selector, and the pricing filter. Offer once with the value stated, then drop it | seen:>=4 | conf:0.9
OPEN:
- **Pricing filter fix** (offered twice, declined for now): `'הסתיים'` → `'בוצע'` and `'הצעה ניתנה'` → `'ניתנה הצעה'` in BOTH `getAIPriceSuggestion` and `getAIPriceRows`. One line each; opens hundreds of real priced jobs to the pricing engine.
- **118 dateless completed jobs (~₪319k)** — Yaniv-only, the dates have to be typed in. The v1002 toggle is a workaround, not a fix.
- Weekly planner screen (code-computed) — deferred.
- The worker-count selector is wired to a dead parameter — either wire it or remove it. Yaniv works alone and asked for a zero-workers option; deferred.
- 🤖 AI button is still hidden (`display:none` on `#ybAiFab`, v999). Un-hiding is deleting that one declaration.
RETIRED:
- "The undated jobs are a date-parsing failure" — FALSE, the cells are empty. Killed 15/08/26.
- "Prompt rules can make the model's arithmetic reliable" — FALSE, already tombstoned 14/08/26; v229's code-computed EXACT TOTALS is the only reason the assistant's numbers are trustworthy.

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

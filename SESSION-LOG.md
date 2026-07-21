# YB TRACKER — SESSION-LOG

Append-only journal. Newest at top. Bootstrap reads the last ~3 blocks (per HANDOFF.md).
Every block: what shipped, dated facts (with evidence), observed preferences, open threads, retired facts.
This file was referenced by the bootstrap but did not exist until 13/07/2026 — created to close the broken pointer.

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
- Repo AS mirror not yet updated to v208 (the output filter blocks exfiltrating .gs source to the sandbox; use the clipboard hand-off GAS→GitHub, as in the v205 session, to refresh `apps-script-v208.js`).
- SESSION-LOG here is the LOCAL working copy (committed to the local never-pushed repo per CLAUDE.md). Pushing the evidence copy to GitHub is a separate, gated action — not done automatically.
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

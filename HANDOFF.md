# BLUE — YB TRACKER · HANDOFF
Updated: 11/07/2026. Repo-native working memory (promoted from the Drive "MASTER HANDOFF v2"; the v800-era doc is historical).
Principle: pointers + currently-load-bearing dated facts only, one page, hard cap. Detail lives in SESSION-LOG.md (append-only journal — read the last ~3 blocks at bootstrap). Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · Components: single-file index.html (GitHub Pages) · Google Apps Script backend · Cloudflare Worker (Caspit proxy).

## Bootstrap (three reads, nothing more)
1. This file. 2. Tail of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker `?action=health` · latest `apps-script-vNNN.js` in this repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.

## Key identifiers
- Sheet: `1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA` ("project list")
- Worker: `https://yb-caspit-proxy.sunroof-dictate-39.workers.dev`
- AS /exec (stable — always "New version" on the EXISTING deployment): `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw`
- GAS project: `script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c`
  ⚠ TWO projects named "YB Tracker Main" — verify Deployment ID matches before editing; the other is a decoy.
  ⚠ Project AT the 200-version cap — delete old versions before any new deploy. [FACT 10/07/26]
- Accountant inbox (monthly docs + quote copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact (ALL API tests, ₪1, cancel after — never real clients): "בדיקות מערכת — לא לקוח (TEST)", ContactId `YB-CONTACT-1783772031444`, #44 [10/07/26]

## Deployment — Claude deploys, one approval each [since 10/07/26]
HTML: GitHub upload/commit via browser → verify live title. AS: GAS editor monaco injection (verify byte-identical BEFORE save) → Manage deployments → New version → POST-probe /exec (write actions live in doPost — GET returns 'OK' for anything). Worker: user pastes in Cloudflare dashboard → `?action=health`. iOS manual checklists = fallback.

## Working style [observed 10/07/26]
Quick Hebrew/English with typos — read intent generously. Spec-first (what/why/files/impact) → approval → build; preview HTML only for major visual redesigns. Trust is method-scoped: proven technique + "go" = proceed; new kinds of side effects = fresh ask. Chat concise; requested analyses = deep .md files → Desktop → time tracker app; builds → claude-builds/vNNN. [CONSTRAINT] Accounting correctness is law (locked invoices, credit notes, verify against real Caspit output).

## Load-bearing Caspit facts [dated 10/07/26 — re-probe before relying]
TrxTypeId 16 quote / 1 invoice / 2 receipt (disabled) / 3 combined. Line Details↔ProductName auto-fill at CREATE (whitespace trimmed; only follow-up PUT `Details:''` clears; PDF prints "Name / Details" when both set; free-text ProductName does not survive Caspit-UI re-saves → app stores descriptions Details-first). Tokens live 10 min — cache ≤8 (AS v202). EmailDocument API 500s always (never worked; fix = AS v203 via Gmail+getDocPdf, blocked on version cleanup). Cloudflare IPs blocked on app.caspit.biz → worker uses app1/app2; Google IPs fine. PUT computed fields → 400.

## Open items
AS v203 clean-email (after GAS version cleanup, Yaniv) · cancel test quotes 900182/83/85/86 (+87) · v92x localStorage backup (spec pending approval) · Bitter-Lesson Phases 0–3 (bitter-lesson-harness-analysis.md) · skill v2 install via Settings (yb-tracker-build-deploy-SKILL-v2.md).
RETIRED: bank-deposit Gmail importer [deleted by Yaniv 10/07/26] — see SESSION-LOG tombstones before re-proposing anything.

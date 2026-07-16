# BLUE — YB TRACKER · HANDOFF (working memory, T2)
Updated: 11/07/2026. THIS repo copy is authoritative; the Drive "MASTER HANDOFF v2" doc mirrors it. The v800-era MASTER HANDOFF is historical.
One-page cap. Pointers + currently-load-bearing dated facts only. Everything else: derive live, or grep SESSION-LOG.md. Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · single-file index.html (GitHub Pages) + Google Apps Script backend + Cloudflare Worker (Caspit proxy).

## Bootstrap (three reads, nothing more)
1. This file. 2. Last ~3 blocks of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker ?action=health · latest apps-script-vNNN.js here in the repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.
Snapshot at writing (DERIVE FRESH): HTML v922 · AS v202 (deployment Version 327) · Worker v29.

## Key identifiers
- Sheet: 1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA ("project list")
- Worker: https://yb-caspit-proxy.sunroof-dictate-39.workers.dev
- AS /exec (stable — always "New version" on the EXISTING deployment): AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw
- GAS project: script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c
  ⚠ TWO projects are named "YB Tracker Main" — verify Deployment ID matches AKfycbxqbXKwg-… before editing. The other is a decoy.
  ⚠ Project AT the 200-version cap — delete old versions before any new AS deploy.
- Accountant inbox (monthly docs + quote-PDF copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact for ALL API tests: "בדיקות מערכת — לא לקוח (TEST)", ContactId YB-CONTACT-1783772031444, #44. ₪1 amounts, cancel after. Never test on real clients.

## Deployment — Claude deploys (since 10/07/26), one approval per deploy
HTML: GitHub upload/commit via browser → verify live title. AS: GAS editor monaco injection (verify byte-identical BEFORE save) → New version on existing deployment → POST-probe /exec (write actions live in doPost; GET returns 'OK' for anything). Worker: user pastes in Cloudflare dashboard → verify ?action=health. iOS manual checklists = fallback.

## Working style [see harness-identity-audit.md]
Quick Hebrew/English + typos — read intent generously. Spec-first (what/why/impact) → one-word approval; preview HTML only for major visual redesigns. Trust is method-scoped; new side-effect kinds get a fresh ask. Chat terse; requested analyses = deep .md files → Desktop → time tracker app (builds → claude-builds/vNNN). [CONSTRAINT] Accounting correctness is law. Changelog-first bumps, never drop AS actions, acorn audit always.

## Load-bearing Caspit facts (dated 10/07/26 — re-probe before relying)
- Line-level Details↔ProductName auto-fill on CREATE (both directions; whitespace trimmed). Only follow-up PUT with Details:'' clears. PDF prints "ProductName / Details". Free-text ProductName dies on Caspit-UI re-save; Details survives → app stores descriptions Details-first.
- Tokens live 10 min; cache ≤8 (AS v202). EmailDocument API 500s always (never worked; mailSent silently false forever) — open fix AS v203 = Gmail + worker getDocPdf, blocked on version cleanup. Interim: quote emails at create may still show the dup; stored docs are clean.
- Cloudflare IPs blocked on app.caspit.biz (worker uses app1/app2); Google IPs fine. PUT computed fields → 400.

## Open (full list: SESSION-LOG.md)
AS v203 clean-email · cancel test quotes 900182/3/5/6(+7) · install skill v2 (Settings → Capabilities) · v92x localStorage backup · Bitter-Lesson Phases 0–3.

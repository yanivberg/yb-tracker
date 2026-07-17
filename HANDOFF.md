# BLUE — YB TRACKER · HANDOFF
Updated: 12/07/2026. Repo-native working memory (promoted from the Drive "MASTER HANDOFF v2"; the v800-era doc is historical).
Principle: pointers + currently-load-bearing dated facts only, one page, hard cap. Detail lives in SESSION-LOG.md (append-only journal — read the last ~3 blocks at bootstrap). Recent observed behavior outvotes anything written here.

## What this is
"BLUE" = YB Tracker: Hebrew RTL field-maintenance PWA for י.ב אחזקות (Yaniv Berg).
Live: https://yanivberg.github.io/yb-tracker · Components: single-file index.html (GitHub Pages) · Google Apps Script backend · Cloudflare Worker (Caspit proxy).
Current deployed: HTML v931 · AS deployment Version 334 (Code.gs = v204: expense rollup integrity) · Worker v30. [17/07/26]  (NOTE: an undeployed v930 "note→quote" build sits in claude-builds, built on v929 — rebase onto v931 before deploying it.)

## Bootstrap (three reads, nothing more)
1. This file. 2. Tail of SESSION-LOG.md. 3. Live probes: app title (HTML version) · worker `?action=health` · latest `apps-script-vNNN.js` in this repo (header + `grep -c "action === '"`). Confirm derived versions with Yaniv in one line.

## Key identifiers
- Sheet: `1Wn2-Yzx08H2NKmJLsMs2xrYIBPLzJJqvRo-Su8jWlgA` ("project list")
- Worker: `https://yb-caspit-proxy.sunroof-dictate-39.workers.dev`
- AS /exec (stable — always "New version" on the EXISTING deployment): `AKfycbxqbXKwg-EkbwKxtmulN_u_RpUi_HLn3Q8Hbw1VkBsl5Go7dRPjIJM2ulJUxZuS01tuVw`
- GAS project: `script.google.com/home/projects/1OQbwNDsfDsRcx_398mkO5CIimZxuWKfXpoMmKuH_7iWSMICqumquXX_c`
  ⚠ TWO projects named "YB Tracker Main" — verify Deployment ID matches before editing; the other is a decoy.
  ⚠ Project was AT the 200-version cap; Yaniv cleared old versions → 187 before v203 deploy. Still delete old versions before any new deploy. [11/07/26]
- Accountant inbox (monthly docs + quote copies): yanivberg@icloud.com [confirmed 10/07/26]
- Caspit TEST contact (ALL API tests, ₪1, cancel after — never real clients): "בדיקות מערכת — לא לקוח (TEST)", ContactId `YB-CONTACT-1783772031444`, #44 [10/07/26]

## Deployment — Claude deploys, one approval each [since 10/07/26]
HTML: GitHub upload/commit via browser → verify live title. AS: GAS editor monaco injection (verify byte-identical BEFORE save) → Manage deployments → New version → POST-probe /exec (write actions live in doPost — GET returns 'OK' for anything). Worker: user pastes in Cloudflare dashboard → `?action=health`. iOS manual checklists = fallback.

## Working style [observed 10/07/26]
Quick Hebrew/English with typos — read intent generously. Spec-first (what/why/files/impact) → approval → build; preview HTML only for major visual redesigns. Trust is method-scoped: proven technique + "go" = proceed; new kinds of side effects = fresh ask. Chat concise; requested analyses = deep .md files → Desktop → time tracker app; builds → claude-builds/vNNN. [CONSTRAINT] Accounting correctness is law (locked invoices, credit notes, verify against real Caspit output).

## Load-bearing Caspit facts [dated 10/07/26 — re-probe before relying]
TrxTypeId 16 quote / 1 invoice / 2 receipt (disabled) / 3 combined. Line Details↔ProductName auto-fill at CREATE (whitespace trimmed; only follow-up PUT `Details:''` clears; PDF prints "Name / Details" when both set; free-text ProductName does not survive Caspit-UI re-saves → app stores descriptions Details-first). Tokens live 10 min — cache ≤8 (AS v202). EmailDocument API 500s always (never worked) → RESOLVED v203 [11/07/26 verified working]: quote PDFs now emailed via Gmail (GmailApp) + worker getDocPdf, fired AFTER the line-Details cleanup PUT resolves, so the emailed PDF matches the saved doc (description once). Caspit EmailDocument no longer used. Shared AS helper `emailQuotePdfViaGmail(docId,docNum,to)`; HTML calls it via `_emailCleanedQuote`. Covers all 3 quote paths (new / pending / edit); pending-quote path now also emails (previously didn't). Cloudflare IPs blocked on app.caspit.biz → worker uses app1/app2; Google IPs fine. PUT computed fields → 400.

## PO import (gmail-po-import.gs) [fixed & verified 12/07/26]
Reads Gmail PO PDFs → parses line items → adds jobs to GOLMAT/ROLLMAT/PAL-YAM sheets. Manual (app Setup → PO Import → scanPOEmails preview → runPOImport). Live PO PDF facts: line = `<row> <SKU> <desc> <qty> יח' <unitPrice> <ILS|ש"ח> <lineTotal>` (NO date column — old regex required one, broke it). GOLMAT/ROLLMAT PO# prints digits-first `2601776POG` → normalize to `POG…`; currency ILS; SKU uppercase. PAL-YAM: pure-digit PO# (`הזמנת רכש מספר 2601003576`), currency `ש"ח`, lowercase SKU (zzz10), email layout varies every time (PDF layout constant) → search by content not subject. POGETTHREADS searches by attachment filename (`filename:הדפסת` GOLMAT/ROLLMAT) + `"הזמנת רכש" ("פל ים"|"t-p-y")` (Pal-Yam), NOT email subject (POs are forwarded w/ arbitrary subjects). POSCAN_RETURN/POIMPORT_RETURN convert every PDF via Drive (slow, seconds each) → guard skips non-PO PDFs by filename/subject/sender BEFORE conversion (scan ~28s vs 240s timeout). PODETECTCLIENT keys off PDF text (פל ים/ט.פ.י/t-p-y/tax 513327064 → PAL-YAM; רולמט/POR → ROLLMAT; else GOLMAT). POEXTRACTPO returns '' (not '?') on no-match so broad search skips non-POs.

## Open items
cancel test quotes 900182/83/85/86 (+87) · v92x localStorage backup (spec pending approval) · Bitter-Lesson Phases 0–3 (bitter-lesson-harness-analysis.md) · skill v2 install via Settings (yb-tracker-build-deploy-SKILL-v2.md).
DONE 11/07/26: AS v203 clean-email (Gmail+getDocPdf) — shipped & verified working, see Caspit facts above.
RETIRED: bank-deposit Gmail importer [deleted by Yaniv 10/07/26] — see SESSION-LOG tombstones before re-proposing anything.

# YB Tracker — SESSION LOG
Append-only journal. One block per session. Bootstrap reads the last ~3 blocks.
Categories: SHIPPED / FACT (dated, with evidence) / PREFERENCE / OPEN / RETIRED (tombstones).
Rule: surprises outrank plans; undated facts are refused; retired knowledge gets a tombstone, never silent deletion.

─────────────────────────────────────────────
## 2026-07-10/11 — Session 1 (Cowork, Mac)

SHIPPED:
- HTML v917 (PWA: sw.js + manifest + icon-512, network-first), v918 (doc-level Details bypass ×2 paths), v919 (line-level ' ' — ineffective, see RETIRED), v920 (post-create clear-PUT), v921 (email-after-clear — rolled back same day), v922 (interim: SendByEmail restored, Details-first cleanup kept). AS v201 (emailQuote action), AS v202 (token cache 25→8min + retry). All deployed by Claude via browser (GitHub upload; GAS monaco injection), one approval each.
- Repo now mirrors AS source (apps-script-v201/202.js). HANDOFF v2 written to Drive. Caspit TEST contact created.

FACT (all 10/07/26):
- Caspit auto-fills DocumentLine.Details↔ProductName on CREATE, both directions; whitespace-only trimmed+overwritten. Only follow-up PUT with Details:'' clears (→null). Evidence: probes on docs 900182/900185. PDF prints "ProductName / Details" when both set.
- Free-text ProductName does NOT survive re-saves from Caspit's web UI; Details does. Evidence: 900180/900184 post-edit states. Hence app stores descriptions Details-first (v921+).
- Caspit tokens live 10 min (sliding); AS cached 25 min → chronic 401/500 on AS-direct calls. Fixed AS v202.
- EmailDocument API 500s regardless of token freshness; updateQuote's mailSent has ALWAYS been silently false. Open fix = AS v203 (Gmail + worker getDocPdf).
- GAS trap: TWO projects named "YB Tracker Main"; real one = project 1OQbwNDsfDsRcx…, verify Deployment ID AKfycbxqbXKwg-… before editing. Project AT 200-version cap — cleanup required before next AS deploy.
- Most AS write actions live in doPost — probe /exec with POST, not GET (GET returns 'OK' for anything).
- Sandbox proxy allowlists vary by session: raw.githubusercontent/api.github/jsdelivr 403'd all day while npm/google/cloudflare worked. Use fallback chain, assert nothing.
- GAS editor exposes monaco; model.setValue + verify-before-save is a reliable deploy path. CSP on script.google.com ALLOWS fetch to raw.githubusercontent.
- Accountant inbox = yanivberg@icloud.com (confirmed by Yaniv 10/07/26).

PREFERENCE (observed 10/07/26):
- Claude deploys; Yaniv approves per deploy, often one word ("go", "deploy"). Mac + Chrome available, not iOS-only.
- Spec-first (short written what/why/impact), NOT preview-HTML-first; previews only for major visual redesigns.
- Trust is method-scoped; new kinds of side effects need a fresh ask. Authorized: ₪1 test docs on the TEST contact, canceled after.
- Chat terse; requested analyses = deep .md files in Desktop → time tracker app. Builds → claude-builds/vNNN. (Standing instruction.)

OPEN:
- AS v203 clean-email fix (Gmail+getDocPdf) — blocked on GAS version cleanup (Yaniv).
- Cancel test quotes 900182/900183/900185/900186 (+900187) in Caspit UI (Yaniv).
- v92x localStorage backup feature — spec approved-in-principle, not built.
- Bitter-Lesson plan Phases 0–3 (see bitter-lesson-harness-analysis.md): version constant, AI config object, verification suite, model-based classifiers.
- Skill v2 file awaiting install via Settings → Capabilities.

RETIRED (tombstones):
- "Single space bypasses Caspit Details auto-fill" — TRUE at document level only; FALSE at line level (trimmed+overwritten). Killed by probe on 900182, 10/07/26. Do not re-learn.
- "User deploys manually on iOS; Claude only prepares" — killed by explicit delegation + Mac evidence, 10/07/26.
- Bank-deposit Gmail importer — deleted from backlog by Yaniv, 10/07/26.
- "apps-script-vNNN.js Drive convention" / "AS not fetchable" — killed by repo mirror, 10/07/26.
─────────────────────────────────────────────

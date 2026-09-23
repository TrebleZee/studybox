# Review: feat/spec-catalogue (PR #7, target v1.4.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. All four findings are fixed on this branch, each with a test. R4 was fixed after the fixer pass, by the session that owns the branch.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/Onboarding.jsx:59, :89; src/App.jsx:350-361 | While a template loads, Start blank and Restore from file stay live, and the late template result overwrites what they set. | Fixed in 2dd56e1. Onboarding disables both while loading. `useTemplate` drops a result that went stale because another onboarding action ran first. Tests: src/components/Onboarding.test.jsx (lock), src/components/OnboardingStaleTemplate.test.jsx (restore during a slow load keeps the restored subjects) |
| R2 | low | security | src/utils/catalogue.js:150-153 | `loadSpec` treats inherited prototype keys (`constructor`, `toString`, ...) as loaders. | Fixed in 7b4b93b (one-line `Object.hasOwn` guard). Test: src/utils/catalogue.test.js (`loadSpec` returns null for inherited keys) |
| R3 | low | tests | src/utils/catalogue.test.js:41-51 | The index-vs-files test ignores `deprecated`, so retiring a spec breaks `npm test`. | Fixed in 8d403c8. The test now mirrors the generator's `deprecated` flag. The no-filter `listSpecs` test now compares against the non-deprecated entries and also checks `includeDeprecated`. Tried by temporarily marking ocr-h446 deprecated. Only the OCR board-filter data assertion then failed, which is correct for a retired spec. |
| R4 | low | correctness | src/data/specs/edexcel-9fm0.json:94, 145, 295 | With options seeded, 9FM0 gives duplicate topic names ("Further calculus" x3, "Further vectors" x2). | Fixed: only `name` changed, ids kept. t11 is now "Further calculus (Further Pure 1)", t36 "Further calculus (Further Pure 2)" and t14 "Further vectors (Further Pure 1)". `validateSpec` now rejects duplicate topic names within a spec (case-insensitive), and there is a broken-fixture test for it. |

## Follow-ups (not fixed on this branch)

None.

Also on this branch: I made `Onboarding.test.jsx` "selecting the GCSE template..." wait for the persisted `sb-subjects`/`sb-onboarded` with `waitFor`. Before that it failed about 1 run in 3, because the persist effect sometimes hadn't run yet.

## Checks

lint pass · test pass (189 tests) · build pass (main bundle 789.50 kB, gzip 234.25 kB)

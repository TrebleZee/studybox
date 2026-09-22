# Review: feat/spec-catalogue (PR #7, target v1.4.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. The medium onboarding race and two low findings are fixed with tests. One low data finding (duplicate 9FM0 topic names) is left as a follow-up.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/Onboarding.jsx:59, :89; src/App.jsx:350-361 | While a template loads, Start blank and Restore from file stay live, and the late template result overwrites what they set. | Fixed in 2dd56e1. Onboarding disables both while loading. `useTemplate` drops a result that went stale because another onboarding action ran first. Tests: src/components/Onboarding.test.jsx (lock), src/components/OnboardingStaleTemplate.test.jsx (restore during a slow load keeps the restored subjects) |
| R2 | low | security | src/utils/catalogue.js:150-153 | `loadSpec` treats inherited prototype keys (`constructor`, `toString`, ...) as loaders. | Fixed in 7b4b93b (one-line `Object.hasOwn` guard). Test: src/utils/catalogue.test.js (`loadSpec` returns null for inherited keys) |
| R3 | low | tests | src/utils/catalogue.test.js:41-51 | The index-vs-files test ignores `deprecated`, so retiring a spec breaks `npm test`. | Fixed in 8d403c8. The test now mirrors the generator's `deprecated` flag. The no-filter `listSpecs` test now compares against the non-deprecated entries and also checks `includeDeprecated`. Tried by temporarily marking ocr-h446 deprecated. Only the OCR board-filter data assertion then failed, which is correct for a retired spec. |
| R4 | low | correctness | src/data/specs/edexcel-9fm0.json:94, 145, 295 | With options seeded, 9FM0 gives duplicate topic names ("Further calculus" x3, "Further vectors" x2). | Not fixed. Confirmed, but the fix changes several user-visible names and needs a design choice, so it is a follow-up. |

## Follow-ups (not fixed on this branch)

- R4 (in diff, low): 9FM0 has duplicate topic names: `edexcel-9fm0-t05`/`t11`/`t36` "Further calculus" and `t06`/`t14` "Further vectors". Either rename only `name` with a paper prefix (e.g. "FP1: Further calculus") and keep the ids, or have `subjectFromSpec` add the paper name when a seeded name repeats. A catalogue-wide test for duplicate seeded names would stop this coming back. Suggested branch: `fix/9fm0-duplicate-topic-names`.

## Checks

lint pass · test pass (188 tests) · build pass (main bundle 789.50 kB, gzip 234.25 kB)

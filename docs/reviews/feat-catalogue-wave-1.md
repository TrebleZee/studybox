# Review: feat/catalogue-wave-1 (PR #10, target v1.5.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: clean. The reviewer found nothing to fix, so the fixer made no code changes on this branch.

## Scope reviewed

One commit (9fadd72). It adds 9 spec files to `src/data/specs/` (edexcel-1en0, edexcel-1et0, edexcel-1ma1, edexcel-1sc0, ocr-j250, ocr-j260, ocr-j351, ocr-j352, ocr-j560) and their `index.json` entries. It also bumps the version to 1.5.0 (package.json, package-lock.json, README) and adds a coverage line to instruction.md. It changes no code: catalogue.js, subjects.js, App.jsx and vite.config.js are untouched.

- Invariants: no existing spec file changed, so all existing spec and topic ids are kept. `index.json` only has additions. No changes to `normalizeSubjects`, `defaultSubjects`, streak, timer or `navigateFallback`. No spec prose or exam questions.
- Security: static JSON only, no new dependencies.
- Tests: the exact spec-id list is now `arrayContaining`. It still fails if a master spec is deleted, and the exact index-vs-files equality test still guards the full set. The "ocr english" search test is updated. There is a new per-board core-GCSE coverage test. All new files pass `validateSpec` and the catalogue uniqueness checks.
- Content spot-checks against the extracted PDFs: the ocr-j250 paper/topic split, the ocr-j560 calculator pattern and 12 headings, the edexcel-1et0 set texts (including the 2019 additions and Belonging) and the ocr-j352 set texts all match. 1sc0, 1ma1, j260, 1en0 and j351 were checked from domain knowledge only.
- specUrl reachability: the reviewer had no network access and did not check it. The authoring session downloaded every specUrl as a PDF before writing the specs.

## Findings

None.

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (211 tests, 19 files) · build pass (main bundle 790.41 kB, gzip 234.37 kB)

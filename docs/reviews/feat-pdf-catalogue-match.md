# Review: feat/pdf-catalogue-match (PR #11, target v1.6.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. The one medium finding (meta leaking between PDF uploads) is fixed with tests. The two low findings each need more than a one-line change, so they are left as follow-ups.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/settings/AddSubjectCard.jsx:106 | A catalogue-miss upload merged into the previous `subjectMeta`, so `specName`, `spec` and `qualification` from an earlier catalogue match leaked into the new subject (e.g. OCR J277 labelled "OCR GCSE Mathematics", or a Custom subject keeping spec 8300). | Fixed in b7e15a2: the miss branch now starts from `EMPTY_META`. Tests: src/components/settings/AddSubjectCard.test.jsx |
| R2 | low | correctness | src/components/settings/AddSubjectCard.jsx:53 | After a catalogue match, changing board/spec in SubjectMetaFields keeps topic source "catalogue", so the subject gets another spec's topics and `catalogueTopicId`s. | Follow-up (not a one-line fix: the legend and radios also need to follow the change) |
| R3 | low | correctness | src/utils/specInference.js:472 | On a joint AQA "AS and A-level" cover listing both codes, `inferSpecCode` returns the AS code (7407) while `inferQualification` returns "alevel". | Follow-up (needs a scoring change to the tie-break and a joint-cover test) |

## Follow-ups (not fixed on this branch)

- R2 (in diff, low): only use catalogue topics while `subjectMeta.board`/`spec` still match `catalogueMatch.subject`, or clear `catalogueMatch` when the board or spec is edited. Hide or update the "This is …" legend to match. Add a component test: upload the AQA 8300 PDF, switch the board to Edexcel, add the subject, and check that no topic has an `aqa-8300-*` `catalogueTopicId`. Suggested branch: `fix/catalogue-match-meta-edit`.
- R3 (in diff, low): when qualification is `alevel` and scores tie, prefer the A-level code (AQA 7xxx with the higher number, OCR Hxxx A-level), or return the candidates and let `findSpec` pick a catalogue hit. Add a joint-cover test such as `"AS AND A-LEVEL PHYSICS (7407, 7408) …"` expecting 7408. No AQA A-level spec is in the catalogue today, so this only affects the miss-path prefill for now. Suggested branch: `fix/spec-code-joint-as-alevel`.

## Checks

lint pass · test pass (242 tests, 20 files) · build pass (main bundle 795.77 kB, gzip 236.06 kB)

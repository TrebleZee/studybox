# Review: feat/pdf-catalogue-match (PR #11, target v1.6.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer (R1), with R2 and R3 fixed by the branch owner after the fixer pass
Verdict: fixed. All three findings are fixed on this branch, each with a test.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/settings/AddSubjectCard.jsx:106 | A catalogue-miss upload merged into the previous `subjectMeta`, so `specName`, `spec` and `qualification` from an earlier catalogue match leaked into the new subject (e.g. OCR J277 labelled "OCR GCSE Mathematics", or a Custom subject keeping spec 8300). | Fixed in b7e15a2: the miss branch now starts from `EMPTY_META`. Tests: src/components/settings/AddSubjectCard.test.jsx |
| R2 | low | correctness | src/components/settings/AddSubjectCard.jsx:53 | After a catalogue match, changing board/spec in SubjectMetaFields kept topic source "catalogue", so the subject got another spec's topics and `catalogueTopicId`s. | Fixed: a new `matchApplies` check requires the form's board and spec code (trimmed, case-insensitive) to still equal the match. Otherwise the choice and legend are hidden and the PDF topics are used. Tests: "drops the catalogue topics once the board is changed…" and "keeps the catalogue topics while the spec code is only re-cased" in AddSubjectCard.test.jsx |
| R3 | low | correctness | src/utils/specInference.js:472 | On a joint AQA "AS and A-level" cover listing both codes, `inferSpecCode` returned the AS code (7407) while `inferQualification` returned "alevel". | Fixed: codes whose shape implies the cover's level get a +2 bonus (OCR H1xx is AS; Edexcel 8xxx AS, 9xxx A-level). AQA shares 7xxx between AS and A-level, so on a tie the higher code wins for A-level and the lower for AS. Test: "picks the code matching the cover's level on joint AS and A-level covers" (AQA 7407/7408 → 7408, AQA AS-only → 7407, Edexcel 9FM0/8FM0 → 9FM0). All 17 real catalogue spec PDFs still resolve to the right code. |

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (245 tests, 20 files) · build pass

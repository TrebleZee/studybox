# Review: feat/pdf-catalogue-match (PR #11, target v1.6.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer (R1), with R2 and R3 fixed by the branch owner after the fixer pass
Verdict: fixed. All three findings are fixed on this branch, each with a test.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/settings/AddSubjectCard.jsx:106 | A catalogue-miss upload merged into the previous `subjectMeta`, so `specName`, `spec` and `qualification` from an earlier catalogue match leaked into the new subject (e.g. OCR J277 labelled "OCR GCSE Mathematics", or a Custom subject keeping spec 8300). | Fixed in b7e15a2: the miss branch now starts from `EMPTY_META`. Tests: src/components/settings/AddSubjectCard.test.jsx |
| R2 | low | correctness | src/components/settings/AddSubjectCard.jsx:53 | After a catalogue match, changing board/spec in SubjectMetaFields kept topic source "catalogue", so the subject got another spec's topics and `catalogueTopicId`s. | Fixed: a new `matchApplies` check requires the form's board and spec code (trimmed, case-insensitive) to still equal the match. Otherwise the choice and legend are hidden and the PDF topics are used. Tests: "drops the catalogue topics once the board is changed…" and "keeps the catalogue topics while the spec code is only re-cased" in AddSubjectCard.test.jsx |
| R3 | low | correctness | src/utils/specInference.js:472 | On a joint AQA "AS and A-level" cover listing both codes, `inferSpecCode` returned the AS code (7407) while `inferQualification` returned "alevel". | Fixed: codes whose shape implies the cover's level get a +2 bonus (OCR H1xx is AS; Edexcel 8xxx AS, 9xxx A-level). AQA shares 7xxx between AS and A-level, so on a tie the higher code wins for A-level and the lower for AS. Test: "picks the code matching the cover's level on joint AS and A-level covers" (AQA 7407/7408 → 7408, AQA AS-only → 7407, Edexcel 9FM0/8FM0 → 9FM0). All 17 real catalogue spec PDFs still resolve to the right code. |

## Round 2 (re-check of the fix commits d55630b..9ab0104)

Verdict: R1–R3 are confirmed fixed. Two new low findings came from the fixes themselves. Both are fixed below, but they were not re-reviewed because the gate allows two rounds at most. No critical or high finding is open.

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R4 | low | correctness | src/utils/specInference.js:306 | The R3 level bonus used `inferQualification`, which returned "alevel" for an AS-only cover that mentions its A-level, so an Edexcel 8FM0 cover could resolve to 9FM0. | Fixed: `inferQualification` now returns "as" when the AS marker comes first and the cover is not a joint "AS and A-level" spec. Test: the Edexcel AS-only cover now resolves to 8FM0 / "as". All 17 real catalogue specs are unchanged. |
| R5 | low | correctness | src/components/settings/AddSubjectCard.jsx:37 | After the spec code was edited away from the match, the matched spec's `specName` stayed on the new subject. | Fixed: `addSubject` sends the matched `specName` only while the match applies, and `null` once the code or board has moved away. Tests: "drops the matched spec name when the spec code is changed…" and "restores the matched spec name if the user returns to the matched spec". |

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (247 tests, 20 files) · build pass

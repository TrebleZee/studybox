# Review: feat/catalogue-wave-2 (PR #14, target v1.9.0)

Date: 2026-09-23 · Reviewer: release-reviewer · Fixes: branch owner
Verdict: fixed. R1 and R2 are fixed with tests. R3 is rejected with evidence (see below).

The reviewer's commands were blocked partway through because the session had switched worktrees, so it could not run lint, test or build itself. The branch owner ran them after the fixes: all pass (see Checks).

## Data checks by the reviewer (no issues)

The reviewer compared the following against the extracted spec texts:

- OCR H645: papers, the major/minor options and the route rules.
- Edexcel 9HI0: all Paper 1, 2 and 3 option names and numbering.
- AQA 7042: breadth options 1A–1L and depth options 2A–2T.
- OCR H505: 13, 24 and 21 units.
- AQA 7192 and OCR H580: option groups.
- AQA 7182 and OCR H567: options.
- AQA 7136 and Edexcel 9EC0: which sections sit on which paper.
- Edexcel 9BI0: the paper split.
- OCR H420 and H557: which modules sit on which paper.
- AQA 7408: the Paper 3 options.
- AQA 7517: the paper split.
- AQA 8465: all 25 headings, the four papers, and a sample of the HT-only topics.
- OCR H431, H436 and H606: exam years.

It found no mapping errors and no copied spec prose. No existing spec or topic id changed.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/data/specs/* (Art titles, H645) | The meaning of `optionGroups.pick` was never defined, but the data relied on it. Art "one or more" areas use `pick: 1`, and MEI Route C needs 3 minors against `pick: 2`. | Fixed by definition. `pick` is the number usually taken: guidance, not a limit. This is documented in instruction.md (Spec catalogue), and a test checks that every picked option is seeded, even beyond `pick` (Fine art with two areas; H645 with three minors). The F3 picker already shows `pick` as a hint. |
| R2 | low | correctness | src/utils/specInference.js | Each board ships one PDF for all its Art and Design titles, so an upload always resolved to one fixed title (AQA 7206, Edexcel 9AD0, OCR H600). | Fixed. `inferSpecCode` now returns `alternatives`: the other codes with an equal score, every code in a short range ("H600–H606"), or every code in a bracketed list ("(7201, …, 7206)"). When more than one of those is in the catalogue, the PDF import asks "Which one do you take?" and applies nothing until the student chooses. Tests: specInference (AQA list, OCR range, no invented alternatives) and AddSubjectCard (the chooser, then Fine art seeds aqa-7202 topics). A new bonus for the `aqa.org.uk/<code>` link also fixes AQA 7132, which the joint AS/A-level cover had been resolving to 7131. Checked against all 56 real spec texts: every non-Art spec resolves to exactly its own code, and each Art PDF offers all of its titles. |
| R3 | low | correctness | src/data/specs/edexcel-9*.json | The Edexcel Art `specUrl` is named "specification-issue-4.pdf", but the text says Issue 6. | Rejected. That is the URL Pearson's own qualification page links to today, and the file it serves is Issue 6 (June 2024). It is the exact file downloaded and reviewed here, so the link is current and not dead. |

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (389 tests, 24 files) · build pass

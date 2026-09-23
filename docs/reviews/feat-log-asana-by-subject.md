# Review: feat/log-asana-by-subject (PR #17, target v1.12.0)

Date: 2026-09-23 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: clean. The Log view's By Subject panel now includes Asana time, and the reviewer found no issues.

## Findings

None.

Note (not a finding): the PR description first said the show rule was the "same rule as AnalysisPanel". That isn't quite true. `AnalysisPanel.jsx:64-78` shows Asana when it has sessions or `asanaStats.total > 0`. `LogView` shows it when Asana is enabled or has sessions. Neither rule gives wrong totals or loses data, so no code change was needed. Only the wording needs fixing.

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (460 tests in 30 files) · build pass (main bundle 849.36 kB, 248.68 kB gzip)

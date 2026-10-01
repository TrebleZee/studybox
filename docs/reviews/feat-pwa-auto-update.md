# Review: feat/pwa-auto-update (PR #22, target v1.13.0)

Date: 2026-10-01 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. All four in-diff findings (two medium, two low) are fixed with regression tests. Reviewed at f544e4c.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/hooks/useTimer.js:4-15, src/App.jsx:312-343 | A running timer restored from a closed tab had no upper limit, so a forgotten session could be logged as days of study and XP. | Fixed in 32e76ce. A running timer is only resumed if it started within the last 12 hours, on or after 2020-01-01 and not in the future. Otherwise it comes back paused at the time it was last seen running (a new `lastSeenAt` heartbeat in `sb-timer`), or at its last paused value if there is no usable heartbeat. Tests: src/hooks/useTimer.test.js |
| R2 | medium | correctness | src/hooks/useAppUpdate.js:13-16 | Auto-reload treated "no timer and no dialog" as safe, so unsaved Add subject, PDF import or onboarding state could be lost. | Fixed in 16b6e70. The update is only applied automatically when the app is on the planner (not Settings or onboarding) and no text field is focused or holds unsaved text. The session note is marked `data-autosaved` because it survives a reload. In every other case the banner is shown. Tests: src/hooks/useAppUpdate.test.js, src/App.test.jsx |
| R3 | low | correctness | src/App.jsx:72, src/components/UpdateBanner.jsx:24 | The selected (timed) topic was not saved, so after Update now the timer label and the logged topic tag were lost. | Fixed in 8a3671d. While a session is in progress, `topicId` is saved in `sb-session-draft`. It is restored, with its subject selected, if it still exists on the timed subject. Test: src/App.test.jsx |
| R4 | low | tests | src/hooks/useTimer.test.js:113-123 | Nothing tested a saved timer with `startedAt: 0` or a future timestamp. | Fixed in 32e76ce, together with R1. Tests: src/hooks/useTimer.test.js ("does not resume a timer started at the epoch / in the future") |

Notes:
- R3 is low severity and more than a one-line change. It was fixed on this branch because the caller asked for every finding to be fixed. It is self-contained and has its own test.
- R1 trade-off: if a tab really was open and running for more than 12 hours and is then reloaded, the timer comes back paused at the full time it was seen running, not resumed. No time is lost; the user just presses Start again.
- README: the PWA paragraph now describes when an update is applied automatically, that the topic is saved, and the 12-hour resume limit.

## Follow-ups (not fixed on this branch)

None. The reviewer reported no pre-existing (`in_diff: false`) findings.

## Checks

lint pass · test pass (525 tests, 34 files) · build pass (main bundle 862.99 kB, 254.01 kB gzip)

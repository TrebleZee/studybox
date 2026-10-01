# Review: feat/version-label (PR #23, target v1.14.0)

Date: 2026-10-01 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: clean. The reviewer found no problems in the diff, so no code was changed. One pre-existing low finding is listed as a follow-up. Reviewed at 4ab2fe4.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | package-lock.json:3 | The lockfile root version is still 1.12.1. It was already stale on master (package.json was 1.13.0 there), and this branch bumps package.json to 1.14.0 without updating the lockfile. This has no effect at runtime: the app reads its version from package.json. | Not fixed. It is pre-existing (`in_diff: false`) and listed as a follow-up. |

## Follow-ups (not fixed on this branch)

- R1 (pre-existing, low): the root `version` in package-lock.json is 1.12.1 but package.json is 1.14.0, so `npm install` produces a lockfile diff. Run `npm install --package-lock-only` to bring them in line. Suggested branch: `fix/lockfile-version`.

## Checks

lint pass · test pass (527 tests, 35 files) · build pass (main bundle 863.29 kB, 254.09 kB gzip; only the existing warning about chunks over 500 kB)

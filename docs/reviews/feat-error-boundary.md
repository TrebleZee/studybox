# Review: feat/error-boundary (PR #33, target v1.17.0)

Date: 2026-10-05 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. The medium finding (the fallback's "Download backup" crashed on the same bad stored data that crashed the app) and the low finding (a migration step whose write failed was stamped as finished) are both fixed with a regression test each.

Reviewed at `8f35ad1`.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/store/appState.js (`storedBackup`), used by src/components/ErrorBoundary.jsx | The fallback's "Download backup" built its backup through the launch loaders and normalizers, so when stored data was what crashed the app (e.g. a `__proto__` subject id, N6), the download threw too: no file and no message, and Reload crashed again | Fixed in 90bbe17. `storedBackup` falls back to the raw parsed values of the account-scope keys (`sb-subjects`, `sb-sessions`, `sb-theme`, `sb-game`, `sb-tombstones`, never the Asana token) if any loader throws, so the download always holds what is on disk. Test `src/components/ErrorBoundary.test.jsx` "still downloads what is on disk when loading the stored data is what throws" (mocks `loaders.subjects` to throw, so it keeps proving the fallback after N6 is fixed) |
| R2 | low | invariant | src/store/migrations.js (behaviour changed by src/store/localStore.js `write`) | `saveJson` now returns false on a failed write instead of throwing, so a migration step whose write hit the quota was stamped as finished in `sb-schema` and never retried, breaking "a crash part-way never re-runs a finished one". Latent today (v3 is a no-op) | Fixed in 2e65f24. `runMigrations` hands steps a `saveJson` that throws when the write fails and stamps versions the same way, so a failed write stops the run before the version is recorded; `main.jsx` already catches and logs a failed migration. Test `src/store/migrations.test.js` "does not stamp a step as finished when one of its writes fails, so it retries next launch" |

Notes:

- R2 is low but fixed on this branch: the regression comes from this PR's change to `saveJson`, and the fix is confined to `runMigrations`. App writes outside migrations keep the new non-throwing behaviour the PR asks for.
- The raw fallback backup is re-importable: `parseBackup` normalizes on import. A file holding the data that crashes the normalizer will still fail to import until N6 is fixed, but the data is safe on disk outside the browser.

## Follow-ups (not fixed on this branch)

- N6 (pre-existing, low, tracked in `docs/readiness/findings.md`): `normalizeSubject` throws on a subject whose id is `__proto__`, `constructor` or `toString`, which is what makes R1's crash reachable from imported or merged data. Being fixed on `fix/preset-lookup-own-keys`.

## Checks

lint pass · test pass (45 files, 651 tests) · build pass (main bundle 885.77 kB, 261.95 kB gzip)

---
name: git-workflow
description: Use whenever making any code change in this repository - before editing, after editing, and when opening a PR. Branches instead of committing to master, classifies the change as a fix/feature/refactor, opens a PR, and tags the release once merged using this project's own semantic versioning rule.
---

# Git workflow: branch, classify, PR, tag

This repo never takes direct commits to `master`. Every change - no matter how small - goes through a branch and a PR. Follow this end to end, don't stop partway without saying so.

## 1. Before touching any file

Make sure `master` is current, then branch off it:

```bash
git checkout master
git pull
git checkout -b <prefix>/<short-description>
```

The prefix is decided by what the change actually is (see the classification table below) - `fix/`, `feat/`, `refactor/`, or `chore/`. Pick the prefix honestly even if it's inconvenient; it drives the version bump later, so getting it right matters more than it looks like it should. `<short-description>` is a few kebab-case words, e.g. `fix/streak-freeze-off-by-one`, `feat/gcse-onboarding-template`, `refactor/split-planner-view`.

If a task turns out to be a mix (say, a feature that also fixes an unrelated bug), don't split hairs - classify by the most significant change present, using the same precedence as the table below (feature beats fix, refactor is reserved for changes with no behavior change at all).

## 2. While working

Commit normally on the branch, as many commits as make sense. Keep `npm run lint`, `npm test`, and `npm run build` passing before opening the PR - don't hand over a red branch.

## 3. Classify the change and open the PR

| Change type | What qualifies | Branch prefix | Version bump |
| --- | --- | --- | --- |
| Bug fix | Fixes broken or incorrect behavior; no new capability | `fix/` | Patch: `x.y.Z+1` |
| New feature | Adds a new capability or user-facing behavior | `feat/` | Minor: `x.Y+1.0` |
| Refactor | Restructures code with no behavior change at all (e.g. the App.jsx decomposition) | `refactor/` | Major: `X+1.0.0` |
| Chore | Tooling, config or repo hygiene with no effect on the shipped app (e.g. `.gitattributes`, dev-only scripts, this skill) | `chore/` | None: merge, no tag |

This is this project's own versioning rule, not the conventional semver meaning of "major" (breaking change) - here major means refactor. Don't second-guess it against conventional semver; this is what's wanted here.

**One deliberate exception:** the switch from local-first storage to accounts/sync (the start of the social product) is released as `v2.0.0` even though it is a `feat/`, because it changes where every user's data lives. Social features after it are ordinary `feat/` minors on 2.x.

Push the branch and open the PR:

```bash
git push -u origin <prefix>/<short-description>
gh pr create --title "<short summary>" --body "<what changed and why>"
```

If `gh` isn't available in the environment, push the branch and give the person the compare URL (`https://github.com/<owner>/<repo>/compare/master...<branch>`) instead of failing silently.

## 3b. Review gate (`feat/` and `refactor/` only)

Before merging any `feat/` or `refactor/` PR, run an independent review. Merging deploys to Vercel, so the gate runs **before** merge: bugs are fixed in the same release instead of reaching users. `fix/` and `chore/` PRs skip it.

1. **Review.** Spawn the `release-reviewer` agent with the branch name and PR number. It's read-only and starts cold, so it isn't grading its own work. Don't pass it your own reasoning about the change; the diff and the PR description are enough.
2. **Fix.** If the verdict is `fixes-needed`, spawn the `release-fixer` agent with the branch, the PR number and the reviewer's findings verbatim. It fixes in-diff issues with a regression test each, writes `docs/reviews/<branch>.md` and pushes to the same branch. If the verdict is `clean`, the fixer still runs, only to write the report.
3. **Re-check.** If the fixer changed code, run `release-reviewer` once more on the fix commits only (`git diff <pre-fix-sha>..HEAD`). At most two rounds in total.
4. **Decide.**
   - No unresolved critical or high findings, and lint/test/build green: add the report's verdict line and a link to it in the PR body, then continue to step 4.
   - Any critical or high finding still unresolved, or the reviewer returned `blocked`: **don't merge.** Leave the PR open and tell the person what's outstanding (same as step 5).
5. **Follow-ups.** Pre-existing issues the reviewer found go in the report, not into this PR. Mention them in the final message so they can become `fix/` branches.

The report is a doc that ships with its change, so it lives in the same PR (see Edge cases), not a separate one.

## 4. Merge and tag

This is a solo-maintained repo with no required external reviewers, so once the PR is open, checks are green and (for `feat/` and `refactor/`) the review gate in step 3b has passed, merge it and tag the resulting `master` commit - don't leave the release half-finished:

```bash
gh pr merge <prefix>/<short-description> --squash --delete-branch
git checkout master
git pull
```

Work out the next version from the latest tag, not from `package.json` (they can drift, as they already have once in this repo):

```bash
git fetch --tags
git describe --tags --abbrev=0
```

Bump whichever segment the classification in step 3 calls for, reset everything to its right of it to zero, then tag and push:

```bash
git tag -a v<new-version> -m "<one-line summary of the release>"
git push origin v<new-version>
```

Then spawn the `release-publisher` agent with `v<new-version>` to publish the GitHub release for it. If it reports other tags with no release, let it backfill those too.

Also bump `"version"` in `package.json` to match `<new-version>` in the same PR (or a fast-follow commit on `master` if that's cleaner) - don't let the tag and the file disagree.

## 5. If merging is blocked

If the PR can't be merged automatically - failing checks, a merge conflict, or branch protection that requires a manual review - stop there, leave the PR open, and say so plainly rather than forcing it through or tagging a commit that isn't actually on `master` yet.

## Edge cases

- **First tag in a repo with none**: start at `v0.1.0` for a feature, `v0.0.1` for a fix - never assume `v1.0.0` for a first release unless asked.
- **Doc-only or config-only changes** (README, `instruction.md`, CI config) that ship alongside a code change: bundle them into that change's branch and PR, don't open a separate one.
- **A change that's purely internal tooling with no release-worthy effect** (e.g. editing this skill file itself): use a `chore/` branch, still PR it, but skip the tag - not every merged PR needs a new version.
- **Catalogue data**: one `feat/` PR per catalogue wave, never one per spec file, so versions don't inflate.

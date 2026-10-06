---
name: git-workflow
description: Use whenever making any code change in this repository - before editing, after editing, and when opening a PR. Claims the work, branches in its own worktree instead of committing to master, classifies the change as a fix/feature/refactor, opens a PR, and syncs, merges and tags the release one at a time using this project's own semantic versioning rule, so several sessions can work in parallel.
---

# Git workflow: claim, branch, classify, PR, sync, tag

This repo never takes direct commits to `master`. Every change - no matter how small - goes through a branch and a PR. Several sessions often work on it at once, each in its own worktree, so the steps below are written to keep them out of each other's way. Follow this end to end, don't stop partway without saying so.

## 1. Before touching any file

Never run `git checkout`, `git pull` or `git stash pop` in another session's checkout, and never switch the branch of the main checkout while other sessions are running.

**Pick work nobody has claimed.** Before you branch, check the item isn't already in flight:

```bash
git fetch origin --prune
gh pr list --state open      # open PRs, drafts included, are claims
git branch -r                # a pushed branch is a claim
git worktree list            # a locked worktree is a live session
```

If the branch the goal names already exists on `origin`, has an open PR or has a worktree, someone has it: pick the next item instead. The goal's **Parallel lanes** say which items can run side by side and which must wait. Never reuse a branch name that already exists on `origin`.

**Isolate, then branch off the latest `origin/master`.** A background session enters a worktree first (the `EnterWorktree` tool, or `git worktree add .claude/worktrees/<short-description> origin/master`). Then, inside the worktree:

```bash
git fetch origin
git switch -c <prefix>/<short-description> origin/master
```

This works in any worktree, even while `master` is checked out somewhere else; `git checkout master` does not. If the worktree tool made a placeholder branch (`worktree-<name>`), delete it once you've switched: `git branch -D worktree-<name>`.

**Claim it straight away.** Push the branch and open a draft PR before the real work starts, so every other session can see it:

```bash
git commit --allow-empty -m "Start <short-description> (<ledger ids>)"
git push -u origin <prefix>/<short-description>
gh pr create --draft --title "<short summary>" --body "Claims <goal item> (<ledger ids>). Work in progress."
```

The prefix is decided by what the change actually is (see the classification table below) - `fix/`, `feat/`, `refactor/`, or `chore/`. Pick the prefix honestly even if it's inconvenient; it drives the version bump later, so getting it right matters more than it looks like it should. `<short-description>` is a few kebab-case words, e.g. `fix/streak-freeze-off-by-one`, `feat/gcse-onboarding-template`, `refactor/split-planner-view`. When the goal names the branch, use that name.

If a task turns out to be a mix (say, a feature that also fixes an unrelated bug), don't split hairs - classify by the most significant change present, using the same precedence as the table below (feature beats fix, refactor is reserved for changes with no behavior change at all).

## 2. While working

Commit normally on the branch, as many commits as make sense, and push as you go. Keep `npm run lint`, `npm test`, and `npm run build` passing before marking the PR ready - don't hand over a red branch.

**Stay in your lane.** Don't edit files another open PR is changing (`gh pr diff <n> --name-only`) unless the goal puts the two items in the same lane. If you must, say so in both PRs. `docs/STATUS.md`, `docs/readiness/findings.md`, `instruction.md` and `README.md` are shared by every PR and are the exception: edit only the lines your change is about.

**Leave the version alone.** Don't bump `package.json` or write the new version anywhere on the branch. Other branches merge while yours is open, so the version is only known at merge time (step 4).

## 2b. Update the status page

Every PR updates `docs/STATUS.md` in the same branch. It is the maintainer's one-page summary, so keep it short and current. The sections only your change affects you write while working; the lines every PR touches you write at merge time, so parallel branches don't fight over them.

While working:

- **Progress against the plan:** move the phase's state on when this PR finishes or starts one.
- **Needs actioning:** delete what this PR made unnecessary; add anything only the maintainer can now do (a tag the session couldn't push, a decision, a check on a real device), with why and by when. Next agent steps go under **Agent**.
- **Known risks:** delete a risk this PR removes; add one a user should know about before it's fixed.

At merge time (step 4, after syncing with `origin/master`):

- **Recent changes:** add one row at the top for this PR: what changed for the user (or "no user-facing change"), the ledger ids it closes, and the version it will be tagged (or "none" for `chore/`). Keep the table to roughly the last dozen rows.
- **Current state:** the version (must equal `package.json`; `src/statusDoc.test.js` checks it) and `Last updated`.

**The rule: STATUS states only what is true once the PR that writes it has merged.** The PR is written before it merges, so anything that becomes true after (the latest tag, the release, the production commit, which PRs are open, whether a check is green or required, "merge this PR") is false by the time anyone reads it. Don't write those on the page; `src/statusDoc.test.js` fails on an "Open PRs", "Production", "Latest tag" or "Checks on" row, a production sha or "merge this PR" wording. They live on GitHub (`gh pr list`, `git ls-remote --tags origin`, the Releases page) and Vercel, and step 4g is where they get checked. `docs/readiness/findings.md`'s header follows the same rule.

## 3. Classify the change and mark the PR ready

| Change type | What qualifies | Branch prefix | Version bump |
| --- | --- | --- | --- |
| Bug fix | Fixes broken or incorrect behavior; no new capability | `fix/` | Patch: `x.y.Z+1` |
| New feature | Adds a new capability or user-facing behavior | `feat/` | Minor: `x.Y+1.0` |
| Refactor | Restructures code with no behavior change at all (e.g. the App.jsx decomposition) | `refactor/` | Major: `X+1.0.0` |
| Chore | Tooling, config or repo hygiene with no effect on the shipped app (e.g. `.gitattributes`, dev-only scripts, this skill) | `chore/` | None: merge, no tag |

This is this project's own versioning rule, not the conventional semver meaning of "major" (breaking change) - here major means refactor. Don't second-guess it against conventional semver; this is what's wanted here.

**One deliberate exception:** the switch from local-first storage to accounts/sync (the start of the social product) is released as `v2.0.0` even though it is a `feat/`, because it changes where every user's data lives. Social features after it are ordinary `feat/` minors on 2.x.

When the work is done and green, push, give the draft PR its real title and body (what changed and why, the ledger ids it closes) and mark it ready:

```bash
git push
gh pr edit <n> --title "<short summary>" --body "<what changed and why>"
gh pr ready <n>
```

If `gh` isn't available in the environment, push the branch and give the person the compare URL (`https://github.com/<owner>/<repo>/compare/master...<branch>`) instead of failing silently.

## 3b. Review gate (`feat/` and `refactor/` only)

Before merging any `feat/` or `refactor/` PR, run an independent review. Merging deploys to Vercel, so the gate runs **before** merge: bugs are fixed in the same release instead of reaching users. `fix/` and `chore/` PRs skip it. Reviews of different branches can run in parallel.

1. **Review.** Spawn the `release-reviewer` agent with the branch name, the PR number and the path of the worktree the branch is checked out in. It's read-only and starts cold, so it isn't grading its own work. Don't pass it your own reasoning about the change; the diff and the PR description are enough.
2. **Fix.** If the verdict is `fixes-needed`, spawn the `release-fixer` agent with the branch, the PR number, the worktree path and the reviewer's findings verbatim. It fixes in-diff issues with a regression test each, writes `docs/reviews/<branch>.md` and pushes to the same branch. If the verdict is `clean`, the fixer still runs, only to write the report.
3. **Re-check.** If the fixer changed code, run `release-reviewer` once more on the fix commits only (`git diff <pre-fix-sha>..HEAD`). At most two rounds in total.
4. **Decide.**
   - No unresolved critical or high findings, and lint/test/build green: add the report's verdict line and a link to it in the PR body, then continue to step 4.
   - Any critical or high finding still unresolved, or the reviewer returned `blocked`: **don't merge.** Leave the PR open and tell the person what's outstanding (same as step 5).
5. **Follow-ups.** Pre-existing issues the reviewer found go in the report, not into this PR. Mention them in the final message so they can become `fix/` branches.

The report is a doc that ships with its change, so it lives in the same PR (see Edge cases), not a separate one.

## 4. Sync, merge and tag (one branch at a time)

This is a solo-maintained repo with no required external reviewers, so once the PR is ready, checks are green and (for `feat/` and `refactor/`) the review gate in step 3b has passed, merge it and tag it - don't leave the release half-finished. Branches are built in parallel but merge one at a time: each merge changes the next one's version.

**a. Sync with `master`.** In the branch's worktree:

```bash
git fetch origin --tags
git merge origin/master
```

Merge, don't rebase: the PR is squashed anyway, and merging needs no force-push. Resolve conflicts in the shared files by keeping both sides: every row from `master` and every row of yours in `docs/STATUS.md` and `docs/readiness/findings.md`, `master`'s value for `package.json`'s `version`. Anything else that conflicts means two lanes overlapped; resolve it carefully and say so in the PR.

**b. Set the version.** Work it out from the latest tag, not from `package.json` (they can drift, as they already have once in this repo):

```bash
git describe --tags --abbrev=0 origin/master
```

Bump whichever segment the classification in step 3 calls for and reset everything to its right of it to zero. Set `"version"` in `package.json` to it, then write the merge-time lines of `docs/STATUS.md` (step 2b). `chore/` branches leave `package.json` alone and write "none".

**c. Check and push.** Run `npm run lint`, `npm test` and `npm run build`, commit, push, and wait for CI: `gh pr checks <n> --watch`.

**d. Make sure nothing merged meanwhile, then merge.** Immediately before merging:

```bash
git fetch origin --tags
git merge-base --is-ancestor origin/master HEAD && echo up to date
git ls-remote --tags origin v<new-version>   # must print nothing
```

If `master` moved, or the tag already exists, another branch merged first: go back to **a**. Otherwise merge at once, pinned to the commit you checked:

```bash
gh pr merge <n> --squash --delete-branch --match-head-commit "$(git rev-parse HEAD)"
```

**e. Tag the squash commit.** No checkout of `master` is needed, so this works from the worktree:

```bash
git fetch origin
git tag -a v<new-version> "$(gh pr view <n> --json mergeCommit -q .mergeCommit.oid)" -m "<one-line summary of the release>"
git push origin v<new-version>
```

If the push is refused because the tag exists, another session raced you: don't move or overwrite it. Leave a note under Needs actioning and tell the person. If the session isn't allowed to push tags, give the person the exact commands above and add them to Needs actioning.

Then spawn the `release-publisher` agent with `v<new-version>` to publish the GitHub release for it. If it reports other tags with no release, let it backfill those too.

**f. Clean up.** Leave the worktree (`ExitWorktree`, or `git worktree remove <path>` from another checkout) so its branch name is free.

**g. Post-merge check (the merger's step).** Whoever runs the merge (the maintainer's merger session) checks what the PR could not state, on GitHub, and writes none of it into STATUS: the tag exists on `origin` and points at the squash commit, the release is published, CI on the merge commit is green, and the deployment is live (Vercel). If something didn't happen as planned (a tag that couldn't be pushed, a release not published, a red `master`), add it to **Needs actioning** in the next PR or a `chore/` follow-up, worded as an action still to do (never as a status like "production is at X"), and delete the line when it's done.

## 4b. When a coordinator is running the lanes

If you were started as a worker by the `orchestrate` skill (your prompt says so), stop after step 3b with a ready PR: **don't merge or tag**. The coordinator runs step 4 for every lane, one at a time, and tells you if you need to merge `origin/master` again.

## 5. If merging is blocked

If the PR can't be merged automatically - failing checks, a merge conflict, or branch protection that requires a manual review - stop there, leave the PR open, and say so plainly rather than forcing it through or tagging a commit that isn't actually on `master` yet.

## Edge cases

- **First tag in a repo with none**: start at `v0.1.0` for a feature, `v0.0.1` for a fix - never assume `v1.0.0` for a first release unless asked.
- **Doc-only or config-only changes** (README, `instruction.md`, CI config) that ship alongside a code change: bundle them into that change's branch and PR, don't open a separate one.
- **A change that's purely internal tooling with no release-worthy effect** (e.g. editing this skill file itself): use a `chore/` branch, still PR it, but skip the tag - not every merged PR needs a new version.
- **Catalogue data**: one `feat/` PR per catalogue wave, never one per spec file, so versions don't inflate.
- **Two PRs ready at once**: merge whichever is ready first; the other goes back through step 4a. Expected versions in the goal are a forecast; the tags decide.
- **Abandoning a claim**: close the draft PR with a comment saying why and delete the remote branch, so the item shows as free again.

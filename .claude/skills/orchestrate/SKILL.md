---
name: orchestrate
description: Run the current goal's Parallel lanes as full Claude Code sessions instead of one session doing everything - pick the lanes that can start, choose each session's model by risk, launch one worker session per lane, watch them, run the review gate where needed, and merge their PRs one at a time. Use when asked to run lanes in parallel, start workers, fan out the goal, or coordinate other sessions.
---

# Orchestrate: one coordinator, one full session per lane

The goal (`.claude/commands/goal.md`) splits its work into **Parallel lanes**: queues of branches that don't share files. This skill turns each open lane into its own full Claude Code session (a "worker"), so several lanes progress at once, while one session (the "coordinator", you) keeps the parts that must stay serial: choosing what starts, merging, versions and the shared docs.

Workers are full sessions, not subagents: each has its own clone, context and tools, appears in the maintainer's Claude app, and can run its own subagents (the review gate). Subagents are still the right tool for short, read-only jobs inside one session.

## 0. Before launching anything

1. Read `docs/STATUS.md` (Needs actioning, Agent next steps) and the goal's **Parallel lanes** and **Stop and ask**.
2. Find what's already claimed. A claim is an open PR (drafts included), a pushed branch, or a live session:
   ```bash
   git fetch origin --prune
   gh pr list --state open          # or the GitHub MCP list_pull_requests
   git branch -r
   ```
   Also `list_sessions` (claude-code-remote MCP) and `ListAgents` for sessions already working here. Never launch a worker for a lane that has a live claim: the maintainer's local sessions count.
3. A lane can start only if its **Waits for** is satisfied and its next branch is unclaimed. Lanes whose next step is the maintainer's (a decision, a device check) are not started; they go in the report.
4. **At most 3 workers at once.** More than that and merge syncing, CI queueing and review cost more than the parallelism saves. Prefer the lanes whose items are `high` severity or block another lane.

## 1. Choose the model by risk

Each worker's model is set by the riskiest branch it will run before reporting back. The question is: *if this change is subtly wrong and passes the tests, what does a user lose, and would anyone notice?*

| Tier | Model (session id / subagent alias) | Use for | Examples in StudyBox |
| --- | --- | --- | --- |
| **Critical** | `claude-fable-5-1` / `fable` | Changes to the stored data model, merge semantics, tombstones or anything a sync engine will replicate, where a wrong fix silently corrupts or drops records on every device and no test catches the whole space. | Unknown-field preservation (N9), replace actions writing tombstones (N10), subtasks as records (N19), schema migrations, record order, the readiness audit |
| **High** | `claude-opus-5-5` / `opus` | Anything else that can lose, duplicate or misattribute a user's data, or touches the store layer, normalizers, undo, `App.jsx` record handlers, the service-worker update path or security headers. Also the coordinator, every review and every plan. | Storage guards (N16/N17), undo restore (N11), timer ownership (N12), orphaned timer subject (N15), update reload guard (N18), `release-reviewer`, `release-fixer`, `readiness-planner` |
| **Standard** | `claude-sonnet-5-5` / `sonnet` | A fix confined to one component or hook, no stored-data shape change, a reproducing test is straightforward. | Session edit keeps seconds (N21), Android reminders (N20), docs-only updates |
| **Mechanical** | `claude-haiku-4-5-20251001` / `haiku` | No product code: config, ignore files, release notes, link fixes. | `chore/ignore-drafts` (C10), `release-publisher` |

Rules that override the table:

- **The tier is the highest any branch in the run needs.** A lane whose queue goes A2.9 (High) → A3.2 (Critical) runs at Critical, or the worker stops after A2.9 and the coordinator launches A3.2 separately.
- **Review at least one tier up from the author, never below Opus.** Every branch written by a Standard or Mechanical worker gets a `release-reviewer` pass even when it is a `fix/` (which normally skips the gate). Critical branches are reviewed with `release-reviewer` run as `fable` (Agent tool `model: "fable"`).
- **Escalate, never silently downgrade.** If a worker hits a Stop-and-ask condition, fails CI twice on the same cause, or its review returns a `high` or `critical` finding, archive it and relaunch the lane one tier up with what it learned. Only the maintainer lowers a tier.
- **Severity is a floor.** A ledger `high` or `critical` finding is never worked below High.
- Record the tier and model in the worker's draft PR body ("Model: claude-opus-5-5, tier High") so the choice is reviewable.

Model ids change: check the session's model list (or the `claude-api` skill) before launching, and update this table in a `chore/` PR when the line-up moves.

## 2. Launch a worker

Use `create_session` (claude-code-remote MCP; load it with ToolSearch if deferred):

- `source_url`: `https://github.com/TrebleZee/studybox`
- `model`: from step 1
- `outcome_branch`: the lane's next branch name exactly as the goal gives it (the session pushes there, no suffix)
- `title`: `Lane <n>: <branch>`
- `tags`: `["studybox", "lane-<n>", "tier-<tier>"]`
- `permission_mode`: omit (inherits). **Never `plan`**: nobody is watching to approve it and the worker would stall.
- `prompt`: the template in `worker-prompt.md` next to this file, filled in. It must stand alone: the worker starts cold and cannot see this conversation.

Launch the chosen workers in one turn, then write each one's session id, lane, branch, model and launch time into the coordinator's notes (the conversation is enough; nothing needs committing).

## 3. Watch without polling

- Subscribe to each worker's PR as soon as its draft appears (`subscribe_pr_activity`), so CI results, reviews and its "ready" flip wake you.
- Arm one `send_later` check-in about 45 minutes out as a safety net. When it fires: `get_session` for each worker (`status_bucket`: `failed` means its turn errored; `blocked` means it is waiting on a question), `list_events` with `kinds: ["assistant", "result"]` for the last few turns, and the PR state. Re-arm while any worker is live.
- Never `sleep` in Bash to wait for a worker.
- A worker that asks a question: answer it with `send_message` if the goal or the Decisions already made answer it; otherwise it is the maintainer's, so put it under Needs actioning and tell the maintainer.
- A worker that has gone off-track: `interrupt_session`, then `send_message` with the correction. Twice off-track is an escalation (step 1).

## 4. Merge, one at a time

Workers stop at a ready PR: green CI, review gate done, the PR body listing the ledger ids, tests and the docs lines they changed. **Only the coordinator merges**, following `git-workflow` step 4 (sync with `origin/master`, set the version from the latest tag, write the merge-time lines of `docs/STATUS.md`, check nothing merged meanwhile, merge pinned to the head commit, tag, publish the release).

- Merge in the order PRs become ready, except that a branch another lane waits for goes first.
- After each merge, tell the other live workers whose files overlapped (`send_message`: "master moved; merge origin/master before you mark ready").
- **Tags from a cloud coordinator:** cloud sessions here can't push tags. Collect the exact `git tag -a … && git push origin …` commands in Needs actioning and in the report, and don't merge a second versioned PR on top of an untagged one: the next version would be computed from the stale tag. Chores can still merge.
- **Split coordination.** The merger can be a different session from the launcher: for example, the maintainer's local session merges and tags (it can push tags), while a cloud session launches and watches. Agree on one merger, and say in every worker prompt who it is. The launcher then never merges; it subscribes to every worker PR so that the merge wakes it.
- **Repurpose a lane the moment its PR merges.** When a lane's PR merges, whoever merged it:
  1. archive that lane's worker (`archive_session`);
  2. check the lane's next item: unclaimed, and its **Waits for** met now that this PR is live;
  3. if it can start, launch a fresh worker for it at once, with the model the lanes table gives it (a fresh session, not the old one, so it starts from the new `master` with a clean context);
  4. if it can't start yet, give the slot to the highest-priority startable item in a lane with no live worker (a `high` finding first, then whatever unblocks another lane), keeping to at most 3 workers;
  5. tell live workers whose files overlapped the merged PR to merge `origin/master`.

  Never wait for the next scheduled check-in to do this: the merge event is the trigger.

## 5. Finish

When every started lane is merged or blocked:

1. `archive_session` each finished worker (only after its PR is merged or closed).
2. Update `docs/STATUS.md` in the last merge (or a `chore/` follow-up): Progress, Agent next steps, the lanes still waiting and why.
3. Report to the maintainer:
   - each lane with its PR, version and model;
   - escalations and why;
   - tags to push;
   - questions waiting on them;
   - what it cost in sessions, as a count of sessions per tier.

## Stop and ask

- Two workers' PRs change the same non-shared file: the lanes were wrong. Pause the later one and ask before merging both.
- A worker wants to change a decision in the goal's Decisions already made.
- The goal's own Stop-and-ask conditions, which apply to every worker.
- More than 3 workers would be needed to keep to the plan's dates: say so rather than launching more.

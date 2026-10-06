# Worker prompt template

The coordinator fills in every `<…>` and sends the result as the `prompt` of `create_session`. Keep it self-contained: the worker starts cold, in its own clone, with only this text, the repo's `CLAUDE.md` (which imports `instruction.md`) and the skills in `.claude/skills/`.

---

You are a worker session on StudyBox (`TrebleZee/studybox`), started by a coordinator session that is running the goal's lanes in parallel. Your job is one lane item, taken to a ready PR. Other sessions are working other lanes at the same time.

**Your item:** <goal item id and title, e.g. "A2.9 Unreadable or blocked storage never costs data">
**Branch:** `<branch name from the goal>` (push only to this branch)
**Closes:** <ledger ids>
**Lane:** <n>: <lane name>. Main files: <files from the Parallel lanes table>. Don't edit files outside them except the shared docs (`docs/STATUS.md`, `docs/readiness/findings.md`, `instruction.md`, `README.md`), and there only the lines about your change.
**Model and tier:** <model id>, <tier>. Put this line in your PR body.
**Review:** <"Run the review gate (git-workflow step 3b)" | "Critical tier: run release-reviewer twice, independently (two Agent calls on opus, the second not shown the first's findings), then release-fixer with both" | "This is a fix/ written below Opus: run release-reviewer once anyway (step 3b, steps 1-3) and fix what it finds">.

Do this:

1. Read `docs/STATUS.md`, then the goal's section for your item in `.claude/commands/goal.md`, its Ground rules, Decisions already made and Stop and ask. The goal is the spec; follow its Build and Done when exactly.
2. Follow the `git-workflow` skill steps 1 to 3b. Check the item isn't already claimed (open PRs, `git branch -r`); if it is, stop and say so. Branch off `origin/master`, claim it with a draft PR at once, and reproduce the finding with a failing test before changing code.
3. Don't bump `package.json`, don't write the new version anywhere, and don't write the merge-time lines of `docs/STATUS.md` (Recent changes row, Current state). Do update Progress, Needs actioning and Known risks for your change, and move your finding to Closed in `docs/readiness/findings.md` with the test that proves it.
4. When lint, test and build are green locally and in CI and the review is done, give the PR its real title and body: what changed, the ledger ids it closes, the test for each, the docs lines you changed, and the model and tier. Then mark it ready.
5. **Stop there. Do not merge or tag.** The coordinator merges every lane one at a time. If the coordinator tells you `master` moved, merge `origin/master` into your branch (never rebase or force-push), re-run the checks and push.

If you hit one of the goal's Stop-and-ask conditions, a decision that isn't in the goal, or the same CI failure twice, stop. Say exactly what is blocking in your last message and in the PR, and wait for the coordinator.

<optional: anything the coordinator learned that this worker needs, e.g. "master moved to include #45, which changed normalizeSessions">

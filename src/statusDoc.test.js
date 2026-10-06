import { describe, expect, it } from "vitest";
import status from "../docs/STATUS.md?raw";
import findings from "./../docs/readiness/findings.md?raw";
import pkg from "../package.json";

// docs/STATUS.md is the maintainer's one-page summary and every PR keeps it
// current (git-workflow skill, step 2b). These checks catch the commonest drift.
const sections = ["## Current state", "## Recent changes", "## Progress against the plan", "## Needs actioning", "## Known risks"];

describe("docs/STATUS.md", () => {
  it("has every section the workflow fills in", () => {
    sections.forEach((heading) => expect(status).toContain(`\n${heading}\n`));
  });

  it("states the version package.json ships", () => {
    expect(status).toMatch(new RegExp(`\\| Current version \\| ${pkg.version.replaceAll(".", "\\.")} \\|`));
  });

  it("carries a last-updated date", () => {
    expect(status).toMatch(/^Last updated: \d{4}-\d{2}-\d{2}$/m);
  });

  // C13: STATUS is written inside the PR, before it merges, so it may hold only
  // what is true once that PR has merged. Anything that becomes true afterwards
  // (production, open PRs, tags, check state, "merge this PR") is post-merge
  // and lives on GitHub, not on this page (git-workflow step 4g).
  describe("carries no post-merge facts (C13)", () => {
    const banned = [
      ["an Open PRs row", /^\|\s*Open PRs\s*\|/im],
      ["a Production row", /^\|\s*Production\s*\|/im],
      ["a production commit sha", /deployed from\b|\bmaster`? @ `?[0-9a-f]{7,40}/i],
      ["a latest-tag row", /^\|\s*Latest tag/im],
      ["a required-check state row", /^\|\s*Checks on\b/im],
      ["merge-this-PR wording", /\bmerge this (PR|pull request)\b/i],
    ];

    it.each(banned)("has no %s", (_name, pattern) => {
      expect(status).not.toMatch(pattern);
    });

    it("keeps the ledger header free of tag and production facts too", () => {
      const header = findings.split("\n## Open\n")[0];
      expect(header).not.toMatch(/newest tag|production|deployed from/i);
    });
  });
});

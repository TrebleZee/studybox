import { describe, expect, it } from "vitest";
import auditor from "../.claude/agents/readiness-auditor.md?raw";
import planner from "../.claude/agents/readiness-planner.md?raw";
import fixer from "../.claude/agents/release-fixer.md?raw";
import publisher from "../.claude/agents/release-publisher.md?raw";
import reviewer from "../.claude/agents/release-reviewer.md?raw";
import goal from "../.claude/commands/goal.md?raw";

// Models are chosen by risk (orchestrate skill, step 1). Reviews, fixes, plans
// and the audit never run below Opus. Fable is not used: the account has no
// usage credits for it (maintainer decision, 2026-10-06).
const RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };
const modelOf = (definition) => definition.match(/^---\n[\s\S]*?^model: (\w+)$[\s\S]*?^---$/m)?.[1];

describe("agent models", () => {
  it.each([
    ["readiness-auditor", auditor, "opus"],
    ["readiness-planner", planner, "opus"],
    ["release-reviewer", reviewer, "opus"],
    ["release-fixer", fixer, "opus"],
    ["release-publisher", publisher, "haiku"],
  ])("%s pins a model at or above its floor", (_name, definition, floor) => {
    const model = modelOf(definition);
    expect(Object.keys(RANK)).toContain(model);
    expect(RANK[model]).toBeGreaterThanOrEqual(RANK[floor]);
  });

  it("never pins an agent to Fable", () => {
    [auditor, planner, reviewer, fixer, publisher].forEach((definition) => expect(modelOf(definition)).not.toBe("fable"));
  });

  it("gives every lane in the goal a model", () => {
    const start = goal.indexOf("## Parallel lanes");
    if (start === -1) return; // a goal without lanes runs in one session
    const rows = goal
      .slice(start)
      .split("\n")
      .filter((line) => /^\| \d+\./.test(line));
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row).toMatch(/`claude-[a-z0-9-]+` \((Critical|High|Standard|Mechanical)[^)]*\)/);
      expect(row).not.toMatch(/claude-fable/);
    });
  });
});

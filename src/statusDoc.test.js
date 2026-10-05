import { describe, expect, it } from "vitest";
import status from "../docs/STATUS.md?raw";
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
});

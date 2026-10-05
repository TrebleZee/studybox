import { describe, expect, it } from "vitest";
import raw from "../.github/workflows/ci.yml?raw";

// C7: a newer push must never cancel the CI run of a commit on master, or a
// commit can reach production unverified. Pull requests may still cancel.
const workflow = raw.replace(/\r\n/g, "\n");
const setting = (name) => workflow.match(new RegExp(`^  ${name}: (.+)$`, "m"))?.[1];

describe("CI concurrency (C7)", () => {
  it("still runs on pull requests and on pushes to master", () => {
    expect(workflow).toMatch(/^on:\n {2}pull_request:\n {2}push:\n {4}branches: \[master\]$/m);
  });

  it("gives every push its own group, so a master run is never replaced", () => {
    expect(setting("group")).toBe(
      "${{ github.event_name == 'pull_request' && format('ci-pr-{0}', github.ref) || format('ci-push-{0}', github.run_id) }}"
    );
  });

  it("cancels in progress only for pull requests", () => {
    expect(setting("cancel-in-progress")).toBe("${{ github.event_name == 'pull_request' }}");
  });
});

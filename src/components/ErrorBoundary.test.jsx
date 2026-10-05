import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary.jsx";

const captureDownload = () => {
  let blob;
  URL.createObjectURL = vi.fn((b) => {
    blob = b;
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return async () => JSON.parse(await blob.text());
};

function Boom() {
  throw new Error("render failed");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error; keep the test output quiet.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("All fine")).toBeTruthy();
  });

  it("shows a fallback whose backup comes straight from storage, without the Asana token", async () => {
    const user = userEvent.setup();
    const downloaded = captureDownload();
    localStorage.setItem(
      "sb-subjects",
      JSON.stringify([{ id: "maths", name: "Maths", topics: [{ id: "t1", name: "Algebra", done: true, subtasks: [] }] }])
    );
    localStorage.setItem(
      "sb-sessions",
      JSON.stringify([{ id: "s1", subjectId: "maths", subjectName: "Maths", duration: 600, date: "2026-09-14T10:00:00.000Z" }])
    );
    localStorage.setItem("studybox_asana_pat", "1/secret-token");

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert").textContent).toMatch(/went wrong/);
    await user.click(screen.getByRole("button", { name: "Download backup" }));
    const backup = await downloaded();
    expect(backup.subjects.map((s) => s.id)).toEqual(["maths"]);
    expect(backup.subjects[0].topics[0].done).toBe(true);
    expect(backup.sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(JSON.stringify(backup)).not.toContain("secret-token");
  });

  it("offers a reload", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    render(
      <ErrorBoundary reload={reload}>
        <Boom />
      </ErrorBoundary>
    );
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});

import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/helpers.jsx";

// A template whose spec chunks arrive only when the test says so, to
// reproduce a slow first-visit load racing another onboarding action.
const pending = vi.hoisted(() => ({ resolve: null }));
vi.mock("../utils/catalogue.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    subjectsForTemplate: vi.fn(async (templateId) => {
      const subjects = await actual.subjectsForTemplate(templateId);
      await new Promise((resolve) => (pending.resolve = resolve));
      return subjects;
    }),
  };
});

describe("onboarding with a slow template load", () => {
  it("a template that resolves after a backup restore does not overwrite the restored subjects", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Use GCSE core subjects/ }));
    await vi.waitFor(() => expect(pending.resolve).toBeTypeOf("function"));

    // fireEvent bypasses the disabled input, so this exercises App's own guard.
    const backup = {
      subjects: [{ id: "bio", name: "Biology", exam: "AQA", color: "#00ff00", topics: [] }],
      sessions: [{ id: "s1", subjectId: "bio", subjectName: "Biology", duration: 60 }],
      theme: "slate",
      version: 1,
    };
    const input = screen.getByLabelText("Restore backup file");
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File([JSON.stringify(backup)], "backup.json", { type: "application/json" })],
    });
    fireEvent.change(input);
    expect(await screen.findByRole("button", { name: "Biology" })).toBeTruthy();

    await act(async () => pending.resolve());
    expect(screen.getByRole("button", { name: "Biology" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "English Language" })).toBeNull();
    expect(JSON.parse(localStorage.getItem("sb-subjects")).map((s) => s.id)).toEqual(["bio"]);
  });
});

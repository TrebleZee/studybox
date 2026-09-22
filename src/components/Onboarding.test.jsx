import { act, render, screen } from "@testing-library/react";
import Onboarding from "./Onboarding.jsx";
import { THEMES } from "../utils/themes.js";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/helpers.jsx";
import {
  TEMPLATES,
  defaultSubjects,
  normalizeSubjects,
} from "../utils/subjects.js";
import { subjectsForTemplate } from "../utils/catalogue.js";

describe("first-run onboarding", () => {
  it("appears on a clean slate instead of the planner, offering every template", () => {
    renderApp({ onboarded: false });
    expect(screen.getByText("Welcome to StudyBox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start blank/ })).toBeTruthy();
    TEMPLATES.forEach((template) => {
      expect(screen.getByRole("button", { name: new RegExp(`Use ${template.name}`) })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Planner" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Physics" })).toBeNull();
  });

  it("start blank gives an empty subject list with an add-subject prompt", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Start blank/ }));

    expect(screen.getByText("No subjects yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add your first subject" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-subjects"))).toEqual([]);
    expect(localStorage.getItem("sb-onboarded")).toBe("true");
  });

  it("the A-Level template starts from defaultSubjects with everything unchecked", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Use A-Level example set/ }));

    expect(screen.getByRole("button", { name: "Physics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Computer Science" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-subjects"))).toEqual(normalizeSubjects(defaultSubjects()));
    expect(localStorage.getItem("sb-onboarded")).toBe("true");
  });

  it("selecting the GCSE template loads its catalogue subjects, not the A-Level ones", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Use GCSE core subjects/ }));

    expect(await screen.findByRole("button", { name: "English Language" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "English Literature" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Combined Science" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Physics" })).toBeNull();
    expect(JSON.parse(localStorage.getItem("sb-subjects"))).toEqual(await subjectsForTemplate("gcse"));
    expect(localStorage.getItem("sb-onboarded")).toBe("true");
  });

  it("shows an error and re-enables the templates if one can't be loaded", async () => {
    const user = userEvent.setup();
    let fail;
    const onUseTemplate = vi.fn(() => new Promise((resolve) => (fail = resolve)));
    render(
      <Onboarding C={THEMES[0].colors} onStartBlank={() => {}} onUseTemplate={onUseTemplate} onRestore={() => {}} />
    );
    await user.click(screen.getByRole("button", { name: /Use GCSE core subjects/ }));

    expect(onUseTemplate).toHaveBeenCalledWith("gcse");
    const busy = screen.getByRole("button", { name: /Use GCSE core subjects \(loading/ });
    expect(busy.disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Use A-Level example set/ }).disabled).toBe(true);

    await act(async () => fail({ ok: false, error: "That template couldn't be loaded." }));
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't be loaded/);
    const ready = screen.getByRole("button", { name: /Use GCSE core subjects/ });
    expect(ready.disabled).toBe(false);
    expect(ready.textContent).not.toMatch(/loading/);
  });

  it.each(["Start blank", "Use A-Level example set", "Use GCSE core subjects"])(
    "does not reappear after dismissal (%s) and a reload",
    async (name) => {
      const user = userEvent.setup();
      const first = renderApp({ onboarded: false });
      await user.click(screen.getByRole("button", { name: new RegExp(name) }));
      await screen.findByRole("button", { name: "Planner" });
      first.unmount();

      renderApp({ onboarded: false });
      expect(screen.queryByText("Welcome to StudyBox")).toBeNull();
      expect(screen.getByRole("button", { name: "Planner" })).toBeTruthy();
    }
  );

  it("is skipped for existing users who already have data", () => {
    localStorage.setItem(
      "sb-sessions",
      JSON.stringify([{ id: "s", subjectId: "physics", subjectName: "Physics", duration: 60 }])
    );
    renderApp({ onboarded: false });
    expect(screen.queryByText("Welcome to StudyBox")).toBeNull();

    localStorage.clear();
    const edited = defaultSubjects();
    edited[0].name = "Mine";
    localStorage.setItem("sb-subjects", JSON.stringify(edited));
    renderApp({ onboarded: false });
    expect(screen.queryByText("Welcome to StudyBox")).toBeNull();
  });

  it("lets a user restore a backup straight from the welcome screen", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });

    const backup = {
      subjects: [{ id: "bio", name: "Biology", exam: "AQA", color: "#00ff00", topics: [] }],
      sessions: [],
      theme: "slate",
      version: 1,
    };
    await user.upload(
      screen.getByLabelText("Restore backup file"),
      new File([JSON.stringify(backup)], "backup.json", { type: "application/json" })
    );

    expect(await screen.findByRole("button", { name: "Biology" })).toBeTruthy();
    expect(screen.queryByText("Welcome to StudyBox")).toBeNull();
  });

  it("shows an error for a bad backup and stays on the welcome screen", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.upload(
      screen.getByLabelText("Restore backup file"),
      new File(["nope"], "bad.json", { type: "application/json" })
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/valid JSON/);
    expect(screen.getByText("Welcome to StudyBox")).toBeTruthy();
  });
});

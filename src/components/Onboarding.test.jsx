import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/helpers.jsx";
import { TEMPLATES, defaultSubjects, subjectsForTemplate } from "../utils/subjects.js";

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
    expect(JSON.parse(localStorage.getItem("sb-subjects"))).toEqual(defaultSubjects());
    expect(localStorage.getItem("sb-onboarded")).toBe("true");
  });

  it("selecting the GCSE template loads its own core subjects, not the A-Level ones", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Use GCSE core subjects/ }));

    expect(screen.getByRole("button", { name: "English" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Combined Science" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Physics" })).toBeNull();
    expect(JSON.parse(localStorage.getItem("sb-subjects"))).toEqual(subjectsForTemplate("gcse"));
    expect(localStorage.getItem("sb-onboarded")).toBe("true");
  });

  it.each(["Start blank", "Use A-Level example set", "Use GCSE core subjects"])(
    "does not reappear after dismissal (%s) and a reload",
    async (name) => {
      const user = userEvent.setup();
      const first = renderApp({ onboarded: false });
      await user.click(screen.getByRole("button", { name: new RegExp(name) }));
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

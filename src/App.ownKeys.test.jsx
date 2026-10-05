import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { goTo, renderApp } from "./test/helpers.jsx";

// Stored ids named after Object.prototype members (N6): the app must start,
// and every per-subject tally must count them like any other id.
const HOSTILE_IDS = ["__proto__", "constructor", "toString", "hasOwnProperty"];

describe("stored ids named after Object.prototype members (N6)", () => {
  it("starts, shows every subject and tallies each one's study time", async () => {
    const now = new Date().toISOString();
    const subjects = HOSTILE_IDS.map((id, index) => ({
      id,
      name: `Subject ${index}`,
      exam: "Custom",
      color: "#60A5FA",
      topics: [{ id, name: `Topic ${index}`, done: false, subtasks: [] }],
      milestones: [{ id, name: `Milestone ${index}`, kind: id, due: "2027-03-01", done: false }],
    }));
    // 1, 2, 3 and 4 hours: shares of 10%, 20%, 30% and 40%.
    const sessions = HOSTILE_IDS.map((id, index) => ({
      id,
      subjectId: id,
      subjectName: `Subject ${index}`,
      duration: (index + 1) * 3600,
      date: now,
    }));
    localStorage.setItem("sb-subjects", JSON.stringify(subjects));
    localStorage.setItem("sb-sessions", JSON.stringify(sessions));

    const user = userEvent.setup();
    renderApp();
    HOSTILE_IDS.forEach((_, index) => {
      expect(screen.getAllByText(`Subject ${index}`).length).toBeGreaterThan(0);
    });

    await goTo(user, "Analysis");
    HOSTILE_IDS.forEach((_, index) => {
      expect(screen.getByTitle(`Subject ${index}: ${(index + 1) * 10}%`)).toBeTruthy();
    });
    expect({}.toString).toBe(Object.prototype.toString);
  });
});

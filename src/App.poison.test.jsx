import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { goTo, renderApp } from "./test/helpers.jsx";

// Wrong-type fields in a backup or in storage (N13): an object where a name,
// colour, note or tag belongs used to persist and crash rendering on every
// launch. The app must stay up and every view must open.
const now = new Date().toISOString();

const poisonedSubjects = () => [
  {
    id: "poison",
    name: { evil: true },
    exam: "Custom",
    color: { evil: true },
    topics: [
      {
        id: "poison-t1",
        name: { evil: true },
        done: true,
        subtasks: [{ id: { evil: true }, name: ["evil"], done: false }],
      },
      { id: ["evil"], name: 42, done: false, subtasks: "evil" },
    ],
    milestones: [{ id: "poison-m1", name: { evil: true }, kind: "nea", due: null, done: false }],
  },
  { id: { evil: true }, name: "Object id", exam: "Custom", topics: { evil: true } },
];

const poisonedSessions = () => [
  {
    id: "poison-s1",
    subjectId: "poison",
    subjectName: { evil: true },
    subjectColor: { evil: true },
    duration: 1800,
    date: now,
    note: { evil: true },
    tags: [{ evil: true }, "Recap", 7, null],
  },
  {
    id: { evil: true },
    subjectId: { evil: true },
    subjectName: ["evil"],
    duration: 600,
    date: { evil: true },
    note: ["evil"],
    tags: "evil",
  },
];

const poisonFile = () =>
  new File(
    [JSON.stringify({ version: 3, subjects: poisonedSubjects(), sessions: poisonedSessions() })],
    "poison.json",
    { type: "application/json" }
  );

const visitEveryView = async (user) => {
  for (const view of ["Log", "Analysis", "Planner", "Settings"]) {
    await goTo(user, view);
  }
  await goTo(user, "Log");
  // The poisoned session is still listed, under a usable name and its real tag.
  expect(screen.getAllByText("Recap").length).toBeGreaterThan(0);
};

describe("wrong-type fields (N13)", () => {
  it("survive Restore from file", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Restore backup file"), poisonFile());
    expect(await screen.findByText(/restored/i)).toBeTruthy();
    await visitEveryView(user);
  });

  it("survive Merge from file", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Merge backup file"), poisonFile());
    expect(await screen.findByText("Backup merged with the data on this device.")).toBeTruthy();
    await visitEveryView(user);
  });

  it("already in storage let the app start", async () => {
    localStorage.setItem("sb-subjects", JSON.stringify(poisonedSubjects()));
    localStorage.setItem("sb-sessions", JSON.stringify(poisonedSessions()));
    const user = userEvent.setup();
    renderApp();
    await visitEveryView(user);
  });
});

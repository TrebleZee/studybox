import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { goTo, renderApp } from "../test/helpers.jsx";
import { THEMES } from "../utils/themes.js";
import MilestoneStrip from "./MilestoneStrip.jsx";

const C = THEMES[0].colors;
const NOW = new Date(2027, 4, 10, 12); // 10 May 2027, local

const SUBJECTS = [
  {
    id: "cs",
    name: "Computer Science",
    color: "#FBBF24",
    topics: [],
    milestones: [
      { id: "m1", name: "NEA final hand-in", kind: "nea", due: "2027-05-20", done: false },
      { id: "m2", name: "NEA design", kind: "nea", due: "2027-05-01", done: false },
      { id: "m3", name: "Analysis", kind: "coursework", due: "2027-03-01", done: true },
    ],
  },
  {
    id: "phys",
    name: "Physics",
    color: "#4F9CF9",
    topics: [],
    milestones: [
      { id: "m4", name: "Practical endorsement", kind: "practical", due: null, done: false },
      { id: "m5", name: "PAG 3", kind: "practical", due: "2027-05-12", done: false },
    ],
  },
];

const renderStrip = (props = {}) => {
  const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn(), onConvertTopic: vi.fn(), onKeepTopic: vi.fn() };
  render(<MilestoneStrip C={C} subjects={SUBJECTS} defaultSubjectId="cs" now={NOW} {...handlers} {...props} />);
  return handlers;
};

const openRows = () =>
  within(screen.getByRole("region", { name: "Milestones" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("MilestoneStrip", () => {
  it("lists open milestones across subjects by due date, undated last", () => {
    renderStrip();
    const rows = openRows();
    expect(rows.map((r) => r.split(" · ")[0])).toEqual([
      "NEA design",
      "PAG 3",
      "NEA final hand-in",
      "Practical endorsement",
    ]);
    expect(rows[1]).toContain("Physics");
    expect(rows[1]).toContain("Due in 2 days");
    expect(rows[3]).toContain("No date");
    expect(screen.getByText("4 to do · 1 overdue")).toBeTruthy();
  });

  it("highlights overdue milestones", () => {
    renderStrip();
    const overdue = screen.getByText(/Overdue by 9 days/);
    expect(overdue.getAttribute("data-overdue")).toBe("true");
    expect(screen.getByText(/Due in 10 days/).getAttribute("data-overdue")).toBeNull();
  });

  it("completes a milestone inline", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    await user.click(screen.getByLabelText("Complete milestone PAG 3"));
    expect(h.onUpdate).toHaveBeenCalledWith("phys", "m5", { done: true });
  });

  it("keeps completed milestones behind a toggle and can reopen them", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    expect(screen.queryByText(/^Analysis/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /Completed milestones \(1\)/ }));
    await user.click(screen.getByLabelText("Reopen milestone Analysis"));
    expect(h.onUpdate).toHaveBeenCalledWith("cs", "m3", { done: false });
  });

  it("adds a milestone to the chosen subject", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    await user.click(screen.getByRole("button", { name: "Add milestone" }));
    expect(screen.getByLabelText("Milestone subject").value).toBe("cs");
    await user.selectOptions(screen.getByLabelText("Milestone subject"), "phys");
    await user.type(screen.getByLabelText("Milestone name"), "PAG 4");
    await user.selectOptions(screen.getByLabelText("Milestone kind"), "practical");
    await user.type(screen.getByLabelText("Milestone due date"), "2027-06-01");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(h.onAdd).toHaveBeenCalledWith("phys", { name: "PAG 4", kind: "practical", due: "2027-06-01" });
  });

  it("does not add a milestone without a name", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    await user.click(screen.getByRole("button", { name: "Add milestone" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(h.onAdd).not.toHaveBeenCalled();
  });

  it("edits a milestone's name, kind and date inline", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    await user.click(screen.getByRole("button", { name: "Edit milestone NEA design" }));
    const name = screen.getByLabelText("Milestone name for NEA design");
    await user.clear(name);
    await user.type(name, "NEA design doc");
    const due = screen.getByLabelText("Milestone due date for NEA design");
    await user.clear(due);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(h.onUpdate).toHaveBeenCalledWith("cs", "m2", { name: "NEA design doc", kind: "nea", due: null });
  });

  it("deletes a milestone", async () => {
    const user = userEvent.setup();
    const h = renderStrip();
    await user.click(screen.getByRole("button", { name: "Delete milestone PAG 3" }));
    expect(h.onDelete).toHaveBeenCalledWith("phys", "m5");
  });

  it("offers NEA topics as milestones only after an explicit confirm", async () => {
    const user = userEvent.setup();
    const subjects = [
      { id: "cs", name: "Computer Science", color: "#fff", topics: [{ id: "t9", name: "NEA Programming Project", done: false, subtasks: [] }] },
    ];
    const h = renderStrip({ subjects });
    const offer = screen.getByRole("group", { name: "Suggestion for NEA Programming Project" });

    await user.click(within(offer).getByRole("button", { name: "Convert to milestone" }));
    expect(h.onConvertTopic).not.toHaveBeenCalled();
    await user.click(within(offer).getByRole("button", { name: "Cancel" }));
    expect(h.onConvertTopic).not.toHaveBeenCalled();

    await user.click(within(offer).getByRole("button", { name: "Convert to milestone" }));
    await user.click(within(offer).getByRole("button", { name: "Confirm" }));
    expect(h.onConvertTopic).toHaveBeenCalledWith("cs", "t9");
  });

  it("can dismiss an NEA suggestion and keep the topic", async () => {
    const user = userEvent.setup();
    const subjects = [
      { id: "cs", name: "Computer Science", color: "#fff", topics: [{ id: "t9", name: "NEA Programming Project", done: false, subtasks: [] }] },
    ];
    const h = renderStrip({ subjects });
    await user.click(screen.getByRole("button", { name: "Keep as topic" }));
    expect(h.onKeepTopic).toHaveBeenCalledWith("cs", "t9");
    expect(h.onConvertTopic).not.toHaveBeenCalled();
  });

  it("no longer offers a topic the user chose to keep", () => {
    const subjects = [
      {
        id: "cs",
        name: "Computer Science",
        color: "#fff",
        topics: [{ id: "t9", name: "NEA Programming Project", done: false, subtasks: [], keepAsTopic: true }],
      },
    ];
    renderStrip({ subjects });
    expect(screen.queryByRole("group", { name: /Suggestion for/ })).toBeNull();
  });

  it("warns how many subtasks a conversion deletes", async () => {
    const user = userEvent.setup();
    const topic = (subtasks) => ({
      id: "t9",
      name: "NEA Programming Project",
      done: false,
      subtasks: Array.from({ length: subtasks }, (_, i) => ({ id: `s${i}`, name: `S${i}`, done: false })),
    });
    const { unmount } = render(
      <MilestoneStrip C={C} subjects={[{ id: "cs", name: "CS", color: "#fff", topics: [topic(5)] }]} now={NOW}
        onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} onConvertTopic={vi.fn()} onKeepTopic={vi.fn()} />
    );
    await user.click(screen.getByRole("button", { name: "Convert to milestone" }));
    expect(screen.getByText(/and delete its 5 subtasks, and add it as an NEA milestone\?/)).toBeTruthy();
    unmount();

    renderStrip({ subjects: [{ id: "cs", name: "CS", color: "#fff", topics: [topic(0)] }] });
    await user.click(screen.getByRole("button", { name: "Convert to milestone" }));
    const text = screen.getByText(/add it as an NEA milestone\?/).textContent;
    expect(text).not.toMatch(/subtask/);
  });

  it("defaults each new milestone to the currently selected subject", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const props = { C, subjects: SUBJECTS, now: NOW, onAdd, onUpdate: vi.fn(), onDelete: vi.fn(), onConvertTopic: vi.fn(), onKeepTopic: vi.fn() };
    const { rerender } = render(<MilestoneStrip {...props} defaultSubjectId="cs" />);

    await user.click(screen.getByRole("button", { name: "Add milestone" }));
    await user.type(screen.getByLabelText("Milestone name"), "First");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenLastCalledWith("cs", expect.objectContaining({ name: "First" }));

    rerender(<MilestoneStrip {...props} defaultSubjectId="phys" />);
    await user.click(screen.getByRole("button", { name: "Add milestone" }));
    expect(screen.getByLabelText("Milestone subject").value).toBe("phys");
    await user.type(screen.getByLabelText("Milestone name"), "Second");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenLastCalledWith("phys", expect.objectContaining({ name: "Second" }));
  });

  it("renders nothing without subjects", () => {
    const { container } = render(
      <MilestoneStrip C={C} subjects={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} onConvertTopic={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("milestones in the app", () => {
  it("converts the default NEA topic only once confirmed, keeping XP and streak unchanged", async () => {
    const user = userEvent.setup();
    renderApp();
    const gameBefore = localStorage.getItem("sb-game");

    await goTo(user, "Computer Science");
    expect(screen.getByText("NEA Programming Project")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Convert to milestone" }));
    // Still a topic until confirmed.
    expect(JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.id === "cs").topics.map((t) => t.name))
      .toContain("NEA Programming Project");

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const cs = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.id === "cs");
    expect(cs.topics.map((t) => t.name)).not.toContain("NEA Programming Project");
    expect(cs.milestones).toEqual([expect.objectContaining({ name: "NEA Programming Project", kind: "nea", due: null })]);

    // Completing the milestone gives no XP.
    await user.click(screen.getByLabelText("Complete milestone NEA Programming Project"));
    expect(localStorage.getItem("sb-game")).toBe(gameBefore);
  });

  it("remembers 'Keep as topic' across views and reloads", async () => {
    const user = userEvent.setup();
    const first = renderApp();
    await user.click(screen.getByRole("button", { name: "Keep as topic" }));
    expect(screen.queryByRole("button", { name: "Convert to milestone" })).toBeNull();

    await goTo(user, "Settings");
    await goTo(user, "Planner");
    expect(screen.queryByRole("button", { name: "Convert to milestone" })).toBeNull();

    first.unmount();
    renderApp();
    expect(screen.queryByRole("button", { name: "Convert to milestone" })).toBeNull();
    const cs = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.id === "cs");
    expect(cs.topics.find((t) => t.name === "NEA Programming Project")).toMatchObject({ keepAsTopic: true });
  });

  it("adds a milestone from the planner and persists it", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Add milestone" }));
    await user.type(screen.getByLabelText("Milestone name"), "Mock exams");
    await user.selectOptions(screen.getByLabelText("Milestone kind"), "other");
    await user.click(screen.getByRole("button", { name: "Add" }));

    const physics = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.id === "physics");
    expect(physics.milestones).toEqual([
      expect.objectContaining({ name: "Mock exams", kind: "other", due: null, done: false }),
    ]);
    expect(screen.getByText(/Mock exams/)).toBeTruthy();
  });
});

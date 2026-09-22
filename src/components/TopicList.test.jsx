import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { THEMES } from "../utils/themes.js";
import TopicList from "./TopicList.jsx";

const C = THEMES[0].colors;

const handlers = () => ({
  onToggleTopic: vi.fn(),
  onAddTopic: vi.fn(),
  onDeleteTopic: vi.fn(),
  onToggleSubtask: vi.fn(),
  onAddSubtask: vi.fn(),
  onDeleteSubtask: vi.fn(),
  onUpdateTopic: vi.fn(),
});

// A subject as stored before papers existed (A-level, no papers, no tiers).
const PLAIN_SUBJECT = {
  id: "physics",
  name: "Physics",
  qualification: "alevel",
  board: "OCR",
  spec: "H556",
  specName: "Physics A",
  tier: null,
  exam: "OCR Physics A",
  color: "#4F9CF9",
  topics: [
    { id: "t1", name: "Forces and Motion", done: false, subtasks: [{ id: "s1", name: "SUVAT", done: true }] },
    { id: "t2", name: "Waves", done: true, subtasks: [] },
    { id: "t3", name: "Capacitors", done: false, subtasks: [] },
  ],
};

const GCSE_SUBJECT = {
  id: "maths",
  name: "Mathematics",
  qualification: "gcse",
  board: "Edexcel",
  spec: "1MA1",
  specName: "Mathematics",
  tier: "foundation",
  exam: "Edexcel Mathematics",
  color: "#34D399",
  papers: [
    { id: "p1", name: "Paper 1" },
    { id: "p2", name: "Paper 2" },
  ],
  topics: [
    { id: "a", name: "Fractions", done: true, subtasks: [], paper: "p1" },
    { id: "b", name: "Graphs", done: false, subtasks: [], paper: "p1" },
    { id: "c", name: "Probability", done: false, subtasks: [], paper: ["p1", "p2"] },
    { id: "d", name: "Circle theorems", done: false, subtasks: [], paper: "p2", higherOnly: true },
    { id: "e", name: "Revision notes", done: false, subtasks: [] },
  ],
};

const renderList = (sub, props = {}) => {
  const h = handlers();
  const view = render(
    <TopicList C={C} sub={sub} loggedSecs={0} expandedTopic={null} setExpandedTopic={vi.fn()} {...h} {...props} />
  );
  return { ...view, h };
};

describe("TopicList with papers", () => {
  it("groups topics by paper with a progress bar each, and 'Other' last", () => {
    renderList({ ...GCSE_SUBJECT, tier: "higher" });
    const sections = screen.getAllByRole("region").map((s) => s.getAttribute("aria-label"));
    expect(sections).toEqual(["Paper 1 topics", "All papers topics", "Paper 2 topics", "Other topics"]);

    const paper1 = within(screen.getByRole("region", { name: "Paper 1 topics" }));
    expect(paper1.getByText("Graphs")).toBeTruthy();
    expect(paper1.getByText("1/2")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Paper 1 progress" }).getAttribute("aria-valuenow")).toBe("50");
    expect(within(screen.getByRole("region", { name: "Other topics" })).getByText("Revision notes")).toBeTruthy();
  });

  it("hides higher-only topics on Foundation until the toggle is pressed", async () => {
    const user = userEvent.setup();
    renderList(GCSE_SUBJECT);

    expect(screen.queryByText("Circle theorems")).toBeNull();
    expect(screen.queryByRole("region", { name: "Paper 2 topics" })).toBeNull();
    expect(screen.getByText("1/4 done", { exact: false })).toBeTruthy();
    expect(screen.getByText(/1 higher-tier topic is hidden/)).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Show higher-tier topics" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Circle theorems")).toBeTruthy();
    expect(screen.getByText("Higher")).toBeTruthy();
    // Progress still counts the Foundation tier only.
    expect(screen.getByText("1/4 done", { exact: false })).toBeTruthy();
  });

  it("offers no toggle on Higher tier, showing every topic", () => {
    renderList({ ...GCSE_SUBJECT, tier: "higher" });
    expect(screen.queryByRole("button", { name: "Show higher-tier topics" })).toBeNull();
    expect(screen.getByText("Circle theorems")).toBeTruthy();
    expect(screen.getByText("1/5 done", { exact: false })).toBeTruthy();
  });

  it("lets a topic's paper and higher-only flag be edited", async () => {
    const user = userEvent.setup();
    const { h } = renderList({ ...GCSE_SUBJECT, tier: "higher" }, { expandedTopic: "b" });

    const paper = screen.getByLabelText("Paper for Graphs");
    expect(paper.value).toBe("p1");
    await user.selectOptions(paper, "p2");
    expect(h.onUpdateTopic).toHaveBeenLastCalledWith("b", { paper: "p2" });
    await user.selectOptions(paper, "");
    expect(h.onUpdateTopic).toHaveBeenLastCalledWith("b", { paper: undefined });

    await user.click(screen.getByLabelText("Higher tier only: Graphs"));
    expect(h.onUpdateTopic).toHaveBeenLastCalledWith("b", { higherOnly: true });
  });

  it("shows a multi-paper topic's papers and keeps them until another is picked", () => {
    renderList({ ...GCSE_SUBJECT, tier: "higher" }, { expandedTopic: "c" });
    const paper = screen.getByLabelText("Paper for Probability");
    expect(paper.value).toBe("__several__");
    expect(within(paper).getByRole("option", { name: "Paper 1 & Paper 2" })).toBeTruthy();
  });

  it("has no paper or tier controls for a non-GCSE subject without papers", () => {
    renderList(PLAIN_SUBJECT, { expandedTopic: "t1" });
    expect(screen.queryByLabelText(/Paper for/)).toBeNull();
    expect(screen.queryByLabelText(/Higher tier only/)).toBeNull();
  });
});

describe("TopicList without papers", () => {
  // This snapshot was recorded before papers and tiers were added (F5), so
  // any change to how a paper-less subject renders fails here.
  it("renders exactly as before papers existed", () => {
    const { container } = render(
      <TopicList
        C={C}
        sub={PLAIN_SUBJECT}
        loggedSecs={3600}
        expandedTopic="t1"
        setExpandedTopic={vi.fn()}
        {...handlers()}
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

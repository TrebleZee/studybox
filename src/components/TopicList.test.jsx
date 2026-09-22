import { render } from "@testing-library/react";
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

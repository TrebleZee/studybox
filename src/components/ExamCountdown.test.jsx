import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalysisPanel from "./AnalysisPanel.jsx";
import ExamCountdown from "./ExamCountdown.jsx";
import TopBar from "./TopBar.jsx";

const C = {
  bdr: "#272727",
  bdr2: "#333333",
  s1: "#131313",
  s2: "#1A1A1A",
  s3: "#222222",
  txt: "#F0F0F0",
  muted: "#5A5A5A",
  dim: "#353535",
};

const game = { currentStreak: 0, longestStreak: 0, totalXP: 0, freezesUsed: 0 };
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);

const topics = (count, done = 0) =>
  Array.from({ length: count }, (_, i) => ({ id: `t${i}`, name: `Topic ${i}`, done: i < done, subtasks: [] }));

// AQA GCSE Maths: the published 2027 timetable has paper 1 on 14 May,
// paper 2 on 27 May and paper 3 on 14 June.
const gcseMaths = (overrides = {}) => ({
  id: "gcse-maths",
  name: "Maths",
  color: "#4F9CF9",
  qualification: "gcse",
  board: "AQA",
  spec: "8300",
  tier: "higher",
  examYear: 2027,
  papers: [
    { id: "p1", name: "Paper 1 (non-calculator)" },
    { id: "p2", name: "Paper 2 (calculator)" },
    { id: "p3", name: "Paper 3 (calculator)" },
  ],
  topics: topics(10, 5),
  ...overrides,
});

// A user with no exam dates at all: a custom subject and a catalogue-style
// subject whose spec isn't in the timetable file.
const noDates = [
  { id: "latin", name: "Latin", color: "#F87171", board: "Custom", spec: null, topics: topics(3) },
  {
    id: "mystery",
    name: "Mystery",
    color: "#34D399",
    board: "AQA",
    spec: "0000",
    papers: [{ id: "p1", name: "Paper 1" }],
    topics: topics(3),
  },
];

const renderTopBar = (subjects) =>
  render(<TopBar C={C} view="planner" onChangeView={() => {}} game={game} grandTotal={0} subjects={subjects} />);

const renderAnalysis = (subjects) =>
  render(
    <AnalysisPanel subjects={subjects} sessions={[]} asanaCfg={{ id: "asana", name: "Asana" }} asanaStats={null} game={game} C={C} />
  );

describe("exam countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(2027, 5, 1));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows neither countdown nor pacing for a user with no exam dates", () => {
    renderTopBar(noDates);
    expect(screen.queryByText(/📅/)).toBeNull();
    expect(screen.queryByRole("button", { name: /next exam/i })).toBeNull();

    renderAnalysis(noDates);
    expect(screen.getByText("Study Analysis")).toBeTruthy();
    expect(screen.queryByText("Exam Pacing")).toBeNull();
  });

  it("hides both once every exam has passed", () => {
    vi.setSystemTime(at(2027, 6, 15));
    renderTopBar([gcseMaths()]);
    expect(screen.queryByRole("button", { name: /next exam/i })).toBeNull();
    renderAnalysis([gcseMaths()]);
    expect(screen.queryByText("Exam Pacing")).toBeNull();
  });

  it("doesn't count down to 2027 exams for a subject sat later or not yet set", () => {
    renderTopBar([gcseMaths({ examYear: 2028 }), gcseMaths({ id: "unset", examYear: undefined })]);
    expect(screen.queryByRole("button", { name: /next exam/i })).toBeNull();
  });

  it("counts down to the next published exam in the top bar", () => {
    renderTopBar([...noDates, gcseMaths()]);
    const countdown = screen.getByRole("button", { name: /next exam/i });
    expect(countdown.textContent).toContain("Maths in 13d");
    expect(countdown.getAttribute("title")).toBe("Next exam: Maths, Paper 1 (non-calculator) on 2027-05-14");
  });

  it("says today and tomorrow instead of a day count", () => {
    const { rerender } = render(<ExamCountdown C={C} subjects={[gcseMaths()]} now={at(2027, 5, 13, 23)} />);
    expect(screen.getByRole("button").textContent).toContain("Maths tomorrow");
    rerender(<ExamCountdown C={C} subjects={[gcseMaths()]} now={at(2027, 5, 14, 0)} />);
    expect(screen.getByRole("button").textContent).toContain("Maths today");
  });
});

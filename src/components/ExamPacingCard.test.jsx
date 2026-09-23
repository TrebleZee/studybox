import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalysisPanel from "./AnalysisPanel.jsx";
import ExamPacingCard from "./ExamPacingCard.jsx";
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

describe("exam pacing card", () => {
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

  it("shows a pacing row only for subjects with an exam to come", () => {
    renderAnalysis([...noDates, gcseMaths()]);
    const card = screen.getByRole("region", { name: "Exam Pacing" });
    const row = within(card).getByTestId("pacing-gcse-maths");
    // 5 of 10 topics left, 2 weeks to 14 May; 50% done against ~87% of the year.
    expect(row.textContent).toContain("Paper 1 (non-calculator) in 13d (2027-05-14)");
    expect(row.textContent).toContain("5 topics left · 3 topics/week");
    expect(row.textContent).toContain("Behind");
    expect(within(card).queryByTestId("pacing-latin")).toBeNull();
    expect(within(card).queryByTestId("pacing-mystery")).toBeNull();
  });

  it("uses the user's own date over the published one", () => {
    const moved = gcseMaths({
      papers: [
        { id: "p1", name: "Paper 1 (non-calculator)", examDate: "2027-06-20" },
        { id: "p2", name: "Paper 2 (calculator)", examDate: "2027-06-21" },
        { id: "p3", name: "Paper 3 (calculator)", examDate: "2027-06-22" },
      ],
    });
    render(<ExamPacingCard C={C} subjects={[moved]} />);
    expect(screen.getByTestId("pacing-gcse-maths").textContent).toContain("(2027-06-20)");
  });

  it("leaves out a subject sitting a later series", () => {
    renderAnalysis([gcseMaths({ examYear: 2028 })]);
    expect(screen.queryByText("Exam Pacing")).toBeNull();
  });

  it("follows the Analysis subject filter", () => {
    const physics = { ...gcseMaths(), id: "phys", name: "Physics" };
    renderAnalysis([gcseMaths(), physics]);
    expect(screen.getByTestId("pacing-phys")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("All Subjects"), { target: { value: "gcse-maths" } });
    expect(screen.getByTestId("pacing-gcse-maths")).toBeTruthy();
    expect(screen.queryByTestId("pacing-phys")).toBeNull();
  });
});

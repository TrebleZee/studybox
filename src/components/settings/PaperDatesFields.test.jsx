import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import EditSubjectsCard from "./EditSubjectsCard.jsx";
import { updateSubjectFields } from "../../utils/subjects.js";

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

describe("exam dates in Settings", () => {
  const Harness = ({ initial }) => {
    const [subjects, setSubjects] = useState(initial);
    return (
      <>
        <EditSubjectsCard
          C={C}
          subjects={subjects}
          onUpdateSubject={(id, patch) =>
            setSubjects((prev) => prev.map((s) => (s.id === id ? updateSubjectFields(s, patch) : s)))
          }
          onRemoveSubject={() => {}}
        />
        <output data-testid="papers">{JSON.stringify(subjects[0].papers)}</output>
        <output data-testid="subject">{JSON.stringify(subjects[0])}</output>
      </>
    );
  };

  it("shows the published date, lets the user override it and go back", () => {
    render(<Harness initial={[gcseMaths()]} />);
    const input = screen.getByLabelText("Exam date Paper 1 (non-calculator) gcse-maths");
    expect(input.value).toBe("2027-05-14");
    expect(screen.getAllByText("Published timetable")).toHaveLength(3);

    fireEvent.change(input, { target: { value: "2027-05-20" } });
    expect(input.value).toBe("2027-05-20");
    expect(screen.getByText("Your date")).toBeTruthy();
    expect(JSON.parse(screen.getByTestId("papers").textContent)[0]).toEqual({
      id: "p1",
      name: "Paper 1 (non-calculator)",
      examDate: "2027-05-20",
    });

    fireEvent.click(screen.getByRole("button", { name: "Use published date for Paper 1 (non-calculator) gcse-maths" }));
    expect(input.value).toBe("2027-05-14");
    expect(JSON.parse(screen.getByTestId("papers").textContent)[0]).toEqual({
      id: "p1",
      name: "Paper 1 (non-calculator)",
    });
  });

  it("shows published dates only once the exam year is summer 2027", () => {
    render(<Harness initial={[gcseMaths({ examYear: undefined })]} />);
    const input = screen.getByLabelText("Exam date Paper 1 (non-calculator) gcse-maths");
    const year = screen.getByLabelText("Exam year gcse-maths");
    expect(year.value).toBe("");
    expect(input.value).toBe("");
    expect(screen.getByText(/Published dates are filled in for summer 2027/)).toBeTruthy();

    fireEvent.change(year, { target: { value: "2027" } });
    expect(input.value).toBe("2027-05-14");
    expect(JSON.parse(screen.getByTestId("subject").textContent).examYear).toBe(2027);

    fireEvent.change(year, { target: { value: "2028" } });
    expect(input.value).toBe("");
    expect(screen.getAllByText("No date")).toHaveLength(3);
  });

  it("lets a subject off the timetable have its own dates", () => {
    render(<Harness initial={[noDates[1]]} />);
    const input = screen.getByLabelText("Exam date Paper 1 mystery");
    expect(input.value).toBe("");
    expect(screen.getByText("No date")).toBeTruthy();
    fireEvent.change(input, { target: { value: "2027-06-03" } });
    expect(screen.getByText("Your date")).toBeTruthy();
    // Clearing the field removes the user's date.
    fireEvent.change(input, { target: { value: "" } });
    expect(JSON.parse(screen.getByTestId("papers").textContent)).toEqual([{ id: "p1", name: "Paper 1" }]);
  });

  it("has no exam date fields for a subject without papers", () => {
    render(<Harness initial={[noDates[0]]} />);
    expect(screen.queryByText("Exam dates")).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { goTo, renderApp } from "../test/helpers.jsx";
import { THEMES } from "../utils/themes.js";
import SubjectPicker from "./SubjectPicker.jsx";

const C = THEMES[0].colors;

const subjectButton = (pattern) => within(screen.getByRole("list", { name: "Subjects" })).getByRole("button", { name: pattern });
const boardButton = (name) => within(screen.getByRole("list", { name: "Exam boards" })).getByRole("button", { name });

// Walks subject → board (→ spec) → details and adds the subject.
const pick = async (user, { subject, board, spec, tier, options = [] }) => {
  await user.click(subjectButton(subject));
  await user.click(boardButton(board));
  if (spec) {
    await user.click(within(screen.getByRole("list", { name: "Specifications" })).getByRole("button", { name: spec }));
  }
  if (tier) await user.click(await screen.findByRole("radio", { name: tier }));
  for (const option of options) await user.click(await screen.findByRole("radio", { name: option }));
  await user.click(await screen.findByRole("button", { name: /Add to my subjects|Add subject/ }));
};

describe("SubjectPicker", () => {
  it("adds four GCSEs in one onboarding pass with the right metadata and topics", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await user.click(screen.getByRole("button", { name: /Choose my subjects/ }));

    await user.click(screen.getByRole("radio", { name: "GCSE" }));
    await pick(user, { subject: /^Mathematics/, board: /Pearson Edexcel/, tier: "Higher" });
    await pick(user, { subject: /^English Language/, board: /^AQA/ });
    await pick(user, { subject: /^English Literature/, board: /^AQA/, options: ["Macbeth", "A Christmas Carol"] });
    await pick(user, { subject: /^Combined Science/, board: /^AQA/, spec: /Trilogy/, tier: "Higher" });

    const mine = within(screen.getByRole("list", { name: "My subjects" }));
    expect(mine.getAllByRole("listitem")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "Finish (4)" }));

    await waitFor(() => expect(screen.queryByText("Welcome to StudyBox")).toBeNull());
    const stored = JSON.parse(localStorage.getItem("sb-subjects"));
    expect(stored.map((s) => [s.board, s.spec, s.qualification, s.tier])).toEqual([
      ["Edexcel", "1MA1", "gcse", "higher"],
      ["AQA", "8700", "gcse", null],
      ["AQA", "8702", "gcse", null],
      ["AQA", "8464", "gcse", "higher"],
    ]);
    const [maths, lang, lit, science] = stored;
    expect(maths.topics.every((t) => t.catalogueTopicId?.startsWith("edexcel-1ma1-"))).toBe(true);
    expect(maths.papers.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(lang.topics.length).toBeGreaterThan(5);
    expect(lang.milestones.map((m) => m.name)).toEqual(["Spoken language endorsement"]);
    expect(lit.topics.map((t) => t.name)).toEqual(
      expect.arrayContaining(["Unseen poetry", "Shakespeare: Macbeth", "19th-century novel: A Christmas Carol"])
    );
    expect(science.specName).toBe("Combined Science Trilogy");
    expect(science.topics.some((t) => t.higherOnly)).toBe(true);
    // Distinct colours, unique ids.
    expect(new Set(stored.map((s) => s.color)).size).toBe(4);
    expect(new Set(stored.map((s) => s.id)).size).toBe(4);
  });

  it("seeds only the chosen option's topics", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SubjectPicker C={C} mode="single" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText(/Search subjects/), "english literature");
    await pick(user, { subject: /^English Literature · GCSE/, board: /^AQA/, options: ["Romeo and Juliet"] });

    const [subject] = onConfirm.mock.calls[0][0];
    const names = subject.topics.map((t) => t.name);
    expect(names).toContain("Shakespeare: Romeo and Juliet");
    expect(names.some((n) => n.startsWith("Shakespeare:") && n !== "Shakespeare: Romeo and Juliet")).toBe(false);
    expect(names.some((n) => n.startsWith("Modern text:"))).toBe(false);
  });

  it("lets more options than the usual count be chosen (pick is guidance)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SubjectPicker C={C} mode="single" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText(/Search subjects/), "further mathematics");
    await pick(user, { subject: /^Further Mathematics · A-level/, board: /^OCR/, spec: /MEI/ });
    // pick would have added already; instead pick three minors explicitly:
    const [subject] = onConfirm.mock.calls[0][0];
    expect(subject.spec).toBe("H645");

    onConfirm.mockClear();
    await user.click(subjectButton(/^Further Mathematics · A-level/));
    await user.click(boardButton(/^OCR/));
    await user.click(within(screen.getByRole("list", { name: "Specifications" })).getByRole("button", { name: /MEI/ }));
    for (const name of ["Modelling with Algorithms", "Numerical Methods", "Extra Pure"]) {
      await user.click(await screen.findByRole("checkbox", { name }));
    }
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    const [routeC] = onConfirm.mock.calls[0][0];
    const papers = new Set(routeC.topics.flatMap((t) => (Array.isArray(t.paper) ? t.paper : [t.paper])));
    ["y433", "y434", "y435"].forEach((p) => expect(papers.has(p)).toBe(true));
  });

  it("prevents adding a spec that is already there", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <SubjectPicker
        C={C}
        mode="single"
        existingSubjects={[{ id: "x", name: "Maths", board: "AQA", spec: "8300", color: "#4F9CF9" }]}
        onConfirm={onConfirm}
      />
    );
    await user.click(screen.getByRole("radio", { name: "GCSE" }));
    await user.click(subjectButton(/^Mathematics/));
    const aqa = boardButton(/^AQA/);
    expect(aqa.disabled).toBe(true);
    expect(aqa.textContent).toMatch(/already added/);
    await user.click(aqa);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(boardButton(/Pearson Edexcel/).disabled).toBe(false);
  });

  it("does not offer a spec twice within one onboarding pass", async () => {
    const user = userEvent.setup();
    render(<SubjectPicker C={C} mode="multi" onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "GCSE" }));
    await pick(user, { subject: /^English Language/, board: /^AQA/ });
    await user.click(subjectButton(/^English Language/));
    expect(boardButton(/^AQA/).disabled).toBe(true);
  });

  it("mixes GCSE and A-level subjects in one pass", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SubjectPicker C={C} mode="multi" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText(/Search subjects/), "mathematics");
    await pick(user, { subject: /^Mathematics · GCSE/, board: /^AQA/, tier: "Foundation" });
    await pick(user, { subject: /^Mathematics · A-level/, board: /Pearson Edexcel/ });
    await user.click(screen.getByRole("button", { name: "Finish (2)" }));
    expect(onConfirm.mock.calls[0][0].map((s) => [s.qualification, s.spec])).toEqual([
      ["gcse", "8300"],
      ["alevel", "9MA0"],
    ]);
  });

  it("requires a tier for tiered GCSEs before adding", async () => {
    const user = userEvent.setup();
    render(<SubjectPicker C={C} mode="single" onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "GCSE" }));
    await user.click(subjectButton(/^Mathematics/));
    await user.click(boardButton(/^AQA/));
    expect((await screen.findByRole("button", { name: "Add subject" })).disabled).toBe(true);
    await user.click(screen.getByRole("radio", { name: "Higher" }));
    expect(screen.getByRole("button", { name: "Add subject" }).disabled).toBe(false);
  });

  it("moves focus to each step's heading and back works", async () => {
    const user = userEvent.setup();
    render(<SubjectPicker C={C} mode="single" onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "A-level" }));
    await user.click(subjectButton(/^Physics/));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: /Physics: which exam board/ }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Find a subject" }));
  });

  it("is keyboard operable end to end", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SubjectPicker C={C} mode="single" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText(/Search subjects/), "H446");
    subjectButton(/^Computer Science/).focus();
    await user.keyboard("{Enter}");
    boardButton(/^OCR/).focus();
    await user.keyboard("{Enter}");
    const add = await screen.findByRole("button", { name: "Add subject" });
    add.focus();
    await user.keyboard("{Enter}");
    expect(onConfirm.mock.calls[0][0][0]).toMatchObject({ board: "OCR", spec: "H446" });
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<SubjectPicker C={C} mode="single" onConfirm={vi.fn()} />);
    await user.type(screen.getByLabelText(/Search subjects/), "underwater basket weaving");
    expect(screen.getByText(/No subjects match/)).toBeTruthy();
  });
});

describe("SubjectPicker in the app", () => {
  it("adds a catalogue subject from Settings through the existing add handler", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: /Add from catalogue/ }));
    await user.type(screen.getByLabelText(/Search subjects/), "7408");
    await pick(user, { subject: /^Physics · A-level/, board: /^AQA/, options: ["Astrophysics"] });

    const stored = JSON.parse(localStorage.getItem("sb-subjects"));
    const physics = stored.find((s) => s.spec === "7408");
    expect(physics).toMatchObject({ board: "AQA", qualification: "alevel", name: "Physics" });
    expect(physics.topics.map((t) => t.name)).toContain("Astrophysics");
    expect(physics.milestones.map((m) => m.kind)).toEqual(["practical"]);
    // Colour avoids the four default subjects' colours.
    expect(stored.filter((s) => s.id !== physics.id).map((s) => s.color)).not.toContain(physics.color);
  });

  it("does not start the timer when space is typed in the picker search", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: /Add from catalogue/ }));
    const search = screen.getByLabelText(/Search subjects/);
    await user.type(search, "english literature");
    expect(search.value).toBe("english literature");
    fireEvent.keyDown(search, { code: "Space", key: " " });
    await goTo(user, "Planner");
    expect(document.title).toBe("StudyBox");
  });
});

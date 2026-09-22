import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEMES } from "../../utils/themes.js";
import AddSubjectCard from "./AddSubjectCard.jsx";

// pdf.js can't run under jsdom, so the "PDF" is just its text, keyed by file name.
const PDF_TEXT = {
  "aqa-maths.pdf": "GCSE MATHEMATICS (8300) Specification. AQA GCSE Mathematics 8300.",
  "ocr-cs.pdf": "GCSE (9-1) Computer Science J277 Specification. OCR GCSE Computer Science J277.",
  "sqa-history.pdf": "SQA National 5 History Course Specification.",
};

vi.mock("../../utils/specImport.js", async (importOriginal) => ({
  ...(await importOriginal()),
  extractPdfText: vi.fn(async (file) => PDF_TEXT[file.name]),
}));

const C = THEMES[0].colors;
const pdf = (name) => new File(["%PDF"], name, { type: "application/pdf" });

describe("AddSubjectCard spec import", () => {
  let onAddSubject;
  let user;

  beforeEach(() => {
    onAddSubject = vi.fn();
    user = userEvent.setup();
    render(<AddSubjectCard C={C} onAddSubject={onAddSubject} />);
  });

  const upload = async (name) => {
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf(name));
    await waitFor(() => expect(screen.getByText(`Loaded ${name}.`)).toBeTruthy());
  };

  it("uses the catalogue spec when the PDF's code matches", async () => {
    await upload("aqa-maths.pdf");
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject).toMatchObject({ board: "AQA", spec: "8300", specName: "Mathematics", qualification: "gcse" });
    expect(subject.topics[0].catalogueTopicId).toMatch(/^aqa-8300-/);
  });

  it("does not carry a previous catalogue match's spec name into a catalogue miss", async () => {
    await upload("aqa-maths.pdf");
    await upload("ocr-cs.pdf");
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject).toMatchObject({ board: "OCR", spec: "J277", name: "Computer Science" });
    expect(subject.specName ?? null).toBeNull();
    expect(subject.topics.every((topic) => !topic.catalogueTopicId)).toBe(true);
  });

  it("drops the catalogue topics once the board is changed away from the matched spec", async () => {
    await upload("aqa-maths.pdf");
    expect(screen.getByRole("radio", { name: /Use StudyBox's topic list/ })).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Exam board"), "Edexcel");
    expect(screen.queryByRole("radio")).toBeNull();
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject.board).toBe("Edexcel");
    expect(subject.topics.some((topic) => typeof topic === "object" && topic.catalogueTopicId)).toBe(false);
  });

  it("drops the matched spec name when the spec code is changed to another spec", async () => {
    await upload("aqa-maths.pdf");
    const code = screen.getByLabelText("Spec code");
    await user.clear(code);
    await user.type(code, "8700");
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject).toMatchObject({ board: "AQA", spec: "8700", specName: null });
    expect(subject.topics.some((topic) => typeof topic === "object" && topic.catalogueTopicId)).toBe(false);
  });

  it("restores the matched spec name if the user returns to the matched spec", async () => {
    await upload("aqa-maths.pdf");
    await user.selectOptions(screen.getByLabelText("Exam board"), "Edexcel");
    await user.selectOptions(screen.getByLabelText("Exam board"), "AQA");
    await user.type(screen.getByLabelText("Spec code"), "8300");
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject).toMatchObject({ board: "AQA", spec: "8300", specName: "Mathematics" });
    expect(subject.topics[0].catalogueTopicId).toMatch(/^aqa-8300-/);
  });

  it("keeps the catalogue topics while the spec code is only re-cased", async () => {
    await upload("aqa-maths.pdf");
    const code = screen.getByLabelText("Spec code");
    await user.clear(code);
    await user.type(code, " 8300 ");
    expect(screen.getByRole("radio", { name: /Use StudyBox's topic list/ }).checked).toBe(true);
  });

  it("does not carry a previous match's spec code onto a Custom subject", async () => {
    await upload("aqa-maths.pdf");
    await upload("sqa-history.pdf");
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject.board).toBe("Custom");
    expect(subject.spec).toBeNull();
    expect(subject.specName ?? null).toBeNull();
    expect(subject.tier).toBeNull();
  });
});

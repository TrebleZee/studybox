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
  "aqa-art.pdf": "A-LEVEL ART AND DESIGN (7201, 7202, 7203, 7204, 7205, 7206) Specification. AQA A-level Art and Design.",
  // Not a spec: its own code isn't in the catalogue, though codes listed with it are.
  "aqa-timetable.pdf": "AQA A-LEVEL ITALIAN (7682) timetable. AQA components (7682, 7367, 7182) on the same day.",
};

// A PDF's read can be held pending the same way (keyed by file name).
const readHolds = new Map();

vi.mock("../../utils/specImport.js", async (importOriginal) => ({
  ...(await importOriginal()),
  extractPdfText: vi.fn(async (file) => {
    if (readHolds.has(file.name)) await readHolds.get(file.name);
    return PDF_TEXT[file.name];
  }),
}));

// loadSpec can be told to fail once, to simulate an uncached chunk offline.
const loadFailures = { remaining: 0 };
// ...or to hold a spec's load pending until the test releases it (a slow chunk).
const loadHolds = new Map();
const holdLoad = (id) => {
  let release;
  loadHolds.set(id, new Promise((resolve) => (release = resolve)));
  return release;
};
vi.mock("../../utils/catalogue.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadSpec: vi.fn(async (id) => {
      if (loadHolds.has(id)) await loadHolds.get(id);
      if (loadFailures.remaining > 0) {
        loadFailures.remaining -= 1;
        throw new Error("offline");
      }
      return actual.loadSpec(id);
    }),
  };
});

const C = THEMES[0].colors;
const pdf = (name) => new File(["%PDF"], name, { type: "application/pdf" });

describe("AddSubjectCard spec import", () => {
  let onAddSubject;
  let user;

  beforeEach(() => {
    loadHolds.clear();
    readHolds.clear();
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

  it("asks which title to use when one PDF covers several catalogue specs", async () => {
    await upload("aqa-art.pdf");
    expect(screen.getByText(/This specification covers 6 titles/)).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Fine art (7202)" }));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /Use StudyBox's topic list for AQA A-level Fine art/ }).checked).toBe(true)
    );
    await user.click(screen.getByLabelText("Create subject"));

    const subject = onAddSubject.mock.calls[0][0];
    expect(subject).toMatchObject({ board: "AQA", spec: "7202", specName: "Fine art", qualification: "alevel" });
    expect(subject.topics[0].catalogueTopicId).toMatch(/^aqa-7202-/);
  });

  it("offers no title chooser when the document's own code isn't in the catalogue", async () => {
    await upload("aqa-timetable.pdf");
    expect(screen.queryByText(/This specification covers/)).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("keeps the title chooser visible after a failed load so the student can retry", async () => {
    await upload("aqa-art.pdf");
    loadFailures.remaining = 1;
    await user.click(screen.getByRole("button", { name: "Fine art (7202)" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fine art (7202)" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Fine art (7202)" }));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /Use StudyBox's topic list for AQA A-level Fine art/ })).toBeTruthy()
    );
    expect(screen.queryByRole("alert")).toBeNull();
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

  it("ignores a slow title load that a newer title choice has overtaken", async () => {
    await upload("aqa-art.pdf");
    const releaseSlow = holdLoad("aqa-7202");
    await user.click(screen.getByRole("button", { name: "Fine art (7202)" }));
    await user.click(screen.getByRole("button", { name: /\(7201\)/ }));
    await waitFor(() => expect(screen.getByRole("radio", { name: /AQA A-level Art/ })).toBeTruthy());
    expect((screen.getByLabelText("Spec code")).value).toBe("7201");

    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByLabelText("Spec code").value).toBe("7201");
  });

  it("ignores a slow catalogue load that a newer upload has overtaken", async () => {
    const releaseSlow = holdLoad("aqa-8300");
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf("aqa-maths.pdf"));
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf("ocr-cs.pdf"));
    await waitFor(() => expect(screen.getByText("Loaded ocr-cs.pdf.")).toBeTruthy());

    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("Loaded ocr-cs.pdf.")).toBeTruthy();
    await user.click(screen.getByLabelText("Create subject"));
    expect(onAddSubject.mock.calls[0][0]).toMatchObject({ board: "OCR", spec: "J277", name: "Computer Science" });
  });

  it("ignores a slow load once the import has been cleared", async () => {
    const releaseSlow = holdLoad("aqa-8300");
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf("aqa-maths.pdf"));
    await user.click(screen.getByRole("button", { name: /clear/i }));
    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByLabelText("Spec code").value).toBe("");
  });

  it("ignores a slow PDF read that a newer upload has overtaken", async () => {
    let releaseSlow;
    readHolds.set("sqa-history.pdf", new Promise((resolve) => (releaseSlow = resolve)));
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf("sqa-history.pdf"));
    await user.upload(screen.getByLabelText("Import subject specification PDF"), pdf("aqa-maths.pdf"));
    await waitFor(() => expect(screen.getByText("Loaded aqa-maths.pdf.")).toBeTruthy());

    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("Loaded aqa-maths.pdf.")).toBeTruthy();
    await user.click(screen.getByLabelText("Create subject"));
    expect(onAddSubject.mock.calls[0][0]).toMatchObject({ board: "AQA", spec: "8300" });
  });
});

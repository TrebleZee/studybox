import { describe, expect, it } from "vitest";
import {
  generateSubjectDraftFromSpecText,
  inferExamBoard,
  inferQualification,
  inferSpecCode,
  inferSubjectName,
  inferTopicChecklist,
} from "./specInference.js";

describe("spec inference", () => {
  const sampleText = `
AQA A Level Art History Specification
1 Introduction to Art History
1.1 Ancient Art
1.2 Modern Art
2 Key Movements
2.1 Renaissance
2.2 Modernism
  `;

  it("infers the exam board from the spec text", () => {
    expect(inferExamBoard(sampleText, "aqa-art-history-specification.pdf")).toBe("AQA");
  });

  it("recognises each board, preferring the more specific name", () => {
    expect(inferExamBoard("OCR A Level Physics A H556")).toBe("OCR A");
    expect(inferExamBoard("OCR GCSE Computer Science J277")).toBe("OCR");
    expect(inferExamBoard("Pearson Edexcel Level 3 Advanced GCE in Mathematics")).toBe("Pearson Edexcel");
    expect(inferExamBoard("Edexcel GCSE Maths")).toBe("Edexcel");
    expect(inferExamBoard("WJEC Eduqas GCSE History")).toBe("WJEC Eduqas");
    expect(inferExamBoard("CCEA GCSE Biology")).toBe("CCEA");
  });

  it("falls back to the file name, then to Custom", () => {
    expect(inferExamBoard("Specification for teaching", "aqa-8300.pdf")).toBe("AQA");
    expect(inferExamBoard("Specification for teaching", "maths.pdf")).toBe("Custom");
  });

  it("infers the subject name from the spec text", () => {
    expect(inferSubjectName(sampleText, "aqa-art-history-specification.pdf")).toBe(
      "Art History"
    );
  });

  it("generates a topic checklist from headings", () => {
    expect(inferTopicChecklist(sampleText)).toEqual([
      "Ancient Art",
      "Modern Art",
      "Key Movements",
      "Renaissance",
      "Modernism",
    ]);
  });

  it("handles flattened PDF text with multiple headings on one line", () => {
    const flatText =
      "AQA A Level Art History Specification 1 Introduction to Art History 1.1 Ancient Art 1.2 Modern Art 2 Key Movements 2.1 Renaissance 2.2 Modernism";

    expect(inferTopicChecklist(flatText)).toEqual([
      "Ancient Art",
      "Modern Art",
      "Key Movements",
      "Renaissance",
      "Modernism",
    ]);
  });

  it("builds a draft from spec text", () => {
    expect(
      generateSubjectDraftFromSpecText(sampleText, "aqa-art-history-specification.pdf")
    ).toEqual({
      subjectName: "Art History",
      examBoard: "AQA",
      specCode: null,
      qualification: "alevel",
      topics: ["Ancient Art", "Modern Art", "Key Movements", "Renaissance", "Modernism"],
    });
  });
});

// Cover and footer lines as pdf.js extracts them from the boards' real spec PDFs.
const COVERS = {
  "AQA 8300": `GCSE MATHEMATICS (8300) Specification For teaching from September 2015 onwards For exams in May/June 2017 onwards Version 1.0 12 September 2014
3 GCSE Mathematics (8300). For exams in May/June 2017 onwards. Version 1.0
Visit aqa.org.uk/8300 for the most up-to-date specifications, resources, support and administration
1.1 Why choose AQA for GCSE Mathematics 5`,
  "AQA 8464": `GCSE COMBINED SCIENCE: TRILOGY (8464) Specification For teaching from September 2016 onwards For exams in 2018 onwards Version 1.1 04 October 2019
1.1 Why choose AQA for GCSE Combined Science: Trilogy 5
AQA GCSE Combined Science: Trilogy 8464. GCSE exams June 2018 onwards. Version 1.1 04 October 2019`,
  "AQA 7408": `A-LEVEL PHYSICS (7408) Specification For teaching from September 2015 onwards
For A-level exams in May/June 2017 onwards
AQA A-level Physics 7408. A-level exams June 2017 onwards. Version 1.5
Visit aqa.org.uk/7408 for the most up-to-date specification, resources, support and administration`,
  "OCR H556": `ocr.org.uk/alevelphysicsaVersion 3.0 (March 2026) Qualification Accredited Specification A Level Physics A
Cambridge OCR Level 3 Advanced GCE in Physics A H556 For first assessment in 2017
As of September 2025, our name is Cambridge OCR.`,
  "OCR J560": `Qualification Accredited ocr.org.uk/gcsemaths Cambridge OCR Level 1/Level 2 GCSE (9-1) in Mathematics J560
For first assessment in 2017 Specification Version 2.1 (August 2026) GCSE Mathematics`,
  "OCR J277": `Qualification Accredited GCSE (9–1) Specification Computer Science J277 For first assessment in 2022
Version 2.1 (January 2024) ocr.org.uk/gcsecomputerscience OCR is part of Cambridge University Press & Assessment`,
  "Edexcel 9MA0": `Specification Pearson Edexcel Level 3 Advanced GCE in Mathematics (9MA0) First teaching from September 2017
First certification from 2018 A Level Mathematics Issue 4
Paper 1: Pure Mathematics 1 (*Paper code: 9MA0/01)`,
  "Edexcel 1MA1": `GCSE (9-1) Mathematics Specification Pearson Edexcel Level 1/Level 2 GCSE (9 - 1) in Mathematics (1MA1)
First teaching from September 2015 First certification from June 2017 Issue 2`,
  "Edexcel 1SC0": `GCSE (9-1) Combined Science Specification Pearson Edexcel Level 1/Level 2 GCSE (9 - 1) in Combined Science (1SC0)
First teaching from September 2016 First certification from June 2018 Issue 6
Paper 1: Biology 1 (*Paper code: 1SC0/1BF, 1SC0/1BH)`,
  "Edexcel 8FM0": `Pearson Edexcel Level 3 Advanced Subsidiary GCE in Further Mathematics (8FM0)
First teaching from September 2017`,
};

describe("inferSpecCode", () => {
  it.each(Object.entries(COVERS))("reads %s", (expected, text) => {
    const [board, spec] = expected.split(" ");
    expect(inferSpecCode(text)).toEqual({ board, spec });
  });

  it("uses the file name, which boards also print the code in", () => {
    expect(inferSpecCode("Specification for teaching. Why choose AQA?", "AQA-8300-SP-2015.PDF")).toEqual({
      board: "AQA",
      spec: "8300",
    });
  });

  it("picks the code matching the cover's level on joint AS and A-level covers", () => {
    const aqaJoint = `AS AND A-LEVEL PHYSICS (7407, 7408) Specification. AQA AS and A-level Physics 7407 7408`;
    expect(inferSpecCode(aqaJoint)).toEqual({ board: "AQA", spec: "7408" });
    expect(inferQualification(aqaJoint)).toBe("alevel");

    const aqaAsOnly = `AS PHYSICS (7407) Specification. AQA AS Physics 7407, see also A-level 7408 later`;
    expect(inferSpecCode(aqaAsOnly)).toEqual({ board: "AQA", spec: "7407" });

    const edexcelAsOnly = `Pearson Edexcel Level 3 Advanced Subsidiary GCE in Further Mathematics (8FM0). First teaching 2017. This AS qualification is co-teachable with the Pearson Edexcel Level 3 Advanced GCE in Further Mathematics (9FM0), and AS marks do not count towards the A level.`;
    expect(inferQualification(edexcelAsOnly)).toBe("as");
    expect(inferSpecCode(edexcelAsOnly)).toEqual({ board: "Edexcel", spec: "8FM0" });

    const edexcelJoint = `Pearson Edexcel Level 3 Advanced GCE in Further Mathematics (9FM0) and Advanced Subsidiary (8FM0)`;
    expect(inferSpecCode(edexcelJoint)).toEqual({ board: "Edexcel", spec: "9FM0" });
  });

  it("prefers the cover code over a code mentioned later (e.g. a related spec)", () => {
    const text = `${COVERS["AQA 8464"]}\n${"filler text ".repeat(500)}\nSee also AQA GCSE Biology (8461) and AQA GCSE Biology 8461.`;
    expect(inferSpecCode(text)).toEqual({ board: "AQA", spec: "8464" });
  });

  it.each([
    ["page numbers and years", "AQA GCSE Maths. Page 8 of 44. For exams in 2017 onwards. Version 1.0 12 September 2014"],
    ["section numbers and decimals", "AQA GCSE. 8.300 grams. 7.408 m. Contents 3.1 Number 8"],
    ["money and percentages", "AQA spent £8000 and 7500% more; 8,300 learners took part"],
    ["a 4-digit number far from the board name", `AQA${" lorem ipsum".repeat(40)} the year 8300 BC saw`],
    ["an Edexcel-shaped code in a document that never names Edexcel", "Level 3 in Mathematics (9MA0) First teaching"],
    ["an OCR-shaped code with no OCR in sight", "GCSE Computer Science J277 for first assessment"],
    ["chemical formulae", "OCR Chemistry: H2O and H2SO4 react; H1 and J3 hydrogen"],
    ["no code at all", "A specification for teaching Art History."],
  ])("returns null for %s", (_label, text) => {
    expect(inferSpecCode(text)).toBeNull();
  });
});

describe("inferQualification", () => {
  it("reads the level from the cover pages", () => {
    expect(inferQualification(COVERS["AQA 8300"])).toBe("gcse");
    expect(inferQualification(COVERS["OCR H556"])).toBe("alevel");
    expect(inferQualification(COVERS["Edexcel 9MA0"])).toBe("alevel");
    expect(inferQualification(COVERS["AQA 7408"])).toBe("alevel");
    expect(inferQualification(COVERS["Edexcel 8FM0"])).toBe("as");
    expect(inferQualification("A specification for teaching Art History.")).toBeNull();
  });

  it("ignores GCSE mentioned in an A-level spec's later pages", () => {
    const text = `${COVERS["OCR H556"]}\n${"x".repeat(5000)}\nPrior learning: GCSE Physics`;
    expect(inferQualification(text)).toBe("alevel");
  });
});

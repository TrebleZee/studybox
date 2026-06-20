import { describe, expect, it } from "vitest";
import {
  generateSubjectDraftFromSpecText,
  inferExamBoard,
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
      topics: ["Ancient Art", "Modern Art", "Key Movements", "Renaissance", "Modernism"],
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  SUBJECT_PRESETS,
  TEMPLATES,
  addUniqueTag,
  defaultSubjects,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubjects,
  subjectLabel,
  subjectProgress,
  subjectsForTemplate,
  topicList,
  updateSubjectFields,
} from "./subjects.js";

describe("defaultSubjects", () => {
  it("builds the A-Level example subjects with unchecked topics and no dead flags", () => {
    const subjects = defaultSubjects();
    expect(subjects.map((s) => s.id)).toEqual(["physics", "maths", "further", "cs"]);
    subjects.forEach((s) => {
      expect(s.topics.length).toBeGreaterThan(0);
      expect(s.topics.every((t) => t.done === false)).toBe(true);
      expect(s).not.toHaveProperty("locked");
      expect(s).not.toHaveProperty("custom");
    });
  });

  it("is deterministic, so untouched detection is reliable", () => {
    expect(isUntouchedDefaultSubjects(defaultSubjects())).toBe(true);
    const edited = defaultSubjects();
    edited[0].topics[0].done = true;
    expect(isUntouchedDefaultSubjects(edited)).toBe(false);
    expect(isUntouchedDefaultSubjects([])).toBe(false);
  });

  it("is only the alevel template, even though SUBJECT_PRESETS now spans every template", () => {
    expect(defaultSubjects().map((s) => s.id)).toEqual(
      TEMPLATES.find((t) => t.id === "alevel").presets.map((p) => p.id)
    );
    expect(SUBJECT_PRESETS.length).toBeGreaterThan(defaultSubjects().length);
  });
});

describe("onboarding templates", () => {
  it("exposes more than one selectable template, each with a distinct starter set", () => {
    expect(TEMPLATES.length).toBeGreaterThan(1);
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("subjectsForTemplate builds a full, unchecked, deterministic subject list per template", () => {
    TEMPLATES.forEach((template) => {
      const subjects = subjectsForTemplate(template.id);
      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects.map((s) => s.id)).toEqual(template.presets.map((p) => p.id));
      subjects.forEach((s) => {
        expect(s.topics.length).toBeGreaterThan(0);
        expect(s.topics.every((t) => t.done === false)).toBe(true);
      });
      expect(subjectsForTemplate(template.id)).toEqual(subjects);
    });
  });

  it("the GCSE template covers the core subjects with a shape matching SUBJECT_PRESETS", () => {
    const gcse = TEMPLATES.find((t) => t.id === "gcse");
    expect(gcse.presets.map((p) => p.name).sort()).toEqual(
      ["Combined Science", "English", "Maths"].sort()
    );
    const subjects = subjectsForTemplate("gcse");
    subjects.forEach((s) => {
      expect(s).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        exam: expect.any(String),
        color: expect.any(String),
      });
      expect(SUBJECT_PRESETS.some((p) => p.id === s.id)).toBe(true);
    });
  });

  it("returns [] for an unknown template id instead of throwing", () => {
    expect(subjectsForTemplate("nope")).toEqual([]);
  });

  it("picking a non-alevel template is never mistaken for the untouched default", () => {
    expect(isUntouchedDefaultSubjects(subjectsForTemplate("gcse"))).toBe(false);
  });
});

describe("normalizeSubjects", () => {
  it("returns defaults for null, undefined and non-arrays", () => {
    [null, undefined, {}, "x", 5].forEach((input) => {
      expect(normalizeSubjects(input)).toEqual(normalizeSubjects(defaultSubjects()));
    });
  });

  it("keeps an explicitly empty list empty", () => {
    expect(normalizeSubjects([])).toEqual([]);
  });

  it("fills in missing fields without throwing on garbage entries", () => {
    const result = normalizeSubjects([null, 5, {}, { id: "x", topics: "nope" }, { id: "y", topics: [null, {}] }]);
    expect(result).toHaveLength(5);
    result.forEach((s) => {
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.color).toBe("string");
      expect(Array.isArray(s.topics)).toBe(true);
    });
    expect(result[3].topics).toEqual([]);
    expect(result[4].topics.map((t) => t.name)).toEqual(["Untitled topic", "Untitled topic"]);
  });

  it("uses preset details for known ids and coerces done flags", () => {
    const [physics] = normalizeSubjects([
      { id: "physics", topics: [{ id: "a", name: "A", done: "yes", subtasks: [{ name: "s" }] }] },
    ]);
    expect(physics.name).toBe("Physics");
    expect(physics.exam).toBe("OCR Physics A");
    expect(physics.topics[0].done).toBe(true);
    expect(physics.topics[0].subtasks[0]).toMatchObject({ name: "s", done: false });
  });
});

describe("normalizeSessions", () => {
  it("returns [] for non-arrays", () => {
    expect(normalizeSessions(null)).toEqual([]);
    expect(normalizeSessions({})).toEqual([]);
  });

  it("repairs partial sessions", () => {
    const [s] = normalizeSessions([{ duration: "90", tags: ["a", "", null] }]);
    expect(s.duration).toBe(90);
    expect(s.tags).toEqual(["a"]);
    expect(s.subjectColor).toBe("#888888");
    expect(s.id).toBeTruthy();
    expect(Number.isNaN(new Date(s.date).getTime())).toBe(false);
  });

  it("does not throw on null entries", () => {
    expect(() => normalizeSessions([null, undefined])).not.toThrow();
  });
});

describe("helpers", () => {
  it("addUniqueTag trims, collapses whitespace and dedupes case-insensitively", () => {
    expect(addUniqueTag(["Recap"], "  past   papers ")).toEqual(["Recap", "past papers"]);
    expect(addUniqueTag(["Recap"], "recap")).toEqual(["Recap"]);
    expect(addUniqueTag(["Recap"], "   ")).toEqual(["Recap"]);
  });

  it("topicList builds ids from the prefix", () => {
    expect(topicList(["a", "b"], "x")).toEqual([
      { id: "x0", name: "a", done: false, subtasks: [] },
      { id: "x1", name: "b", done: false, subtasks: [] },
    ]);
  });

  it("subjectProgress is a rounded percentage and 0 for empty subjects", () => {
    expect(subjectProgress({ topics: [] })).toBe(0);
    expect(subjectProgress({ topics: [{ done: true }, { done: false }, { done: false }] })).toBe(33);
  });
});

// A realistic sb-subjects value as written by v1.2.1: presets with progress,
// a hand-made custom subject and a subject created from a spec PDF.
const V121_SUBJECTS = [
  {
    id: "physics",
    name: "Physics",
    exam: "OCR A",
    color: "#4F9CF9",
    topics: [
      {
        id: "ph0",
        name: "Practical Skills in Physics",
        done: true,
        subtasks: [{ id: "ph0-st0", name: "PAG 1", done: true }],
      },
      { id: "ph1", name: "Foundations of Physics", done: false, subtasks: [] },
    ],
  },
  {
    id: "maths",
    name: "Maths",
    exam: "Edexcel",
    color: "#34D399",
    topics: [{ id: "ma0", name: "Algebra and Functions", done: true, subtasks: [] }],
  },
  { id: "further", name: "Further Maths", exam: "Edexcel", color: "#A78BFA", topics: [] },
  {
    id: "cs",
    name: "Computer Science",
    exam: "OCR",
    color: "#FBBF24",
    topics: [{ id: "cs9", name: "NEA Programming Project", done: false, subtasks: [] }],
  },
  { id: "gcse-english", name: "English", exam: "AQA", color: "#F472B6", topics: [] },
  { id: "gcse-maths", name: "Maths", exam: "AQA", color: "#34D399", topics: [] },
  { id: "gcse-science", name: "Combined Science", exam: "AQA", color: "#60A5FA", topics: [] },
  {
    id: "custom-lx1",
    name: "Latin",
    exam: "My tutor",
    color: "#ff0000",
    topics: [{ id: "custom-lx1-topic-0", name: "Verbs", done: true, subtasks: [] }],
  },
  {
    id: "custom-lx2",
    name: "Art History",
    exam: "Pearson Edexcel",
    color: "#00ff00",
    topics: [{ id: "custom-lx2-topic-0", name: "Ancient Art", done: false, subtasks: [] }],
  },
];

describe("subject metadata migration", () => {
  const byId = (list) => Object.fromEntries(list.map((s) => [s.id, s]));

  it("maps every preset id to its exact board and spec", () => {
    const s = byId(normalizeSubjects(V121_SUBJECTS));
    expect(s.physics).toMatchObject({
      qualification: "alevel",
      board: "OCR",
      spec: "H556",
      specName: "Physics A",
      tier: null,
    });
    expect(s.maths).toMatchObject({ qualification: "alevel", board: "Edexcel", spec: "9MA0", specName: null });
    expect(s.further).toMatchObject({ qualification: "alevel", board: "Edexcel", spec: "9FM0" });
    expect(s.cs).toMatchObject({ qualification: "alevel", board: "OCR", spec: "H446" });
    expect(s["gcse-english"]).toMatchObject({ qualification: "gcse", board: "AQA", spec: null });
    expect(s["gcse-maths"]).toMatchObject({ qualification: "gcse", board: "AQA", spec: "8300" });
    expect(s["gcse-science"]).toMatchObject({
      qualification: "gcse",
      board: "AQA",
      spec: "8464",
      specName: "Combined Science Trilogy",
    });
  });

  it("parses the board from exam text for other subjects, else falls back to Custom", () => {
    const s = byId(normalizeSubjects(V121_SUBJECTS));
    expect(s["custom-lx1"]).toMatchObject({
      board: "Custom",
      qualification: "other",
      exam: "My tutor",
      spec: null,
      tier: null,
    });
    expect(s["custom-lx2"]).toMatchObject({ board: "Edexcel", qualification: "other", exam: "Edexcel" });
  });

  it("loses no topics, subtasks or progress", () => {
    const result = normalizeSubjects(V121_SUBJECTS);
    expect(result).toHaveLength(V121_SUBJECTS.length);
    result.forEach((subject, index) => {
      const source = V121_SUBJECTS[index];
      expect(subject.id).toBe(source.id);
      expect(subject.name).toBe(source.name);
      expect(subject.color).toBe(source.color);
      expect(subject.topics).toEqual(source.topics);
    });
  });

  it("is idempotent, so reloading stored data never drifts", () => {
    const once = normalizeSubjects(V121_SUBJECTS);
    expect(normalizeSubjects(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it("does not force preset metadata onto a preset the user re-pointed at another board", () => {
    const [physics] = normalizeSubjects([{ id: "physics", name: "Physics", exam: "AQA GCSE", topics: [] }]);
    expect(physics).toMatchObject({ board: "AQA", qualification: "gcse", spec: null });
  });

  it("recognises every board name case-insensitively", () => {
    const exams = ["aqa", "pearson", "Edexcel", "ocr", "WJEC Eduqas", "wjec", "ccea", "SQA"];
    const boards = normalizeSubjects(exams.map((exam, i) => ({ id: `b${i}`, exam }))).map((s) => s.board);
    expect(boards).toEqual(["AQA", "Edexcel", "Edexcel", "OCR", "Eduqas", "WJEC", "CCEA", "Custom"]);
  });

  it("forces tier to null unless the qualification is GCSE, and drops unknown values", () => {
    const [a, b, c] = normalizeSubjects([
      { id: "a", board: "AQA", qualification: "alevel", tier: "higher" },
      { id: "b", board: "AQA", qualification: "gcse", tier: "higher" },
      { id: "c", board: "Nope", qualification: "degree", tier: "middle", exam: "AQA" },
    ]);
    expect(a.tier).toBeNull();
    expect(b.tier).toBe("higher");
    expect(c).toMatchObject({ board: "AQA", qualification: "other", tier: null });
  });

  it("keeps writing exam as a derived board + spec name string", () => {
    const [s] = normalizeSubjects([
      { id: "x", board: "OCR", qualification: "alevel", specName: "Physics A", exam: "stale" },
    ]);
    expect(s.exam).toBe("OCR Physics A");
  });

  it("updateSubjectFields re-derives exam and tier after an edit", () => {
    const [physics] = normalizeSubjects(defaultSubjects());
    const edited = updateSubjectFields(physics, {
      board: "AQA",
      specName: null,
      qualification: "gcse",
      tier: "foundation",
    });
    expect(edited).toMatchObject({ exam: "AQA", tier: "foundation" });
    expect(updateSubjectFields(edited, { qualification: "alevel" }).tier).toBeNull();
  });
});

describe("subjectLabel", () => {
  it("formats board, level, spec name and tier", () => {
    const [physics] = normalizeSubjects([{ id: "physics", exam: "OCR A" }]);
    expect(subjectLabel(physics)).toBe("OCR A-level Physics A");
    expect(subjectLabel({ name: "Maths", board: "AQA", qualification: "gcse", tier: "higher" })).toBe(
      "AQA GCSE Maths (Higher)"
    );
    expect(subjectLabel({ name: "Maths", board: "AQA", qualification: "alevel", tier: "higher" })).toBe(
      "AQA A-level Maths"
    );
    expect(subjectLabel({ name: "Art", board: "Edexcel", qualification: "other" })).toBe("Edexcel Art");
  });

  it("uses the old exam text for Custom and legacy subjects", () => {
    expect(subjectLabel({ name: "Latin", board: "Custom", exam: "My tutor" })).toBe("My tutor");
    expect(subjectLabel({ name: "Latin", board: "Custom", exam: "" })).toBe("Custom");
    expect(subjectLabel({ name: "Latin", exam: "OCR A" })).toBe("OCR A");
  });
});

describe("onboarding guard", () => {
  it("defaultSubjects stays the frozen A-level set with no new metadata fields", () => {
    const subjects = defaultSubjects();
    expect(subjects.map(({ id, name, exam, color }) => ({ id, name, exam, color }))).toEqual([
      { id: "physics", name: "Physics", exam: "OCR A", color: "#4F9CF9" },
      { id: "maths", name: "Maths", exam: "Edexcel", color: "#34D399" },
      { id: "further", name: "Further Maths", exam: "Edexcel", color: "#A78BFA" },
      { id: "cs", name: "Computer Science", exam: "OCR", color: "#FBBF24" },
    ]);
    subjects.forEach((s) =>
      expect(Object.keys(s).sort()).toEqual(["color", "exam", "id", "name", "topics"])
    );
  });

  it("detects an untouched install both raw and after normalization and storage", () => {
    expect(isUntouchedDefaultSubjects(defaultSubjects())).toBe(true);
    const stored = JSON.parse(JSON.stringify(normalizeSubjects(null)));
    expect(isUntouchedDefaultSubjects(stored)).toBe(true);
    stored[1].qualification = "gcse";
    stored[1].tier = "higher";
    expect(isUntouchedDefaultSubjects(stored)).toBe(false);
  });
});

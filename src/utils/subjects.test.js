import { describe, expect, it } from "vitest";
import {
  SUBJECT_PRESETS,
  TEMPLATES,
  addUniqueTag,
  defaultSubjects,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubjects,
  subjectProgress,
  subjectsForTemplate,
  topicList,
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
      expect(normalizeSubjects(input)).toEqual(defaultSubjects());
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
    expect(physics.exam).toBe("OCR A");
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

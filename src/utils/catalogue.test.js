import { describe, expect, it } from "vitest";
import specIndex from "../data/specs/index.json";
import {
  listSpecs,
  loadSpec,
  subjectFromSpec,
  subjectsForTemplate,
  topicPapers,
  validateCatalogue,
  validateSpec,
} from "./catalogue.js";
import { defaultSubjects, isUntouchedDefaultSubjects, normalizeSubjects } from "./subjects.js";

const SPEC_FILES = Object.entries(
  import.meta.glob(["../data/specs/*.json", "!../data/specs/index.json"], {
    eager: true,
    import: "default",
  })
).map(([path, spec]) => ({ fileName: path.split("/").pop(), spec }));
const SPECS = SPEC_FILES.map(({ spec }) => spec);

const clone = (value) => JSON.parse(JSON.stringify(value));
const specById = (id) => clone(SPECS.find((spec) => spec.id === id));

describe("catalogue files", () => {
  it("has spec files", () => {
    expect(SPEC_FILES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(SPEC_FILES.map(({ fileName, spec }) => [fileName, spec]))(
    "%s validates against the schema",
    (fileName, spec) => {
      expect(validateSpec(spec, fileName)).toEqual([]);
    }
  );

  it("has unique spec and topic ids across the whole catalogue", () => {
    expect(validateCatalogue(SPECS)).toEqual([]);
  });

  it("index.json lists exactly the spec files, with matching metadata", () => {
    const fromFiles = SPECS.map(({ id, qualification, board, spec, subject, specName, deprecated }) => ({
      id,
      qualification,
      board,
      spec,
      subject,
      specName,
      ...(deprecated ? { deprecated: true } : {}),
    })).sort((a, b) => a.id.localeCompare(b.id));
    expect(specIndex).toEqual(fromFiles);
  });

  it("includes the re-expressed presets and the split GCSE English specs", () => {
    expect(SPECS.map((spec) => spec.id).sort()).toEqual(
      [
        "aqa-8300",
        "aqa-8464",
        "aqa-8700",
        "aqa-8702",
        "edexcel-9fm0",
        "edexcel-9ma0",
        "ocr-h446",
        "ocr-h556",
      ].sort()
    );
  });
});

describe("validateSpec rejects broken fixtures", () => {
  const base = () => specById("aqa-8702");

  it.each([
    ["file name not matching id", (s) => s, "aqa-9999.json", /file name/],
    ["id not matching board and spec", (s) => ({ ...s, spec: "8703" }), undefined, /id must equal/],
    ["unknown board", (s) => ({ ...s, board: "Custom" }), undefined, /board/],
    ["qualification other", (s) => ({ ...s, qualification: "other" }), undefined, /qualification/],
    [
      "topic pointing at a missing paper",
      (s) => ({ ...s, topics: [{ ...s.topics[0], paper: "p9" }, ...s.topics.slice(1)] }),
      undefined,
      /unknown paper p9/,
    ],
    [
      "one of several papers missing",
      (s) => ({ ...s, topics: [{ ...s.topics[0], paper: ["p1", "px"] }, ...s.topics.slice(1)] }),
      undefined,
      /unknown paper px/,
    ],
    [
      "topic with no paper",
      (s) => ({ ...s, topics: [{ ...s.topics[0], paper: undefined }, ...s.topics.slice(1)] }),
      undefined,
      /needs a paper/,
    ],
    [
      "duplicate topic id",
      (s) => ({ ...s, topics: [...s.topics, s.topics[0]] }),
      undefined,
      /duplicate topic id/,
    ],
    [
      "topic id without the spec prefix",
      (s) => ({ ...s, topics: [{ ...s.topics[0], id: "t01" }, ...s.topics.slice(1)] }),
      undefined,
      /must start with/,
    ],
    [
      "option listing a missing topic",
      (s) => {
        s.optionGroups[0].options[0].topicIds = ["aqa-8702-t99"];
        return s;
      },
      undefined,
      /unknown topic aqa-8702-t99/,
    ],
    [
      "option group picking more than it offers",
      (s) => {
        s.optionGroups[0].pick = 99;
        return s;
      },
      undefined,
      /invalid pick/,
    ],
    [
      "higherOnly topic in an untiered spec",
      (s) => ({ ...s, topics: [{ ...s.topics[0], higherOnly: true }, ...s.topics.slice(1)] }),
      undefined,
      /higherOnly in an untiered spec/,
    ],
    ["tiered A-level", (s) => ({ ...s, qualification: "alevel", tiers: ["higher"] }), undefined, /only GCSE/],
    ["missing milestones list", (s) => ({ ...s, milestones: undefined }), undefined, /milestones/],
    ["non-https spec link", (s) => ({ ...s, specUrl: "http://example.com" }), undefined, /specUrl/],
  ])("%s", (_label, mutate, fileName, pattern) => {
    const errors = validateSpec(mutate(base()), fileName ?? "aqa-8702.json");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(pattern);
  });

  it("validateCatalogue catches a duplicate spec id and a topic id reused across specs", () => {
    const a = specById("aqa-8300");
    const b = specById("aqa-8464");
    b.topics[0].id = a.topics[0].id;
    expect(validateCatalogue([a, a])).toEqual(expect.arrayContaining([expect.stringMatching(/duplicate spec id/)]));
    expect(validateCatalogue([a, b]).join()).toMatch(/duplicate topic id aqa-8300-t01/);
  });
});

describe("listSpecs", () => {
  it("returns every current spec with no filters, and the whole index with includeDeprecated", () => {
    expect(listSpecs()).toEqual(specIndex.filter((entry) => !entry.deprecated));
    expect(listSpecs({ includeDeprecated: true })).toEqual(specIndex);
  });

  it("filters by qualification and board", () => {
    expect(listSpecs({ qualification: "gcse" }).every((s) => s.qualification === "gcse")).toBe(true);
    expect(listSpecs({ qualification: "alevel", board: "OCR" }).map((s) => s.id).sort()).toEqual([
      "ocr-h446",
      "ocr-h556",
    ]);
  });

  it("searches board, code, subject and spec name case-insensitively, all words required", () => {
    expect(listSpecs({ query: "physics" }).map((s) => s.id)).toEqual(["ocr-h556"]);
    expect(listSpecs({ query: "9ma0" }).map((s) => s.id)).toEqual(["edexcel-9ma0"]);
    expect(listSpecs({ query: "aqa english" }).map((s) => s.id).sort()).toEqual(["aqa-8700", "aqa-8702"]);
    expect(listSpecs({ query: "ocr english" })).toEqual([]);
  });

  it("hides deprecated specs unless asked", () => {
    const index = [
      { id: "aqa-1", board: "AQA", deprecated: true },
      { id: "aqa-2", board: "AQA" },
    ];
    expect(listSpecs({}, index).map((s) => s.id)).toEqual(["aqa-2"]);
    expect(listSpecs({ includeDeprecated: true }, index).map((s) => s.id)).toEqual(["aqa-1", "aqa-2"]);
  });
});

describe("loadSpec", () => {
  it("loads a spec by id and returns null for an unknown one", async () => {
    expect((await loadSpec("ocr-h556")).specName).toBe("Physics A");
    expect(await loadSpec("nope-0000")).toBeNull();
    expect(await loadSpec("index")).toBeNull();
  });

  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "returns null for the inherited object key %s",
    async (id) => {
      expect(await loadSpec(id)).toBeNull();
    }
  );
});

describe("topicPapers", () => {
  it("accepts a single paper id or a list", () => {
    expect(topicPapers({ paper: "p1" })).toEqual(["p1"]);
    expect(topicPapers({ paper: ["p1", "p2"] })).toEqual(["p1", "p2"]);
    expect(topicPapers({})).toEqual([]);
  });
});

describe("subjectFromSpec", () => {
  it("builds a normalized subject with metadata and catalogueTopicId on every topic", () => {
    const spec = specById("ocr-h556");
    const subject = subjectFromSpec(spec, { color: "#123456" });
    expect(subject).toMatchObject({
      id: "ocr-h556",
      name: "Physics",
      qualification: "alevel",
      board: "OCR",
      spec: "H556",
      specName: "Physics A",
      tier: null,
      exam: "OCR Physics A",
      color: "#123456",
    });
    expect(subject.topics).toHaveLength(spec.topics.length);
    subject.topics.forEach((topic, index) => {
      expect(topic).toEqual({
        id: `ocr-h556-t${index}`,
        name: spec.topics[index].name,
        done: false,
        subtasks: [],
        catalogueTopicId: spec.topics[index].id,
      });
    });
    expect(normalizeSubjects([subject])).toEqual([subject]);
  });

  it("seeds only the picked options' topics", () => {
    const spec = specById("aqa-8702");
    const none = subjectFromSpec(spec);
    expect(none.topics.map((t) => t.name)).toEqual(["Unseen poetry"]);

    const picked = subjectFromSpec(spec, { optionIds: ["macbeth", "frankenstein"] });
    expect(picked.topics.map((t) => t.name)).toEqual([
      "Unseen poetry",
      "Shakespeare: Macbeth",
      "19th-century novel: Frankenstein",
    ]);
  });

  it("seeds two Further Maths option papers alongside core pure", () => {
    const spec = specById("edexcel-9fm0");
    const subject = subjectFromSpec(spec, { optionIds: ["3b", "3d"] });
    const optionTopicIds = spec.optionGroups[0].options
      .filter((o) => ["3b", "3d"].includes(o.id))
      .flatMap((o) => o.topicIds);
    const coreCount = spec.topics.filter((t) => ["p1", "p2"].includes(topicPapers(t)[0])).length;
    expect(subject.topics).toHaveLength(coreCount + optionTopicIds.length);
    expect(subject.topics.slice(coreCount).map((t) => t.catalogueTopicId)).toEqual(optionTopicIds);
  });

  it("keeps a tier only when the spec is tiered", () => {
    expect(subjectFromSpec(specById("aqa-8300"), { tier: "higher" }).tier).toBe("higher");
    expect(subjectFromSpec(specById("aqa-8300"), { tier: "bogus" }).tier).toBeNull();
    expect(subjectFromSpec(specById("aqa-8700"), { tier: "higher" }).tier).toBeNull();
  });

  it("accepts an explicit subject id", () => {
    const subject = subjectFromSpec(specById("aqa-8300"), { id: "maths-2" });
    expect(subject.id).toBe("maths-2");
    expect(subject.topics[0].id).toBe("maths-2-t0");
  });
});

describe("subjectsForTemplate", () => {
  it("builds the A-level template from presets, identical to the normalized default", async () => {
    expect(await subjectsForTemplate("alevel")).toEqual(normalizeSubjects(defaultSubjects()));
  });

  it("builds the GCSE template from catalogue specs, deterministically", async () => {
    const subjects = await subjectsForTemplate("gcse");
    expect(subjects.map((s) => [s.id, s.name, s.board, s.spec])).toEqual([
      ["aqa-8700", "English Language", "AQA", "8700"],
      ["aqa-8702", "English Literature", "AQA", "8702"],
      ["aqa-8300", "Mathematics", "AQA", "8300"],
      ["aqa-8464", "Combined Science", "AQA", "8464"],
    ]);
    subjects.forEach((s) => {
      expect(s.qualification).toBe("gcse");
      expect(s.topics.length).toBeGreaterThan(0);
      expect(s.topics.every((t) => !t.done && t.catalogueTopicId)).toBe(true);
    });
    expect(new Set(subjects.map((s) => s.color)).size).toBe(subjects.length);
    expect(subjects[1].topics.map((t) => t.name)).toContain("Shakespeare: Macbeth");
    expect(await subjectsForTemplate("gcse")).toEqual(subjects);
  });

  it("returns [] for an unknown template id instead of throwing", async () => {
    expect(await subjectsForTemplate("nope")).toEqual([]);
  });

  it("picking the GCSE template is never mistaken for the untouched default", async () => {
    expect(isUntouchedDefaultSubjects(await subjectsForTemplate("gcse"))).toBe(false);
  });
});

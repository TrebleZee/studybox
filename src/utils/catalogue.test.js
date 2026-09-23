import { describe, expect, it } from "vitest";
import specIndex from "../data/specs/index.json";
import {
  findSpec,
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
    expect(SPECS.map((spec) => spec.id)).toEqual(
      expect.arrayContaining([
        "aqa-8300",
        "aqa-8464",
        "aqa-8700",
        "aqa-8702",
        "edexcel-9fm0",
        "edexcel-9ma0",
        "ocr-h446",
        "ocr-h556",
      ])
    );
  });

  it.each(SPECS.filter((spec) => spec.tiers).map((spec) => [spec.id, spec]))(
    "tiered %s has at least one higher-only topic",
    (_id, spec) => {
      expect(spec.topics.some((topic) => topic.higherOnly)).toBe(true);
      // ...and still has plenty of Foundation content.
      expect(spec.topics.filter((topic) => !topic.higherOnly).length).toBeGreaterThan(5);
    }
  );

  it.each([
    ["ocr-h446", "nea"],
    ["ocr-h556", "practical"],
    ["aqa-8464", "practical"],
    ["edexcel-1sc0", "practical"],
    ["ocr-j250", "practical"],
    ["ocr-j260", "practical"],
    ["aqa-8700", "nea"],
    ["edexcel-1en0", "nea"],
    ["ocr-j351", "nea"],
  ])("%s seeds a %s milestone", (id, kind) => {
    expect(SPECS.find((spec) => spec.id === id).milestones.map((m) => m.kind)).toContain(kind);
  });

  it("untiered specs have no higher-only topics", () => {
    SPECS.filter((spec) => !spec.tiers).forEach((spec) =>
      expect(spec.topics.filter((topic) => topic.higherOnly), spec.id).toEqual([])
    );
  });

  // Wave 2: the A-level top 10 plus Further Maths and Computer Science on
  // every one of the three boards that offers the subject (Pearson Edexcel
  // has no A-level Sociology or Computer Science).
  const WAVE_2 = ["Mathematics", "Psychology", "Biology", "Chemistry", "Business", "Physics", "History", "Sociology",
    "Art and Design", "Economics", "Further Mathematics", "Computer Science"];
  const NOT_OFFERED = { Edexcel: ["Sociology", "Computer Science"] };
  it.each(["AQA", "Edexcel", "OCR"])("offers every Wave 2 A-level that %s runs", (board) => {
    const subjects = new Set(SPECS.filter((s) => s.board === board && s.qualification === "alevel").map((s) => s.subject));
    WAVE_2.filter((subject) => !(NOT_OFFERED[board] || []).includes(subject)).forEach((subject) =>
      expect(subjects.has(subject), `${board} A-level ${subject}`).toBe(true)
    );
  });

  it("lists every spec variant a board runs (OCR A/B, Edexcel A/B)", () => {
    const ids = SPECS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([
      "ocr-h240", "ocr-h640", "ocr-h245", "ocr-h645", "ocr-h420", "ocr-h422", "ocr-h432", "ocr-h433", "ocr-h556", "ocr-h557",
      "edexcel-9bn0", "edexcel-9bi0", "edexcel-9ec0", "edexcel-9eb0",
    ]));
  });

  it("marks specs that are being withdrawn with their last exam year", () => {
    const byId = Object.fromEntries(SPECS.map((s) => [s.id, s]));
    expect(byId["ocr-h431"].lastExam).toBe(2027);
    expect(byId["ocr-h436"].firstExam).toBe(2028);
    expect(byId["ocr-h606"].lastExam).toBe(2028);
  });

  // Wave 1: the four core GCSEs on each of the three big boards.
  it.each(["AQA", "Edexcel", "OCR"])("offers every core GCSE on %s", (board) => {
    const gcse = SPECS.filter((spec) => spec.board === board && spec.qualification === "gcse");
    ["Mathematics", "English Language", "English Literature", "Combined Science"].forEach((subject) => {
      const specs = gcse.filter((spec) => spec.subject === subject);
      expect(specs.length, `${board} GCSE ${subject}`).toBeGreaterThan(0);
      specs.forEach((spec) => {
        const tiered = ["Mathematics", "Combined Science"].includes(subject);
        expect(spec.tiers).toEqual(tiered ? ["foundation", "higher"] : null);
      });
    });
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
      "two topics with the same name (case-insensitive)",
      (s) => ({
        ...s,
        topics: [...s.topics, { ...s.topics[0], id: "aqa-8702-t99", name: " unseen POETRY " }],
      }),
      undefined,
      /duplicate topic name/,
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
    [
      "milestone with an unknown kind",
      (s) => ({ ...s, milestones: [{ id: "aqa-8702-m01", name: "Essay", kind: "essay" }] }),
      undefined,
      /unknown kind/,
    ],
    [
      "milestone id without the spec prefix",
      (s) => ({ ...s, milestones: [{ id: "m1", name: "Essay", kind: "other" }] }),
      undefined,
      /milestone id m1 must start with/,
    ],
    [
      "duplicate milestone id",
      (s) => ({
        ...s,
        milestones: [
          { id: "aqa-8702-m01", name: "A", kind: "other" },
          { id: "aqa-8702-m01", name: "B", kind: "other" },
        ],
      }),
      undefined,
      /duplicate milestone id/,
    ],
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
    const ocrALevel = listSpecs({ qualification: "alevel", board: "OCR" });
    expect(ocrALevel.length).toBeGreaterThan(2);
    expect(ocrALevel.every((s) => s.board === "OCR" && s.qualification === "alevel")).toBe(true);
    expect(ocrALevel.map((s) => s.id)).toEqual(expect.arrayContaining(["ocr-h446", "ocr-h556"]));
  });

  it("searches board, code, subject and spec name case-insensitively, all words required", () => {
    expect(listSpecs({ query: "ocr physics h556" }).map((s) => s.id)).toEqual(["ocr-h556"]);
    expect(listSpecs({ query: "physics" }).map((s) => s.id).sort()).toEqual(["aqa-7408", "edexcel-9ph0", "ocr-h556", "ocr-h557"]);
    expect(listSpecs({ query: "9ma0" }).map((s) => s.id)).toEqual(["edexcel-9ma0"]);
    expect(listSpecs({ query: "aqa english" }).map((s) => s.id).sort()).toEqual(["aqa-8700", "aqa-8702"]);
    expect(listSpecs({ query: "ocr english" }).map((s) => s.id).sort()).toEqual(["ocr-j351", "ocr-j352"]);
    expect(listSpecs({ query: "aqa french" })).toEqual([]);
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

describe("findSpec", () => {
  it("matches a board and code case-insensitively, else null", () => {
    expect(findSpec("AQA", "8300")?.id).toBe("aqa-8300");
    expect(findSpec("OCR", "h556")?.id).toBe("ocr-h556");
    expect(findSpec("Edexcel", "1MA1")?.id).toBe("edexcel-1ma1");
    expect(findSpec("OCR", "J277")).toBeNull();
    expect(findSpec("AQA", "H556")).toBeNull();
    expect(findSpec(null, "8300")).toBeNull();
    expect(findSpec("AQA", undefined)).toBeNull();
  });

  it("still finds a deprecated spec, so an old PDF matches its old spec", () => {
    const index = [{ id: "aqa-1234", board: "AQA", spec: "1234", deprecated: true }];
    expect(findSpec("AQA", "1234", index)).toEqual(index[0]);
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
        paper: spec.topics[index].paper,
      });
    });
    expect(subject.papers).toEqual(spec.papers);
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

  // `pick` is how many options a student usually takes, not a limit: Art
  // students may work in "one or more" areas, and MEI Route C takes three
  // minors. Every picked option is seeded.
  it("seeds every picked option, even beyond the group's pick count", () => {
    const fineArt = specById("aqa-7202");
    expect(fineArt.optionGroups[0].pick).toBe(1);
    const ids = fineArt.optionGroups[0].options.slice(0, 2).map((o) => o.id);
    const subject = subjectFromSpec(fineArt, { optionIds: ids });
    const seeded = subject.topics.map((t) => t.name);
    fineArt.optionGroups[0].options.slice(0, 2).forEach((o) => expect(seeded).toContain(o.name));

    const mei = specById("ocr-h645");
    const minors = ["y433", "y434", "y435"];
    const routeC = subjectFromSpec(mei, { optionIds: minors });
    minors.forEach((id) =>
      expect(routeC.topics.some((t) => mei.optionGroups[0].options.find((o) => o.id === id).topicIds.includes(t.catalogueTopicId))).toBe(true)
    );
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

  it("seeds the spec's milestones undated and not done", () => {
    const subject = subjectFromSpec(specById("ocr-h446"));
    expect(subject.milestones).toEqual([
      {
        id: "ocr-h446-m0",
        name: "Programming project (NEA)",
        kind: "nea",
        due: null,
        done: false,
        catalogueMilestoneId: "ocr-h446-m01",
      },
    ]);
    expect(subjectFromSpec(specById("edexcel-9ma0"))).not.toHaveProperty("milestones");
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

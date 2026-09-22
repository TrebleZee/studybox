import specIndex from "../data/specs/index.json";
import {
  BOARDS,
  QUALIFICATIONS,
  TEMPLATES,
  TIERS,
  normalizeSubject,
  subjectsFromPresets,
} from "./subjects.js";

// Each spec file becomes its own lazily-loaded chunk, so the main bundle only
// carries the small search index. Keyed by spec id (the file name).
const SPEC_LOADERS = Object.fromEntries(
  Object.entries(
    import.meta.glob(["../data/specs/*.json", "!../data/specs/index.json"], {
      import: "default",
    })
  ).map(([path, loader]) => [path.split("/").pop().replace(/\.json$/, ""), loader])
);

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

// A topic's paper is one paper id, or an array of ids when the topic is
// examined on several papers (e.g. A-level Maths pure content on papers 1 and 2).
export const topicPapers = (topic) => {
  if (Array.isArray(topic?.paper)) return topic.paper;
  return isNonEmptyString(topic?.paper) ? [topic.paper] : [];
};

// Returns a list of human-readable problems; an empty list means valid.
// `fileName` (without directory) is checked against the id when given.
export const validateSpec = (spec, fileName) => {
  const errors = [];
  const fail = (message) => errors.push(`${spec?.id || fileName || "spec"}: ${message}`);

  if (!spec || typeof spec !== "object") return [`${fileName || "spec"}: not an object`];
  if (!/^[a-z]+-[a-z0-9]+$/.test(spec.id || "")) fail("id must be <board>-<spec> in lowercase");
  if (fileName && fileName !== `${spec.id}.json`) fail(`file name ${fileName} does not match id`);
  if (!QUALIFICATIONS.includes(spec.qualification) || spec.qualification === "other") {
    fail("qualification must be gcse, alevel or as");
  }
  if (!BOARDS.includes(spec.board) || spec.board === "Custom") fail("board must be a real board");
  if (!isNonEmptyString(spec.spec)) fail("spec code is required");
  if (spec.id && spec.board && spec.spec && spec.id !== `${spec.board}-${spec.spec}`.toLowerCase()) {
    fail("id must equal lowercase <board>-<spec>");
  }
  if (!isNonEmptyString(spec.subject)) fail("subject is required");
  if (spec.specName !== null && !isNonEmptyString(spec.specName)) fail("specName must be a string or null");
  if (!isNonEmptyString(spec.specVersion)) fail("specVersion is required");
  if (!Number.isInteger(spec.firstExam)) fail("firstExam must be a year");
  if (spec.lastExam !== null && !Number.isInteger(spec.lastExam)) fail("lastExam must be a year or null");
  if (!/^https:\/\//.test(spec.specUrl || "")) fail("specUrl must be an https link");
  if (spec.tiers !== null) {
    if (!Array.isArray(spec.tiers) || !spec.tiers.length || spec.tiers.some((t) => !TIERS.includes(t))) {
      fail("tiers must be null or a list of foundation/higher");
    } else if (spec.qualification !== "gcse") {
      fail("only GCSE specs can be tiered");
    }
  }

  const paperIds = new Set();
  if (!Array.isArray(spec.papers) || !spec.papers.length) fail("papers must be a non-empty list");
  (Array.isArray(spec.papers) ? spec.papers : []).forEach((paper) => {
    if (!isNonEmptyString(paper?.id) || !isNonEmptyString(paper?.name)) fail("paper needs id and name");
    if (paperIds.has(paper?.id)) fail(`duplicate paper id ${paper?.id}`);
    paperIds.add(paper?.id);
  });

  const topicIds = new Set();
  if (!Array.isArray(spec.topics) || !spec.topics.length) fail("topics must be a non-empty list");
  (Array.isArray(spec.topics) ? spec.topics : []).forEach((topic) => {
    if (!isNonEmptyString(topic?.id) || !topic.id.startsWith(`${spec.id}-`)) {
      fail(`topic id ${topic?.id} must start with ${spec.id}-`);
    }
    if (topicIds.has(topic?.id)) fail(`duplicate topic id ${topic?.id}`);
    topicIds.add(topic?.id);
    if (!isNonEmptyString(topic?.name)) fail(`topic ${topic?.id} needs a name`);
    const papers = topicPapers(topic);
    if (!papers.length) fail(`topic ${topic?.id} needs a paper`);
    papers.forEach((paper) => {
      if (!paperIds.has(paper)) fail(`topic ${topic?.id} has unknown paper ${paper}`);
    });
    if (typeof topic?.higherOnly !== "boolean") fail(`topic ${topic?.id} needs a higherOnly flag`);
    if (topic?.higherOnly && !spec.tiers) fail(`topic ${topic?.id} is higherOnly in an untiered spec`);
  });

  const optionIds = new Set();
  if (!Array.isArray(spec.optionGroups)) fail("optionGroups must be a list");
  (Array.isArray(spec.optionGroups) ? spec.optionGroups : []).forEach((group) => {
    if (!isNonEmptyString(group?.id) || !isNonEmptyString(group?.name)) fail("option group needs id and name");
    const options = Array.isArray(group?.options) ? group.options : [];
    if (!options.length) fail(`option group ${group?.id} has no options`);
    if (!Number.isInteger(group?.pick) || group.pick < 1 || group.pick > options.length) {
      fail(`option group ${group?.id} has an invalid pick count`);
    }
    options.forEach((option) => {
      if (!isNonEmptyString(option?.id) || !isNonEmptyString(option?.name)) fail("option needs id and name");
      if (optionIds.has(option?.id)) fail(`duplicate option id ${option?.id}`);
      optionIds.add(option?.id);
      (Array.isArray(option?.topicIds) ? option.topicIds : []).forEach((topicId) => {
        if (!topicIds.has(topicId)) fail(`option ${option?.id} lists unknown topic ${topicId}`);
      });
    });
  });

  if (!Array.isArray(spec.milestones)) fail("milestones must be a list");
  return errors;
};

// Cross-file checks: spec ids and topic ids are unique across the catalogue.
export const validateCatalogue = (specs) => {
  const errors = [];
  const specIds = new Set();
  const topicIds = new Set();
  specs.forEach((spec) => {
    if (specIds.has(spec.id)) errors.push(`duplicate spec id ${spec.id}`);
    specIds.add(spec.id);
    (spec.topics || []).forEach((topic) => {
      if (topicIds.has(topic.id)) errors.push(`duplicate topic id ${topic.id}`);
      topicIds.add(topic.id);
    });
  });
  return errors;
};

const matchesQuery = (entry, query) => {
  const haystack = [entry.board, entry.spec, entry.subject, entry.specName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

// Searches the lightweight index. Filters: qualification, board, query
// (every word must appear in board/spec/subject/specName) and
// includeDeprecated (off by default).
export const listSpecs = (filters = {}, index = specIndex) =>
  index.filter(
    (entry) =>
      (filters.includeDeprecated || !entry.deprecated) &&
      (!filters.qualification || entry.qualification === filters.qualification) &&
      (!filters.board || entry.board === filters.board) &&
      (!filters.query || matchesQuery(entry, filters.query))
  );

export const loadSpec = async (id) => {
  const loader = SPEC_LOADERS[id];
  return loader ? loader() : null;
};

// Builds a normalized subject from a catalogue spec. Topics that belong to an
// option are only included when that option is picked. Every seeded topic
// keeps its catalogueTopicId so a later "reset to spec" can match it up.
export const subjectFromSpec = (spec, { tier = null, optionIds = [], color, id } = {}) => {
  const picked = new Set(optionIds);
  const optionTopicIds = new Set();
  const pickedTopicIds = new Set();
  (spec.optionGroups || []).forEach((group) =>
    group.options.forEach((option) =>
      option.topicIds.forEach((topicId) => {
        optionTopicIds.add(topicId);
        if (picked.has(option.id)) pickedTopicIds.add(topicId);
      })
    )
  );

  const subjectId = id || spec.id;
  const topics = spec.topics
    .filter((topic) => !optionTopicIds.has(topic.id) || pickedTopicIds.has(topic.id))
    .map((topic, index) => ({
      id: `${subjectId}-t${index}`,
      name: topic.name,
      done: false,
      subtasks: [],
      catalogueTopicId: topic.id,
    }));

  return normalizeSubject({
    id: subjectId,
    name: spec.subject,
    qualification: spec.qualification,
    board: spec.board,
    spec: spec.spec,
    specName: spec.specName,
    tier: spec.tiers?.includes(tier) ? tier : null,
    color,
    topics,
  });
};

// Builds a template's subjects, loading catalogue specs where the template
// points at them. Always resolves to normalized subjects ([] if unknown).
export const subjectsForTemplate = async (templateId) => {
  const template = TEMPLATES.find((item) => item.id === templateId);
  if (!template) return [];
  if (template.presets) return subjectsFromPresets(template.presets).map(normalizeSubject);

  const specs = await Promise.all(template.specs.map((entry) => loadSpec(entry.specId)));
  return template.specs.flatMap((entry, index) =>
    specs[index] ? [subjectFromSpec(specs[index], entry)] : []
  );
};

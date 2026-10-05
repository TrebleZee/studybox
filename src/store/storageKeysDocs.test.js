import { describe, expect, it } from "vitest";
import instructions from "../../instruction.md?raw";
import projectInstructions from "../../docs/project-instructions.md?raw";
import { SECRET_KEYS, STORAGE_KEYS } from "./localStore.js";

// The docs list every storage key the code uses, and nothing else (C4).
const codeKeys = [...Object.values(STORAGE_KEYS), ...Object.values(SECRET_KEYS)].sort();

// Backticked sb-* and studybox_* names inside one "## <heading>" section.
const keysInSection = (markdown, heading) => {
  const start = markdown.indexOf(`## ${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + heading.length + 4);
  const end = rest.search(/^## /m);
  const section = end === -1 ? rest : rest.slice(0, end);
  return [...new Set([...section.matchAll(/`((?:sb-|studybox_)[a-z0-9_-]+)`/g)].map((match) => match[1]))].sort();
};

describe("documented storage keys", () => {
  it("instruction.md lists exactly the keys in STORAGE_KEYS and SECRET_KEYS", () => {
    expect(keysInSection(instructions, "Storage keys")).toEqual(codeKeys);
  });

  it("the Claude project instructions list exactly the same keys", () => {
    expect(keysInSection(projectInstructions, "Storage keys")).toEqual(codeKeys);
  });
});

// Regenerates src/data/specs/index.json from the spec files beside it, so the
// lightweight search index can never drift from the catalogue. Runs before
// every build and test run (see the prebuild/pretest npm scripts).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "specs");
const INDEX_FILE = "index.json";
const INDEX_FIELDS = ["id", "qualification", "board", "spec", "subject", "specName"];

const entries = readdirSync(SPEC_DIR)
  .filter((file) => file.endsWith(".json") && file !== INDEX_FILE)
  .sort()
  .map((file) => {
    const spec = JSON.parse(readFileSync(join(SPEC_DIR, file), "utf8"));
    const entry = Object.fromEntries(INDEX_FIELDS.map((field) => [field, spec[field] ?? null]));
    if (spec.deprecated) entry.deprecated = true;
    return entry;
  });

writeFileSync(join(SPEC_DIR, INDEX_FILE), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`build-spec-index: ${entries.length} specs written to ${INDEX_FILE}`);

// Dev-only: draft a catalogue spec from a board's specification PDF.
//
//   npm run draft-spec -- <pdf path or https URL> --board AQA --spec 8461 \
//     --qualification gcse --subject Biology [--spec-name "Biology"] \
//     [--tiered] [--depth 2|3|leaf] [--layout numbered|stacked] [--sections 4,5,6]
//     [--dump-text]
//
// Writes drafts/<board>-<spec>.json (gitignored) with every numbered heading
// found at the chosen depth, candidate papers, and "TODO" where a human must
// decide. It never writes into src/data/specs: check each heading against the
// PDF, drop non-topic headings, assign papers/higherOnly/option groups, fill
// specVersion/firstExam, delete the _source fields, then move the file into
// src/data/specs/ and run npm test. See instruction.md > Authoring specs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildDraftSpec } from "./lib/specDraft.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRAFT_DIR = join(ROOT, "drafts");
const QUALIFICATIONS = ["gcse", "alevel", "as"];
const BOARDS = ["AQA", "Edexcel", "OCR", "Eduqas", "WJEC", "CCEA"];

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
    } else if (["--tiered", "--dump-text"].includes(arg)) {
      args[arg.slice(2)] = true;
    } else {
      args[arg.slice(2)] = argv[(i += 1)];
    }
  }
  return args;
};

const fail = (message) => {
  console.error(`draft-spec: ${message}`);
  process.exit(1);
};

const readPdf = async (source) => {
  if (/^https:\/\//.test(source)) {
    const response = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0 StudyBox catalogue authoring" } });
    if (!response.ok) fail(`could not download ${source} (HTTP ${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }
  return new Uint8Array(readFileSync(source));
};

// One line per visual row, like src/utils/specImport.js does in the app.
const pdfLines = async (data) => {
  const pdf = await getDocument({ data, verbosity: 0 }).promise;
  const lines = [];
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const content = await (await pdf.getPage(pageIndex)).getTextContent();
    let row = "";
    let lastY = null;
    content.items.forEach((item) => {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(row);
        row = "";
      }
      row += item.str;
      lastY = y;
    });
    lines.push(row);
  }
  return lines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
};

const args = parseArgs(process.argv.slice(2));
const [source] = args._;
if (!source) fail("pass a PDF path or https URL (see the header of scripts/draft-spec.js)");
if (!BOARDS.includes(args.board)) fail(`--board must be one of ${BOARDS.join(", ")}`);
if (!args.spec) fail("--spec is required (e.g. 8461)");
if (!QUALIFICATIONS.includes(args.qualification)) fail(`--qualification must be one of ${QUALIFICATIONS.join(", ")}`);

const lines = await pdfLines(await readPdf(source));
mkdirSync(DRAFT_DIR, { recursive: true });
const id = `${args.board}-${args.spec}`.toLowerCase();

if (args["dump-text"]) {
  writeFileSync(join(DRAFT_DIR, `${id}.txt`), `${lines.join("\n")}\n`);
}

const draft = buildDraftSpec(
  lines,
  {
    board: args.board,
    spec: args.spec,
    qualification: args.qualification,
    subject: args.subject,
    specName: args["spec-name"],
    specUrl: /^https:\/\//.test(source) ? source : undefined,
    tiered: Boolean(args.tiered),
  },
  {
    depth: args.depth === "leaf" ? "leaf" : Number(args.depth) || 2,
    layout: args.layout || "numbered",
    sections: args.sections ? String(args.sections).split(",").map((s) => s.trim()) : undefined,
  }
);

const out = join(DRAFT_DIR, `${id}.json`);
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(
  `draft-spec: ${draft.topics.length} headings, ${draft.papers.length} paper candidates -> drafts/${id}.json` +
    (args["dump-text"] ? ` (text in drafts/${id}.txt)` : "")
);
console.log("Check every heading against the PDF before moving the file into src/data/specs/.");

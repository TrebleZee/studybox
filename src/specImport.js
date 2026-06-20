import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  inferExamBoard as inferExamBoardSpec,
  inferSubjectName as inferSubjectNameSpec,
  generateSubjectDraftFromSpecText,
} from "./specInference.js";

GlobalWorkerOptions.workerSrc = workerSrc;

const pageTextToLines = (content) => {
  const rows = [];

  for (const item of content.items) {
    if (!("str" in item) || !item.str) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = typeof transform[4] === "number" ? transform[4] : 0;
    const y = typeof transform[5] === "number" ? transform[5] : 0;

    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }

    row.items.push({ x, str: item.str });
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((entry) => entry.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
};

export async function extractPdfText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const parts = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const pageText = pageTextToLines(content).join("\n");
    if (pageText.trim()) parts.push(pageText);
  }

  return parts.join("\n");
}

export const inferExamBoard = inferExamBoardSpec;
export const inferSubjectName = inferSubjectNameSpec;

export function generateSubjectDraftFromPdfText(text, fileName = "") {
  return generateSubjectDraftFromSpecText(text, fileName);
}

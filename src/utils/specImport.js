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
import { pageTextToLines } from "./pdfLines.js";

GlobalWorkerOptions.workerSrc = workerSrc;

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

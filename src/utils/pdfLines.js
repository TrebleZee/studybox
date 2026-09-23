// Turns pdf.js text content into one line of text per visual row, the shape
// src/utils/topicExtraction.js reads. Kept free of pdf.js itself so it can be
// tested (and used by scripts) without a worker.

// A bare section number, option code or bullet stays with the text after it
// even across a tab-sized gap ("3.1<tab>Number").
const LEAD_IN = /^(?:\d{1,2}(?:\.\d{1,2})*\.?|\d[A-Z](?:\.\d)?|[•●▪◦■-])$/;

// Joins one visual row's items into lines. Specs print tables and two-column
// pages, so a gap much wider than a space starts a new line: otherwise a
// heading in one column is glued to the middle of text from another.
const rowToLines = (items) => {
  const lines = [];
  let current = null;
  items
    .sort((a, b) => a.x - b.x)
    .forEach((entry) => {
      const gap = current ? entry.x - current.end : 0;
      if (current && gap > Math.max(8, entry.size * 1.5) && !LEAD_IN.test(current.text.trim())) {
        lines.push(current.text);
        current = null;
      }
      if (!current) current = { text: "", end: entry.x };
      current.text += ` ${entry.str}`;
      current.end = Math.max(current.end, entry.x + entry.width);
    });
  if (current) lines.push(current.text);
  return lines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
};

export const pageTextToLines = (content) => {
  const rows = [];

  for (const item of content.items) {
    if (!("str" in item) || !item.str) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = typeof transform[4] === "number" ? transform[4] : 0;
    const y = typeof transform[5] === "number" ? transform[5] : 0;
    const size = Math.abs(typeof transform[3] === "number" ? transform[3] : 0) || item.height || 10;
    const width = typeof item.width === "number" ? item.width : 0;

    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }

    row.items.push({ x, str: item.str, size, width });
  }

  return rows.sort((a, b) => b.y - a.y).flatMap((row) => rowToLines(row.items));
};

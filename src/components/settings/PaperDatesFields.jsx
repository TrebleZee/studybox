import { PUBLISHED_EXAM_YEAR, paperExamDate, publishedExamDate } from "../../utils/pacing.js";

// Exam year and exam date per paper for one subject. The published timetable
// date shows by default once the subject is set to the published series
// (summer 2027); typing a date stores the user's own `examDate`, which always
// wins. "Use published" (or clearing the field) drops the user's date again.
const yearChoices = (current) => {
  const years = [PUBLISHED_EXAM_YEAR - 1, PUBLISHED_EXAM_YEAR, PUBLISHED_EXAM_YEAR + 1, PUBLISHED_EXAM_YEAR + 2];
  return current && !years.includes(current) ? [...years, current].sort() : years;
};

export default function PaperDatesFields({ C, subject, onChange }) {
  const papers = subject.papers || [];
  if (papers.length === 0) return null;

  const setDate = (paperId, value) =>
    onChange({
      papers: papers.map((paper) => {
        if (paper.id !== paperId) return paper;
        const next = { ...paper, examDate: value };
        if (!value) delete next.examDate;
        return next;
      }),
    });

  return (
    <details>
      <summary style={{ cursor: "pointer", fontSize: "11px", color: C.muted }}>Exam dates</summary>
      <div style={{ display: "grid", gap: "6px", marginTop: "6px" }}>
        <label style={{ fontSize: "11px", color: C.txt }}>
          Exam year{" "}
          <select
            aria-label={`Exam year ${subject.id}`}
            value={subject.examYear ? String(subject.examYear) : ""}
            onChange={(e) => onChange({ examYear: e.target.value ? Number(e.target.value) : undefined })}
            style={{
              background: C.s1,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "8px",
              padding: "4px 6px",
              color: C.txt,
              fontSize: "11px",
            }}
          >
            <option value="">Not set</option>
            {yearChoices(subject.examYear).map((year) => (
              <option key={year} value={String(year)}>
                Summer {year}
              </option>
            ))}
          </select>
          {subject.examYear !== PUBLISHED_EXAM_YEAR && (
            <span style={{ display: "block", color: C.muted, fontSize: "10px", marginTop: "2px" }}>
              Published dates are filled in for summer {PUBLISHED_EXAM_YEAR}; for other years, add your own below.
            </span>
          )}
        </label>
        {papers.map((paper) => {
          const published = publishedExamDate(subject, paper);
          const own = paper.examDate && paper.examDate !== published;
          const value = paperExamDate(subject, paper) || "";
          const label = `Exam date ${paper.name} ${subject.id}`;
          return (
            <div key={paper.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px" }}>
              <label style={{ fontSize: "11px", color: C.txt, flex: "1 1 120px", minWidth: 0 }}>
                <span style={{ display: "block", marginBottom: "2px" }}>{paper.name}</span>
                <input
                  type="date"
                  aria-label={label}
                  value={value}
                  onChange={(e) => setDate(paper.id, e.target.value)}
                  style={{
                    background: C.s1,
                    border: `1px solid ${C.bdr2}`,
                    borderRadius: "8px",
                    padding: "5px 7px",
                    color: C.txt,
                    fontSize: "11px",
                    maxWidth: "100%",
                  }}
                />
              </label>
              <span style={{ fontSize: "10px", color: C.muted }}>
                {own ? "Your date" : published ? "Published timetable" : "No date"}
              </span>
              {paper.examDate && published && (
                <button
                  type="button"
                  className="nb"
                  onClick={() => setDate(paper.id, "")}
                  aria-label={`Use published date for ${paper.name} ${subject.id}`}
                  style={{
                    border: `1px solid ${C.bdr2}`,
                    background: "transparent",
                    color: C.muted,
                    borderRadius: "6px",
                    fontSize: "10px",
                    padding: "2px 6px",
                    cursor: "pointer",
                  }}
                >
                  Use published
                </button>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

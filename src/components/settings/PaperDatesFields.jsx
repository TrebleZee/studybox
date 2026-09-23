import { paperExamDate, publishedExamDate } from "../../utils/pacing.js";

// Exam date per paper for one subject. The published timetable date shows
// by default; typing a date stores the user's own `examDate`, which always
// wins. "Use published" (or clearing the field) drops the user's date again.
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

import { PACE_MARGIN, countdownLabel, pace } from "../utils/pacing.js";

const STATUS = {
  ahead: { label: "Ahead", color: "#34D399" },
  "on-track": { label: "On track", color: "#4F9CF9" },
  behind: { label: "Behind", color: "#F87171" },
};

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// One pacing row per subject with an exam still to come. Renders nothing
// when no subject has one, so users without exam dates never see it.
export default function ExamPacingCard({ C, subjects, now = new Date() }) {
  const rows = subjects
    .map((subject) => ({ subject, result: pace(subject, now) }))
    .filter((row) => row.result)
    .sort((a, b) => a.result.exam.date.localeCompare(b.result.exam.date));
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="exam-pacing-heading"
      style={{
        background: C.s1,
        padding: "18px",
        borderRadius: "10px",
        border: `1px solid ${C.bdr}`,
        marginBottom: "20px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h3 id="exam-pacing-heading" style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
          Exam Pacing
        </h3>
        <span style={{ fontSize: "11px", color: C.muted }}>
          Topics done against how far through the school year you are, up to each subject&apos;s next exam
          (within {PACE_MARGIN} points counts as on track)
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
        {rows.map(({ subject, result }) => {
          const status = STATUS[result.status];
          return (
            <li
              key={subject.id}
              data-testid={`pacing-${subject.id}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px 12px",
                padding: "9px 11px",
                borderRadius: "8px",
                background: C.s2,
                border: `1px solid ${C.bdr}`,
                fontSize: "12px",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: subject.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: C.txt, minWidth: 0 }}>{subject.name}</span>
              <span style={{ color: C.muted }}>
                {result.exam.paperName} {countdownLabel(result.exam.days)} ({result.exam.date})
              </span>
              <span style={{ color: C.muted }}>
                {result.topicsLeft === 0
                  ? "All topics done"
                  : `${plural(result.topicsLeft, "topic")} left · ${plural(result.perWeek, "topic")}/week`}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  color: status.color,
                  fontWeight: 700,
                  border: `1px solid ${status.color}`,
                  borderRadius: "999px",
                  padding: "1px 8px",
                  fontSize: "11px",
                }}
              >
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

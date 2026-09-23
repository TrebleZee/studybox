import { countdownLabel, nextExam } from "../utils/pacing.js";

// Countdown to the next exam across all subjects, for the top bar. Renders
// nothing when no subject has an exam still to come.
export default function ExamCountdown({ C, subjects, now = new Date(), onClick }) {
  const exam = nextExam(subjects, now);
  if (!exam) return null;

  const title = `Next exam: ${exam.subjectName}, ${exam.paperName} on ${exam.date}`;
  return (
    <button
      type="button"
      className="nb"
      onClick={onClick}
      title={title}
      aria-label={`${title} (${countdownLabel(exam.days)})`}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "3px",
        fontWeight: 600,
        color: exam.days <= 7 ? "#F87171" : C.txt,
        padding: "2px 4px",
        borderRadius: "4px",
        whiteSpace: "nowrap",
        maxWidth: "180px",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      📅 {exam.subjectName} {countdownLabel(exam.days)}
    </button>
  );
}

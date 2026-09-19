import { fmtDur } from "../utils/format.js";
import { subjectProgress } from "../utils/subjects.js";

export default function SubjectSidebar({
  C,
  subjects,
  sel,
  asanaEnabled,
  asanaCfg,
  asanaPct,
  grandTotal,
  onSelectSubject,
  onSelectAsana,
  onOpenAnalysis,
}) {
  const pct = subjectProgress;

  return (
      <div
        style={{
          width: "188px",
          borderRight: `1px solid ${C.bdr}`,
          background: C.s1,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "11px 13px 5px",
            fontSize: "10px",
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Subjects
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {subjects.map((subject) => (
            <button
              key={subject.id}
              className="sub-btn"
              type="button"
              onClick={() => {
                onSelectSubject(subject.id);
              }}
              aria-label={subject.name}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                padding: "9px 13px",
                cursor: "pointer",
                background:
                  sel === subject.id ? `${subject.color}18` : "transparent",
                borderLeft: `3px solid ${
                  sel === subject.id ? subject.color : "transparent"
                }`,
                transition: "background 0.1s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "1px",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "12px",
                    color: sel === subject.id ? subject.color : C.txt,
                  }}
                >
                  {subject.name}
                </span>
                <span style={{ fontSize: "10px", color: C.muted }}>
                  {pct(subject)}%
                </span>
              </div>
              <div style={{ fontSize: "10px", color: C.muted, marginBottom: "5px" }}>
                {subject.exam}
              </div>
              <div
                style={{
                  height: "2px",
                  background: C.bdr2,
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct(subject)}%`,
                    background: subject.color,
                    borderRadius: "2px",
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </button>
          ))}
        </div>
        {asanaEnabled && (
          <button
            className="sub-btn"
            type="button"
            onClick={onSelectAsana}
            aria-label={asanaCfg.name}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              borderTop: `1px solid ${C.bdr}`,
              padding: "9px 13px",
              cursor: "pointer",
              background:
                sel === asanaCfg.id ? `${asanaCfg.color}18` : "transparent",
              borderLeft: `3px solid ${
                sel === asanaCfg.id ? asanaCfg.color : "transparent"
              }`,
              transition: "background 0.1s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "1px",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "12px",
                  color: sel === asanaCfg.id ? asanaCfg.color : C.txt,
                }}
              >
                {asanaCfg.name}
              </span>
              {asanaPct !== null && (
                <span style={{ fontSize: "10px", color: C.muted }}>
                  {asanaPct}%
                </span>
              )}
            </div>
            <div style={{ fontSize: "10px", color: C.muted, marginBottom: "5px" }}>
              {asanaCfg.exam}
            </div>
            {asanaPct !== null && (
              <div
                style={{
                  height: "2px",
                  background: C.bdr2,
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${asanaPct}%`,
                    background: asanaCfg.color,
                    borderRadius: "2px",
                    transition: "width 0.4s",
                  }}
                />
              </div>
            )}
          </button>
        )}
        <div style={{ padding: "10px 13px", borderTop: `1px solid ${C.bdr}` }}>
          <div style={{ fontSize: "10px", color: C.muted, marginBottom: "2px" }}>
            Total study time
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {fmtDur(grandTotal)}
          </div>
          <button
            className="nb"
            type="button"
            onClick={() => onOpenAnalysis()}
            aria-label="More study analysis"
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${C.bdr2}`,
              background: C.s2,
              color: C.txt,
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "background 0.1s",
            }}
          >
            <span>More</span>
            <span style={{ color: C.muted }}>→</span>
          </button>
        </div>
      </div>
  );
}

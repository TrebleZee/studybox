import { fmtDate, fmtDur } from "../utils/format.js";

export default function LogView({
  C,
  subjects,
  sessions,
  grandTotal,
  subTotal,
  onEditSession,
  onDeleteSession,
}) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
            padding: "11px 13px 8px",
            fontSize: "10px",
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Overview
        </div>
        <div style={{ padding: "0 13px 12px", borderBottom: `1px solid ${C.bdr}` }}>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-1px",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtDur(grandTotal)}
          </div>
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px" }}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          style={{
            padding: "9px 13px 4px",
            fontSize: "10px",
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          By Subject
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "3px 0 8px" }}>
          {[...subjects]
            .sort((a, b) => subTotal(b.id) - subTotal(a.id))
            .map((subject) => {
              const total = subTotal(subject.id);
              const max = Math.max(...subjects.map((item) => subTotal(item.id)), 1);

              return (
                <div key={subject.id} style={{ padding: "5px 13px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 500, color: C.txt }}>
                      {subject.name}
                    </span>
                    <span style={{ fontSize: "11px", color: C.muted }}>
                      {fmtDur(total)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "3px",
                      background: C.bdr2,
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(total / max) * 100}%`,
                        background: subject.color,
                        borderRadius: "2px",
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "10px",
          }}
        >
          Session History
        </div>
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: "60px 0" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4 }}>
              ⏱
            </div>
            <div style={{ fontSize: "13px" }}>No sessions yet.</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Start the timer and log your first session.
            </div>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="sess-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "10px 13px",
                background: C.s2,
                borderRadius: "8px",
                marginBottom: "5px",
                border: `1px solid ${C.bdr}`,
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: session.subjectColor,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>
                  {session.subjectName}
                </div>
                {session.note && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.muted,
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {session.note}
                  </div>
                )}
                {session.tags?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                    {session.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "10px",
                          padding: "3px 7px",
                          borderRadius: "999px",
                          border: `1px solid ${C.bdr2}`,
                          background: C.s1,
                          color: C.muted,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    color: session.subjectColor,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtDur(session.duration)}
                </div>
                <div style={{ fontSize: "11px", color: C.muted }}>
                  {fmtDate(session.date)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <button
                  className="edit-sess nb"
                  onClick={() => onEditSession(session)}
                  aria-label={`Edit session ${session.subjectName}`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: C.muted,
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 500,
                    opacity: 0,
                    transition: "opacity 0.1s",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  Edit
                </button>
                <button
                  className="del-sess nb"
                  onClick={() => onDeleteSession(session.id)}
                  aria-label={`Delete session ${session.subjectName}`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: C.muted,
                    cursor: "pointer",
                    fontSize: "17px",
                    lineHeight: 1,
                    opacity: 0,
                    transition: "opacity 0.1s",
                    padding: "0 2px",
                    flexShrink: 0,
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

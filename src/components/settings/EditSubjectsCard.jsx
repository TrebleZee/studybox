export default function EditSubjectsCard({ C, subjects, onUpdateSubject, onRemoveSubject }) {
  return (
    <div
      style={{
        background: C.s1,
        border: `1px solid ${C.bdr}`,
        borderRadius: "12px",
        padding: "14px",
      }}
    >
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
        Edit Subjects
      </div>
      <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5, marginBottom: "12px" }}>
        Rename, recolour or delete any subject. Deleting a subject keeps its logged sessions.
      </div>
      {subjects.length === 0 ? (
        <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5 }}>
          No subjects yet. Add one on the left to get started again.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) 52px auto",
                gap: "10px",
                alignItems: "center",
                padding: "10px 11px",
                borderRadius: "10px",
                background: C.s2,
                border: `1px solid ${C.bdr}`,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: subject.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
                <input
                  aria-label={`Subject name ${subject.id}`}
                  value={subject.name}
                  onChange={(e) => onUpdateSubject(subject.id, { name: e.target.value })}
                  style={{
                    width: "100%",
                    background: C.s1,
                    border: `1px solid ${C.bdr2}`,
                    borderRadius: "8px",
                    padding: "8px 9px",
                    color: C.txt,
                    outline: "none",
                  }}
                />
                <input
                  aria-label={`Subject exam ${subject.id}`}
                  value={subject.exam}
                  onChange={(e) => onUpdateSubject(subject.id, { exam: e.target.value })}
                  style={{
                    width: "100%",
                    background: C.s1,
                    border: `1px solid ${C.bdr2}`,
                    borderRadius: "8px",
                    padding: "8px 9px",
                    color: C.txt,
                    outline: "none",
                  }}
                />
              </div>
              <input
                type="color"
                aria-label={`Subject colour ${subject.id}`}
                value={subject.color}
                onChange={(e) => onUpdateSubject(subject.id, { color: e.target.value })}
                style={{
                  width: "52px",
                  height: "38px",
                  padding: 0,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
              <button
                className="nb"
                onClick={() => onRemoveSubject(subject.id)}
                aria-label={`Delete subject ${subject.id}`}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: "17px",
                  lineHeight: 1,
                  padding: "0 2px",
                  flexShrink: 0,
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

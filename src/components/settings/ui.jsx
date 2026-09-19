export function Card({ C, children, style }) {
  return (
    <div
      style={{
        background: C.s1,
        border: `1px solid ${C.bdr}`,
        borderRadius: "12px",
        padding: "14px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ C, children }) {
  return (
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
      {children}
    </div>
  );
}

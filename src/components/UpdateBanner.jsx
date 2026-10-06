export default function UpdateBanner({ C, onUpdate }) {
  return (
    <div
      role="status"
      style={{
        pointerEvents: "auto",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px 8px 14px",
        background: C.s2,
        border: `1px solid ${C.bdr2}`,
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
        fontSize: "12px",
        color: C.txt,
        maxWidth: "100%",
      }}
    >
      <span>A new version of StudyBox is ready. Your timer is saved, so it's safe to update.</span>
      <button
        className="nb"
        onClick={onUpdate}
        style={{
          padding: "5px 10px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "12px",
          background: C.s3,
          color: C.txt,
          flexShrink: 0,
        }}
      >
        Update now
      </button>
    </div>
  );
}

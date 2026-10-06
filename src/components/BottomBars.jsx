// One fixed stack for the bars that float at the bottom of the screen (the
// undo bar and the update banner). Each bar is an ordinary flex item, so they
// stack with a gap instead of being offset by a guessed height, and can never
// overlap however many lines either one wraps to. The stack lets clicks
// through, so only the bars themselves take them. Renders nothing when empty.
export default function BottomBars({ children }) {
  const bars = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!bars || (Array.isArray(bars) && bars.length === 0)) return null;
  return (
    <div
      data-bottom-bars=""
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {bars}
    </div>
  );
}

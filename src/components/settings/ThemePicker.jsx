import { THEMES } from "../../utils/themes.js";

export default function ThemePicker({ C, themeId, onChange }) {
  return (
    <div
      style={{
        width: "228px",
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
        Themes
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {THEMES.map((candidate) => {
          const active = candidate.id === themeId;
          return (
            <button
              key={candidate.id}
              className="theme-card nb"
              onClick={() => onChange(candidate.id)}
              aria-pressed={active}
              data-theme={candidate.id}
              style={{
                width: "100%",
                textAlign: "left",
                display: "block",
                border: `1px solid ${active ? candidate.colors.s3 : C.bdr}`,
                background: active ? C.s2 : "transparent",
                color: C.txt,
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "8px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>
                    {candidate.name}
                  </div>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
                    {candidate.description}
                  </div>
                </div>
                {active ? (
                  <span
                    style={{
                      fontSize: "10px",
                      color: C.txt,
                      border: `1px solid ${C.bdr2}`,
                      background: C.s3,
                      borderRadius: "999px",
                      padding: "3px 7px",
                    }}
                  >
                    Active
                  </span>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  candidate.colors.bg,
                  candidate.colors.s1,
                  candidate.colors.s2,
                  candidate.colors.txt,
                ].map((swatch) => (
                  <div
                    key={swatch}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "5px",
                      background: swatch,
                      border: `1px solid ${C.bdr2}`,
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import {
  BOARDS,
  QUALIFICATION_LABELS,
  QUALIFICATIONS,
  TIER_LABELS,
  TIERS,
} from "../../utils/subjects.js";

// Qualification / board / tier / spec controls shared by the add and edit
// subject cards. `value` holds the subject's metadata fields; `onChange`
// receives a patch. Tier only exists for GCSE, and the free-text exam label
// only for Custom boards (it is derived from board + spec name otherwise).
export default function SubjectMetaFields({ C, value, onChange, labelSuffix = "" }) {
  const fieldStyle = {
    background: C.s1,
    border: `1px solid ${C.bdr2}`,
    borderRadius: "8px",
    padding: "7px 8px",
    color: C.txt,
    outline: "none",
    minWidth: 0,
    fontSize: "12px",
  };
  const label = (name) => (labelSuffix ? `${name} ${labelSuffix}` : name);
  const isGcse = value.qualification === "gcse";
  const isCustom = value.board === "Custom";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
        gap: "6px",
      }}
    >
      <select
        aria-label={label("Qualification")}
        value={value.qualification || "other"}
        onChange={(e) =>
          onChange({
            qualification: e.target.value,
            ...(e.target.value === "gcse" ? {} : { tier: null }),
          })
        }
        style={fieldStyle}
      >
        {QUALIFICATIONS.map((q) => (
          <option key={q} value={q}>
            {QUALIFICATION_LABELS[q]}
          </option>
        ))}
      </select>
      <select
        aria-label={label("Exam board")}
        value={value.board || "Custom"}
        onChange={(e) => onChange({ board: e.target.value, spec: "", specName: null })}
        style={fieldStyle}
      >
        {BOARDS.map((board) => (
          <option key={board} value={board}>
            {board}
          </option>
        ))}
      </select>
      {isGcse && (
        <select
          aria-label={label("Tier")}
          value={value.tier || ""}
          onChange={(e) => onChange({ tier: e.target.value || null })}
          style={fieldStyle}
        >
          <option value="">No tier</option>
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </select>
      )}
      <input
        aria-label={label("Spec code")}
        value={value.spec || ""}
        onChange={(e) => onChange({ spec: e.target.value })}
        placeholder="Spec code (optional)"
        style={fieldStyle}
      />
      {isCustom && (
        <input
          aria-label={label("Exam label")}
          value={value.exam || ""}
          onChange={(e) => onChange({ exam: e.target.value })}
          placeholder="Exam label"
          style={fieldStyle}
        />
      )}
    </div>
  );
}

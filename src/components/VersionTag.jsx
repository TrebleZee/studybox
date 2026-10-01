// Named import so only the version string from package.json is bundled.
import { version } from "../../package.json";

export default function VersionTag({ C, style }) {
  return (
    <span
      title={`StudyBox version ${version}`}
      style={{
        fontSize: "10px",
        fontWeight: 500,
        letterSpacing: 0,
        color: C.muted,
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      v{version}
    </span>
  );
}

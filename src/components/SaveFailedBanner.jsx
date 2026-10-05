import { useId } from "react";

// Shown while a change couldn't be written to storage. The app keeps the
// change in memory, so a backup downloaded from here still includes it.
export default function SaveFailedBanner({ C, onDownload }) {
  const labelId = useId();
  return (
    <div
      role="alert"
      aria-labelledby={labelId}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        background: C.s2,
        borderBottom: "1px solid #f87171",
        color: C.txt,
        fontSize: "12px",
      }}
    >
      <span id={labelId}>Couldn&apos;t save your last change – this browser&apos;s storage is full.</span>
      <button
        type="button"
        className="nb"
        onClick={onDownload}
        style={{
          padding: "5px 10px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "12px",
          background: C.s3,
          color: C.txt,
        }}
      >
        Download a backup
      </button>
    </div>
  );
}

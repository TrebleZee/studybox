import { useId } from "react";
import { storedBackup } from "../store/appState.js";
import { downloadBackup } from "../utils/backup.js";

const MESSAGES = {
  full: "Couldn't save your last change – this browser's storage is full.",
  blocked: "This browser is blocking storage, so nothing you do here will be saved.",
  unreadable:
    "Some of your saved data couldn't be read, so it has been left as it was. Download a backup to keep it: your next change will replace it.",
};

// Shown while something stops the app saving (`reason`, from useSaveFailure).
// When a write failed or storage is blocked, the app keeps changes in memory,
// so a backup downloaded from here (`onDownload`) still includes them. When
// stored data couldn't be read, the backup is built from storage instead, so
// it carries that data's text exactly as stored.
export default function SaveFailedBanner({ C, reason = "full", onDownload }) {
  const labelId = useId();
  const download = reason === "unreadable" ? () => downloadBackup(storedBackup()) : onDownload;
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
      <span id={labelId}>{MESSAGES[reason] ?? MESSAGES.full}</span>
      <button
        type="button"
        className="nb"
        onClick={download}
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

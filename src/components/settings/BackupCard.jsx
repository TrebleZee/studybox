import { Card, SectionLabel } from "./ui.jsx";

const outlineButton = (C) => ({
  border: `1px solid ${C.bdr2}`,
  background: "transparent",
  color: C.txt,
  borderRadius: "8px",
  padding: "9px 14px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
});

export default function BackupCard({ C, message, onExport, onImport, onMerge, onUndoMerge }) {
  return (
    <Card C={C} style={{ marginTop: "12px" }}>
      <SectionLabel C={C}>Backup &amp; Restore</SectionLabel>
      <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.6, marginBottom: "12px" }}>
        Your data lives only in this browser&apos;s local storage. Download a backup
        regularly, especially before clearing site data — Chrome sometimes prompts
        for this and iOS Safari can evict storage on its own.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
          className="nb"
          onClick={onExport}
          style={{
            border: "none",
            background: C.s3,
            color: C.txt,
            borderRadius: "8px",
            padding: "9px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Download backup
        </button>
        <label className="nb" style={outlineButton(C)}>
          Restore from file
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Restore backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onImport(file);
            }}
            style={{ display: "none" }}
          />
        </label>
        {onMerge && (
          <label className="nb" style={outlineButton(C)}>
            Merge from file
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Merge backup file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                onMerge(file);
              }}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>
      <div style={{ color: C.muted, fontSize: "11px", lineHeight: 1.6, marginTop: "10px" }}>
        Restore replaces everything here with the file. Merge combines the file with what&apos;s
        already here, keeping the most recent version of anything changed in both. Use it to
        bring two devices together. Changes made before version 1.15 have no edit time recorded,
        so check anything you changed on both devices before then.
      </div>
      {message && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
          <div
            role={message.type === "error" ? "alert" : "status"}
            style={{ fontSize: "11px", color: message.type === "error" ? "#f87171" : C.txt }}
          >
            {message.text}
          </div>
          {/* App passes onUndoMerge only while nothing has changed since the merge. */}
          {message.undo && onUndoMerge && (
            <button
              type="button"
              className="nb"
              onClick={onUndoMerge}
              style={{ ...outlineButton(C), padding: "4px 10px", fontSize: "11px" }}
            >
              Undo merge
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

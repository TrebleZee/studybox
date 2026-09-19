import { Card, SectionLabel } from "./ui.jsx";

export default function BackupCard({ C, message, onExport, onImport }) {
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
        <label
          className="nb"
          style={{
            border: `1px solid ${C.bdr2}`,
            background: "transparent",
            color: C.txt,
            borderRadius: "8px",
            padding: "9px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
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
      </div>
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          style={{
            marginTop: "10px",
            fontSize: "11px",
            color: message.type === "error" ? "#f87171" : C.txt,
          }}
        >
          {message.text}
        </div>
      )}
    </Card>
  );
}

import AddSubjectCard from "./settings/AddSubjectCard.jsx";
import AsanaSettingsCard from "./settings/AsanaSettingsCard.jsx";
import BackupCard from "./settings/BackupCard.jsx";
import EditSubjectsCard from "./settings/EditSubjectsCard.jsx";
import ThemePicker from "./settings/ThemePicker.jsx";
import { Card, SectionLabel } from "./settings/ui.jsx";

export default function SettingsView({
  C,
  themeId,
  onChangeTheme,
  subjects,
  onAddSubject,
  onUpdateSubject,
  onRemoveSubject,
  asanaCfg,
  onUpdateAsana,
  backupMessage,
  onExport,
  onImport,
}) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <ThemePicker C={C} themeId={themeId} onChange={onChangeTheme} />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(180px, 1fr)",
            gap: "12px",
          }}
        >
          <AddSubjectCard C={C} onAddSubject={onAddSubject} />
          <EditSubjectsCard
            C={C}
            subjects={subjects}
            onUpdateSubject={onUpdateSubject}
            onRemoveSubject={onRemoveSubject}
          />
        </div>

        <AsanaSettingsCard C={C} cfg={asanaCfg} onUpdate={onUpdateAsana} />
        <BackupCard C={C} message={backupMessage} onExport={onExport} onImport={onImport} />

        <Card C={C} style={{ marginTop: "12px" }}>
          <SectionLabel C={C}>What changes with themes</SectionLabel>
          <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.6 }}>
            Themes update the app surfaces, borders, and contrast. Subject colours stay
            separate so you can keep subjects visually distinct while switching the
            overall feel of the app.
          </div>
        </Card>
      </div>
    </div>
  );
}

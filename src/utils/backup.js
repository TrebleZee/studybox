import { normalizeGame } from "./gameLogic.js";
import { normalizeSessions, normalizeSubjects } from "./subjects.js";
import { THEMES } from "./themes.js";
import { emptyTombstones, normalizeTombstones } from "./tombstones.js";

// v2 (1.3.0) adds subject qualification/board/spec/specName/tier. v1 files still
// load: normalizeSubjects migrates them.
// v3 (1.15.0) adds tombstones, and records may carry createdAt/updatedAt.
// Older files load with no tombstones and unstamped records.
export const BACKUP_VERSION = 3;

export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Unable to read backup file."));
    reader.readAsText(file);
  });

export const buildBackup = ({ subjects, sessions, themeId, game, tombstones }) => ({
  subjects,
  sessions,
  theme: themeId,
  game,
  tombstones: normalizeTombstones(tombstones),
  version: BACKUP_VERSION,
});

export const backupFileName = (date = new Date()) =>
  `studybox-backup-${date.toISOString().slice(0, 10)}.json`;

// Throws a user-presentable Error for anything that isn't a StudyBox backup,
// so callers can leave existing state untouched.
export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON, so it can't be a StudyBox backup.");
  }

  const isObject = data && typeof data === "object" && !Array.isArray(data);
  const hasKnownData = isObject && (Array.isArray(data.subjects) || Array.isArray(data.sessions));
  if (!hasKnownData) {
    throw new Error("That file doesn't look like a StudyBox backup.");
  }
  // Unversioned, v1, v2 and v3 files all load; a newer file could carry fields this
  // build would silently drop, so refuse it rather than lose data.
  if (typeof data.version === "number" && data.version > BACKUP_VERSION) {
    throw new Error("That backup was made by a newer version of StudyBox. Update the app and try again.");
  }

  const restored = {};
  if (Array.isArray(data.subjects)) restored.subjects = normalizeSubjects(data.subjects);
  if (Array.isArray(data.sessions)) restored.sessions = normalizeSessions(data.sessions);
  if (THEMES.some((theme) => theme.id === data.theme)) restored.themeId = data.theme;
  if (data.game && typeof data.game === "object") restored.game = normalizeGame(data.game);
  restored.tombstones = data.tombstones ? normalizeTombstones(data.tombstones) : emptyTombstones();
  return restored;
};

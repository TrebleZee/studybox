import { normalizeGame } from "./gameLogic.js";
import { normalizeSessions, normalizeSubjects } from "./subjects.js";
import { THEMES } from "./themes.js";

// v2 (1.3.0) adds subject qualification/board/spec/specName/tier. v1 files still
// load: normalizeSubjects migrates them.
export const BACKUP_VERSION = 2;

export const buildBackup = ({ subjects, sessions, themeId, game }) => ({
  subjects,
  sessions,
  theme: themeId,
  game,
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
  // Unversioned, v1 and v2 files all load; a newer file could carry fields this
  // build would silently drop, so refuse it rather than lose data.
  if (typeof data.version === "number" && data.version > BACKUP_VERSION) {
    throw new Error("That backup was made by a newer version of StudyBox. Update the app and try again.");
  }

  const restored = {};
  if (Array.isArray(data.subjects)) restored.subjects = normalizeSubjects(data.subjects);
  if (Array.isArray(data.sessions)) restored.sessions = normalizeSessions(data.sessions);
  if (THEMES.some((theme) => theme.id === data.theme)) restored.themeId = data.theme;
  if (data.game && typeof data.game === "object") restored.game = normalizeGame(data.game);
  return restored;
};

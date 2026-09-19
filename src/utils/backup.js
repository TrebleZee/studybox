import { normalizeGame } from "./gameLogic.js";
import { normalizeSessions, normalizeSubjects } from "./subjects.js";
import { THEMES } from "./themes.js";

export const BACKUP_VERSION = 1;

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

  const restored = {};
  if (Array.isArray(data.subjects)) restored.subjects = normalizeSubjects(data.subjects);
  if (Array.isArray(data.sessions)) restored.sessions = normalizeSessions(data.sessions);
  if (THEMES.some((theme) => theme.id === data.theme)) restored.themeId = data.theme;
  if (data.game && typeof data.game === "object") restored.game = normalizeGame(data.game);
  return restored;
};

// The single seam for persisted app state. Nothing outside src/store/ touches
// localStorage directly (enforced by ESLint), so a sync engine has one place
// to attach: subscribe() sees every write and removal.

export const STORAGE_KEYS = {
  subjects: "sb-subjects",
  sessions: "sb-sessions",
  theme: "sb-theme",
  asana: "sb-asana",
  asanaStats: "sb-asana-stats",
  game: "sb-game",
  onboarded: "sb-onboarded",
  lastStreakReminder: "sb-last-streak-reminder",
  lastMilestoneReminder: "sb-last-milestone-reminder",
  timer: "sb-timer",
  sessionDraft: "sb-session-draft",
  tombstones: "sb-tombstones",
  schema: "sb-schema",
};

// Stored as plain text, not JSON, and under a legacy name that predates the
// sb-* namespace. Kept out of STORAGE_KEYS so nothing that iterates the app's
// data keys can pick a secret up by accident.
export const SECRET_KEYS = {
  asanaToken: "studybox_asana_pat",
};

// Where each key is allowed to travel:
// - "account": the user's study data. Included in backups, and what sync will carry.
// - "device":  state that only makes sense on this browser (a running timer,
//              reminder bookkeeping, the Asana project chosen here).
// - "secret":  credentials. Never backed up, never synced, never logged.
export const KEY_SCOPES = {
  [STORAGE_KEYS.subjects]: "account",
  [STORAGE_KEYS.sessions]: "account",
  [STORAGE_KEYS.game]: "account",
  [STORAGE_KEYS.theme]: "account",
  [STORAGE_KEYS.tombstones]: "account",
  [STORAGE_KEYS.asana]: "device",
  [STORAGE_KEYS.asanaStats]: "device",
  [STORAGE_KEYS.onboarded]: "device",
  [STORAGE_KEYS.lastStreakReminder]: "device",
  [STORAGE_KEYS.lastMilestoneReminder]: "device",
  [STORAGE_KEYS.timer]: "device",
  [STORAGE_KEYS.sessionDraft]: "device",
  [STORAGE_KEYS.schema]: "device",
  [SECRET_KEYS.asanaToken]: "secret",
};

export const scopeOf = (key) => (Object.hasOwn(KEY_SCOPES, key) ? KEY_SCOPES[key] : "device");
export const keysInScope = (scope) =>
  Object.keys(KEY_SCOPES).filter((key) => KEY_SCOPES[key] === scope);

const listeners = new Set();

// Listeners get { key, scope, type: "write" | "remove" | "external" | "error", value }.
// Secret values are never handed to listeners: they only learn that the key
// changed.
const notify = (key, type, value) => {
  if (!listeners.size) return;
  const scope = scopeOf(key);
  const change = { key, scope, type, value: scope === "secret" ? undefined : value };
  listeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // A broken listener must never stop the app saving.
    }
  });
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// A write that throws (storage full, or blocked) must not take the app down:
// the value stays in memory and subscribers hear { key, type: "error" } so
// the app can say so. Returns whether the write reached storage.
const write = (key, raw, value) => {
  try {
    localStorage.setItem(key, raw);
  } catch {
    notify(key, "error", undefined);
    return false;
  }
  notify(key, "write", value);
  return true;
};

export const saveJson = (key, value) => write(key, JSON.stringify(value), value);

export const loadText = (key) => localStorage.getItem(key) || "";

export const saveText = (key, value) => write(key, value, value);

export const removeKey = (key) => {
  localStorage.removeItem(key);
  notify(key, "remove", undefined);
};

// Another tab, or the installed app beside a tab, changed a key this store
// owns. Browsers fire `storage` only in the other tabs, never in the writer.
// Keys the store doesn't own are ignored; `value` is the new stored value
// (undefined once removed), so a listener can reload it.
const parseStored = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const onStorage = (event) => {
  if (event.storageArea && event.storageArea !== localStorage) return;
  const { key } = event;
  if (!key || !Object.hasOwn(KEY_SCOPES, key)) return;
  notify(key, "external", event.newValue === null ? undefined : parseStored(event.newValue));
};

if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

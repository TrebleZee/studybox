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
// "error" is a write or removal that threw.
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

// What the store knows is wrong with storage, so the app can say so:
// - blocked: the last read threw (the browser denies storage), so nothing
//   will be saved this visit.
// - failed: keys whose last write threw (storage full, or blocked).
// - unreadable: account keys whose stored text doesn't parse, with that text.
//   It is left in storage untouched, and storedBackup() carries it, until the
//   key is next written.
let blocked = false;
const failed = new Set();
const unreadable = new Map();

// Every access goes through here: reading `localStorage` itself can throw
// when the browser blocks storage, not just its methods.
const storage = () => globalThis.localStorage;

const readRaw = (key) => {
  try {
    const raw = storage().getItem(key);
    blocked = false;
    return raw;
  } catch {
    blocked = true;
    return null;
  }
};

export const loadJson = (key, fallback) => {
  const raw = readRaw(key);
  if (!raw) {
    unreadable.delete(key);
    return fallback;
  }
  try {
    const value = JSON.parse(raw);
    unreadable.delete(key);
    return value;
  } catch {
    if (scopeOf(key) === "account") unreadable.set(key, raw);
    return fallback;
  }
};

// True while `key` holds account data that didn't parse when last loaded.
// usePersistedState then skips its write-back on mount, so the text survives
// until the user changes that data.
export const isUnreadable = (key) => unreadable.has(key);

// The stored text of every unreadable account key, by key.
export const unreadableText = () => Object.fromEntries(unreadable);

// The one problem the user should hear about, worst first: "blocked",
// "full" (a write failed), "unreadable" (stored data didn't parse), or null.
// A string, so React can compare snapshots (useSyncExternalStore).
export const storageProblem = () => {
  if (blocked) return "blocked";
  if (failed.size) return "full";
  if (unreadable.size) return "unreadable";
  return null;
};

// A write that throws (storage full, or blocked) must not take the app down:
// the value stays in memory and subscribers hear { key, type: "error" } so
// the app can say so. Returns whether the write reached storage.
const write = (key, raw, value) => {
  try {
    storage().setItem(key, raw);
  } catch {
    failed.add(key);
    notify(key, "error", undefined);
    return false;
  }
  failed.delete(key);
  unreadable.delete(key);
  notify(key, "write", value);
  return true;
};

export const saveJson = (key, value) => write(key, JSON.stringify(value), value);

export const loadText = (key) => readRaw(key) || "";

export const saveText = (key, value) => write(key, value, value);

// Like a write, a removal that throws is reported, never thrown.
export const removeKey = (key) => {
  try {
    storage().removeItem(key);
  } catch {
    failed.add(key);
    notify(key, "error", undefined);
    return false;
  }
  failed.delete(key);
  unreadable.delete(key);
  notify(key, "remove", undefined);
  return true;
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
  try {
    if (event.storageArea && event.storageArea !== storage()) return;
  } catch {
    return;
  }
  const { key } = event;
  if (!key || !Object.hasOwn(KEY_SCOPES, key)) return;
  notify(key, "external", event.newValue === null ? undefined : parseStored(event.newValue));
};

if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

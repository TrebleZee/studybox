import { loadJson, saveJson, STORAGE_KEYS } from "./localStore.js";

// Version of the data shape in localStorage. Backup files have their own
// version (BACKUP_VERSION); the two happen to match at 3.
export const SCHEMA_VERSION = 3;

// Ordered, one-way steps. Each `up` gets { loadJson, saveJson, STORAGE_KEYS }
// (its saveJson throws if a write fails) and must be safe to run on data that
// is missing or malformed.
//
// Field defaults do NOT belong here: by project convention those live in the
// normalizers (normalizeSubjects, normalizeSessions, normalizeGame), which
// every load path runs, including backup restore. A step is for a change a
// normalizer cannot express: moving a key, splitting or reshaping stored data.
export const MIGRATIONS = [
  {
    version: 3,
    // Sync-safe records. Everything v3 adds is optional (stamps appear as
    // records are edited; tombstones start empty), so there is nothing to
    // rewrite. Installs from before versioning are treated as v2.
    up: () => {},
  },
];

const storedVersion = () => {
  const value = loadJson(STORAGE_KEYS.schema, null);
  return Number.isInteger(value) && value > 0 ? value : null;
};

// saveJson reports a failed write (storage full) by returning false instead of
// throwing, so the app keeps running. A migration must not carry on past one:
// the step would be stamped as finished with its data never written. Steps
// and version stamps use this instead, so a failed write stops the run before
// the version is recorded and the step retries on the next launch.
const saveOrThrow = (key, value) => {
  if (!saveJson(key, value)) throw new Error(`StudyBox: migration could not write ${key}`);
  return true;
};

// The last run's result, for storedSchemaIsNewer below.
let lastRun = null;

// True when the stored data was written by a newer build than this one (its
// sb-schema is above SCHEMA_VERSION). usePersistedState then skips its mount
// write-back, so a key this build has not changed is never rewritten in this
// build's shape. The normalizers keep the fields they don't know (N9), so a
// key this build does change still carries the newer build's fields through.
export const storedSchemaIsNewer = () => Boolean(lastRun?.newer);

// Runs any steps newer than the stored version, in order, then records the
// new version. Data written by a newer build is left alone and reported: its
// version stamp is not lowered, nothing is rewritten on mount
// (storedSchemaIsNewer) and what this build does write keeps every field it
// doesn't know, so an old cached build can neither stamp the data back down
// nor strip it.
export const runMigrations = (migrations = MIGRATIONS, target = SCHEMA_VERSION) => {
  const from = storedVersion() ?? 2;
  lastRun = { from, to: from, newer: from > target, ran: [] };
  if (lastRun.newer) return lastRun;

  const ran = [];
  migrations
    .filter((step) => step.version > from && step.version <= target)
    .sort((a, b) => a.version - b.version)
    .forEach((step) => {
      step.up({ loadJson, saveJson: saveOrThrow, STORAGE_KEYS });
      // Recorded after each step, so a crash part-way never re-runs a finished one.
      saveOrThrow(STORAGE_KEYS.schema, step.version);
      ran.push(step.version);
    });

  if (storedVersion() !== target) saveOrThrow(STORAGE_KEYS.schema, target);
  lastRun = { from, to: target, newer: false, ran };
  return lastRun;
};

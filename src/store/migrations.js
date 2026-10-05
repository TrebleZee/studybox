import { loadJson, saveJson, STORAGE_KEYS } from "./localStore.js";

// Version of the data shape in localStorage. Backup files have their own
// version (BACKUP_VERSION); the two happen to match at 3.
export const SCHEMA_VERSION = 3;

// Ordered, one-way steps. Each `up` gets { loadJson, saveJson, STORAGE_KEYS }
// and must be safe to run on data that is missing or malformed.
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

// Runs any steps newer than the stored version, in order, then records the
// new version. Data written by a newer build is left alone and reported, so
// an old cached build can't stamp it back down.
export const runMigrations = (migrations = MIGRATIONS, target = SCHEMA_VERSION) => {
  const from = storedVersion() ?? 2;
  if (from > target) return { from, to: from, newer: true, ran: [] };

  const ran = [];
  migrations
    .filter((step) => step.version > from && step.version <= target)
    .sort((a, b) => a.version - b.version)
    .forEach((step) => {
      step.up({ loadJson, saveJson, STORAGE_KEYS });
      // Recorded after each step, so a crash part-way never re-runs a finished one.
      saveJson(STORAGE_KEYS.schema, step.version);
      ran.push(step.version);
    });

  if (storedVersion() !== target) saveJson(STORAGE_KEYS.schema, target);
  return { from, to: target, newer: false, ran };
};

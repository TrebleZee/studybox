// Sync-safe record plumbing (schema v3): globally unique ids for new records
// and ISO createdAt / updatedAt stamps. Records from before v3 simply have no
// stamps; merging treats a missing updatedAt as "older than any real edit".

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const isTimestamp = (value) =>
  typeof value === "string" && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));

export const nowIso = () => new Date().toISOString();

const fallbackUuid = () => {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)]
    .map((part) => part.join(""))
    .join("-");
};

// randomUUID needs a secure context; the fallback covers plain-http dev hosts.
export const uuid = () =>
  typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : fallbackUuid();

// Ids made on different devices can never collide, unlike the Date.now() ids
// used before v3. Existing ids are permanent and are never rewritten.
export const newId = (prefix) => `${prefix}-${uuid()}`;

export const stampNew = (record, now = nowIso()) => ({ ...record, createdAt: now, updatedAt: now });

export const touch = (record, now = nowIso()) => ({ ...record, updatedAt: now });

// For normalizers: carry valid stamps through, drop anything else.
export const keepStamps = (record) => ({
  ...(isTimestamp(record?.createdAt) ? { createdAt: record.createdAt } : {}),
  ...(isTimestamp(record?.updatedAt) ? { updatedAt: record.updatedAt } : {}),
});

// Forward compatibility (N9). A record written by a newer build may carry
// fields this build has never heard of. The normalizers keep every own key
// outside their known set, as long as its value is a plain JSON value (what
// JSON.parse can produce: null, booleans, finite numbers, strings, arrays and
// plain objects of the same), so the record round-trips through this build
// unchanged. Unknown fields are opaque: nothing in the app reads them, and a
// merge moves them whole with the record that wins. A key named __proto__ is
// never kept: it is not a field any build writes, and Object.assign-style
// copies would read it as the prototype. Nesting stops at MAX_JSON_DEPTH
// levels: a deeper value is not one this build carries (the field is dropped,
// as every unknown field was before N9), and the check never recurses far
// enough to overflow the stack on a hostile or absurd file.
export const MAX_JSON_DEPTH = 64;

export const isJsonValue = (value, depth = 0, seen = new Set()) => {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      break;
    default:
      return false;
  }
  if (depth >= MAX_JSON_DEPTH) return false;
  // `seen` is the path from the root: a cycle can never be serialized.
  if (seen.has(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return false;
  seen.add(value);
  const items = Array.isArray(value) ? value : Object.keys(value).map((key) => value[key]);
  const ok = items.every((item) => isJsonValue(item, depth + 1, seen));
  seen.delete(value);
  return ok;
};

export const unknownFields = (record, known) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) return {};
  return Object.fromEntries(
    Object.keys(record).filter(
      (key) => key !== "__proto__" && !known.has(key) && isJsonValue(record[key])
    ).map((key) => [key, record[key]])
  );
};

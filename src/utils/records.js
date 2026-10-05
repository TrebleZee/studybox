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

export interface Storage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getMany?<T = unknown>(keys: readonly string[]): Promise<(T | null)[]>;
  setMany?(entries: readonly (readonly [string, unknown])[]): Promise<void>;
  deleteMany?(keys: readonly string[]): Promise<void>;
  getAllByPrefix?<T = unknown>(prefix: string): Promise<[string, T][]>;
}

const DB_NAME = "typing-trainer-pro";
const DB_VERSION = 1;
const STORE_NAME = "kv";

export class MemoryStorage implements Storage {
  private readonly map = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.map.has(key)) return null;
    return this.map.get(key) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.map.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async getMany<T = unknown>(keys: readonly string[]): Promise<(T | null)[]> {
    return keys.map((k) => (this.map.has(k) ? (this.map.get(k) as T) : null));
  }

  async setMany(entries: readonly (readonly [string, unknown])[]): Promise<void> {
    for (const [k, v] of entries) {
      this.map.set(k, v);
    }
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    for (const k of keys) {
      this.map.delete(k);
    }
  }

  async getAllByPrefix<T = unknown>(prefix: string): Promise<[string, T][]> {
    const out: [string, T][] = [];
    for (const [k, v] of this.map.entries()) {
      if (k.startsWith(prefix)) {
        out.push([k, v as T]);
      }
    }
    return out;
  }
}

export class IndexedDbStorage implements Storage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly fallback = new MemoryStorage();

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB unavailable"));
    }
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          this.dbPromise = null;
          reject(req.error ?? new Error("Failed to open IndexedDB"));
        };
      } catch (err) {
        this.dbPromise = null;
        reject(err instanceof Error ? err : new Error("Failed to open IndexedDB"));
      }
    });
    return this.dbPromise;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await this.openDb();
      return await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
      });
    } catch {
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error("IndexedDB set failed"));
      });
    } catch {
      await this.fallback.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error("IndexedDB delete failed"));
      });
    } catch {
      await this.fallback.delete(key);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const db = await this.openDb();
      return await new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const range = prefix ? IDBKeyRange.bound(prefix, `${prefix}\uffff`) : undefined;
        const req = range ? store.getAllKeys(range) : store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result.filter((k): k is string => typeof k === "string");
          resolve(prefix ? keys.filter((k) => k.startsWith(prefix)) : keys);
        };
        req.onerror = () => reject(req.error ?? new Error("IndexedDB list failed"));
      });
    } catch {
      return this.fallback.list(prefix);
    }
  }

  async getMany<T = unknown>(keys: readonly string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    try {
      const db = await this.openDb();
      return await new Promise<(T | null)[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const out = new Array<T | null>(keys.length).fill(null);
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB getMany failed"));
        keys.forEach((k, idx) => {
          const req = store.get(k);
          req.onsuccess = () => {
            out[idx] = (req.result as T | undefined) ?? null;
          };
        });
      });
    } catch {
      return this.fallback.getMany<T>(keys);
    }
  }

  async setMany(entries: readonly (readonly [string, unknown])[]): Promise<void> {
    if (entries.length === 0) return;
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB setMany failed"));
        for (const [k, v] of entries) {
          store.put(v, k);
        }
      });
    } catch {
      await this.fallback.setMany(entries);
    }
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB deleteMany failed"));
        for (const k of keys) {
          store.delete(k);
        }
      });
    } catch {
      await this.fallback.deleteMany(keys);
    }
  }

  async getAllByPrefix<T = unknown>(prefix: string): Promise<[string, T][]> {
    try {
      const db = await this.openDb();
      return await new Promise<[string, T][]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
        const keysReq = store.getAllKeys(range);
        const valsReq = store.getAll(range);
        tx.oncomplete = () => {
          const keys = keysReq.result;
          const vals = valsReq.result;
          const out: [string, T][] = [];
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (typeof k === "string" && k.startsWith(prefix)) {
              out.push([k, vals[i] as T]);
            }
          }
          resolve(out);
        };
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB getAllByPrefix failed"));
      });
    } catch {
      return this.fallback.getAllByPrefix<T>(prefix);
    }
  }
}

export const appStorage: Storage = new IndexedDbStorage();

export const LEGACY_EXACT_KEYS = [
  "ttp:history:v1",
  "ttp:keystats:v1",
  "ttp:keyspeed:v1",
  "ttp:daily:v1",
  "ttp:missed-words:v1",
  "ttp:drill:settings:v1",
  "ttp:uiprefs:v1",
  "ttp:theme:v1",
  "ttp:onboarded:v1",
] as const;

export const LEGACY_SAMPLES_PREFIX = "ttp:best:samples:v1:";

const STRING_RAW_KEYS = new Set(["ttp:theme:v1", "ttp:onboarded:v1"]);

function parseLegacyValue(key: string, raw: string): unknown {
  if (STRING_RAW_KEYS.has(key)) {
    return raw;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function getBrowserLocalStorage(): globalThis.Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export interface MigrationReport {
  migrated: string[];
  removed: string[];
  failed: string[];
}

/**
 * Migrate legacy `ttp:*` keys from localStorage into the Storage adapter.
 * Keeps old localStorage keys until all writes succeed, then removes them.
 */
export async function migrateLegacyLocalStorage(
  storage: Storage,
  local: globalThis.Storage | null = getBrowserLocalStorage(),
): Promise<MigrationReport> {
  const report: MigrationReport = { migrated: [], removed: [], failed: [] };
  if (!local) return report;

  const keysToCheck = new Set<string>(LEGACY_EXACT_KEYS);
  const extraCleanupKeys: string[] = [];

  try {
    for (let i = 0; i < local.length; i++) {
      const k = local.key(i);
      if (k && k.startsWith(LEGACY_SAMPLES_PREFIX)) {
        keysToCheck.add(k);
      }
    }
  } catch {
    return report;
  }

  // Handle pre-v1 unversioned history and legacy difficulty key if present.
  try {
    if (!local.getItem("ttp:history:v1") && local.getItem("ttp:history")) {
      const legacyHist = local.getItem("ttp:history");
      if (legacyHist !== null) {
        await storage.set("ttp:history:v1", parseLegacyValue("ttp:history:v1", legacyHist));
        report.migrated.push("ttp:history:v1");
        extraCleanupKeys.push("ttp:history");
      }
    }
    if (!local.getItem("ttp:drill:settings:v1") && local.getItem("ttp:drill:diff:v1")) {
      const legacyDiff = local.getItem("ttp:drill:diff:v1");
      if (legacyDiff === "easy" || legacyDiff === "medium" || legacyDiff === "hard") {
        const existing = await storage.get("ttp:drill:settings:v1");
        if (existing === null) {
          await storage.set("ttp:drill:settings:v1", { difficulty: legacyDiff });
          report.migrated.push("ttp:drill:settings:v1");
        }
        extraCleanupKeys.push("ttp:drill:diff:v1");
      }
    } else if (local.getItem("ttp:drill:diff:v1")) {
      extraCleanupKeys.push("ttp:drill:diff:v1");
    }
  } catch {
    report.failed.push("legacy-pre-v1");
    return report;
  }

  const keysPresent: { key: string; raw: string }[] = [];
  for (const key of keysToCheck) {
    try {
      const raw = local.getItem(key);
      if (raw !== null) {
        keysPresent.push({ key, raw });
      }
    } catch {
      report.failed.push(key);
    }
  }

  if (report.failed.length > 0) {
    return report;
  }

  for (const { key, raw } of keysPresent) {
    try {
      const existing = await storage.get(key);
      if (existing === null) {
        await storage.set(key, parseLegacyValue(key, raw));
        report.migrated.push(key);
      }
    } catch {
      report.failed.push(key);
    }
  }

  // Only remove legacy keys once ALL writes succeeded.
  if (report.failed.length > 0) {
    return report;
  }

  const bootProtectedLegacyKeys = new Set(["ttp:theme:v1", "ttp:uiprefs:v1"]);
  let hasBootPrefs = false;
  try {
    hasBootPrefs = local.getItem("ttp:boot:v1") !== null;
  } catch {
    hasBootPrefs = false;
  }

  for (const { key } of keysPresent) {
    if (bootProtectedLegacyKeys.has(key) && !hasBootPrefs) {
      continue;
    }
    try {
      local.removeItem(key);
      report.removed.push(key);
    } catch {
      // Non-fatal if remove fails
    }
  }

  for (const key of extraCleanupKeys) {
    try {
      local.removeItem(key);
      report.removed.push(key);
    } catch {
      // Non-fatal
    }
  }

  return report;
}

/**
 * Raw IndexedDB wrapper for APSIMS offline PWA.
 * No external dependencies — uses the native IDBDatabase API.
 *
 * Database : apsims-offline-db  (version 1)
 * Stores   : students | attendance | fees | offline_queue
 */

const DB_NAME = "apsims-offline-db";
const DB_VERSION = 1;

/** All store names used by the app. */
const STORE_NAMES = ["students", "attendance", "fees", "offline_queue"] as const;
type StoreName = (typeof STORE_NAMES)[number];

/** Module-level singleton — openDB() only opens the database once. */
let db: IDBDatabase | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when running in a server-side (non-browser) environment. */
function isSSR(): boolean {
  return typeof window === "undefined";
}

/**
 * Wraps an IDBRequest in a Promise.
 * Resolves with the request result on success, rejects with the error on failure.
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// openDB
// ---------------------------------------------------------------------------

/**
 * Opens (or reuses) the IndexedDB database.
 * Creates all object stores and indexes on first run / version upgrade.
 *
 * @returns A promise that resolves with the open IDBDatabase instance.
 */
export function openDB(): Promise<IDBDatabase> {
  if (isSSR()) {
    return Promise.reject(new Error("IndexedDB is not available in SSR context."));
  }

  if (db) {
    return Promise.resolve(db);
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // ── students ──────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains("students")) {
        const studentsStore = database.createObjectStore("students", { keyPath: "id" });
        studentsStore.createIndex("form_id", "form_id", { unique: false });
        studentsStore.createIndex("stream_id", "stream_id", { unique: false });
      }

      // ── attendance ────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains("attendance")) {
        const attendanceStore = database.createObjectStore("attendance", { keyPath: "id" });
        attendanceStore.createIndex("student_id", "student_id", { unique: false });
        attendanceStore.createIndex("attendance_date", "attendance_date", { unique: false });
      }

      // ── fees ──────────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains("fees")) {
        database.createObjectStore("fees", { keyPath: "id" });
      }

      // ── offline_queue ─────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains("offline_queue")) {
        const queueStore = database.createObjectStore("offline_queue", { keyPath: "id" });
        queueStore.createIndex("type", "type", { unique: false });
        queueStore.createIndex("status", "status", { unique: false });
        queueStore.createIndex("queued_at", "queued_at", { unique: false });
      }
    };
  });
}

// ---------------------------------------------------------------------------
// getAll
// ---------------------------------------------------------------------------

/**
 * Returns all records from the given object store.
 *
 * @param store - Name of the object store.
 * @returns Array of all records cast to type T.
 */
export async function getAll<T>(store: string): Promise<T[]> {
  if (isSSR()) return [];

  const database = await openDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

/**
 * Inserts or updates a record in the given object store.
 *
 * @param store  - Name of the object store.
 * @param record - The record to store (must include the keyPath field).
 */
export async function put<T>(store: string, record: T): Promise<void> {
  if (isSSR()) return;

  const database = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    const request = tx.objectStore(store).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

/**
 * Deletes a single record by its key from the given object store.
 *
 * @param store - Name of the object store.
 * @param id    - Primary key of the record to delete.
 */
export async function remove(store: string, id: string | number): Promise<void> {
  if (isSSR()) return;

  const database = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    const request = tx.objectStore(store).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

/**
 * Removes all records from the given object store.
 *
 * @param store - Name of the object store to clear.
 */
export async function clear(store: string): Promise<void> {
  if (isSSR()) return;

  const database = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    const request = tx.objectStore(store).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// getCount
// ---------------------------------------------------------------------------

/**
 * Returns the number of records in the given object store.
 *
 * @param store - Name of the object store.
 * @returns Record count as a number.
 */
export async function getCount(store: string): Promise<number> {
  if (isSSR()) return 0;

  const database = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    const request = tx.objectStore(store).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// getAllByIndex
// ---------------------------------------------------------------------------

/**
 * Returns all records that match a specific index value.
 *
 * @param store     - Name of the object store.
 * @param indexName - Name of the index to query.
 * @param value     - The index value to match.
 * @returns Array of matching records cast to type T.
 */
export async function getAllByIndex<T>(
  store: string,
  indexName: string,
  value: string | number
): Promise<T[]> {
  if (isSSR()) return [];

  const database = await openDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    const index = tx.objectStore(store).index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// clearAllStores
// ---------------------------------------------------------------------------

/**
 * Clears every object store in the database.
 * Intended to be called on user logout to wipe all locally cached data.
 */
export async function clearAllStores(): Promise<void> {
  if (isSSR()) return;

  const database = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction([...STORE_NAMES], "readwrite");

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    for (const storeName of STORE_NAMES) {
      tx.objectStore(storeName).clear();
    }
  });
}

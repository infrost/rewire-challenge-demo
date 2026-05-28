"use client";

import type { RewireAgentSessionRecord } from "@/lib/rewire-agent/types";

const dbName = "rewire-agent-db";
const dbVersion = 1;
const storeSessions = "sessions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeSessions)) {
        db.createObjectStore(storeSessions, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeSessions, mode);
    const store = transaction.objectStore(storeSessions);

    executor(store)
      .then((result) => {
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
      })
      .catch((error) => reject(error));
  });
}

export async function loadRewireAgentSession(
  id: string,
): Promise<RewireAgentSessionRecord | null> {
  return withStore("readonly", async (store) => {
    const result = await requestAsPromise(store.get(id));

    return (result as RewireAgentSessionRecord | undefined) ?? null;
  });
}

export async function saveRewireAgentSession(
  record: RewireAgentSessionRecord,
) {
  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.put(record));
  });
}

export async function deleteRewireAgentSession(id: string) {
  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.delete(id));
  });
}

import { openDB, type IDBPDatabase } from 'idb'
import type { OfflineQueueItem } from '../types'

const DB_NAME = 'botana-offline'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

async function getDB() {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('queue')) {
        database.createObjectStore('queue', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('logs_draft')) {
        database.createObjectStore('logs_draft', { keyPath: 'id' })
      }
    },
  })
  return db
}

export async function enqueue(type: OfflineQueueItem['type'], payload: unknown): Promise<string> {
  const db = await getDB()
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
  }
  await db.put('queue', item)
  return item.id
}

export async function dequeue(): Promise<OfflineQueueItem[]> {
  const db = await getDB()
  return db.getAll('queue')
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('queue', id)
}

export async function saveDraft(log: Record<string, unknown>): Promise<void> {
  const db = await getDB()
  await db.put('logs_draft', log)
}

export async function getDrafts(): Promise<Record<string, unknown>[]> {
  const db = await getDB()
  return db.getAll('logs_draft')
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('logs_draft', id)
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count('queue')
}

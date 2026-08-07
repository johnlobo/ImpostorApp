import Dexie from 'dexie'

import type { PublicPlatformError } from '../../domain/entities/platform'
import { persistenceMigrations, type PersistenceMigration } from './migrations'

export const CURRENT_SCHEMA_VERSION = persistenceMigrations.at(-1)?.version ?? 1

type DatabaseMode = 'read-write' | 'safe-read-only'
type DatabaseInitializationResult =
  { ok: true; value: 'ready' } | { ok: false; error: PublicPlatformError }

export interface PersistenceTable<T = unknown> {
  get(key: IDBValidKey): Promise<T | undefined>
  toArray(): Promise<T[]>
  put(value: T): Promise<IDBValidKey>
  delete(key: IDBValidKey): Promise<void>
  clear(): Promise<void>
}

export interface CreatePersistenceDatabaseOptions {
  name: string
  indexedDB: IDBFactory
  IDBKeyRange: typeof globalThis.IDBKeyRange
  migrations?: readonly PersistenceMigration[]
}

const incompatibleError: PublicPlatformError = {
  code: 'incompatible-data',
  retryable: false,
}

class IncompatibleDataError extends Error implements PublicPlatformError {
  readonly code = 'incompatible-data'
  readonly retryable = false

  constructor() {
    super('The stored schema is newer than this application understands')
    this.name = 'IncompatibleDataError'
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

class NativeReadOnlyTable<T> implements PersistenceTable<T> {
  constructor(
    private readonly database: IDBDatabase,
    private readonly tableName: string,
  ) {}

  async get(key: IDBValidKey): Promise<T | undefined> {
    const transaction = this.database.transaction(this.tableName, 'readonly')
    return (await requestResult(transaction.objectStore(this.tableName).get(key))) as T | undefined
  }

  async toArray(): Promise<T[]> {
    const transaction = this.database.transaction(this.tableName, 'readonly')
    return (await requestResult(transaction.objectStore(this.tableName).getAll())) as T[]
  }

  put(): Promise<IDBValidKey> {
    return Promise.reject(new IncompatibleDataError())
  }

  delete(): Promise<void> {
    return Promise.reject(new IncompatibleDataError())
  }

  clear(): Promise<void> {
    return Promise.reject(new IncompatibleDataError())
  }
}

export class PersistenceDatabase {
  mode: DatabaseMode = 'read-write'

  private readonly dexie: Dexie
  private nativeDatabase: IDBDatabase | null = null

  constructor(private readonly options: CreatePersistenceDatabaseOptions) {
    this.dexie = new Dexie(options.name, {
      indexedDB: options.indexedDB,
      IDBKeyRange: options.IDBKeyRange,
    })

    for (const migration of options.migrations ?? persistenceMigrations) {
      const version = this.dexie.version(migration.version).stores(migration.stores)
      if (migration.upgrade) {
        version.upgrade(migration.upgrade)
      }
    }
  }

  async initialize(): Promise<DatabaseInitializationResult> {
    const existing = await this.openNative()
    if (existing && existing.version > CURRENT_SCHEMA_VERSION && !this.options.migrations) {
      this.mode = 'safe-read-only'
      this.nativeDatabase = existing
      return { ok: false, error: incompatibleError }
    }
    existing?.close()

    try {
      await this.open()
      return { ok: true, value: 'ready' }
    } catch {
      return {
        ok: false,
        error: { code: 'migration-failed', retryable: false },
      }
    }
  }

  open(): Promise<Dexie> {
    return this.dexie.open()
  }

  close(): void {
    this.dexie.close()
    this.nativeDatabase?.close()
    this.nativeDatabase = null
  }

  async deleteDatabase(): Promise<void> {
    this.close()
    await this.dexie.delete()
  }

  table<T = unknown>(name: string): PersistenceTable<T> {
    if (this.mode === 'safe-read-only') {
      if (!this.nativeDatabase) {
        throw new Error('Safe-mode database is closed')
      }
      return new NativeReadOnlyTable<T>(this.nativeDatabase, name)
    }
    return this.dexie.table<T, IDBValidKey>(name)
  }

  async transaction<T>(tableNames: readonly string[], operation: () => Promise<T>): Promise<T> {
    if (this.mode === 'safe-read-only') {
      throw new IncompatibleDataError()
    }
    const tables = tableNames.map((name) => this.dexie.table(name))
    return this.dexie.transaction('rw', tables, operation)
  }

  private openNative(): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      const request = this.options.indexedDB.open(this.options.name)
      let databaseDidNotExist = false
      request.onupgradeneeded = (event) => {
        if (event.oldVersion === 0) {
          databaseDidNotExist = true
          request.transaction?.abort()
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        if (databaseDidNotExist) {
          resolve(null)
          return
        }
        reject(request.error ?? new Error('Could not inspect IndexedDB'))
      }
    })
  }
}

export function createPersistenceDatabase(
  options: CreatePersistenceDatabaseOptions,
): PersistenceDatabase {
  return new PersistenceDatabase(options)
}

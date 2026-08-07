import 'fake-indexeddb/auto'

import Dexie, { type Transaction } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import {
  CURRENT_SCHEMA_VERSION,
  createPersistenceDatabase,
} from '../../src/infrastructure/persistence/database'
import type { PersistenceMigration } from '../../src/infrastructure/persistence/migrations'

const databaseNames = new Set<string>()

function uniqueDatabaseName(): string {
  const name = `migration-contract-${crypto.randomUUID()}`
  databaseNames.add(name)
  return name
}

async function seedVersionOne(name: string, marker: string): Promise<void> {
  const legacy = new Dexie(name, { indexedDB, IDBKeyRange })
  legacy.version(1).stores({ metadata: '&id', recoverySnapshots: '&id' })
  await legacy.table('metadata').put({ id: 'app', schemaVersion: 1, marker })
  legacy.close()
}

afterEach(async () => {
  await Promise.all(
    [...databaseNames].map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error ?? new Error(`Could not delete ${name}`))
          request.onblocked = () => resolve()
        }),
    ),
  )
  databaseNames.clear()
})

describe('persistence migrations', () => {
  it('rolls back every transformed record when a migration fails', async () => {
    const name = uniqueDatabaseName()
    await seedVersionOne(name, 'original')
    const failingMigration: PersistenceMigration = {
      version: 2,
      stores: { metadata: '&id', recoverySnapshots: '&id' },
      async upgrade(transaction: Transaction) {
        await transaction.table('metadata').update('app', { marker: 'partially-migrated' })
        throw new Error('fixture migration failure')
      },
    }
    const database = createPersistenceDatabase({
      name,
      indexedDB,
      IDBKeyRange,
      migrations: [failingMigration],
    })

    await expect(database.open()).rejects.toThrow('fixture migration failure')
    database.close()

    const legacy = new Dexie(name, { indexedDB, IDBKeyRange })
    legacy.version(1).stores({ metadata: '&id', recoverySnapshots: '&id' })
    await legacy.open()
    await expect(legacy.table('metadata').get('app')).resolves.toMatchObject({
      schemaVersion: 1,
      marker: 'original',
    })
    legacy.close()
  })

  it('reports migration-failed without deleting legacy data', async () => {
    const name = uniqueDatabaseName()
    await seedVersionOne(name, 'keep-me')
    const database = createPersistenceDatabase({
      name,
      indexedDB,
      IDBKeyRange,
      migrations: [
        {
          version: 2,
          stores: { metadata: '&id', recoverySnapshots: '&id' },
          upgrade: () => {
            throw new Error('cannot understand legacy record')
          },
        },
      ],
    })

    await expect(database.initialize()).resolves.toEqual({
      ok: false,
      error: { code: 'migration-failed', retryable: false },
    })
    database.close()

    const request = indexedDB.open(name)
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error(`Could not open ${name}`))
    })
    expect(request.result.objectStoreNames.contains('metadata')).toBe(true)
    request.result.close()
  })

  it('opens a future schema in read-only safe mode and refuses all writes', async () => {
    const name = uniqueDatabaseName()
    const future = new Dexie(name, { indexedDB, IDBKeyRange })
    future.version(CURRENT_SCHEMA_VERSION + 1).stores({ metadata: '&id', futureRecords: '&id' })
    await future.table('metadata').put({
      id: 'app',
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      marker: 'future-data',
    })
    future.close()

    const database = createPersistenceDatabase({ name, indexedDB, IDBKeyRange })
    await expect(database.initialize()).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
    expect(database.mode).toBe('safe-read-only')
    await expect(database.table('metadata').put({ id: 'other' })).rejects.toMatchObject({
      code: 'incompatible-data',
    })

    const metadata = await database.table('metadata').get('app')
    expect(metadata).toMatchObject({ marker: 'future-data' })
    database.close()
  })
})

import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import type { PersistenceNamespace, PublicPlatformError } from '../../src/domain/entities/platform'
import { DexiePersistenceGateway } from '../../src/infrastructure/persistence/dexiePersistenceGateway'
import { createPersistenceDatabase } from '../../src/infrastructure/persistence/database'
import { recoverySnapshot } from '../fixtures/platform'

const databaseNames = new Set<string>()

function createGateway(options: { writer?: boolean } = {}) {
  const name = `persistence-contract-${crypto.randomUUID()}`
  databaseNames.add(name)
  const database = createPersistenceDatabase({ name, indexedDB, IDBKeyRange })
  const gateway = new DexiePersistenceGateway(database, {
    hasWriterLease: () => options.writer ?? true,
  })

  return { database, gateway }
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

describe('PersistenceGateway contract', () => {
  it('initializes a new database and starts without a recovery snapshot', async () => {
    const { database, gateway } = createGateway()

    await expect(gateway.initialize()).resolves.toEqual({ ok: true, value: 'ready' })
    await expect(gateway.loadRecoverySnapshot()).resolves.toEqual({ ok: true, value: null })

    database.close()
  })

  it.each<PersistenceNamespace>([
    'player-groups',
    'custom-categories',
    'used-concepts',
    'preferences',
  ])('commits and reads the %s collection independently', async (namespace) => {
    const { database, gateway } = createGateway()
    const record = { id: `${namespace}-1`, schemaVersion: 1, marker: namespace }

    await gateway.initialize()
    await expect(
      gateway.commitCollectionChange(namespace, {
        operation: 'put',
        key: record.id,
        value: record,
      }),
    ).resolves.toEqual({ ok: true, value: undefined })
    await expect(gateway.readCollection(namespace)).resolves.toEqual({ ok: true, value: [record] })

    await gateway.commitCollectionChange(namespace, { operation: 'delete', key: record.id })
    await expect(gateway.readCollection(namespace)).resolves.toEqual({ ok: true, value: [] })

    database.close()
  })

  it('rejects stale snapshot revisions and preserves the confirmed snapshot', async () => {
    const { database, gateway } = createGateway()
    const first = recoverySnapshot({ revision: 1, payload: { round: 1 } })
    const stale = recoverySnapshot({ revision: 2, payload: { round: 2 } })

    await gateway.initialize()
    await expect(gateway.commitRecoverySnapshot(0, first)).resolves.toEqual({
      ok: true,
      value: first,
    })
    await expect(gateway.commitRecoverySnapshot(0, stale)).resolves.toMatchObject({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    await expect(gateway.loadRecoverySnapshot()).resolves.toEqual({ ok: true, value: first })

    database.close()
  })

  it('keeps the previous snapshot when the next payload cannot be committed atomically', async () => {
    const { database, gateway } = createGateway()
    const confirmed = recoverySnapshot({ revision: 1, payload: { round: 1 } })
    const invalid = recoverySnapshot({
      revision: 2,
      payload: { nonCloneable: () => 'must fail structured cloning' },
    })

    await gateway.initialize()
    await gateway.commitRecoverySnapshot(0, confirmed)
    const result = await gateway.commitRecoverySnapshot(1, invalid)

    expect(result).toMatchObject({ ok: false, error: { code: 'unknown-storage-error' } })
    await expect(gateway.loadRecoverySnapshot()).resolves.toEqual({ ok: true, value: confirmed })

    database.close()
  })

  it('requires a writer lease for every mutation', async () => {
    const { database, gateway } = createGateway({ writer: false })

    await gateway.initialize()
    await expect(
      gateway.commitRecoverySnapshot(0, recoverySnapshot({ revision: 1 })),
    ).resolves.toMatchObject({ ok: false, error: { code: 'writer-unavailable' } })
    await expect(
      gateway.commitCollectionChange('preferences', {
        operation: 'put',
        key: 'preferences',
        value: { id: 'preferences' },
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'writer-unavailable' } })

    database.close()
  })

  it('only clears data after explicit confirmation', async () => {
    const { database, gateway } = createGateway()
    const snapshot = recoverySnapshot({ revision: 1 })

    await gateway.initialize()
    await gateway.commitRecoverySnapshot(0, snapshot)

    // @ts-expect-error Confirmation must be the literal true at the public boundary.
    await expect(gateway.clearAllData({ confirmed: false })).resolves.toMatchObject({ ok: false })
    await expect(gateway.loadRecoverySnapshot()).resolves.toEqual({ ok: true, value: snapshot })

    await expect(gateway.clearAllData({ confirmed: true })).resolves.toEqual({
      ok: true,
      value: undefined,
    })
    await expect(gateway.loadRecoverySnapshot()).resolves.toEqual({ ok: true, value: null })

    database.close()
  })

  it('returns only public error fields and never includes persisted payloads', async () => {
    const { database, gateway } = createGateway({ writer: false })
    const secret = 'concepto-que-no-debe-filtrarse'

    await gateway.initialize()
    const result = await gateway.commitRecoverySnapshot(
      0,
      recoverySnapshot({ revision: 1, payload: { secret } }),
    )
    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(Object.keys(result.error).sort()).toEqual(['code', 'retryable'])
      expect(JSON.stringify(result.error)).not.toContain(secret)
      expect(result.error satisfies PublicPlatformError).toBe(result.error)
    }

    database.close()
  })
})

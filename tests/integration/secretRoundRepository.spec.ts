import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  type ContentCategory,
  type PreparedContentSelection,
} from '../../src/domain/entities/contentCatalog'
import {
  GAME_CONFIGURATION_SCHEMA_VERSION,
  type PreparedGame,
} from '../../src/domain/entities/gameConfiguration'
import {
  createPersistenceDatabase,
  type PersistenceDatabase,
} from '../../src/infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../src/infrastructure/persistence/dexiePersistenceGateway'
import {
  createImpostorAllocationHistoryRepository,
  createSecretRoundRepository,
} from '../../src/infrastructure/persistence/secretRoundRepository'

const databases: PersistenceDatabase[] = []
const now = '2026-08-08T00:00:00.000Z'

function category(): ContentCategory {
  return {
    id: 'ideas',
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    source: 'custom',
    name: 'Ideas',
    adult: false,
    concepts: ['Uno', 'Dos', 'Tres'].map((text, index) => ({ id: `concept-${index + 1}`, text })),
    createdAt: now,
    updatedAt: now,
  }
}

function game(): PreparedGame {
  return {
    schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
    id: 'game-1',
    roster: {
      players: [
        { id: 'ana', name: 'Ana', position: 0 },
        { id: 'bruno', name: 'Bruno', position: 1 },
        { id: 'carla', name: 'Carla', position: 2 },
      ],
    },
    rules: {
      rounds: 3,
      impostorCount: 1,
      conversation: { mode: 'free' },
      turnOrder: 'roster',
      voting: 'verbal',
      finalAttempt: false,
      allocation: 'random',
      impostorAwareness: 'unknown',
      elimination: 'single',
    },
    createdAt: now,
  }
}

function content(): PreparedContentSelection {
  const categories = [category()]
  return {
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    game: game(),
    selection: { mode: 'all' },
    eligibleCategoryIds: categories.map(({ id }) => id),
    categories,
    adultContentEnabled: false,
    createdAt: now,
  }
}

async function setup(writer = true) {
  const database = createPersistenceDatabase({
    name: `secret-round-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  })
  databases.push(database)
  await database.initialize()
  const gateway = new DexiePersistenceGateway(database, { hasWriterLease: () => writer })
  const prepared = content()
  await gateway.commitRecoverySnapshot(0, {
    id: 'active-game',
    schemaVersion: 1,
    revision: 1,
    savedAt: now,
    phase: 'content-selected',
    payload: prepared,
    integrity: 'confirmed',
  })
  return {
    database,
    prepared,
    repository: createSecretRoundRepository(database, { hasWriterLease: () => writer }, () => now),
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.deleteDatabase()))
})

describe('SecretRoundRepository', () => {
  it('prepares concept, allocation history and recovery snapshot atomically', async () => {
    const { database, prepared, repository } = await setup()

    const result = await repository.prepare(prepared, 1, () => 0)

    expect(result).toMatchObject({
      ok: true,
      value: {
        revision: 2,
        snapshot: { roundNumber: 1, concept: { conceptId: 'concept-1', text: 'Uno' } },
      },
    })
    if (!result.ok || !result.value.snapshot) throw new Error('expected prepared round')
    expect(result.value.snapshot.assignments).toEqual([
      { playerId: 'ana', role: 'impostor' },
      { playerId: 'bruno', role: 'citizen' },
      { playerId: 'carla', role: 'citizen' },
    ])
    await expect(database.table('used-concepts').get('game-1')).resolves.toMatchObject({
      value: { usedConceptIds: ['concept-1'] },
    })
    await expect(
      createImpostorAllocationHistoryRepository(database).load('game-1'),
    ).resolves.toMatchObject({
      ok: true,
      value: { roundsPlayed: 1, impostorCounts: { ana: 1, bruno: 0, carla: 0 } },
    })
    await expect(repository.load()).resolves.toEqual(result)
  })

  it('returns an existing prepared round without drawing or writing again', async () => {
    const { database, prepared, repository } = await setup()
    const first = await repository.prepare(prepared, 1, () => 0)

    await expect(repository.prepare(prepared, 1, () => 0.99)).resolves.toEqual(first)
    await expect(database.table('used-concepts').get('game-1')).resolves.toMatchObject({
      value: { usedConceptIds: ['concept-1'] },
    })
    await expect(
      createImpostorAllocationHistoryRepository(database).load('game-1'),
    ).resolves.toMatchObject({ ok: true, value: { roundsPlayed: 1 } })
  })

  it('rejects a different content selection for an already prepared game', async () => {
    const { prepared, repository } = await setup()
    await repository.prepare(prepared, 1, () => 0)
    const changed = { ...prepared, selection: { mode: 'random-category' as const } }

    await expect(repository.prepare(changed, 2, () => 0)).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('rejects allocation history from another game scope', async () => {
    const { database, prepared, repository } = await setup()
    await database.table('role-assignment-history').put({
      key: 'game-1',
      value: {
        scopeId: 'other-game',
        schemaVersion: 1,
        impostorCounts: { ana: 0, bruno: 0, carla: 0 },
        roundsPlayed: 0,
        updatedAt: now,
      },
    })

    await expect(repository.prepare(prepared, 1, () => 0)).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('leaves all stores unchanged when content is exhausted', async () => {
    const { database, prepared, repository } = await setup()
    const used = {
      key: 'game-1',
      value: {
        scopeId: 'game-1',
        schemaVersion: 1,
        usedConceptIds: ['concept-1', 'concept-2', 'concept-3'],
        updatedAt: now,
      },
    }
    await database.table('used-concepts').put(used)

    await expect(repository.prepare(prepared, 1, () => 0)).resolves.toEqual({
      ok: false,
      error: { code: 'content-exhausted', retryable: false },
    })
    await expect(database.table('used-concepts').get('game-1')).resolves.toEqual(used)
    await expect(database.table('role-assignment-history').toArray()).resolves.toEqual([])
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      value: { snapshot: null, revision: 1 },
    })
  })

  it('rejects preparation without the writer lease and persists nothing', async () => {
    const { database, prepared, repository } = await setup(false)

    await expect(repository.prepare(prepared, 1, () => 0)).resolves.toEqual({
      ok: false,
      error: { code: 'writer-unavailable', retryable: true },
    })
    await expect(database.table('used-concepts').toArray()).resolves.toEqual([])
    await expect(database.table('role-assignment-history').toArray()).resolves.toEqual([])
  })

  it('increments the revision once and treats a repeated completed reveal as an idempotent no-op', async () => {
    const { prepared, repository } = await setup()
    const preparedRound = await repository.prepare(prepared, 1, () => 0)
    expect(preparedRound.ok).toBe(true)

    const completed = await repository.completeReveal('ana', 2)
    expect(completed).toMatchObject({ ok: true, value: { revision: 3 } })
    if (!completed.ok || !completed.value.snapshot) throw new Error('expected completed reveal')
    expect(completed.value.snapshot.reveals).toEqual([
      { playerId: 'ana', status: 'completed' },
      { playerId: 'bruno', status: 'pending' },
      { playerId: 'carla', status: 'pending' },
    ])
    await expect(repository.completeReveal('ana', 2)).resolves.toEqual(completed)
    await expect(repository.load()).resolves.toEqual(completed)
  })

  it('preserves the last confirmed snapshot on a stale reveal revision', async () => {
    const { prepared, repository } = await setup()
    const preparedRound = await repository.prepare(prepared, 1, () => 0)

    await expect(repository.completeReveal('bruno', 1)).resolves.toEqual({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    await expect(repository.load()).resolves.toEqual(preparedRound)
  })
})

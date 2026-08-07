import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  type ContentCategory,
  type PreparedContentSelection,
} from '../../src/domain/entities/contentCatalog'
import type { PreparedGame } from '../../src/domain/entities/gameConfiguration'
import { createConceptDrawRepository } from '../../src/infrastructure/persistence/conceptDrawRepository'
import { createContentSelectionRepository } from '../../src/infrastructure/persistence/contentSelectionRepository'
import {
  createPersistenceDatabase,
  type PersistenceDatabase,
} from '../../src/infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../src/infrastructure/persistence/dexiePersistenceGateway'

const databases: PersistenceDatabase[] = []
const now = '2026-08-07T14:00:00.000Z'

async function store() {
  const database = createPersistenceDatabase({
    name: `content-residual-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  })
  databases.push(database)
  await database.initialize()
  return {
    database,
    gateway: new DexiePersistenceGateway(database, { hasWriterLease: () => true }),
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.deleteDatabase()))
})

function game(id = 'game-1'): PreparedGame {
  return {
    schemaVersion: 1,
    id,
    roster: {
      players: [
        { id: 'p1', name: 'Ana', position: 0 },
        { id: 'p2', name: 'Brais', position: 1 },
        { id: 'p3', name: 'Carla', position: 2 },
      ],
    },
    rules: {
      rounds: 1,
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

function category(): ContentCategory {
  return {
    id: 'custom-one',
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    source: 'custom',
    name: 'Ideas',
    adult: false,
    concepts: [{ id: 'concept-one', text: 'Secreto' }],
    createdAt: now,
    updatedAt: now,
  }
}

function content(): PreparedContentSelection {
  const selected = category()
  return {
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    game: game(),
    selection: { mode: 'all' },
    eligibleCategoryIds: [selected.id],
    categories: [selected],
    adultContentEnabled: false,
    createdAt: now,
  }
}

describe('content repository residual contracts', () => {
  it('preserves the configured snapshot after a stale content-selection conflict', async () => {
    const { gateway } = await store()
    await gateway.commitRecoverySnapshot(0, {
      id: 'active-game',
      schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
      revision: 1,
      savedAt: now,
      phase: 'configured',
      payload: game(),
      integrity: 'confirmed',
    })

    await expect(createContentSelectionRepository(gateway).save(content(), 0)).resolves.toEqual({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    await expect(gateway.loadRecoverySnapshot()).resolves.toMatchObject({
      ok: true,
      value: { phase: 'configured', revision: 1 },
    })
  })

  it('rejects a malformed content-selected snapshot', async () => {
    const { gateway } = await store()
    await gateway.commitRecoverySnapshot(0, {
      id: 'active-game',
      schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
      revision: 1,
      savedAt: now,
      phase: 'content-selected',
      payload: { ...content(), categories: [] },
      integrity: 'confirmed',
    })

    await expect(createContentSelectionRepository(gateway).load()).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it.each([Number.NaN, -0.01, 1])(
    'does not write history for invalid RNG value %s',
    async (randomValue) => {
      const { database } = await store()
      const prepared = content()
      const repository = createConceptDrawRepository(
        database,
        () => true,
        () => now,
      )

      await expect(
        repository.drawAndMarkUsed(
          {
            gameId: prepared.game.id,
            selection: prepared.selection,
            eligibleCategoryIds: prepared.eligibleCategoryIds,
          },
          prepared.categories,
          () => randomValue,
        ),
      ).resolves.toEqual({
        ok: false,
        error: { code: 'incompatible-data', retryable: false },
      })
      expect(await database.table('used-concepts').toArray()).toEqual([])
    },
  )

  it('rejects reset without confirmation and keeps history intact', async () => {
    const { database } = await store()
    const prepared = content()
    const repository = createConceptDrawRepository(
      database,
      () => true,
      () => now,
    )
    const request = {
      gameId: prepared.game.id,
      selection: prepared.selection,
      eligibleCategoryIds: prepared.eligibleCategoryIds,
    }
    await repository.drawAndMarkUsed(request, prepared.categories, () => 0)

    await expect(
      repository.reset('game-1', { confirmed: false } as unknown as { confirmed: true }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
    expect(await database.table('used-concepts').toArray()).toHaveLength(1)
  })

  it('isolates used concepts by PreparedGame ID', async () => {
    const { database } = await store()
    const prepared = content()
    const repository = createConceptDrawRepository(
      database,
      () => true,
      () => now,
    )
    const draw = (gameId: string) =>
      repository.drawAndMarkUsed(
        {
          gameId,
          selection: prepared.selection,
          eligibleCategoryIds: prepared.eligibleCategoryIds,
        },
        prepared.categories,
        () => 0,
      )

    await expect(draw('game-one')).resolves.toMatchObject({
      ok: true,
      value: { gameId: 'game-one', conceptId: 'concept-one' },
    })
    await expect(draw('game-two')).resolves.toMatchObject({
      ok: true,
      value: { gameId: 'game-two', conceptId: 'concept-one' },
    })
    expect(await database.table('used-concepts').toArray()).toHaveLength(2)
  })
})

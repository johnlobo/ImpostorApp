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
import { createConceptDrawRepository } from '../../src/infrastructure/persistence/conceptDrawRepository'
import { createContentPreferencesRepository } from '../../src/infrastructure/persistence/contentPreferencesRepository'
import { createContentSelectionRepository } from '../../src/infrastructure/persistence/contentSelectionRepository'
import { createCustomCategoriesRepository } from '../../src/infrastructure/persistence/customCategoriesRepository'
import {
  createPersistenceDatabase,
  type PersistenceDatabase,
} from '../../src/infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../src/infrastructure/persistence/dexiePersistenceGateway'

interface TestStore {
  database: PersistenceDatabase
  gateway: DexiePersistenceGateway
  setWriter(value: boolean): void
}

const databases: PersistenceDatabase[] = []
const now = '2026-08-07T12:00:00.000Z'

async function store(): Promise<TestStore> {
  let writer = true
  const database = createPersistenceDatabase({
    name: `content-catalog-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  })
  databases.push(database)
  await database.initialize()
  return {
    database,
    gateway: new DexiePersistenceGateway(database, { hasWriterLease: () => writer }),
    setWriter(value) {
      writer = value
    },
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.deleteDatabase()))
})

function category(id = 'custom-one', concepts = ['Uno', 'Dos', 'Tres']): ContentCategory {
  return {
    id,
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    source: 'custom',
    name: id === 'custom-one' ? 'Ideas' : 'Más ideas',
    adult: false,
    concepts: concepts.map((text, index) => ({ id: `${id}-${index + 1}`, text })),
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

function content(categories = [category()]): PreparedContentSelection {
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

describe('content catalog repositories', () => {
  it('round-trips and deletes only valid custom categories', async () => {
    const { gateway } = await store()
    const repository = createCustomCategoriesRepository(gateway)
    const saved = category()

    await expect(repository.save(saved)).resolves.toEqual({ ok: true, value: saved })
    await expect(repository.list()).resolves.toEqual({ ok: true, value: [saved] })
    await expect(repository.delete(saved.id)).resolves.toEqual({ ok: true, value: undefined })
    await expect(repository.list()).resolves.toEqual({ ok: true, value: [] })
  })

  it('rejects the complete custom-category read when one record is incompatible', async () => {
    const { gateway } = await store()
    await gateway.commitCollectionChange('custom-categories', {
      operation: 'put',
      key: 'bad',
      value: { ...category(), source: 'built-in' },
    })

    await expect(createCustomCategoriesRepository(gateway).list()).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('defaults adult content to off and persists the preference offline', async () => {
    const { gateway } = await store()
    const repository = createContentPreferencesRepository(gateway, () => now)

    await expect(repository.loadAdultEnabled()).resolves.toEqual({ ok: true, value: false })
    await expect(repository.saveAdultEnabled(true)).resolves.toEqual({
      ok: true,
      value: undefined,
    })
    await expect(repository.loadAdultEnabled()).resolves.toEqual({ ok: true, value: true })
  })

  it('round-trips a content-selected snapshot with optimistic revision', async () => {
    const { gateway } = await store()
    const prepared = content()
    const repository = createContentSelectionRepository(gateway, () => now)

    await expect(repository.save(prepared, 0)).resolves.toEqual({
      ok: true,
      value: { content: prepared, revision: 1 },
    })
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      value: { content: prepared, revision: 1 },
    })
  })

  it('preserves writer failures without presenting selection or concepts as durable', async () => {
    const testStore = await store()
    testStore.setWriter(false)
    const prepared = content()

    await expect(
      createContentSelectionRepository(testStore.gateway).save(prepared, 0),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'writer-unavailable', retryable: true },
    })
    const draw = createConceptDrawRepository(
      testStore.database,
      () => false,
      () => now,
    )
    await expect(
      draw.drawAndMarkUsed(
        {
          gameId: prepared.game.id,
          selection: prepared.selection,
          eligibleCategoryIds: prepared.eligibleCategoryIds,
        },
        prepared.categories,
        () => 0,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'writer-unavailable', retryable: true },
    })
    expect(await testStore.database.table('used-concepts').toArray()).toEqual([])
  })

  it('serializes concurrent draws and persists opaque unique IDs before exposing text', async () => {
    const testStore = await store()
    const prepared = content()
    const repository = createConceptDrawRepository(
      testStore.database,
      () => true,
      () => now,
    )
    const request = {
      gameId: prepared.game.id,
      selection: prepared.selection,
      eligibleCategoryIds: prepared.eligibleCategoryIds,
    }

    const [first, second] = await Promise.all([
      repository.drawAndMarkUsed(request, prepared.categories, () => 0),
      repository.drawAndMarkUsed(request, prepared.categories, () => 0),
    ])

    expect(first).toEqual({
      ok: true,
      value: {
        gameId: 'game-1',
        categoryId: 'custom-one',
        conceptId: 'custom-one-1',
        text: 'Uno',
      },
    })
    expect(second).toEqual({
      ok: true,
      value: {
        gameId: 'game-1',
        categoryId: 'custom-one',
        conceptId: 'custom-one-2',
        text: 'Dos',
      },
    })
    const records = await testStore.database.table('used-concepts').toArray()
    expect(JSON.stringify(records)).toContain('custom-one-1')
    expect(JSON.stringify(records)).toContain('custom-one-2')
    expect(JSON.stringify(records)).not.toContain('Uno')
    expect(JSON.stringify(records)).not.toContain('Dos')
  })

  it('blocks on exhaustion until an explicit reset and then draws again', async () => {
    const testStore = await store()
    const only = category('custom-one', ['Único'])
    const repository = createConceptDrawRepository(
      testStore.database,
      () => true,
      () => now,
    )
    const request = {
      gameId: 'game-1',
      selection: { mode: 'all' as const },
      eligibleCategoryIds: [only.id],
    }

    expect(await repository.drawAndMarkUsed(request, [only], () => 0)).toMatchObject({
      ok: true,
      value: { conceptId: 'custom-one-1' },
    })
    await expect(repository.drawAndMarkUsed(request, [only], () => 0)).resolves.toEqual({
      ok: true,
      value: 'content-exhausted',
    })
    await expect(repository.reset('game-1', { confirmed: true })).resolves.toEqual({
      ok: true,
      value: undefined,
    })
    expect(await repository.drawAndMarkUsed(request, [only], () => 0)).toMatchObject({
      ok: true,
      value: { conceptId: 'custom-one-1' },
    })
  })

  it('chooses a fresh category on every random-category draw', async () => {
    const testStore = await store()
    const categories = [category(), category('custom-two')]
    const repository = createConceptDrawRepository(
      testStore.database,
      () => true,
      () => now,
    )
    const values = [0.75, 0, 0, 0]
    const request = {
      gameId: 'game-random',
      selection: { mode: 'random-category' as const },
      eligibleCategoryIds: categories.map(({ id }) => id),
    }

    const first = await repository.drawAndMarkUsed(request, categories, () => values.shift() ?? 0)
    const second = await repository.drawAndMarkUsed(request, categories, () => values.shift() ?? 0)
    expect(first).toMatchObject({ ok: true, value: { categoryId: 'custom-two' } })
    expect(second).toMatchObject({ ok: true, value: { categoryId: 'custom-one' } })
  })
  it('preserves the configured snapshot revision for the content handoff', async () => {
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
    const repository = createContentSelectionRepository(gateway, () => now)
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      value: { content: null, revision: 1 },
    })
    const prepared = content()
    await expect(repository.save(prepared, 1)).resolves.toEqual({
      ok: true,
      value: { content: prepared, revision: 2 },
    })
  })
})

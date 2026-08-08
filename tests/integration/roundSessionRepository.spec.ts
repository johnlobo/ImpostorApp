import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PreparedContentSelection } from '../../src/domain/entities/contentCatalog'
import type { PreparedGame } from '../../src/domain/entities/gameConfiguration'
import type {
  ActiveRoundRecovery,
  NextCluePhaseRequest,
} from '../../src/domain/entities/roundSession'
import type { RecoverySnapshot } from '../../src/domain/entities/platform'
import {
  isSecretRoundSnapshot,
  type SecretRoundSnapshot,
} from '../../src/domain/entities/secretRoleAssignment'
import {
  createPersistenceDatabase,
  type PersistenceDatabase,
} from '../../src/infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../src/infrastructure/persistence/dexiePersistenceGateway'
import { createRoundSessionRepository } from '../../src/infrastructure/persistence/roundSessionRepository'

const databases: PersistenceDatabase[] = []
const times = ['2026-08-08T00:00:01.000Z', '2026-08-08T00:00:02.000Z', '2026-08-08T00:00:03.000Z']

function game(): PreparedGame {
  return {
    schemaVersion: 1,
    id: 'game-1',
    roster: {
      players: ['ana', 'bruno', 'carla'].map((id, position) => ({ id, name: id, position })),
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
    createdAt: times[0]!,
  }
}

function secretRound(): SecretRoundSnapshot {
  const preparedGame = game()
  const content: PreparedContentSelection = {
    schemaVersion: 1,
    game: preparedGame,
    selection: { mode: 'all' },
    eligibleCategoryIds: ['ideas'],
    categories: [
      {
        id: 'ideas',
        schemaVersion: 1,
        source: 'custom',
        name: 'Ideas',
        adult: false,
        concepts: [
          { id: 'concept-1', text: 'Secreto' },
          { id: 'concept-2', text: 'Dos' },
          { id: 'concept-3', text: 'Tres' },
        ],
        createdAt: times[0]!,
        updatedAt: times[0]!,
      },
    ],
    adultContentEnabled: false,
    createdAt: times[0]!,
  }
  return {
    schemaVersion: 1,
    content,
    roundNumber: 1,
    assignments: [
      { playerId: 'ana', role: 'impostor' },
      { playerId: 'bruno', role: 'citizen' },
      { playerId: 'carla', role: 'citizen' },
    ],
    concept: { gameId: 'game-1', categoryId: 'ideas', conceptId: 'concept-1', text: 'Secreto' },
    impostorAwareness: 'unknown',
    reveals: ['ana', 'bruno', 'carla'].map((playerId) => ({
      playerId,
      status: 'completed' as const,
    })),
    createdAt: times[0]!,
  }
}

async function setup(writer = true) {
  const database = createPersistenceDatabase({
    name: `round-session-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  })
  databases.push(database)
  await database.initialize()
  const gateway = new DexiePersistenceGateway(database, { hasWriterLease: () => true })
  const snapshot = secretRound()
  expect(isSecretRoundSnapshot(snapshot)).toBe(true)
  const seeded = await gateway.commitRecoverySnapshot(0, {
    id: 'active-game',
    schemaVersion: 1,
    revision: 1,
    savedAt: times[0]!,
    phase: 'round-prepared',
    payload: snapshot,
    integrity: 'confirmed',
  })
  expect(seeded.ok).toBe(true)
  let index = 0
  return {
    database,
    snapshot,
    repository: createRoundSessionRepository(
      database,
      { hasWriterLease: () => writer },
      () => times[Math.min(index++, times.length - 1)]!,
    ),
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.deleteDatabase()))
})

describe('RoundSessionRepository', () => {
  it('prepares phase one atomically and returns only its public projection', async () => {
    const { database, snapshot, repository } = await setup()
    const random = vi.fn(() => 0)
    const result = await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      random,
    )
    expect(result).toMatchObject({
      ok: true,
      value: {
        revision: 2,
        session: { activePhase: { identity: { phaseNumber: 1 }, state: 'ready' } },
      },
    })
    expect(JSON.stringify(result)).not.toContain('Secreto')
    expect(JSON.stringify(result)).not.toContain('assignments')
    await expect(database.table('recoverySnapshots').get('active-game')).resolves.toMatchObject({
      phase: 'clues-active',
      payload: { secretRound: snapshot, resolutionLedger: null },
    })
  })

  it('returns the existing phase without consuming RNG or incrementing revision', async () => {
    const { repository } = await setup()
    const first = await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    const random = vi.fn(() => 0.9)
    await expect(
      repository.prepareInitial(
        { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
        1,
        random,
      ),
    ).resolves.toEqual(first)
    expect(random).not.toHaveBeenCalled()
  })

  it('increments once for real mutations and permits stale idempotent no-ops', async () => {
    const { repository } = await setup()
    await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    const begun = await repository.begin(2)
    expect(begun).toMatchObject({
      ok: true,
      value: { revision: 3, session: { activePhase: { state: 'active' } } },
    })
    await expect(repository.begin(2)).resolves.toEqual(begun)
    await expect(repository.close(2, { confirmed: true })).resolves.toEqual({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
  })

  it('commits a closure before returning one stable handoff', async () => {
    const { repository } = await setup()
    await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    await repository.begin(2)
    const closed = await repository.close(3, { confirmed: true })
    expect(closed).toMatchObject({
      ok: true,
      value: {
        stored: { revision: 4 },
        handoff: {
          gameId: 'game-1',
          roundNumber: 1,
          phaseNumber: 1,
          participantIds: ['ana', 'bruno', 'carla'],
        },
      },
    })
    await expect(repository.close(3, { confirmed: true })).resolves.toEqual(closed)
  })

  it('rejects writes without writer lease and keeps round-prepared recovery', async () => {
    const { repository } = await setup(false)
    await expect(
      repository.prepareInitial(
        { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
        1,
        () => 0,
      ),
    ).resolves.toEqual({ ok: false, error: { code: 'writer-unavailable', retryable: true } })
    await expect(repository.load()).resolves.toEqual({
      ok: true,
      value: { session: null, revision: 1 },
    })
  })

  it('prepares a strict successive phase once and preserves the opaque ledger', async () => {
    const { database, repository } = await setup()
    await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    await repository.begin(2)
    await repository.close(3, { confirmed: true })

    const table = database.table<RecoverySnapshot<ActiveRoundRecovery>>('recoverySnapshots')
    const recovery = await table.get('active-game')
    expect(recovery).toBeDefined()
    await table.put({
      ...recovery!,
      payload: {
        ...recovery!.payload,
        resolutionLedger: {
          schemaVersion: 1,
          gameId: 'game-1',
          roundNumber: 1,
          payload: { opaqueMarker: 'must-stay-internal' },
        },
      },
    })
    const request: NextCluePhaseRequest = {
      gameId: 'game-1',
      roundNumber: 1,
      phaseNumber: 2,
      eligiblePlayerIds: ['carla', 'bruno'],
      issuedAt: times[2]!,
    }
    const random = vi.fn(() => 0)
    const prepared = await repository.prepareNext(request, 4, random)

    expect(prepared).toMatchObject({
      ok: true,
      value: {
        revision: 5,
        session: {
          activePhase: {
            identity: { phaseNumber: 2 },
            participantIds: ['bruno', 'carla'],
            state: 'ready',
          },
          closedPhaseHandoffs: [{ phaseNumber: 1 }],
        },
      },
    })
    expect(JSON.stringify(prepared)).not.toContain('opaqueMarker')
    await expect(
      repository.prepareNext({ ...request, eligiblePlayerIds: ['bruno', 'carla'] }, 4, random),
    ).resolves.toEqual(prepared)
    expect(random).not.toHaveBeenCalled()
    await expect(table.get('active-game')).resolves.toMatchObject({
      payload: { resolutionLedger: { payload: { opaqueMarker: 'must-stay-internal' } } },
    })
  })

  it('rejects a corrupt active recovery without projecting its secret payload', async () => {
    const { database, repository } = await setup()
    await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    const table = database.table<RecoverySnapshot<ActiveRoundRecovery>>('recoverySnapshots')
    const recovery = await table.get('active-game')
    await table.put({
      ...recovery!,
      payload: {
        ...recovery!.payload,
        activePhase: { ...recovery!.payload.activePhase, participantIds: ['intruder'] },
      },
    })

    await expect(repository.load()).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('rolls back the phase mutation when metadata cannot be committed', async () => {
    const { database, repository } = await setup()
    await repository.prepareInitial(
      { gameId: 'game-1', roundNumber: 1, preparedAt: times[0]! },
      1,
      () => 0,
    )
    const metadata = database.table<Record<string, unknown>>('metadata')
    vi.spyOn(metadata, 'put').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))

    await expect(repository.begin(2)).resolves.toEqual({
      ok: false,
      error: { code: 'storage-full', retryable: true },
    })
    await expect(repository.load()).resolves.toMatchObject({
      ok: true,
      value: { revision: 2, session: { activePhase: { state: 'ready' } } },
    })
  })
})

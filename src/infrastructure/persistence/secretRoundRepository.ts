import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  drawNextConcept,
  isPreparedContentSelection,
  type PreparedContentSelection,
} from '../../domain/entities/contentCatalog'
import type { PublicPlatformError, RecoverySnapshot } from '../../domain/entities/platform'
import {
  SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
  assignRoles,
  completeRevealState,
  isImpostorAllocationHistory,
  isSecretRoundSnapshot,
  type ImpostorAllocationHistory,
  type SecretRoundSnapshot,
} from '../../domain/entities/secretRoleAssignment'
import type {
  ImpostorAllocationHistoryRepository,
  SecretRoundRepository,
  StoredSecretRound,
} from '../../domain/ports/secretRoleAssignment'
import type { StorageResult } from '../../domain/ports/platform'
import type { PersistenceDatabase } from './database'

interface WriterLeaseProvider {
  hasWriterLease(): boolean
}

interface CollectionEnvelope<T = unknown> {
  key: string
  value: T
}

interface ConceptHistory {
  scopeId: string
  schemaVersion: typeof CONTENT_CATALOG_SCHEMA_VERSION
  usedConceptIds: readonly string[]
  updatedAt: string
}

type AtomicDatabase = Pick<PersistenceDatabase, 'table' | 'transaction'>

function failure<T>(error: PublicPlatformError): StorageResult<T> {
  return { ok: false, error }
}

function incompatible<T>(): StorageResult<T> {
  return failure({ code: 'incompatible-data', retryable: false })
}

function mapStorageError(error: unknown): PublicPlatformError {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'incompatible-data') {
    return { code: 'incompatible-data', retryable: false }
  }
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return { code: 'storage-full', retryable: true }
    if (error.name === 'InvalidStateError' || error.name === 'NotFoundError') {
      return { code: 'storage-unavailable', retryable: true }
    }
  }
  return { code: 'unknown-storage-error', retryable: true }
}

function isConceptHistory(value: unknown, gameId: string): value is ConceptHistory {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ConceptHistory>
  return (
    record.scopeId === gameId &&
    record.schemaVersion === CONTENT_CATALOG_SCHEMA_VERSION &&
    typeof record.updatedAt === 'string' &&
    record.updatedAt.length > 0 &&
    Array.isArray(record.usedConceptIds) &&
    record.usedConceptIds.every((id) => typeof id === 'string' && id.length > 0) &&
    new Set(record.usedConceptIds).size === record.usedConceptIds.length
  )
}

function readStoredRound(value: unknown): StorageResult<StoredSecretRound> {
  if (!value || typeof value !== 'object') return incompatible()
  const recovery = value as Partial<RecoverySnapshot>
  if (
    recovery.id !== 'active-game' ||
    !Number.isInteger(recovery.revision) ||
    (recovery.revision as number) < 1 ||
    typeof recovery.savedAt !== 'string' ||
    !recovery.savedAt ||
    recovery.integrity !== 'confirmed'
  ) {
    return incompatible()
  }
  if (recovery.phase === 'content-selected' && isPreparedContentSelection(recovery.payload)) {
    return { ok: true, value: { snapshot: null, revision: recovery.revision as number } }
  }
  if (
    recovery.phase === 'round-prepared' &&
    recovery.schemaVersion === SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION &&
    isSecretRoundSnapshot(recovery.payload)
  ) {
    return {
      ok: true,
      value: { snapshot: recovery.payload, revision: recovery.revision as number },
    }
  }
  return incompatible()
}

function nextAllocationHistory(
  gameId: string,
  previous: ImpostorAllocationHistory | null,
  snapshot: SecretRoundSnapshot,
  updatedAt: string,
): ImpostorAllocationHistory {
  const impostorCounts: Record<string, number> = {}
  for (const { id } of snapshot.content.game.roster.players) {
    impostorCounts[id] = previous?.impostorCounts[id] ?? 0
  }
  for (const { playerId, role } of snapshot.assignments) {
    if (role === 'impostor') impostorCounts[playerId] = (impostorCounts[playerId] ?? 0) + 1
  }
  return {
    scopeId: gameId,
    schemaVersion: SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
    impostorCounts,
    roundsPlayed: (previous?.roundsPlayed ?? 0) + 1,
    updatedAt,
  }
}

export function createSecretRoundRepository(
  database: AtomicDatabase,
  writerLease: WriterLeaseProvider,
  nowIso: () => string = () => new Date().toISOString(),
): SecretRoundRepository {
  const tails = new Map<string, Promise<unknown>>()

  function serialized<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const previous = tails.get(gameId) ?? Promise.resolve()
    const current = previous.catch(() => undefined).then(operation)
    tails.set(gameId, current)
    return current.finally(() => {
      if (tails.get(gameId) === current) tails.delete(gameId)
    })
  }

  return {
    async load() {
      try {
        const recovery = await database
          .table<RecoverySnapshot>('recoverySnapshots')
          .get('active-game')
        return recovery ? readStoredRound(recovery) : { ok: true, value: null }
      } catch (error) {
        return failure(mapStorageError(error))
      }
    },

    prepare(content, expectedRevision, random) {
      const gameId = content?.game?.id ?? ''
      return serialized(gameId, async () => {
        if (
          !isPreparedContentSelection(content) ||
          !Number.isInteger(expectedRevision) ||
          expectedRevision < 0 ||
          typeof random !== 'function'
        ) {
          return incompatible()
        }
        if (!writerLease.hasWriterLease()) {
          return failure({ code: 'writer-unavailable', retryable: true })
        }

        try {
          return await database.transaction(
            ['used-concepts', 'role-assignment-history', 'recoverySnapshots', 'metadata'],
            async (): Promise<StorageResult<StoredSecretRound>> => {
              const recoveryTable = database.table<RecoverySnapshot>('recoverySnapshots')
              const current = await recoveryTable.get('active-game')
              if (!current) return incompatible()
              const stored = readStoredRound(current)
              if (!stored.ok) return stored
              if (stored.value.snapshot) {
                return JSON.stringify(stored.value.snapshot.content) === JSON.stringify(content)
                  ? stored
                  : incompatible()
              }
              if (stored.value.revision !== expectedRevision) {
                return failure({ code: 'revision-conflict', retryable: true })
              }
              const storedContent = current.payload as PreparedContentSelection
              if (JSON.stringify(storedContent) !== JSON.stringify(content)) return incompatible()

              const usedTable = database.table<CollectionEnvelope>('used-concepts')
              const usedEnvelope = await usedTable.get(gameId)
              if (
                usedEnvelope &&
                (usedEnvelope.key !== gameId || !isConceptHistory(usedEnvelope.value, gameId))
              ) {
                return incompatible()
              }
              const used = (usedEnvelope?.value as ConceptHistory | undefined)?.usedConceptIds ?? []

              const allocationTable = database.table<CollectionEnvelope>('role-assignment-history')
              const allocationEnvelope = await allocationTable.get(gameId)
              if (
                allocationEnvelope &&
                (allocationEnvelope.key !== gameId ||
                  (allocationEnvelope.value as Partial<ImpostorAllocationHistory>).scopeId !==
                    gameId ||
                  !isImpostorAllocationHistory(
                    allocationEnvelope.value,
                    new Set(content.game.roster.players.map(({ id }) => id)),
                  ))
              ) {
                return incompatible()
              }
              const history =
                (allocationEnvelope?.value as ImpostorAllocationHistory | undefined) ?? null

              const concept = drawNextConcept(content, used, random)
              if (!concept.ok) {
                if (concept.issues.includes('content-exhausted')) {
                  return failure({ code: 'content-exhausted', retryable: false })
                }
                return incompatible()
              }
              const assignments = assignRoles(
                content.game.roster,
                content.game.rules.impostorCount,
                content.game.rules.allocation,
                history,
                random,
              )
              if (!assignments.ok) return incompatible()

              const savedAt = nowIso()
              if (!savedAt) return incompatible()
              const snapshot: SecretRoundSnapshot = {
                schemaVersion: SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
                content,
                roundNumber: (history?.roundsPlayed ?? 0) + 1,
                assignments: assignments.value,
                concept: concept.value,
                impostorAwareness: content.game.rules.impostorAwareness,
                reveals: content.game.roster.players.map(({ id }) => ({
                  playerId: id,
                  status: 'pending',
                })),
                createdAt: savedAt,
              }
              const nextHistory = nextAllocationHistory(gameId, history, snapshot, savedAt)
              const nextRevision = expectedRevision + 1
              const recovery: RecoverySnapshot<SecretRoundSnapshot> = {
                id: 'active-game',
                schemaVersion: SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
                revision: nextRevision,
                savedAt,
                phase: 'round-prepared',
                payload: snapshot,
                integrity: 'confirmed',
              }

              await usedTable.put({
                key: gameId,
                value: {
                  scopeId: gameId,
                  schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
                  usedConceptIds: [...used, concept.value.conceptId],
                  updatedAt: savedAt,
                } satisfies ConceptHistory,
              })
              await allocationTable.put({ key: gameId, value: nextHistory })
              await recoveryTable.put(recovery)
              await database.table('metadata').put({
                id: 'app',
                schemaVersion: SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
                updatedAt: savedAt,
                recoveryRevision: nextRevision,
              })
              return { ok: true, value: { snapshot, revision: nextRevision } }
            },
          )
        } catch (error) {
          return failure(mapStorageError(error))
        }
      })
    },

    completeReveal(playerId, expectedRevision) {
      return serialized('active-game', async () => {
        if (!playerId || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
          return incompatible()
        }
        if (!writerLease.hasWriterLease()) {
          return failure({ code: 'writer-unavailable', retryable: true })
        }
        try {
          return await database.transaction(
            ['recoverySnapshots', 'metadata'],
            async (): Promise<StorageResult<StoredSecretRound>> => {
              const table = database.table<RecoverySnapshot>('recoverySnapshots')
              const current = await table.get('active-game')
              if (!current) return incompatible()
              const stored = readStoredRound(current)
              if (!stored.ok || !stored.value.snapshot) return incompatible()
              const existing = stored.value.snapshot.reveals.find(
                (entry) => entry.playerId === playerId,
              )
              if (!existing) return incompatible()
              if (existing.status === 'completed') return stored
              if (stored.value.revision !== expectedRevision) {
                return failure({ code: 'revision-conflict', retryable: true })
              }
              const completed = completeRevealState(stored.value.snapshot, playerId)
              if (!completed.ok) return incompatible()

              const savedAt = nowIso()
              if (!savedAt) return incompatible()
              const nextRevision = expectedRevision + 1
              const recovery: RecoverySnapshot<SecretRoundSnapshot> = {
                ...current,
                revision: nextRevision,
                savedAt,
                payload: completed.value,
              }
              await table.put(recovery)
              await database.table('metadata').put({
                id: 'app',
                schemaVersion: SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION,
                updatedAt: savedAt,
                recoveryRevision: nextRevision,
              })
              return {
                ok: true,
                value: { snapshot: completed.value, revision: nextRevision },
              }
            },
          )
        } catch (error) {
          return failure(mapStorageError(error))
        }
      })
    },
  }
}

export function createImpostorAllocationHistoryRepository(
  database: Pick<PersistenceDatabase, 'table'>,
): ImpostorAllocationHistoryRepository {
  return {
    async load(gameId) {
      if (!gameId) return incompatible()
      try {
        const envelope = await database
          .table<CollectionEnvelope>('role-assignment-history')
          .get(gameId)
        if (!envelope) return { ok: true, value: null }
        if (
          envelope.key !== gameId ||
          !isImpostorAllocationHistory(envelope.value) ||
          envelope.value.scopeId !== gameId
        ) {
          return incompatible()
        }
        return { ok: true, value: envelope.value }
      } catch (error) {
        return failure(mapStorageError(error))
      }
    },
  }
}

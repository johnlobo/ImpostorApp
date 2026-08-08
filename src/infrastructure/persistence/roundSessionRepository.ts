import type { PublicPlatformError, RecoverySnapshot } from '../../domain/entities/platform'
import {
  advanceClueTurn,
  beginClues,
  closeCluePhase,
  pauseClock,
  prepareInitialPhase,
  prepareSuccessivePhase,
  resumeClock,
  isActiveRoundRecovery,
  isCluePhaseHandoff,
  isCluePhaseSnapshot,
  type ActiveRoundRecovery,
  type CluePhaseHandoff,
  type PreparedRound,
  type PublicRoundSession,
} from '../../domain/entities/roundSession'
import {
  isSecretRoundSnapshot,
  type SecretRoundSnapshot,
} from '../../domain/entities/secretRoleAssignment'
import type {
  RoundSessionRepository,
  StoredPublicRoundSession,
} from '../../domain/ports/roundSession'
import type { StorageResult } from '../../domain/ports/platform'
import type { PersistenceDatabase } from './database'

interface WriterLeaseProvider {
  hasWriterLease(): boolean
}

type AtomicDatabase = Pick<PersistenceDatabase, 'table' | 'transaction'>

function failure<T>(error: PublicPlatformError): StorageResult<T> {
  return { ok: false, error }
}

function incompatible<T>(): StorageResult<T> {
  return failure({ code: 'incompatible-data', retryable: false })
}

function mapStorageError(error: unknown): PublicPlatformError {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String(error.name)
    if (name === 'QuotaExceededError') return { code: 'storage-full', retryable: true }
    if (name === 'InvalidStateError' || name === 'NotFoundError') {
      return { code: 'storage-unavailable', retryable: true }
    }
  }
  return { code: 'unknown-storage-error', retryable: true }
}

function preparedRound(secretRound: SecretRoundSnapshot): PreparedRound {
  const { game } = secretRound.content
  return {
    schemaVersion: 1,
    identity: { gameId: game.id, roundNumber: secretRound.roundNumber },
    totalRounds: game.rules.rounds,
    roster: game.roster,
    conversation: game.rules.conversation,
    turnOrder: game.rules.turnOrder,
    voting: game.rules.voting,
    elimination: game.rules.elimination,
    preparedAt: secretRound.createdAt,
  }
}

function readRecovery(value: unknown): StorageResult<{
  stored: StoredPublicRoundSession
  internal: ActiveRoundRecovery | null
  recovery: RecoverySnapshot
}> {
  if (!value || typeof value !== 'object') return incompatible()
  const recovery = value as Partial<RecoverySnapshot>
  if (
    recovery.id !== 'active-game' ||
    recovery.integrity !== 'confirmed' ||
    !Number.isInteger(recovery.revision) ||
    (recovery.revision as number) < 1 ||
    typeof recovery.savedAt !== 'string' ||
    !recovery.savedAt
  )
    return incompatible()
  if (recovery.phase === 'round-prepared' && isSecretRoundSnapshot(recovery.payload)) {
    return {
      ok: true,
      value: {
        stored: { session: null, revision: recovery.revision as number },
        internal: null,
        recovery: recovery as RecoverySnapshot,
      },
    }
  }
  if (
    recovery.phase !== 'clues-active' ||
    recovery.schemaVersion !== 1 ||
    !recovery.payload ||
    typeof recovery.payload !== 'object'
  )
    return incompatible()
  const internal = recovery.payload as Partial<ActiveRoundRecovery>
  if (
    !isActiveRoundRecovery(internal) ||
    !isSecretRoundSnapshot(internal.secretRound) ||
    !isCluePhaseSnapshot(internal.activePhase) ||
    !internal.closedPhaseHandoffs.every(isCluePhaseHandoff)
  )
    return incompatible()
  const secret = internal.secretRound
  const gameId = secret.content.game.id
  const roundNumber = secret.roundNumber
  if (
    internal.resolutionLedger !== null &&
    (internal.resolutionLedger.gameId !== gameId ||
      internal.resolutionLedger.roundNumber !== roundNumber)
  )
    return incompatible()
  const phase = internal.activePhase
  if (
    phase.identity.gameId !== gameId ||
    phase.identity.roundNumber !== roundNumber ||
    internal.closedPhaseHandoffs.some(
      (h, index) =>
        h.gameId !== gameId || h.roundNumber !== roundNumber || h.phaseNumber !== index + 1,
    )
  )
    return incompatible()
  const rosterIds = secret.content.game.roster.players.map(({ id }) => id)
  const canonical = (ids: readonly string[]) => rosterIds.filter((id) => ids.includes(id))
  const expectedHandoffCount =
    phase.state === 'closed' ? phase.identity.phaseNumber : phase.identity.phaseNumber - 1
  if (
    internal.closedPhaseHandoffs.length !== expectedHandoffCount ||
    JSON.stringify(canonical(phase.participantIds)) !== JSON.stringify(phase.participantIds) ||
    internal.closedPhaseHandoffs.some(
      (handoff, index) =>
        JSON.stringify(canonical(handoff.participantIds)) !==
          JSON.stringify(handoff.participantIds) ||
        (index > 0 &&
          !handoff.participantIds.every((id) =>
            internal.closedPhaseHandoffs[index - 1]!.participantIds.includes(id),
          )),
    ) ||
    (phase.state === 'closed' &&
      (internal.closedPhaseHandoffs.at(-1)?.closedAt !== phase.closure?.closedAt ||
        internal.closedPhaseHandoffs.at(-1)?.reason !== phase.closure?.reason ||
        JSON.stringify(internal.closedPhaseHandoffs.at(-1)?.participantIds) !==
          JSON.stringify(phase.participantIds)))
  )
    return incompatible()
  const session: PublicRoundSession = {
    schemaVersion: 1,
    preparedRound: preparedRound(secret),
    activePhase: phase,
    closedPhaseHandoffs: internal.closedPhaseHandoffs,
  }
  return {
    ok: true,
    value: {
      stored: { session, revision: recovery.revision as number },
      internal,
      recovery: recovery as RecoverySnapshot,
    },
  }
}

export function createRoundSessionRepository(
  database: AtomicDatabase,
  writerLease: WriterLeaseProvider,
  nowIso: () => string = () => new Date().toISOString(),
): RoundSessionRepository {
  let tail: Promise<unknown> = Promise.resolve()
  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const current = tail.catch(() => undefined).then(operation)
    tail = current
    return current
  }

  async function mutate(
    expectedRevision: number,
    transform: (current: ActiveRoundRecovery, now: string) => StorageResult<ActiveRoundRecovery>,
  ): Promise<StorageResult<StoredPublicRoundSession>> {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return incompatible()
    if (!writerLease.hasWriterLease())
      return failure({ code: 'writer-unavailable', retryable: true })
    try {
      return await database.transaction(['recoverySnapshots', 'metadata'], async () => {
        const table = database.table<RecoverySnapshot>('recoverySnapshots')
        const current = await table.get('active-game')
        const read = readRecovery(current)
        if (!read.ok || !read.value.internal) return incompatible()
        const now = nowIso()
        if (!now) return incompatible()
        const transformed = transform(read.value.internal, now)
        if (!transformed.ok) return incompatible()
        if (JSON.stringify(transformed.value) === JSON.stringify(read.value.internal))
          return { ok: true, value: read.value.stored }
        if (read.value.stored.revision !== expectedRevision)
          return failure({ code: 'revision-conflict', retryable: true })
        const revision = expectedRevision + 1
        const recovery: RecoverySnapshot<ActiveRoundRecovery> = {
          id: 'active-game',
          schemaVersion: 1,
          revision,
          savedAt: now,
          phase: 'clues-active',
          payload: transformed.value,
          integrity: 'confirmed',
        }
        await table.put(recovery)
        await database
          .table('metadata')
          .put({ id: 'app', schemaVersion: 1, updatedAt: now, recoveryRevision: revision })
        const projected = readRecovery(recovery)
        return projected.ok ? { ok: true as const, value: projected.value.stored } : projected
      })
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }

  return {
    async load() {
      try {
        const current = await database
          .table<RecoverySnapshot>('recoverySnapshots')
          .get('active-game')
        if (!current) return { ok: true, value: null }
        const read = readRecovery(current)
        return read.ok ? { ok: true, value: read.value.stored } : read
      } catch (error) {
        return failure(mapStorageError(error))
      }
    },
    prepareInitial(handoff, expectedRevision, random) {
      return serialized(async () => {
        if (!writerLease.hasWriterLease())
          return failure({ code: 'writer-unavailable', retryable: true })
        try {
          return await database.transaction(['recoverySnapshots', 'metadata'], async () => {
            const table = database.table<RecoverySnapshot>('recoverySnapshots')
            const current = await table.get('active-game')
            const read = readRecovery(current)
            if (!read.ok) return read
            if (read.value.internal) {
              const { activePhase, secretRound } = read.value.internal
              const identity = activePhase.identity
              return identity.gameId === handoff.gameId &&
                identity.roundNumber === handoff.roundNumber &&
                secretRound.createdAt === handoff.preparedAt
                ? { ok: true as const, value: read.value.stored }
                : incompatible()
            }
            if (
              read.value.stored.revision !== expectedRevision ||
              !isSecretRoundSnapshot(current!.payload)
            )
              return failure({ code: 'revision-conflict', retryable: true })
            const secretRound = current!.payload
            if (
              secretRound.content.game.id !== handoff.gameId ||
              secretRound.roundNumber !== handoff.roundNumber ||
              secretRound.createdAt !== handoff.preparedAt ||
              secretRound.reveals.some(({ status }) => status !== 'completed')
            )
              return incompatible()
            const prepared = preparedRound(secretRound)
            const now = nowIso()
            const phase = prepareInitialPhase(prepared, random, now)
            if (!phase.ok) return incompatible()
            const internal: ActiveRoundRecovery = {
              schemaVersion: 1,
              secretRound,
              resolutionLedger: null,
              activePhase: phase.value,
              closedPhaseHandoffs: [],
            }
            const revision = expectedRevision + 1
            const recovery: RecoverySnapshot<ActiveRoundRecovery> = {
              id: 'active-game',
              schemaVersion: 1,
              revision,
              savedAt: now,
              phase: 'clues-active',
              payload: internal,
              integrity: 'confirmed',
            }
            await table.put(recovery)
            await database
              .table('metadata')
              .put({ id: 'app', schemaVersion: 1, updatedAt: now, recoveryRevision: revision })
            const projected = readRecovery(recovery)
            return projected.ok ? { ok: true as const, value: projected.value.stored } : projected
          })
        } catch (error) {
          return failure(mapStorageError(error))
        }
      })
    },
    prepareNext(request, expectedRevision, random) {
      return serialized(() =>
        mutate(expectedRevision, (current, now) => {
          if (current.activePhase.identity.phaseNumber === request.phaseNumber) {
            const canonicalRequest = current.secretRound.content.game.roster.players
              .map(({ id }) => id)
              .filter((id) => request.eligiblePlayerIds.includes(id))
            return current.activePhase.identity.gameId === request.gameId &&
              current.activePhase.identity.roundNumber === request.roundNumber &&
              JSON.stringify(current.activePhase.participantIds) ===
                JSON.stringify(canonicalRequest)
              ? { ok: true, value: current }
              : incompatible()
          }
          const previous = current.closedPhaseHandoffs.at(-1)
          if (!previous) return incompatible()
          const phase = prepareSuccessivePhase(
            preparedRound(current.secretRound),
            previous,
            request,
            random,
            now,
          )
          return phase.ok
            ? { ok: true, value: { ...current, activePhase: phase.value } }
            : incompatible()
        }),
      )
    },
    begin: (revision) =>
      serialized(() =>
        mutate(revision, (current, now) => {
          const phase = beginClues(current.activePhase, preparedRound(current.secretRound), now)
          return phase.ok
            ? { ok: true, value: { ...current, activePhase: phase.value } }
            : incompatible()
        }),
      ),
    advanceClueTurn: (revision, index) =>
      serialized(() =>
        mutate(revision, (current, now) => {
          const phase = advanceClueTurn(current.activePhase, index, now)
          return phase.ok
            ? { ok: true, value: { ...current, activePhase: phase.value } }
            : incompatible()
        }),
      ),
    pause: (revision) =>
      serialized(() =>
        mutate(revision, (current, now) => {
          const phase = pauseClock(current.activePhase, now)
          return phase.ok
            ? { ok: true, value: { ...current, activePhase: phase.value } }
            : incompatible()
        }),
      ),
    resume: (revision) =>
      serialized(() =>
        mutate(revision, (current, now) => {
          const phase = resumeClock(current.activePhase, now)
          return phase.ok
            ? { ok: true, value: { ...current, activePhase: phase.value } }
            : incompatible()
        }),
      ),
    close(expectedRevision, confirmation) {
      return serialized(async () => {
        let handoff: CluePhaseHandoff | null = null
        const stored = await mutate(expectedRevision, (current, now) => {
          const closed = closeCluePhase(current.activePhase, now, confirmation)
          if (!closed.ok) return incompatible()
          const nextHandoff = closed.value.handoff
          handoff = nextHandoff
          const handoffs = current.closedPhaseHandoffs.some(
            ({ phaseNumber }) => phaseNumber === nextHandoff.phaseNumber,
          )
            ? current.closedPhaseHandoffs
            : [...current.closedPhaseHandoffs, nextHandoff]
          return {
            ok: true,
            value: { ...current, activePhase: closed.value.phase, closedPhaseHandoffs: handoffs },
          }
        })
        return stored.ok && handoff
          ? { ok: true, value: { stored: stored.value, handoff } }
          : (stored as StorageResult<never>)
      })
    },
  }
}

import {
  isPreparedGame,
  type ConversationRule,
  type EliminationRule,
  type PreparedGame,
  type TurnOrder,
  type VotingRule,
} from './gameConfiguration'
import type { PreparedRoster } from './playerGroup'
import {
  isSecretRoundSnapshot,
  type RoundHandoff,
  type SecretRoundSnapshot,
} from './secretRoleAssignment'

export const ROUND_SESSION_SCHEMA_VERSION = 1

export interface PhaseIdentity {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
}
export interface PreparedRound {
  readonly schemaVersion: 1
  readonly identity: Pick<PhaseIdentity, 'gameId' | 'roundNumber'>
  readonly totalRounds: number
  readonly roster: PreparedRoster
  readonly conversation: ConversationRule
  readonly turnOrder: TurnOrder
  readonly voting: VotingRule
  readonly elimination: EliminationRule
  readonly preparedAt: string
}
export type TurnSequence =
  | { readonly mode: 'free' }
  | {
      readonly mode: 'roster' | 'random'
      readonly playerIds: readonly string[]
      readonly startingPlayerId: string
    }
export type ConversationClock =
  | { readonly status: 'ready'; readonly mode: 'untimed' }
  | { readonly status: 'ready'; readonly mode: 'timed'; readonly durationSeconds: number }
  | { readonly status: 'untimed'; readonly startedAt: string }
  | {
      readonly status: 'running'
      readonly durationSeconds: number
      readonly deadlineAt: string
      readonly confirmedAt: string
      readonly maximumRemainingSeconds: number
    }
  | {
      readonly status: 'paused'
      readonly durationSeconds: number
      readonly remainingSeconds: number
      readonly pausedAt: string
    }
  | { readonly status: 'expired'; readonly durationSeconds: number; readonly expiredAt: string }
export interface PhaseClosure {
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}
export interface CluePhaseSnapshot {
  readonly schemaVersion: 1
  readonly identity: PhaseIdentity
  readonly participantIds: readonly string[]
  readonly turnSequence: TurnSequence
  readonly clock: ConversationClock
  readonly stage: 'clues' | 'discussion'
  readonly currentTurnIndex: number | null
  readonly completedCluePlayerIds: readonly string[]
  readonly state: 'ready' | 'active' | 'closed'
  readonly createdAt: string
  readonly updatedAt: string
  readonly closure: PhaseClosure | null
}
export interface CluePhaseHandoff {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}
export interface NextCluePhaseRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly eligiblePlayerIds: readonly string[]
  readonly issuedAt: string
}
export interface PublicRoundSession {
  readonly schemaVersion: 1
  readonly preparedRound: PreparedRound
  readonly activePhase: CluePhaseSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
}
export interface OpaqueResolutionLedgerEnvelope {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roundNumber: number
  readonly payload: unknown
}
export interface ActiveRoundRecovery {
  readonly schemaVersion: 1
  readonly secretRound: SecretRoundSnapshot
  readonly resolutionLedger: OpaqueResolutionLedgerEnvelope | null
  readonly activePhase: CluePhaseSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
}
export type RoundSessionIssue =
  | 'invalid-handoff'
  | 'invalid-participants'
  | 'invalid-phase-number'
  | 'invalid-random'
  | 'invalid-clock'
  | 'invalid-transition'
  | 'confirmation-required'
  | 'incompatible-state'
export type RoundSessionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RoundSessionIssue[] }

const ok = <T>(value: T): RoundSessionResult<T> => ({ ok: true, value })
const fail = <T>(issue: RoundSessionIssue): RoundSessionResult<T> => ({
  ok: false,
  issues: [issue],
})
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const timestamp = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
const positiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0
const ids = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((id) => typeof id === 'string' && id.length > 0) &&
  new Set(value).size === value.length
const copyRoster = (roster: PreparedRoster): PreparedRoster => ({
  players: roster.players.map((player) => ({ ...player })),
})
const copySequence = (sequence: TurnSequence): TurnSequence =>
  sequence.mode === 'free' ? { mode: 'free' } : { ...sequence, playerIds: [...sequence.playerIds] }
const copyClock = (clock: ConversationClock): ConversationClock => ({ ...clock })
const copyPhase = (phase: CluePhaseSnapshot): CluePhaseSnapshot => ({
  ...phase,
  identity: { ...phase.identity },
  participantIds: [...phase.participantIds],
  turnSequence: copySequence(phase.turnSequence),
  clock: copyClock(phase.clock),
  completedCluePlayerIds: [...phase.completedCluePlayerIds],
  closure: phase.closure ? { ...phase.closure } : null,
})

function validRoster(value: unknown): value is PreparedRoster {
  if (!record(value) || !Array.isArray(value.players) || value.players.length === 0) return false
  const seen = new Set<string>()
  return value.players.every(
    (player, index) =>
      record(player) &&
      typeof player.id === 'string' &&
      player.id.length > 0 &&
      typeof player.name === 'string' &&
      player.name.length > 0 &&
      player.position === index &&
      !seen.has(player.id) &&
      !!seen.add(player.id),
  )
}

export function isPreparedRound(value: unknown): value is PreparedRound {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !record(value.identity) ||
    typeof value.identity.gameId !== 'string' ||
    !positiveInteger(value.identity.roundNumber) ||
    !positiveInteger(value.totalRounds) ||
    value.totalRounds > 10 ||
    value.identity.roundNumber > value.totalRounds ||
    !validRoster(value.roster) ||
    !timestamp(value.preparedAt)
  )
    return false
  if (
    !record(value.conversation) ||
    (value.conversation.mode !== 'free' &&
      !(
        value.conversation.mode === 'timer' &&
        positiveInteger(value.conversation.seconds) &&
        value.conversation.seconds >= 30 &&
        value.conversation.seconds <= 600 &&
        value.conversation.seconds % 30 === 0
      ))
  )
    return false
  return (
    ['roster', 'random', 'free'].includes(value.turnOrder as string) &&
    ['verbal', 'secret'].includes(value.voting as string) &&
    ['single', 'successive'].includes(value.elimination as string)
  )
}

export function prepareRound(
  handoff: RoundHandoff,
  game: PreparedGame,
): RoundSessionResult<PreparedRound> {
  if (
    !isPreparedGame(game) ||
    !record(handoff) ||
    handoff.gameId !== game.id ||
    !positiveInteger(handoff.roundNumber) ||
    handoff.roundNumber > game.rules.rounds ||
    !timestamp(handoff.preparedAt)
  )
    return fail('invalid-handoff')
  return ok({
    schemaVersion: 1,
    identity: { gameId: game.id, roundNumber: handoff.roundNumber },
    totalRounds: game.rules.rounds,
    roster: copyRoster(game.roster),
    conversation: { ...game.rules.conversation },
    turnOrder: game.rules.turnOrder,
    voting: game.rules.voting,
    elimination: game.rules.elimination,
    preparedAt: handoff.preparedAt,
  })
}

function validSequence(value: unknown, participants: readonly string[]): value is TurnSequence {
  if (!record(value)) return false
  if (value.mode === 'free') return Object.keys(value).length === 1
  return (
    (value.mode === 'roster' || value.mode === 'random') &&
    ids(value.playerIds) &&
    value.playerIds.length === participants.length &&
    value.playerIds.every((id) => participants.includes(id)) &&
    value.startingPlayerId === value.playerIds[0]
  )
}

function validClock(value: unknown): value is ConversationClock {
  if (!record(value)) return false
  if (value.status === 'ready')
    return (
      value.mode === 'untimed' || (value.mode === 'timed' && positiveInteger(value.durationSeconds))
    )
  if (value.status === 'untimed') return timestamp(value.startedAt)
  if (value.status === 'running')
    return (
      positiveInteger(value.durationSeconds) &&
      timestamp(value.deadlineAt) &&
      timestamp(value.confirmedAt) &&
      Number.isInteger(value.maximumRemainingSeconds) &&
      (value.maximumRemainingSeconds as number) >= 0 &&
      (value.maximumRemainingSeconds as number) <= value.durationSeconds
    )
  if (value.status === 'paused')
    return (
      positiveInteger(value.durationSeconds) &&
      Number.isInteger(value.remainingSeconds) &&
      (value.remainingSeconds as number) > 0 &&
      (value.remainingSeconds as number) <= value.durationSeconds &&
      timestamp(value.pausedAt)
    )
  return (
    value.status === 'expired' &&
    positiveInteger(value.durationSeconds) &&
    timestamp(value.expiredAt)
  )
}

export function isCluePhaseSnapshot(value: unknown): value is CluePhaseSnapshot {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !record(value.identity) ||
    typeof value.identity.gameId !== 'string' ||
    !positiveInteger(value.identity.roundNumber) ||
    !positiveInteger(value.identity.phaseNumber) ||
    !ids(value.participantIds) ||
    !validSequence(value.turnSequence, value.participantIds) ||
    !validClock(value.clock) ||
    !['clues', 'discussion'].includes(value.stage as string) ||
    !['ready', 'active', 'closed'].includes(value.state as string) ||
    !timestamp(value.createdAt) ||
    !timestamp(value.updatedAt) ||
    !Array.isArray(value.completedCluePlayerIds)
  )
    return false
  const participantIds = value.participantIds
  const turnSequence = value.turnSequence
  const completed = value.completedCluePlayerIds as readonly unknown[]
  if (
    new Set(completed).size !== completed.length ||
    !completed.every((id) => typeof id === 'string' && participantIds.includes(id))
  )
    return false
  if (turnSequence.mode === 'free') {
    if (value.stage !== 'discussion' || value.currentTurnIndex !== null || completed.length !== 0)
      return false
  } else if (value.stage === 'clues') {
    if (
      !Number.isInteger(value.currentTurnIndex) ||
      (value.currentTurnIndex as number) < 0 ||
      (value.currentTurnIndex as number) >= turnSequence.playerIds.length ||
      completed.length !== value.currentTurnIndex ||
      !completed.every((id, index) => id === turnSequence.playerIds[index])
    )
      return false
  } else if (value.currentTurnIndex !== null || completed.length !== turnSequence.playerIds.length)
    return false
  if (value.state === 'ready' && value.clock.status !== 'ready') return false
  if (value.state !== 'ready' && value.clock.status === 'ready') return false
  return value.state === 'closed'
    ? record(value.closure) &&
        timestamp(value.closure.closedAt) &&
        (value.closure.reason === 'manual' || value.closure.reason === 'timer-expired')
    : value.closure === null
}

export function isCluePhaseHandoff(value: unknown): value is CluePhaseHandoff {
  return (
    record(value) &&
    typeof value.gameId === 'string' &&
    positiveInteger(value.roundNumber) &&
    positiveInteger(value.phaseNumber) &&
    ids(value.participantIds) &&
    timestamp(value.closedAt) &&
    (value.reason === 'manual' || value.reason === 'timer-expired')
  )
}
export function isNextCluePhaseRequest(value: unknown): value is NextCluePhaseRequest {
  return (
    record(value) &&
    typeof value.gameId === 'string' &&
    positiveInteger(value.roundNumber) &&
    positiveInteger(value.phaseNumber) &&
    ids(value.eligiblePlayerIds) &&
    timestamp(value.issuedAt)
  )
}
export function isOpaqueResolutionLedgerEnvelope(
  value: unknown,
): value is OpaqueResolutionLedgerEnvelope {
  return (
    record(value) &&
    value.schemaVersion === 1 &&
    typeof value.gameId === 'string' &&
    positiveInteger(value.roundNumber) &&
    'payload' in value
  )
}
export function isPublicRoundSession(value: unknown): value is PublicRoundSession {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !isPreparedRound(value.preparedRound) ||
    !isCluePhaseSnapshot(value.activePhase) ||
    !Array.isArray(value.closedPhaseHandoffs)
  )
    return false
  const round = value.preparedRound
  const phase = value.activePhase
  const handoffCandidates: readonly unknown[] = value.closedPhaseHandoffs
  if (!handoffCandidates.every(isCluePhaseHandoff)) return false
  const handoffs: readonly CluePhaseHandoff[] = handoffCandidates
  if (
    phase.identity.gameId !== round.identity.gameId ||
    phase.identity.roundNumber !== round.identity.roundNumber
  )
    return false
  const rosterIds = round.roster.players.map(({ id }) => id)
  const isCanonicalSubset = (participantIds: readonly string[]) => {
    const canonical = rosterIds.filter((id) => participantIds.includes(id))
    return (
      canonical.length === participantIds.length &&
      canonical.every((id, index) => id === participantIds[index])
    )
  }
  if (!isCanonicalSubset(phase.participantIds)) return false
  const expectedCount =
    phase.state === 'closed' ? phase.identity.phaseNumber : phase.identity.phaseNumber - 1
  if (handoffs.length !== expectedCount) return false
  if (
    !handoffs.every(
      (handoff, index) =>
        handoff.gameId === round.identity.gameId &&
        handoff.roundNumber === round.identity.roundNumber &&
        handoff.phaseNumber === index + 1 &&
        isCanonicalSubset(handoff.participantIds) &&
        (index === 0 ||
          (handoff.participantIds.length < handoffs[index - 1]!.participantIds.length &&
            handoff.participantIds.every((id) =>
              handoffs[index - 1]!.participantIds.includes(id),
            ))),
    )
  )
    return false
  if (phase.state !== 'closed') {
    if (phase.identity.phaseNumber === 1) return true
    const previous = handoffs.at(-1)!
    return (
      phase.participantIds.length < previous.participantIds.length &&
      phase.participantIds.every((id) => previous.participantIds.includes(id))
    )
  }
  const last = handoffs.at(-1)!
  return (
    last.closedAt === phase.closure!.closedAt &&
    last.reason === phase.closure!.reason &&
    last.participantIds.length === phase.participantIds.length &&
    last.participantIds.every((id: string, index: number) => id === phase.participantIds[index])
  )
}
export function isActiveRoundRecovery(value: unknown): value is ActiveRoundRecovery {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !isSecretRoundSnapshot(value.secretRound) ||
    !isCluePhaseSnapshot(value.activePhase)
  )
    return false
  const gameId = value.secretRound.content.game.id
  const roundNumber = value.secretRound.roundNumber
  if (
    value.activePhase.identity.gameId !== gameId ||
    value.activePhase.identity.roundNumber !== roundNumber
  )
    return false
  if (
    value.resolutionLedger !== null &&
    (!isOpaqueResolutionLedgerEnvelope(value.resolutionLedger) ||
      value.resolutionLedger.gameId !== gameId ||
      value.resolutionLedger.roundNumber !== roundNumber)
  )
    return false
  if (!Array.isArray(value.closedPhaseHandoffs)) return false
  const publicShape = {
    schemaVersion: 1,
    preparedRound: {
      schemaVersion: 1,
      identity: { gameId, roundNumber },
      totalRounds: value.secretRound.content.game.rules.rounds,
      roster: value.secretRound.content.game.roster,
      conversation: value.secretRound.content.game.rules.conversation,
      turnOrder: value.secretRound.content.game.rules.turnOrder,
      voting: value.secretRound.content.game.rules.voting,
      elimination: value.secretRound.content.game.rules.elimination,
      preparedAt: value.secretRound.createdAt,
    },
    activePhase: value.activePhase,
    closedPhaseHandoffs: value.closedPhaseHandoffs,
  }
  return isPublicRoundSession(publicShape)
}

function sequence(
  mode: TurnOrder,
  participantIds: readonly string[],
  random: () => number,
): RoundSessionResult<TurnSequence> {
  if (mode === 'free') return ok({ mode: 'free' })
  const playerIds = [...participantIds]
  if (mode === 'random')
    for (let index = playerIds.length - 1; index > 0; index -= 1) {
      const sample = random()
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) return fail('invalid-random')
      const target = Math.floor(sample * (index + 1))
      const current = playerIds[index]!
      playerIds[index] = playerIds[target]!
      playerIds[target] = current
    }
  return ok({ mode, playerIds, startingPlayerId: playerIds[0]! })
}

function preparePhase(
  round: PreparedRound,
  participantIds: readonly string[],
  phaseNumber: number,
  random: () => number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (!isPreparedRound(round) || !timestamp(now)) return fail('incompatible-state')
  const ordered = round.roster.players
    .map(({ id }) => id)
    .filter((id) => participantIds.includes(id))
  if (ordered.length !== participantIds.length || !ids(participantIds))
    return fail('invalid-participants')
  const turnSequence = sequence(round.turnOrder, ordered, random)
  if (!turnSequence.ok) return turnSequence
  const free = turnSequence.value.mode === 'free'
  return ok({
    schemaVersion: 1,
    identity: { ...round.identity, phaseNumber },
    participantIds: ordered,
    turnSequence: turnSequence.value,
    clock:
      round.conversation.mode === 'free'
        ? { status: 'ready', mode: 'untimed' }
        : { status: 'ready', mode: 'timed', durationSeconds: round.conversation.seconds },
    stage: free ? 'discussion' : 'clues',
    currentTurnIndex: free ? null : 0,
    completedCluePlayerIds: [],
    state: 'ready',
    createdAt: now,
    updatedAt: now,
    closure: null,
  })
}

export function prepareInitialPhase(
  round: PreparedRound,
  random: () => number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  return preparePhase(
    round,
    round.roster.players.map(({ id }) => id),
    1,
    random,
    now,
  )
}
export function prepareSuccessivePhase(
  round: PreparedRound,
  previous: CluePhaseHandoff,
  request: NextCluePhaseRequest,
  random: () => number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (
    !isCluePhaseHandoff(previous) ||
    previous.gameId !== round.identity.gameId ||
    previous.roundNumber !== round.identity.roundNumber
  )
    return fail('invalid-handoff')
  if (
    !isNextCluePhaseRequest(request) ||
    request.gameId !== previous.gameId ||
    request.roundNumber !== previous.roundNumber ||
    request.phaseNumber !== previous.phaseNumber + 1
  )
    return fail('invalid-phase-number')
  if (
    request.eligiblePlayerIds.length >= previous.participantIds.length ||
    !request.eligiblePlayerIds.every((id) => previous.participantIds.includes(id))
  )
    return fail('invalid-participants')
  return preparePhase(round, request.eligiblePlayerIds, request.phaseNumber, random, now)
}

export function deriveClock(
  clock: ConversationClock,
  now: string,
): RoundSessionResult<{ clock: ConversationClock; remainingSeconds: number | null }> {
  if (!validClock(clock) || !timestamp(now)) return fail('invalid-clock')
  if (clock.status === 'ready' || clock.status === 'untimed')
    return ok({ clock: copyClock(clock), remainingSeconds: null })
  if (clock.status === 'paused')
    return ok({ clock: copyClock(clock), remainingSeconds: clock.remainingSeconds })
  if (clock.status === 'expired') return ok({ clock: copyClock(clock), remainingSeconds: 0 })
  const remaining = Math.max(
    0,
    Math.min(
      clock.durationSeconds,
      clock.maximumRemainingSeconds,
      Math.ceil((Date.parse(clock.deadlineAt) - Date.parse(now)) / 1000),
    ),
  )
  return remaining === 0
    ? ok({
        clock: { status: 'expired', durationSeconds: clock.durationSeconds, expiredAt: now },
        remainingSeconds: 0,
      })
    : ok({ clock: copyClock(clock), remainingSeconds: remaining })
}

export function beginClues(
  phase: CluePhaseSnapshot,
  round: PreparedRound,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (
    !isCluePhaseSnapshot(phase) ||
    !isPreparedRound(round) ||
    phase.identity.gameId !== round.identity.gameId ||
    phase.identity.roundNumber !== round.identity.roundNumber
  )
    return fail('incompatible-state')
  if (phase.state === 'active') return ok(copyPhase(phase))
  if (phase.state !== 'ready' || !timestamp(now)) return fail('invalid-transition')
  let clock: ConversationClock
  if (phase.clock.status !== 'ready') return fail('invalid-clock')
  if (phase.clock.mode === 'untimed') clock = { status: 'untimed', startedAt: now }
  else {
    const deadline = new Date(Date.parse(now) + phase.clock.durationSeconds * 1000).toISOString()
    clock = {
      status: 'running',
      durationSeconds: phase.clock.durationSeconds,
      deadlineAt: deadline,
      confirmedAt: now,
      maximumRemainingSeconds: phase.clock.durationSeconds,
    }
  }
  return ok({ ...copyPhase(phase), clock, state: 'active', updatedAt: now })
}

export function advanceClueTurn(
  phase: CluePhaseSnapshot,
  expectedTurnIndex: number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (
    !isCluePhaseSnapshot(phase) ||
    phase.state !== 'active' ||
    phase.turnSequence.mode === 'free' ||
    !Number.isInteger(expectedTurnIndex) ||
    !timestamp(now)
  )
    return fail('invalid-transition')
  if (phase.stage === 'discussion')
    return expectedTurnIndex < phase.completedCluePlayerIds.length
      ? ok(copyPhase(phase))
      : fail('invalid-transition')
  const current = phase.currentTurnIndex as number
  if (
    expectedTurnIndex < current &&
    phase.completedCluePlayerIds[expectedTurnIndex] ===
      phase.turnSequence.playerIds[expectedTurnIndex]
  )
    return ok(copyPhase(phase))
  if (expectedTurnIndex !== current) return fail('invalid-transition')
  const completed = [...phase.completedCluePlayerIds, phase.turnSequence.playerIds[current]!]
  const last = completed.length === phase.turnSequence.playerIds.length
  return ok({
    ...copyPhase(phase),
    stage: last ? 'discussion' : 'clues',
    currentTurnIndex: last ? null : current + 1,
    completedCluePlayerIds: completed,
    updatedAt: now,
  })
}

export function pauseClock(
  phase: CluePhaseSnapshot,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (!isCluePhaseSnapshot(phase) || phase.state !== 'active') return fail('invalid-transition')
  if (phase.clock.status === 'paused') return ok(copyPhase(phase))
  const derived = deriveClock(phase.clock, now)
  if (!derived.ok) return derived
  if (derived.value.clock.status !== 'running' || derived.value.remainingSeconds === null)
    return fail(
      derived.value.clock.status === 'expired' ? 'incompatible-state' : 'invalid-transition',
    )
  return ok({
    ...copyPhase(phase),
    clock: {
      status: 'paused',
      durationSeconds: derived.value.clock.durationSeconds,
      remainingSeconds: derived.value.remainingSeconds,
      pausedAt: now,
    },
    updatedAt: now,
  })
}

export function resumeClock(
  phase: CluePhaseSnapshot,
  now: string,
): RoundSessionResult<CluePhaseSnapshot> {
  if (!isCluePhaseSnapshot(phase) || phase.state !== 'active') return fail('invalid-transition')
  if (phase.clock.status === 'running') return ok(copyPhase(phase))
  if (phase.clock.status !== 'paused' || !timestamp(now))
    return fail(phase.clock.status === 'expired' ? 'incompatible-state' : 'invalid-transition')
  return ok({
    ...copyPhase(phase),
    clock: {
      status: 'running',
      durationSeconds: phase.clock.durationSeconds,
      deadlineAt: new Date(Date.parse(now) + phase.clock.remainingSeconds * 1000).toISOString(),
      confirmedAt: now,
      maximumRemainingSeconds: phase.clock.remainingSeconds,
    },
    updatedAt: now,
  })
}

export function closeCluePhase(
  phase: CluePhaseSnapshot,
  now: string,
  confirmation: { readonly confirmed: true },
): RoundSessionResult<{ readonly phase: CluePhaseSnapshot; readonly handoff: CluePhaseHandoff }> {
  if (!isCluePhaseSnapshot(phase) || !record(confirmation) || confirmation.confirmed !== true)
    return fail('confirmation-required')
  if (phase.state === 'closed') {
    const handoff: CluePhaseHandoff = {
      ...phase.identity,
      participantIds: [...phase.participantIds],
      closedAt: phase.closure!.closedAt,
      reason: phase.closure!.reason,
    }
    return ok({ phase: copyPhase(phase), handoff })
  }
  if (phase.state !== 'active' || !timestamp(now)) return fail('invalid-transition')
  const derived = deriveClock(phase.clock, now)
  if (!derived.ok) return derived
  const reason = derived.value.clock.status === 'expired' ? 'timer-expired' : 'manual'
  const handoff: CluePhaseHandoff = {
    ...phase.identity,
    participantIds: [...phase.participantIds],
    closedAt: now,
    reason,
  }
  return ok({
    phase: {
      ...copyPhase(phase),
      clock: derived.value.clock,
      state: 'closed',
      updatedAt: now,
      closure: { closedAt: now, reason },
    },
    handoff,
  })
}

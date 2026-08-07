import {
  isPreparedContentSelection,
  type DrawnConcept,
  type PreparedContentSelection,
} from './contentCatalog'
import type { AllocationRule, ImpostorAwareness } from './gameConfiguration'
import {
  MAX_PLAYERS,
  MAX_PLAYER_NAME_LENGTH,
  MIN_PLAYERS,
  nameComparisonKey,
  normalizeName,
  type PreparedRoster,
} from './playerGroup'

export const SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION = 1

export type Role = 'citizen' | 'impostor'

export interface RoleAssignment {
  readonly playerId: string
  readonly role: Role
}

export interface ImpostorAllocationHistory {
  readonly scopeId: string
  readonly schemaVersion: typeof SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION
  readonly impostorCounts: Readonly<Record<string, number>>
  readonly roundsPlayed: number
  readonly updatedAt: string
}

export interface RevealStateEntry {
  readonly playerId: string
  readonly status: 'pending' | 'completed'
}

export interface SecretRoundSnapshot {
  readonly schemaVersion: typeof SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION
  readonly content: PreparedContentSelection
  readonly roundNumber: number
  readonly assignments: readonly RoleAssignment[]
  readonly concept: DrawnConcept
  readonly impostorAwareness: ImpostorAwareness
  readonly reveals: readonly RevealStateEntry[]
  readonly createdAt: string
}

export interface PublicRoundProgress {
  readonly total: number
  readonly completed: number
  readonly players: readonly {
    readonly id: string
    readonly name: string
    readonly position: number
    readonly status: 'pending' | 'completed'
  }[]
}

export type PrivateRoleView =
  | { readonly kind: 'citizen'; readonly category: string; readonly concept: string }
  | { readonly kind: 'impostor'; readonly category: string; readonly companions: readonly string[] }

export interface RoundHandoff {
  readonly gameId: string
  readonly roundNumber: number
  readonly preparedAt: string
}

export type RoleAssignmentIssue =
  | 'invalid-content'
  | 'invalid-history'
  | 'invalid-random'
  | 'invalid-player'
  | 'already-completed'
  | 'round-not-ready'
  | 'invalid-confirmation'

export type RoleAssignmentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RoleAssignmentIssue[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidRoster(roster: PreparedRoster): boolean {
  if (
    !isRecord(roster) ||
    !Array.isArray(roster.players) ||
    roster.players.length < MIN_PLAYERS ||
    roster.players.length > MAX_PLAYERS
  ) {
    return false
  }
  const ids = new Set<string>()
  const names = new Set<string>()
  return roster.players.every((player, position) => {
    if (!isRecord(player)) return false
    const normalizedName = typeof player.name === 'string' ? normalizeName(player.name) : ''
    const comparisonName = nameComparisonKey(normalizedName)
    if (
      typeof player.id !== 'string' ||
      !player.id ||
      ids.has(player.id) ||
      typeof player.name !== 'string' ||
      player.name !== normalizedName ||
      Array.from(normalizedName).length > MAX_PLAYER_NAME_LENGTH ||
      names.has(comparisonName) ||
      player.position !== position
    ) {
      return false
    }
    ids.add(player.id)
    names.add(comparisonName)
    return true
  })
}

export function isImpostorAllocationHistory(
  history: unknown,
  playerIds?: ReadonlySet<string>,
): history is ImpostorAllocationHistory {
  if (!isRecord(history)) return false
  const roundsPlayed = history.roundsPlayed
  if (
    history.schemaVersion !== SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION ||
    typeof history.scopeId !== 'string' ||
    !history.scopeId ||
    typeof roundsPlayed !== 'number' ||
    !Number.isInteger(roundsPlayed) ||
    roundsPlayed < 0 ||
    typeof history.updatedAt !== 'string' ||
    !history.updatedAt ||
    !isRecord(history.impostorCounts)
  ) {
    return false
  }
  return Object.entries(history.impostorCounts).every(
    ([playerId, count]) =>
      (!playerIds || playerIds.has(playerId)) && Number.isInteger(count) && (count as number) >= 0,
  )
}

function randomIndex(length: number, random: () => number): RoleAssignmentResult<number> {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    return { ok: false, issues: ['invalid-random'] }
  }
  return { ok: true, value: Math.floor(value * length) }
}

export function assignRoles(
  roster: PreparedRoster,
  impostorCount: number,
  allocation: AllocationRule,
  history: ImpostorAllocationHistory | null,
  random: () => number,
): RoleAssignmentResult<readonly RoleAssignment[]> {
  if (
    !isValidRoster(roster) ||
    !Number.isInteger(impostorCount) ||
    impostorCount < 1 ||
    impostorCount >= roster.players.length ||
    !['random', 'balanced'].includes(allocation) ||
    typeof random !== 'function'
  ) {
    return { ok: false, issues: ['invalid-content'] }
  }
  const playerIds = new Set(roster.players.map(({ id }) => id))
  if (history && !isImpostorAllocationHistory(history, playerIds)) {
    return { ok: false, issues: ['invalid-history'] }
  }

  const selected = new Set<string>()
  if (allocation === 'random') {
    const candidates = roster.players.map(({ id }) => id)
    for (let index = 0; index < impostorCount; index += 1) {
      const chosen = randomIndex(candidates.length, random)
      if (!chosen.ok) return chosen
      selected.add(candidates.splice(chosen.value, 1)[0]!)
    }
  } else {
    const counts = new Map(
      roster.players.map(({ id }) => [id, history?.impostorCounts[id] ?? 0] as const),
    )
    for (let index = 0; index < impostorCount; index += 1) {
      const remaining = roster.players.filter(({ id }) => !selected.has(id))
      const minimum = Math.min(...remaining.map(({ id }) => counts.get(id)!))
      const candidates = remaining.filter(({ id }) => counts.get(id) === minimum)
      const chosen =
        candidates.length === 1
          ? { ok: true as const, value: 0 }
          : randomIndex(candidates.length, random)
      if (!chosen.ok) return chosen
      const playerId = candidates[chosen.value]!.id
      selected.add(playerId)
      counts.set(playerId, counts.get(playerId)! + 1)
    }
  }

  return {
    ok: true,
    value: roster.players.map(({ id }) => ({
      playerId: id,
      role: selected.has(id) ? 'impostor' : 'citizen',
    })),
  }
}

export function isSecretRoundSnapshot(snapshot: unknown): snapshot is SecretRoundSnapshot {
  if (!isRecord(snapshot)) return false
  const roundNumber = snapshot.roundNumber
  if (
    snapshot.schemaVersion !== SECRET_ROLE_ASSIGNMENT_SCHEMA_VERSION ||
    !isPreparedContentSelection(snapshot.content) ||
    typeof roundNumber !== 'number' ||
    !Number.isInteger(roundNumber) ||
    roundNumber < 1 ||
    !Array.isArray(snapshot.assignments) ||
    !Array.isArray(snapshot.reveals) ||
    typeof snapshot.impostorAwareness !== 'string' ||
    !['unknown', 'known'].includes(snapshot.impostorAwareness) ||
    snapshot.impostorAwareness !== snapshot.content.game.rules.impostorAwareness ||
    typeof snapshot.createdAt !== 'string' ||
    !snapshot.createdAt ||
    !isRecord(snapshot.concept)
  ) {
    return false
  }
  const assignments = snapshot.assignments
  const reveals = snapshot.reveals
  const conceptValue = snapshot.concept
  const { game, categories } = snapshot.content
  const players = game.roster.players
  const playerIds = new Set(players.map(({ id }) => id))
  if (assignments.length !== players.length || reveals.length !== players.length) {
    return false
  }
  if (
    assignments.some(
      (assignment, index) =>
        !isRecord(assignment) ||
        assignment.playerId !== players[index]!.id ||
        typeof assignment.role !== 'string' ||
        !['citizen', 'impostor'].includes(assignment.role),
    ) ||
    new Set(assignments.map((assignment) => (isRecord(assignment) ? assignment.playerId : null)))
      .size !== playerIds.size ||
    assignments.filter((assignment) => isRecord(assignment) && assignment.role === 'impostor')
      .length !== game.rules.impostorCount ||
    reveals.some(
      (reveal, index) =>
        !isRecord(reveal) ||
        reveal.playerId !== players[index]!.id ||
        typeof reveal.status !== 'string' ||
        !['pending', 'completed'].includes(reveal.status),
    )
  ) {
    return false
  }
  const category = categories.find(({ id }) => id === conceptValue.categoryId)
  const concept = category?.concepts.find(({ id }) => id === conceptValue.conceptId)
  return (
    conceptValue.gameId === game.id &&
    typeof conceptValue.text === 'string' &&
    conceptValue.text.length > 0 &&
    concept?.text === conceptValue.text
  )
}

function copyContent(content: PreparedContentSelection): PreparedContentSelection {
  return {
    ...content,
    game: {
      ...content.game,
      roster: { players: content.game.roster.players.map((player) => ({ ...player })) },
      rules: {
        ...content.game.rules,
        conversation:
          content.game.rules.conversation.mode === 'timer'
            ? { ...content.game.rules.conversation }
            : { mode: 'free' },
      },
    },
    selection:
      content.selection.mode === 'selected'
        ? { mode: 'selected', categoryIds: [...content.selection.categoryIds] }
        : { mode: content.selection.mode },
    eligibleCategoryIds: [...content.eligibleCategoryIds],
    categories: content.categories.map((category) => ({
      ...category,
      concepts: category.concepts.map((concept) => ({ ...concept })),
    })),
  }
}

function copySnapshot(snapshot: SecretRoundSnapshot): SecretRoundSnapshot {
  return {
    ...snapshot,
    content: copyContent(snapshot.content),
    assignments: snapshot.assignments.map((assignment) => ({ ...assignment })),
    concept: { ...snapshot.concept },
    reveals: snapshot.reveals.map((reveal) => ({ ...reveal })),
  }
}

export function derivePublicProgress(snapshot: SecretRoundSnapshot): PublicRoundProgress {
  const revealByPlayer = new Map(snapshot.reveals.map((entry) => [entry.playerId, entry.status]))
  const players = snapshot.content.game.roster.players.map((player) => ({
    id: player.id,
    name: player.name,
    position: player.position,
    status: revealByPlayer.get(player.id) ?? ('pending' as const),
  }))
  return {
    total: players.length,
    completed: players.filter(({ status }) => status === 'completed').length,
    players,
  }
}

export function completeRevealState(
  snapshot: SecretRoundSnapshot,
  playerId: string,
): RoleAssignmentResult<SecretRoundSnapshot> {
  if (!isSecretRoundSnapshot(snapshot)) return { ok: false, issues: ['invalid-content'] }
  const reveal = snapshot.reveals.find((entry) => entry.playerId === playerId)
  if (!reveal) return { ok: false, issues: ['invalid-player'] }
  if (reveal.status === 'completed') return { ok: false, issues: ['already-completed'] }
  const copy = copySnapshot(snapshot)
  return {
    ok: true,
    value: {
      ...copy,
      reveals: copy.reveals.map((entry) =>
        entry.playerId === playerId ? { ...entry, status: 'completed' } : entry,
      ),
    },
  }
}

export function resolvePrivateRoleView(
  snapshot: SecretRoundSnapshot,
  playerId: string,
): RoleAssignmentResult<PrivateRoleView> {
  if (!isSecretRoundSnapshot(snapshot)) return { ok: false, issues: ['invalid-content'] }
  const reveal = snapshot.reveals.find((entry) => entry.playerId === playerId)
  const assignment = snapshot.assignments.find((entry) => entry.playerId === playerId)
  if (!reveal || !assignment) return { ok: false, issues: ['invalid-player'] }
  if (reveal.status !== 'completed') return { ok: false, issues: ['round-not-ready'] }
  const category = snapshot.content.categories.find(({ id }) => id === snapshot.concept.categoryId)!
  if (assignment.role === 'citizen') {
    return {
      ok: true,
      value: { kind: 'citizen', category: category.name, concept: snapshot.concept.text },
    }
  }
  const companions =
    snapshot.impostorAwareness === 'known' &&
    snapshot.assignments.filter(({ role }) => role === 'impostor').length > 1
      ? snapshot.assignments
          .filter((entry) => entry.role === 'impostor' && entry.playerId !== playerId)
          .map(
            (entry) =>
              snapshot.content.game.roster.players.find(({ id }) => id === entry.playerId)!.name,
          )
      : []
  return { ok: true, value: { kind: 'impostor', category: category.name, companions } }
}

export function confirmHandoff(snapshot: SecretRoundSnapshot): RoundHandoff | null {
  if (
    !isSecretRoundSnapshot(snapshot) ||
    snapshot.reveals.some(({ status }) => status !== 'completed')
  ) {
    return null
  }
  return {
    gameId: snapshot.content.game.id,
    roundNumber: snapshot.roundNumber,
    preparedAt: snapshot.createdAt,
  }
}

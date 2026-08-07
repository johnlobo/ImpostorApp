export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 20
export const MAX_PLAYER_NAME_LENGTH = 30
export const MAX_GROUP_NAME_LENGTH = 40
export const PLAYER_GROUP_SCHEMA_VERSION = 1

export interface Player {
  id: string
  name: string
  position: number
}

export interface PlayerDraft {
  players: readonly Player[]
  dirty: boolean
  sourceGroupId: string | null
}

export interface SavedPlayerGroup {
  id: string
  schemaVersion: typeof PLAYER_GROUP_SCHEMA_VERSION
  name: string
  players: readonly { name: string; position: number }[]
  createdAt: string
  updatedAt: string
}

export interface PreparedRoster {
  players: readonly Player[]
}

export type PlayerGroupIssue =
  | 'empty-name'
  | 'name-too-long'
  | 'duplicate-name'
  | 'minimum-players'
  | 'maximum-players'
  | 'player-not-found'
  | 'duplicate-group-name'
  | 'group-name-too-long'
  | 'invalid-group'

export type DomainResult<T> =
  { ok: true; value: T } | { ok: false; issues: readonly PlayerGroupIssue[] }

export type DraftCommand =
  | { type: 'add'; name: string }
  | { type: 'rename'; playerId: string; name: string }
  | { type: 'remove'; playerId: string }
  | { type: 'move'; playerId: string; direction: 'up' | 'down' }

export type IdFactory = () => string

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ')
}

export function nameComparisonKey(value: string): string {
  return normalizeName(value).toLocaleLowerCase('es')
}

function visibleLength(value: string): number {
  return Array.from(value).length
}

function validateName(
  value: string,
  existingNames: readonly string[],
  maximumLength: number,
): readonly PlayerGroupIssue[] {
  const normalized = normalizeName(value)
  if (!normalized) return ['empty-name']
  if (visibleLength(normalized) > maximumLength) return ['name-too-long']
  const key = nameComparisonKey(normalized)
  if (existingNames.some((name) => nameComparisonKey(name) === key)) {
    return ['duplicate-name']
  }
  return []
}

function withPositions(players: readonly Omit<Player, 'position'>[]): readonly Player[] {
  return players.map((player, position) => ({ ...player, position }))
}

export function createEmptyDraft(): PlayerDraft {
  return { players: [], dirty: false, sourceGroupId: null }
}

export function validateDraft(draft: PlayerDraft): readonly PlayerGroupIssue[] {
  if (draft.players.length < MIN_PLAYERS) return ['minimum-players']
  if (draft.players.length > MAX_PLAYERS) return ['maximum-players']
  return []
}

export function prepareRoster(draft: PlayerDraft): DomainResult<PreparedRoster> {
  const issues = validateDraft(draft)
  return issues.length
    ? { ok: false, issues }
    : { ok: true, value: { players: draft.players.map((player) => ({ ...player })) } }
}

export function applyDraftCommand(
  draft: PlayerDraft,
  command: DraftCommand,
  createId: IdFactory,
): DomainResult<PlayerDraft> {
  if (command.type === 'add') {
    if (draft.players.length >= MAX_PLAYERS) return { ok: false, issues: ['maximum-players'] }
    const issues = validateName(
      command.name,
      draft.players.map(({ name }) => name),
      MAX_PLAYER_NAME_LENGTH,
    )
    if (issues.length) return { ok: false, issues }
    const players = withPositions([
      ...draft.players.map(({ id, name }) => ({ id, name })),
      { id: createId(), name: normalizeName(command.name) },
    ])
    return { ok: true, value: { players, dirty: true, sourceGroupId: draft.sourceGroupId } }
  }

  const index = draft.players.findIndex(({ id }) => id === command.playerId)
  if (index < 0) return { ok: false, issues: ['player-not-found'] }

  if (command.type === 'rename') {
    const issues = validateName(
      command.name,
      draft.players.filter(({ id }) => id !== command.playerId).map(({ name }) => name),
      MAX_PLAYER_NAME_LENGTH,
    )
    if (issues.length) return { ok: false, issues }
    const players = draft.players.map((player) =>
      player.id === command.playerId ? { ...player, name: normalizeName(command.name) } : player,
    )
    return { ok: true, value: { players, dirty: true, sourceGroupId: draft.sourceGroupId } }
  }

  if (command.type === 'remove') {
    const players = withPositions(
      draft.players
        .filter(({ id }) => id !== command.playerId)
        .map(({ id, name }) => ({ id, name })),
    )
    return { ok: true, value: { players, dirty: true, sourceGroupId: draft.sourceGroupId } }
  }

  const target = command.direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= draft.players.length) return { ok: true, value: draft }
  const reordered = [...draft.players]
  ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]
  const players = withPositions(reordered.map(({ id, name }) => ({ id, name })))
  return { ok: true, value: { players, dirty: true, sourceGroupId: draft.sourceGroupId } }
}

export function createGroup(input: {
  id: string
  name: string
  draft: PlayerDraft
  now: string
  existingGroups?: readonly SavedPlayerGroup[]
}): DomainResult<SavedPlayerGroup> {
  const normalized = normalizeName(input.name)
  if (!normalized) return { ok: false, issues: ['empty-name'] }
  if (visibleLength(normalized) > MAX_GROUP_NAME_LENGTH) {
    return { ok: false, issues: ['group-name-too-long'] }
  }
  if (
    input.existingGroups?.some(
      (group) =>
        group.id !== input.id && nameComparisonKey(group.name) === nameComparisonKey(normalized),
    )
  ) {
    return { ok: false, issues: ['duplicate-group-name'] }
  }
  const draftIssues = validateDraft(input.draft)
  if (draftIssues.length) return { ok: false, issues: draftIssues }
  const previous = input.existingGroups?.find(({ id }) => id === input.id)
  return {
    ok: true,
    value: {
      id: input.id,
      schemaVersion: PLAYER_GROUP_SCHEMA_VERSION,
      name: normalized,
      players: input.draft.players.map(({ name, position }) => ({ name, position })),
      createdAt: previous?.createdAt ?? input.now,
      updatedAt: input.now,
    },
  }
}

export function loadGroup(group: SavedPlayerGroup, createId: IdFactory): PlayerDraft {
  return {
    players: group.players.map(({ name }, position) => ({ id: createId(), name, position })),
    dirty: false,
    sourceGroupId: group.id,
  }
}

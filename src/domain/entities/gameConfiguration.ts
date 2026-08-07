import type { PreparedRoster } from './playerGroup'

export const GAME_CONFIGURATION_SCHEMA_VERSION = 1
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 10
export const DEFAULT_ROUNDS = 3
export const MIN_TIMER_SECONDS = 30
export const MAX_TIMER_SECONDS = 600
export const TIMER_STEP_SECONDS = 30
export const TIMER_PRESETS = [60, 90, 120] as const

export type ConversationRule =
  { readonly mode: 'free' } | { readonly mode: 'timer'; readonly seconds: number }
export type TurnOrder = 'roster' | 'random' | 'free'
export type VotingRule = 'verbal' | 'secret'
export type AllocationRule = 'random' | 'balanced'
export type ImpostorAwareness = 'unknown' | 'known'
export type EliminationRule = 'single' | 'successive'

export interface GameConfigurationDraft {
  readonly roster: PreparedRoster
  readonly rounds: number
  readonly impostorCount: number
  readonly conversation: ConversationRule
  readonly turnOrder: TurnOrder
  readonly voting: VotingRule
  readonly finalAttempt: boolean
  readonly allocation: AllocationRule
  readonly impostorAwareness: ImpostorAwareness
  readonly elimination: EliminationRule
}

export type PreparedGameRules = Omit<GameConfigurationDraft, 'roster'>

export interface PreparedGame {
  readonly schemaVersion: typeof GAME_CONFIGURATION_SCHEMA_VERSION
  readonly id: string
  readonly roster: PreparedRoster
  readonly rules: PreparedGameRules
  readonly createdAt: string
}

export type ConfigurationCommand =
  | { readonly type: 'set-rounds'; readonly value: number }
  | { readonly type: 'set-impostors'; readonly value: number }
  | { readonly type: 'set-conversation'; readonly value: ConversationRule }
  | { readonly type: 'set-turn-order'; readonly value: TurnOrder }
  | { readonly type: 'set-voting'; readonly value: VotingRule }
  | { readonly type: 'set-final-attempt'; readonly value: boolean }
  | { readonly type: 'set-allocation'; readonly value: AllocationRule }
  | { readonly type: 'set-awareness'; readonly value: ImpostorAwareness }
  | { readonly type: 'set-elimination'; readonly value: EliminationRule }

export type ConfigurationIssue =
  | 'invalid-roster'
  | 'rounds-out-of-range'
  | 'impostors-out-of-range'
  | 'timer-out-of-range'
  | 'invalid-rule'
  | 'multi-impostor-required'
  | 'invalid-confirmation'

export type ConfigurationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ConfigurationIssue[] }

export type IdFactory = () => string
export type Clock = () => string

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function copyRoster(roster: PreparedRoster): PreparedRoster {
  return { players: roster.players.map((player) => ({ ...player })) }
}

function isValidRoster(value: unknown): value is PreparedRoster {
  if (!isRecord(value) || !Array.isArray(value.players)) return false
  if (value.players.length < 3 || value.players.length > 20) return false
  const ids = new Set<string>()
  const names = new Set<string>()
  return value.players.every((candidate, index) => {
    if (!isRecord(candidate)) return false
    const { id, name, position } = candidate
    if (typeof id !== 'string' || !id || typeof name !== 'string' || position !== index)
      return false
    const normalizedName = name.trim().replace(/\s+/gu, ' ')
    const comparisonName = normalizedName.toLocaleLowerCase('es')
    if (!normalizedName || normalizedName !== name || ids.has(id) || names.has(comparisonName)) {
      return false
    }
    ids.add(id)
    names.add(comparisonName)
    return true
  })
}

export function maximumImpostors(playerCount: number): number {
  return Math.min(3, Math.floor(playerCount / 3))
}

function isConversationRule(value: unknown): value is ConversationRule {
  if (!isRecord(value)) return false
  if (value.mode === 'free') return true
  return (
    value.mode === 'timer' &&
    typeof value.seconds === 'number' &&
    Number.isInteger(value.seconds) &&
    value.seconds >= MIN_TIMER_SECONDS &&
    value.seconds <= MAX_TIMER_SECONDS &&
    value.seconds % TIMER_STEP_SECONDS === 0
  )
}

function isRuleSet(value: unknown, playerCount: number): value is PreparedGameRules {
  if (!isRecord(value)) return false
  const maximum = maximumImpostors(playerCount)
  if (
    !Number.isInteger(value.rounds) ||
    (value.rounds as number) < MIN_ROUNDS ||
    (value.rounds as number) > MAX_ROUNDS ||
    !Number.isInteger(value.impostorCount) ||
    (value.impostorCount as number) < 1 ||
    (value.impostorCount as number) > maximum ||
    !isConversationRule(value.conversation) ||
    !['roster', 'random', 'free'].includes(value.turnOrder as string) ||
    !['verbal', 'secret'].includes(value.voting as string) ||
    typeof value.finalAttempt !== 'boolean' ||
    !['random', 'balanced'].includes(value.allocation as string) ||
    !['unknown', 'known'].includes(value.impostorAwareness as string) ||
    !['single', 'successive'].includes(value.elimination as string)
  )
    return false
  return (
    value.impostorCount !== 1 ||
    (value.allocation === 'random' &&
      value.impostorAwareness === 'unknown' &&
      value.elimination === 'single')
  )
}

export function validateConfiguration(
  draft: GameConfigurationDraft,
): readonly ConfigurationIssue[] {
  const issues: ConfigurationIssue[] = []
  if (!isValidRoster(draft.roster)) issues.push('invalid-roster')
  if (!Number.isInteger(draft.rounds) || draft.rounds < MIN_ROUNDS || draft.rounds > MAX_ROUNDS) {
    issues.push('rounds-out-of-range')
  }
  if (
    !Number.isInteger(draft.impostorCount) ||
    draft.impostorCount < 1 ||
    draft.impostorCount > maximumImpostors(draft.roster.players.length)
  ) {
    issues.push('impostors-out-of-range')
  }
  if (!isConversationRule(draft.conversation)) issues.push('timer-out-of-range')
  if (!['roster', 'random', 'free'].includes(draft.turnOrder)) issues.push('invalid-rule')
  if (!['verbal', 'secret'].includes(draft.voting)) issues.push('invalid-rule')
  if (typeof draft.finalAttempt !== 'boolean') issues.push('invalid-rule')
  if (!['random', 'balanced'].includes(draft.allocation)) issues.push('invalid-rule')
  if (!['unknown', 'known'].includes(draft.impostorAwareness)) issues.push('invalid-rule')
  if (!['single', 'successive'].includes(draft.elimination)) issues.push('invalid-rule')
  if (
    draft.impostorCount === 1 &&
    (draft.allocation !== 'random' ||
      draft.impostorAwareness !== 'unknown' ||
      draft.elimination !== 'single')
  ) {
    issues.push('multi-impostor-required')
  }
  return [...new Set(issues)]
}

export function createConfigurationDraft(
  roster: PreparedRoster,
): ConfigurationResult<GameConfigurationDraft> {
  if (!isValidRoster(roster)) return { ok: false, issues: ['invalid-roster'] }
  return {
    ok: true,
    value: {
      roster: copyRoster(roster),
      rounds: DEFAULT_ROUNDS,
      impostorCount: 1,
      conversation: { mode: 'free' },
      turnOrder: 'roster',
      voting: 'verbal',
      finalAttempt: false,
      allocation: 'random',
      impostorAwareness: 'unknown',
      elimination: 'single',
    },
  }
}

function updateDraft(
  draft: GameConfigurationDraft,
  update: Partial<Omit<GameConfigurationDraft, 'roster'>>,
): ConfigurationResult<GameConfigurationDraft> {
  const candidate = { ...draft, ...update }
  const issues = validateConfiguration(candidate)
  return issues.length ? { ok: false, issues } : { ok: true, value: candidate }
}

export function applyConfigurationCommand(
  draft: GameConfigurationDraft,
  command: ConfigurationCommand,
): ConfigurationResult<GameConfigurationDraft> {
  switch (command.type) {
    case 'set-rounds':
      return updateDraft(draft, { rounds: command.value })
    case 'set-impostors':
      return updateDraft(
        draft,
        command.value === 1
          ? {
              impostorCount: 1,
              allocation: 'random',
              impostorAwareness: 'unknown',
              elimination: 'single',
            }
          : { impostorCount: command.value },
      )
    case 'set-conversation':
      return updateDraft(draft, {
        conversation: command.value.mode === 'timer' ? { ...command.value } : { mode: 'free' },
      })
    case 'set-turn-order':
      return updateDraft(draft, { turnOrder: command.value })
    case 'set-voting':
      return updateDraft(draft, { voting: command.value })
    case 'set-final-attempt':
      return updateDraft(draft, { finalAttempt: command.value })
    case 'set-allocation':
      return draft.impostorCount === 1
        ? { ok: false, issues: ['multi-impostor-required'] }
        : updateDraft(draft, { allocation: command.value })
    case 'set-awareness':
      return draft.impostorCount === 1
        ? { ok: false, issues: ['multi-impostor-required'] }
        : updateDraft(draft, { impostorAwareness: command.value })
    case 'set-elimination':
      return draft.impostorCount === 1
        ? { ok: false, issues: ['multi-impostor-required'] }
        : updateDraft(draft, { elimination: command.value })
  }
}

export function confirmConfiguration(
  draft: GameConfigurationDraft,
  createId: IdFactory,
  clock: Clock,
): ConfigurationResult<PreparedGame> {
  const issues = validateConfiguration(draft)
  if (issues.length) return { ok: false, issues }
  const id = createId()
  const createdAt = clock()
  if (!id || !createdAt) return { ok: false, issues: ['invalid-confirmation'] }
  const { roster, ...rules } = draft
  void roster
  return {
    ok: true,
    value: {
      schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
      id,
      roster: copyRoster(draft.roster),
      rules: {
        ...rules,
        conversation:
          rules.conversation.mode === 'timer' ? { ...rules.conversation } : { mode: 'free' },
      },
      createdAt,
    },
  }
}

export function isPreparedGame(value: unknown): value is PreparedGame {
  if (
    !isRecord(value) ||
    value.schemaVersion !== GAME_CONFIGURATION_SCHEMA_VERSION ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.createdAt !== 'string' ||
    !value.createdAt
  )
    return false
  return isValidRoster(value.roster) && isRuleSet(value.rules, value.roster.players.length)
}

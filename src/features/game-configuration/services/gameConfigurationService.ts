import {
  applyConfigurationCommand,
  confirmConfiguration,
  createConfigurationDraft,
  validateConfiguration,
  type ConfigurationCommand,
  type ConfigurationIssue,
  type GameConfigurationDraft,
  type PreparedGame,
} from '../../../domain/entities/gameConfiguration'
import type { PreparedRoster } from '../../../domain/entities/playerGroup'
import type { PreparedGameRepository } from '../../../domain/ports/gameConfiguration'
import type { PublicPlatformError } from '../../../domain/entities/platform'

export interface GameConfigurationState {
  status: 'loading' | 'ready' | 'reviewing' | 'confirming' | 'confirmed' | 'error'
  draft: GameConfigurationDraft
  issues: readonly ConfigurationIssue[]
  storageError: PublicPlatformError | null
  confirmed: PreparedGame | null
  revision: number
}

export interface GameConfigurationService {
  getState(): GameConfigurationState
  subscribe(listener: (state: GameConfigurationState) => void): () => void
  initialize(): Promise<void>
  apply(command: ConfigurationCommand): void
  review(): void
  edit(): void
  confirm(): Promise<void>
  retry(): Promise<void>
}

interface Dependencies {
  roster: PreparedRoster
  repository: PreparedGameRepository
  createId: () => string
  nowIso: () => string
}

export function createGameConfigurationService({
  roster,
  repository,
  createId,
  nowIso,
}: Dependencies): GameConfigurationService {
  const created = createConfigurationDraft(roster)
  if (!created.ok) throw new Error('A valid prepared roster is required')

  let state: GameConfigurationState = {
    status: 'loading',
    draft: created.value,
    issues: [],
    storageError: null,
    confirmed: null,
    revision: 0,
  }
  let pendingGame: PreparedGame | null = null
  let retryOperation: (() => Promise<void>) | null = null
  const listeners = new Set<(state: GameConfigurationState) => void>()

  function setState(patch: Partial<GameConfigurationState>): void {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  async function initialize(): Promise<void> {
    const result = await repository.load()
    if (!result.ok) {
      retryOperation = initialize
      setState({ status: 'error', storageError: result.error })
      return
    }
    retryOperation = null
    setState({
      status: 'ready',
      revision: result.value?.revision ?? 0,
      storageError: null,
    })
  }

  async function persistConfirmation(): Promise<void> {
    if (!pendingGame || state.status === 'confirming') return
    const game = pendingGame
    setState({ status: 'confirming', issues: [], storageError: null })
    const result = await repository.save(game, state.revision)
    if (!result.ok) {
      retryOperation = persistConfirmation
      setState({ status: 'error', storageError: result.error })
      return
    }
    pendingGame = null
    retryOperation = null
    setState({
      status: 'confirmed',
      confirmed: result.value.game,
      revision: result.value.revision,
      storageError: null,
    })
  }

  const service: GameConfigurationService = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize,
    apply(command) {
      const result = applyConfigurationCommand(state.draft, command)
      if (!result.ok) {
        setState({ issues: result.issues, storageError: null })
        return
      }
      pendingGame = null
      setState({ status: 'ready', draft: result.value, issues: [], storageError: null })
    },
    review() {
      const issues = validateConfiguration(state.draft)
      setState({ status: issues.length ? 'ready' : 'reviewing', issues, storageError: null })
    },
    edit() {
      if (state.status !== 'confirmed')
        setState({ status: 'ready', issues: [], storageError: null })
    },
    async confirm() {
      if (state.status !== 'reviewing' && state.status !== 'error') return
      if (!pendingGame) {
        const result = confirmConfiguration(state.draft, createId, nowIso)
        if (!result.ok) {
          setState({ status: 'ready', issues: result.issues })
          return
        }
        pendingGame = result.value
      }
      await persistConfirmation()
    },
    async retry() {
      await (retryOperation ?? initialize)()
    },
  }
  return service
}

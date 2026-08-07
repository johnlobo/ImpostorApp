import type { PreparedContentSelection } from '../../../domain/entities/contentCatalog'
import type { PublicPlatformError } from '../../../domain/entities/platform'
import {
  confirmHandoff,
  derivePublicProgress,
  resolvePrivateRoleView,
  type PrivateRoleView,
  type PublicRoundProgress,
  type RoundHandoff,
  type SecretRoundSnapshot,
} from '../../../domain/entities/secretRoleAssignment'
import type { SecretRoundRepository } from '../../../domain/ports/secretRoleAssignment'
import type { StorageResult } from '../../../domain/ports/platform'

export type SecretRoleAssignmentStatus =
  | 'loading'
  | 'preparing'
  | 'shared'
  | 'private-covered'
  | 'revealing'
  | 'private-revealed'
  | 'ready'
  | 'error'

export interface SecretRoleAssignmentState {
  readonly status: SecretRoleAssignmentStatus
  readonly progress: PublicRoundProgress | null
  readonly revision: number
  readonly selectedPlayerId: string | null
  readonly privateCategory: string | null
  readonly privateRole: PrivateRoleView | null
  readonly storageError: PublicPlatformError | null
  readonly readOnly: boolean
}

export interface SecretRoleAssignmentService {
  getState(): SecretRoleAssignmentState
  subscribe(listener: (state: SecretRoleAssignmentState) => void): () => void
  initialize(): Promise<void>
  selectPlayer(playerId: string): void
  reveal(): Promise<void>
  conceal(): void
  startRound(): RoundHandoff | null
  resetHistory(): Promise<void>
  retry(): Promise<void>
}

interface Dependencies {
  readonly content: PreparedContentSelection
  readonly repository: SecretRoundRepository
  readonly random: () => number
  readonly resetHistory?: () => Promise<StorageResult<void>>
  readonly readOnly?: boolean
}

const writerError: PublicPlatformError = { code: 'writer-unavailable', retryable: true }

export function createSecretRoleAssignmentService({
  content,
  repository,
  random,
  resetHistory,
  readOnly = false,
}: Dependencies): SecretRoleAssignmentService {
  let state: SecretRoleAssignmentState = {
    status: 'loading',
    progress: null,
    revision: 0,
    selectedPlayerId: null,
    privateCategory: null,
    privateRole: null,
    storageError: null,
    readOnly,
  }
  let currentSnapshot: SecretRoundSnapshot | null = null
  let retryOperation: (() => Promise<void>) | null = null
  const listeners = new Set<(state: SecretRoleAssignmentState) => void>()

  function setState(patch: Partial<SecretRoleAssignmentState>): void {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  function publishShared(snapshot: SecretRoundSnapshot, revision: number): void {
    currentSnapshot = snapshot
    const progress = derivePublicProgress(snapshot)
    setState({
      status: progress.completed === progress.total ? 'ready' : 'shared',
      progress,
      revision,
      selectedPlayerId: null,
      privateCategory: null,
      privateRole: null,
      storageError: null,
    })
  }

  async function prepare(expectedRevision: number): Promise<void> {
    if (readOnly) {
      setState({ status: 'error', storageError: writerError, revision: expectedRevision })
      return
    }
    setState({ status: 'preparing', storageError: null })
    const result = await repository.prepare(content, expectedRevision, random)
    if (!result.ok) {
      retryOperation =
        result.error.code === 'revision-conflict' ? initialize : () => prepare(expectedRevision)
      setState({ status: 'error', storageError: result.error, revision: expectedRevision })
      return
    }
    if (!result.value.snapshot) {
      retryOperation = () => prepare(result.value.revision)
      setState({ status: 'error', storageError: { code: 'incompatible-data', retryable: false } })
      return
    }
    retryOperation = null
    publishShared(result.value.snapshot, result.value.revision)
  }

  async function initialize(): Promise<void> {
    currentSnapshot = null
    setState({
      status: 'loading',
      storageError: null,
      privateCategory: null,
      privateRole: null,
    })
    const result = await repository.load()
    if (!result.ok) {
      retryOperation = initialize
      setState({ status: 'error', storageError: result.error })
      return
    }
    const stored = result.value
    if (stored?.snapshot?.content.game.id === content.game.id) {
      retryOperation = null
      publishShared(stored.snapshot, stored.revision)
      return
    }
    await prepare(stored?.revision ?? 0)
  }

  async function persistReveal(playerId: string, expectedRevision: number): Promise<void> {
    setState({ status: 'revealing', privateRole: null, storageError: null })
    const result = await repository.completeReveal(playerId, expectedRevision)
    if (!result.ok) {
      retryOperation =
        result.error.code === 'revision-conflict'
          ? initialize
          : () => persistReveal(playerId, expectedRevision)
      setState({
        status: 'error',
        storageError: result.error,
        privateCategory: null,
        privateRole: null,
      })
      return
    }
    if (!result.value.snapshot) {
      retryOperation = initialize
      setState({
        status: 'error',
        storageError: { code: 'incompatible-data', retryable: false },
        privateCategory: null,
        privateRole: null,
      })
      return
    }
    const projected = resolvePrivateRoleView(result.value.snapshot, playerId)
    if (!projected.ok) {
      currentSnapshot = result.value.snapshot
      retryOperation = initialize
      setState({
        status: 'error',
        revision: result.value.revision,
        storageError: { code: 'incompatible-data', retryable: false },
        privateCategory: null,
        privateRole: null,
      })
      return
    }
    currentSnapshot = result.value.snapshot
    retryOperation = null
    setState({
      status: 'private-revealed',
      progress: derivePublicProgress(result.value.snapshot),
      revision: result.value.revision,
      privateRole: projected.value,
      storageError: null,
    })
  }

  const service: SecretRoleAssignmentService = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize,
    selectPlayer(playerId) {
      if (readOnly || !state.progress || !['shared', 'ready'].includes(state.status)) return
      const player = state.progress.players.find(({ id }) => id === playerId)
      if (!player || player.status === 'completed') return
      setState({
        status: 'private-covered',
        selectedPlayerId: playerId,
        privateCategory:
          currentSnapshot?.content.categories.find(
            ({ id }) => id === currentSnapshot?.concept.categoryId,
          )?.name ?? null,
        privateRole: null,
        storageError: null,
      })
    },
    async reveal() {
      if (
        readOnly ||
        state.status !== 'private-covered' ||
        !state.selectedPlayerId ||
        !currentSnapshot
      )
        return
      const playerId = state.selectedPlayerId
      await persistReveal(playerId, state.revision)
    },
    conceal() {
      if (!currentSnapshot) return
      publishShared(currentSnapshot, state.revision)
    },
    startRound() {
      if (readOnly || !currentSnapshot || state.status !== 'ready') return null
      return confirmHandoff(currentSnapshot)
    },
    async resetHistory() {
      if (readOnly || !resetHistory || state.storageError?.code !== 'content-exhausted') return
      setState({ status: 'preparing', storageError: null })
      const result = await resetHistory()
      if (!result.ok) {
        retryOperation = () => service.resetHistory()
        setState({ status: 'error', storageError: result.error })
        return
      }
      await prepare(state.revision)
    },
    async retry() {
      const operation = retryOperation ?? initialize
      retryOperation = null
      await operation()
    },
  }

  return service
}

import {
  applyDraftCommand,
  createEmptyDraft,
  createGroup,
  loadGroup,
  prepareRoster,
  type DraftCommand,
  type IdFactory,
  type PlayerDraft,
  type PlayerGroupIssue,
  type PreparedRoster,
  type SavedPlayerGroup,
} from '../../../domain/entities/playerGroup'
import type { PlayerGroupsRepository } from '../../../domain/ports/playerGroups'
import type { PublicPlatformError } from '../../../domain/entities/platform'

export interface PlayerGroupsState {
  status: 'loading' | 'ready' | 'saving' | 'error'
  draft: PlayerDraft
  groups: readonly SavedPlayerGroup[]
  issues: readonly PlayerGroupIssue[]
  storageError: PublicPlatformError | null
  prepared: PreparedRoster | null
}

export interface PlayerGroupsService {
  getState(): PlayerGroupsState
  subscribe(listener: (state: PlayerGroupsState) => void): () => void
  initialize(): Promise<void>
  apply(command: DraftCommand): void
  saveGroup(name: string): Promise<void>
  loadGroup(groupId: string): void
  deleteGroup(groupId: string): Promise<void>
  prepare(): void
  clearFeedback(): void
}

interface Dependencies {
  repository: PlayerGroupsRepository
  createId: IdFactory
  nowIso: () => string
}

export function createPlayerGroupsService({
  repository,
  createId,
  nowIso,
}: Dependencies): PlayerGroupsService {
  let state: PlayerGroupsState = {
    status: 'loading',
    draft: createEmptyDraft(),
    groups: [],
    issues: [],
    storageError: null,
    prepared: null,
  }
  const listeners = new Set<(state: PlayerGroupsState) => void>()

  function setState(next: PlayerGroupsState): void {
    state = next
    listeners.forEach((listener) => listener(state))
  }

  function ready(patch: Partial<PlayerGroupsState>): void {
    setState({
      ...state,
      status: 'ready',
      issues: [],
      storageError: null,
      prepared: null,
      ...patch,
    })
  }

  async function initialize(): Promise<void> {
    setState({ ...state, status: 'loading', storageError: null })
    const result = await repository.list()
    if (!result.ok) {
      setState({ ...state, status: 'error', storageError: result.error })
      return
    }
    ready({ groups: result.value })
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize,
    apply(command) {
      const result = applyDraftCommand(state.draft, command, createId)
      if (!result.ok) {
        setState({ ...state, issues: result.issues, prepared: null })
        return
      }
      ready({ draft: result.value })
    },
    async saveGroup(name) {
      if (state.status === 'saving') return
      const id = state.draft.sourceGroupId ?? createId()
      const built = createGroup({
        id,
        name,
        draft: state.draft,
        now: nowIso(),
        existingGroups: state.groups,
      })
      if (!built.ok) {
        setState({ ...state, issues: built.issues, prepared: null })
        return
      }
      setState({ ...state, status: 'saving', issues: [], storageError: null })
      const result = await repository.save(built.value)
      if (!result.ok) {
        setState({ ...state, status: 'error', storageError: result.error })
        return
      }
      const groups = [
        ...state.groups.filter(({ id: groupId }) => groupId !== id),
        result.value,
      ].sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }))
      ready({
        groups,
        draft: { ...state.draft, dirty: false, sourceGroupId: id },
      })
    },
    loadGroup(groupId) {
      const group = state.groups.find(({ id }) => id === groupId)
      if (!group) {
        setState({ ...state, issues: ['invalid-group'] })
        return
      }
      ready({ draft: loadGroup(group, createId) })
    },
    async deleteGroup(groupId) {
      if (state.status === 'saving') return
      setState({ ...state, status: 'saving', issues: [], storageError: null })
      const result = await repository.delete(groupId)
      if (!result.ok) {
        setState({ ...state, status: 'error', storageError: result.error })
        return
      }
      ready({ groups: state.groups.filter(({ id }) => id !== groupId) })
    },
    prepare() {
      const result = prepareRoster(state.draft)
      if (!result.ok) {
        setState({ ...state, issues: result.issues, prepared: null })
        return
      }
      ready({ prepared: result.value })
    },
    clearFeedback() {
      ready({})
    },
  }
}

import type { PreparedGame } from '../../../domain/entities/gameConfiguration'
import type { PublicPlatformError } from '../../../domain/entities/platform'
import {
  applyContentSelectionCommand,
  confirmContentSelection,
  createContentSelectionDraft,
  normalizeCatalogText,
  resolveEligibleCategories,
  validateCustomCategory,
  type CatalogIssue,
  type CategorySelection,
  type ContentCategory,
  type ContentSelectionDraft,
  type DrawnConcept,
  type PreparedContentSelection,
} from '../../../domain/entities/contentCatalog'
import type {
  ConceptDrawRepository,
  ContentPreferencesRepository,
  CustomCategoriesRepository,
  PreparedContentSelectionRepository,
} from '../../../domain/ports/contentCatalog'

export interface CustomCategoryInput {
  readonly id?: string
  readonly name: string
  readonly adult: boolean
  readonly concepts: readonly { readonly id?: string; readonly text: string }[]
}

export interface ContentCatalogState {
  status: 'loading' | 'ready' | 'reviewing' | 'saving' | 'drawing' | 'confirmed' | 'error'
  draft: ContentSelectionDraft
  categories: readonly ContentCategory[]
  customCategories: readonly ContentCategory[]
  issues: readonly CatalogIssue[]
  storageError: PublicPlatformError | null
  prepared: PreparedContentSelection | null
  drawn: DrawnConcept | null
  revision: number
  adultConfirmationPending: boolean
  readOnly: boolean
}

export interface ContentCatalogService {
  getState(): ContentCatalogState
  subscribe(listener: (state: ContentCatalogState) => void): () => void
  initialize(): Promise<void>
  setSelection(selection: CategorySelection): void
  requestAdultContent(enabled: boolean): Promise<void>
  confirmAdultContent(): Promise<void>
  cancelAdultContent(): void
  review(): void
  edit(): void
  confirm(): Promise<void>
  saveCustomCategory(input: CustomCategoryInput): Promise<void>
  deleteCustomCategory(categoryId: string): Promise<void>
  draw(): Promise<DrawnConcept | null>
  resetHistory(confirmation: { confirmed: true }): Promise<void>
  retry(): Promise<void>
  clearFeedback(): void
}

interface Dependencies {
  game: PreparedGame
  builtInCategories: readonly ContentCategory[]
  customCategoriesRepository: CustomCategoriesRepository
  preferencesRepository: ContentPreferencesRepository
  selectionRepository: PreparedContentSelectionRepository
  drawRepository: ConceptDrawRepository
  createId: () => string
  nowIso: () => string
  random: () => number
  readOnly?: boolean
}

const writerError: PublicPlatformError = { code: 'writer-unavailable', retryable: true }

export function createContentCatalogService(dependencies: Dependencies): ContentCatalogService {
  const created = createContentSelectionDraft(dependencies.game)
  if (!created.ok) throw new Error('A valid prepared game is required')
  let state: ContentCatalogState = {
    status: 'loading',
    draft: created.value,
    categories: dependencies.builtInCategories,
    customCategories: [],
    issues: [],
    storageError: null,
    prepared: null,
    drawn: null,
    revision: 0,
    adultConfirmationPending: false,
    readOnly: dependencies.readOnly ?? false,
  }
  let retryOperation: (() => Promise<unknown>) | null = null
  let pendingSelection: PreparedContentSelection | null = null
  let operationQueue: Promise<unknown> = Promise.resolve()
  const listeners = new Set<(state: ContentCatalogState) => void>()

  function setState(patch: Partial<ContentCatalogState>): void {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }
  function rejectObserver(): boolean {
    if (!state.readOnly) return false
    setState({ status: 'error', storageError: writerError })
    return true
  }
  function catalog(custom = state.customCategories): readonly ContentCategory[] {
    return [...dependencies.builtInCategories, ...custom]
  }
  function queue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation, operation)
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  async function initialize(): Promise<void> {
    const [custom, adult, stored] = await Promise.all([
      dependencies.customCategoriesRepository.list(),
      dependencies.preferencesRepository.loadAdultEnabled(),
      dependencies.selectionRepository.load(),
    ])
    const failure = !custom.ok ? custom : !adult.ok ? adult : !stored.ok ? stored : null
    if (failure && !failure.ok) {
      retryOperation = initialize
      setState({ status: 'error', storageError: failure.error })
      return
    }
    if (!custom.ok || !adult.ok || !stored.ok) return
    const allCategories = catalog(custom.value)
    const nextDraft = applyContentSelectionCommand(state.draft, {
      type: 'set-adult-content',
      enabled: adult.value,
    })
    const recovered =
      stored.value?.content?.game.id === dependencies.game.id ? stored.value.content : null
    retryOperation = null
    setState({
      status: recovered ? 'confirmed' : 'ready',
      draft: nextDraft.ok ? nextDraft.value : state.draft,
      categories: allCategories,
      customCategories: custom.value,
      prepared: recovered,
      revision: stored.value?.revision ?? 0,
      issues: [],
      storageError: null,
    })
  }

  async function persistAdult(enabled: boolean): Promise<void> {
    if (rejectObserver()) return
    setState({ status: 'saving', storageError: null })
    const result = await dependencies.preferencesRepository.saveAdultEnabled(enabled)
    if (!result.ok) {
      retryOperation = () => persistAdult(enabled)
      setState({ status: 'error', storageError: result.error })
      return
    }
    const changed = applyContentSelectionCommand(state.draft, {
      type: 'set-adult-content',
      enabled,
    })
    retryOperation = null
    if (changed.ok)
      setState({
        status: 'ready',
        draft: changed.value,
        adultConfirmationPending: false,
        issues: [],
        storageError: null,
        prepared: null,
      })
  }

  async function persistSelection(): Promise<void> {
    if (!pendingSelection || rejectObserver() || state.status === 'saving') return
    const content = pendingSelection
    setState({ status: 'saving', issues: [], storageError: null })
    const result = await dependencies.selectionRepository.save(content, state.revision)
    if (!result.ok) {
      retryOperation = persistSelection
      setState({ status: 'error', storageError: result.error })
      return
    }
    pendingSelection = null
    retryOperation = null
    setState({
      status: 'confirmed',
      prepared: result.value.content,
      revision: result.value.revision,
      storageError: null,
    })
  }

  const service: ContentCatalogService = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize,
    setSelection(selection) {
      const result = applyContentSelectionCommand(state.draft, { type: 'set-selection', selection })
      if (!result.ok) return setState({ issues: result.issues })
      pendingSelection = null
      setState({
        status: 'ready',
        draft: result.value,
        prepared: null,
        issues: [],
        storageError: null,
      })
    },
    async requestAdultContent(enabled) {
      if (enabled && !state.draft.adultContentEnabled) {
        setState({ adultConfirmationPending: true })
        return
      }
      await persistAdult(enabled)
    },
    async confirmAdultContent() {
      await persistAdult(true)
    },
    cancelAdultContent() {
      setState({ adultConfirmationPending: false })
    },
    review() {
      const eligible = resolveEligibleCategories(
        state.categories,
        state.draft.selection,
        state.draft.adultContentEnabled,
      )
      if (!eligible.ok) return setState({ status: 'ready', issues: eligible.issues })
      const count = eligible.value.reduce((total, item) => total + item.concepts.length, 0)
      setState({
        status: count < state.draft.game.rules.rounds ? 'ready' : 'reviewing',
        issues: count < state.draft.game.rules.rounds ? ['insufficient-concepts'] : [],
      })
    },
    edit() {
      if (state.status !== 'confirmed') setState({ status: 'ready', issues: [] })
    },
    async confirm() {
      if (state.status !== 'reviewing' && state.status !== 'error') return
      if (!pendingSelection) {
        const result = confirmContentSelection(
          state.draft.game,
          state.draft.selection,
          state.categories,
          state.draft.adultContentEnabled,
          dependencies.nowIso,
        )
        if (!result.ok) return setState({ status: 'ready', issues: result.issues })
        pendingSelection = result.value
      }
      await persistSelection()
    },
    async saveCustomCategory(input) {
      if (rejectObserver() || state.status === 'saving') return
      const previous = input.id
        ? state.customCategories.find(({ id }) => id === input.id)
        : undefined
      const now = dependencies.nowIso()
      const candidate: ContentCategory = {
        id: input.id ?? dependencies.createId(),
        schemaVersion: 1,
        source: 'custom',
        name: normalizeCatalogText(input.name),
        adult: input.adult,
        concepts: input.concepts.map((concept) => ({
          id: concept.id ?? dependencies.createId(),
          text: normalizeCatalogText(concept.text),
        })),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }
      const issues = validateCustomCategory(candidate, state.categories)
      if (issues.length) return setState({ issues })
      setState({ status: 'saving', issues: [], storageError: null })
      const result = await dependencies.customCategoriesRepository.save(candidate)
      if (!result.ok) {
        retryOperation = () => service.saveCustomCategory(input)
        setState({ status: 'error', storageError: result.error })
        return
      }
      const customCategories = [
        ...state.customCategories.filter(({ id }) => id !== candidate.id),
        result.value,
      ].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      retryOperation = null
      setState({
        status: 'ready',
        customCategories,
        categories: catalog(customCategories),
        issues: [],
        storageError: null,
      })
    },
    async deleteCustomCategory(categoryId) {
      if (rejectObserver() || state.status === 'saving') return
      if (!state.customCategories.some(({ id }) => id === categoryId))
        return setState({ issues: ['invalid-category'] })
      setState({ status: 'saving', issues: [], storageError: null })
      const result = await dependencies.customCategoriesRepository.delete(categoryId)
      if (!result.ok) {
        retryOperation = () => service.deleteCustomCategory(categoryId)
        setState({ status: 'error', storageError: result.error })
        return
      }
      const customCategories = state.customCategories.filter(({ id }) => id !== categoryId)
      retryOperation = null
      setState({
        status: 'ready',
        customCategories,
        categories: catalog(customCategories),
        storageError: null,
      })
    },
    draw() {
      return queue(async () => {
        if (rejectObserver() || !state.prepared) return null
        setState({ status: 'drawing', issues: [], storageError: null, drawn: null })
        const result = await dependencies.drawRepository.drawAndMarkUsed(
          {
            gameId: state.prepared.game.id,
            selection: state.prepared.selection,
            eligibleCategoryIds: state.prepared.eligibleCategoryIds,
          },
          state.prepared.categories,
          dependencies.random,
        )
        if (!result.ok) {
          retryOperation = () => service.draw()
          setState({ status: 'error', storageError: result.error })
          return null
        }
        if (result.value === 'content-exhausted') {
          setState({ status: 'confirmed', issues: ['content-exhausted'] })
          return null
        }
        retryOperation = null
        setState({ status: 'confirmed', drawn: result.value, storageError: null })
        return result.value
      })
    },
    resetHistory(confirmation) {
      return queue(async () => {
        if (rejectObserver() || !state.prepared) return
        setState({ status: 'saving', issues: [], storageError: null })
        const result = await dependencies.drawRepository.reset(state.prepared.game.id, confirmation)
        if (!result.ok) {
          retryOperation = () => service.resetHistory(confirmation)
          setState({ status: 'error', storageError: result.error })
          return
        }
        retryOperation = null
        setState({ status: 'confirmed', drawn: null, issues: [], storageError: null })
      })
    },
    async retry() {
      await (retryOperation ?? initialize)()
    },
    clearFeedback() {
      setState({ issues: [], storageError: null, drawn: null })
    },
  }
  return service
}

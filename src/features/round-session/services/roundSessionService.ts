import type { PublicPlatformError } from '../../../domain/entities/platform'
import type {
  CluePhaseHandoff,
  NextCluePhaseRequest,
  PublicRoundSession,
} from '../../../domain/entities/roundSession'
import type {
  RoundSessionRepository,
  StoredPublicRoundSession,
} from '../../../domain/ports/roundSession'
import type { RoundHandoff } from '../../../domain/entities/secretRoleAssignment'

export type RoundSessionStatus =
  | 'loading'
  | 'preparing'
  | 'ready'
  | 'clues'
  | 'discussion'
  | 'paused'
  | 'expired'
  | 'confirmation'
  | 'closing'
  | 'closed'
  | 'error'
  | 'observer'
  | 'safe-mode'

export interface RoundSessionState {
  readonly status: RoundSessionStatus
  readonly session: PublicRoundSession | null
  readonly revision: number
  readonly remainingSeconds: number | null
  readonly error: PublicPlatformError | null
  readonly readOnly: boolean
}

export interface RoundSessionService {
  getState(): RoundSessionState
  subscribe(listener: (state: RoundSessionState) => void): () => void
  initialize(handoff?: RoundHandoff, next?: NextCluePhaseRequest): Promise<void>
  begin(): Promise<void>
  advance(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  requestClose(): void
  cancelClose(): void
  confirmClose(): Promise<CluePhaseHandoff | null>
  refreshClock(): void
  retry(): Promise<void>
}

interface Dependencies {
  readonly repository: RoundSessionRepository
  readonly random?: () => number
  readonly now?: () => number
  readonly readOnly?: boolean
}

type Stored = StoredPublicRoundSession
type Mutation = () => Promise<void>

const writerError: PublicPlatformError = { code: 'writer-unavailable', retryable: true }

function remaining(session: PublicRoundSession | null, now: number): number | null {
  const clock = session?.activePhase.clock
  if (!clock || clock.status === 'ready' || clock.status === 'untimed') return null
  if (clock.status === 'paused') return clock.remainingSeconds
  if (clock.status === 'expired') return 0
  const deadline = Date.parse(clock.deadlineAt)
  if (!Number.isFinite(deadline)) return null
  return Math.max(0, Math.min(clock.maximumRemainingSeconds, Math.ceil((deadline - now) / 1000)))
}

function deriveStatus(
  session: PublicRoundSession,
  readOnly: boolean,
  now: number,
): RoundSessionStatus {
  if (readOnly) return 'observer'
  const phase = session.activePhase
  if (phase.state === 'closed') return 'closed'
  if (phase.state === 'ready') return 'ready'
  if (phase.clock.status === 'paused') return 'paused'
  if (phase.clock.status === 'expired' || remaining(session, now) === 0) return 'expired'
  return phase.stage === 'clues' ? 'clues' : 'discussion'
}

export function createRoundSessionService({
  repository,
  random = Math.random,
  now = Date.now,
  readOnly = false,
}: Dependencies): RoundSessionService {
  let state: RoundSessionState = {
    status: 'loading',
    session: null,
    revision: 0,
    remainingSeconds: null,
    error: null,
    readOnly,
  }
  let retryOperation: Mutation | null = null
  let handoffInput: RoundHandoff | undefined
  let nextInput: NextCluePhaseRequest | undefined
  let writing = false
  const listeners = new Set<(state: RoundSessionState) => void>()

  function setState(patch: Partial<RoundSessionState>): void {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  function publish(stored: Stored): void {
    if (!stored.session) {
      setState({
        status: 'safe-mode',
        session: null,
        revision: stored.revision,
        error: { code: 'incompatible-data', retryable: false },
      })
      return
    }
    retryOperation = null
    setState({
      status: deriveStatus(stored.session, readOnly, now()),
      session: stored.session,
      revision: stored.revision,
      remainingSeconds: remaining(stored.session, now()),
      error: null,
    })
  }

  function fail(error: PublicPlatformError, retry: Mutation): void {
    retryOperation = error.code === 'revision-conflict' ? load : retry
    setState({
      status: error.code === 'incompatible-data' ? 'safe-mode' : 'error',
      error,
    })
  }

  async function load(): Promise<void> {
    setState({ status: 'loading', error: null })
    const result = await repository.load()
    if (!result.ok) {
      fail(result.error, load)
      return
    }
    if (result.value?.session) {
      publish(result.value)
      return
    }
    const revision = result.value?.revision ?? 0
    if (readOnly) {
      setState({ status: 'observer', revision, session: null, error: null })
      return
    }
    if (nextInput) {
      await prepareNext(nextInput, revision)
      return
    }
    if (handoffInput) {
      await prepareInitial(handoffInput, revision)
      return
    }
    setState({
      status: 'safe-mode',
      revision,
      error: { code: 'incompatible-data', retryable: false },
    })
  }

  async function prepareInitial(handoff: RoundHandoff, revision: number): Promise<void> {
    setState({ status: 'preparing', error: null })
    const result = await repository.prepareInitial(handoff, revision, random)
    if (!result.ok) {
      fail(result.error, () => prepareInitial(handoff, revision))
      return
    }
    publish(result.value)
  }

  async function prepareNext(request: NextCluePhaseRequest, revision: number): Promise<void> {
    setState({ status: 'preparing', error: null })
    const result = await repository.prepareNext(request, revision, random)
    if (!result.ok) {
      fail(result.error, () => prepareNext(request, revision))
      return
    }
    publish(result.value)
  }

  async function mutate(
    action: () => Promise<{ ok: true; value: Stored } | { ok: false; error: PublicPlatformError }>,
  ): Promise<void> {
    if (readOnly || writing) return
    writing = true
    let result
    try {
      result = await action()
    } catch {
      writing = false
      fail({ code: 'unknown-storage-error', retryable: true }, () => mutate(action))
      return
    }
    writing = false
    if (!result.ok) {
      fail(result.error, result.error.code === 'revision-conflict' ? load : () => mutate(action))
      return
    }
    publish(result.value)
  }

  async function close(revision: number): Promise<CluePhaseHandoff | null> {
    if (readOnly || writing) return null
    writing = true
    setState({ status: 'closing', error: null })
    let result
    try {
      result = await repository.close(revision, { confirmed: true })
    } catch {
      writing = false
      fail({ code: 'unknown-storage-error', retryable: true }, () =>
        close(revision).then(() => undefined),
      )
      return null
    }
    writing = false
    if (!result.ok) {
      fail(
        result.error,
        result.error.code === 'revision-conflict'
          ? load
          : () => close(revision).then(() => undefined),
      )
      return null
    }
    publish(result.value.stored)
    return result.value.handoff
  }

  const service: RoundSessionService = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async initialize(handoff, next) {
      handoffInput = handoff
      nextInput = next
      await load()
    },
    async begin() {
      if (readOnly || state.status !== 'ready') return
      const revision = state.revision
      await mutate(() => repository.begin(revision))
    },
    async advance() {
      const index = state.session?.activePhase.currentTurnIndex
      if (readOnly || state.status !== 'clues' || index === null || index === undefined) return
      const revision = state.revision
      await mutate(() => repository.advanceClueTurn(revision, index))
    },
    async pause() {
      if (readOnly || !['clues', 'discussion'].includes(state.status)) return
      const revision = state.revision
      await mutate(() => repository.pause(revision))
    },
    async resume() {
      if (readOnly || state.status !== 'paused') return
      const revision = state.revision
      await mutate(() => repository.resume(revision))
    },
    requestClose() {
      if (readOnly || !['clues', 'discussion', 'paused', 'expired'].includes(state.status)) return
      setState({ status: 'confirmation' })
    },
    cancelClose() {
      if (state.status !== 'confirmation' || !state.session) return
      setState({ status: deriveStatus(state.session, readOnly, now()) })
    },
    async confirmClose() {
      if (state.status !== 'confirmation') return null
      return close(state.revision)
    },
    refreshClock() {
      if (
        !state.session ||
        !['clues', 'discussion', 'paused', 'expired', 'observer'].includes(state.status)
      )
        return
      setState({
        status: deriveStatus(state.session, readOnly, now()),
        remainingSeconds: remaining(state.session, now()),
      })
    },
    async retry() {
      const operation = retryOperation ?? load
      retryOperation = null
      await operation()
    },
  }

  if (readOnly && !state.session) state = { ...state, error: writerError }
  return service
}

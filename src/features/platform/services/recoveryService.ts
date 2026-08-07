import type { PublicPlatformError, RecoverySnapshot } from '../../../domain/entities/platform'
import type { PersistenceGateway, WriterCoordinator } from '../../../domain/ports/platform'

export type RecoveryState =
  | { status: 'initializing' }
  | { status: 'ready'; snapshot: RecoverySnapshot | null }
  | { status: 'observer'; snapshot: RecoverySnapshot | null }
  | { status: 'safe-read-only'; error: PublicPlatformError }
  | { status: 'error'; error: PublicPlatformError }
  | { status: 'clearing'; snapshot: RecoverySnapshot | null }
  | { status: 'cleared' }

export interface RecoveryService {
  getState(): RecoveryState
  subscribe(listener: (state: RecoveryState) => void): () => void
  initialize(): Promise<void>
  retry(): Promise<void>
  clearAllData(confirmation: { confirmed: true }): Promise<void>
}

interface RecoveryServiceDependencies {
  persistence: PersistenceGateway
  writer: WriterCoordinator
  marker?: Pick<Storage, 'getItem' | 'setItem'>
}

const markerKey = 'impostorapp:recovery-state'

function thrownStorageError(error: unknown): PublicPlatformError {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return { code: 'storage-full', retryable: true }
    if (error.name === 'InvalidStateError') {
      return { code: 'storage-unavailable', retryable: true }
    }
  }
  return { code: 'unknown-storage-error', retryable: true }
}

export function createRecoveryService({
  persistence,
  writer,
  marker = typeof localStorage === 'undefined' ? undefined : localStorage,
}: RecoveryServiceDependencies): RecoveryService {
  let state: RecoveryState = { status: 'initializing' }
  const listeners = new Set<(nextState: RecoveryState) => void>()

  function setState(nextState: RecoveryState): void {
    state = nextState
    listeners.forEach((listener) => listener(nextState))
  }

  async function initialize(): Promise<void> {
    setState({ status: 'initializing' })
    try {
      const initialized = await persistence.initialize()
      if (!initialized.ok) {
        setState(
          initialized.error.code === 'incompatible-data'
            ? { status: 'safe-read-only', error: initialized.error }
            : { status: 'error', error: initialized.error },
        )
        return
      }

      const recovered = await persistence.loadRecoverySnapshot()
      if (!recovered.ok) {
        setState(
          recovered.error.code === 'incompatible-data'
            ? { status: 'safe-read-only', error: recovered.error }
            : { status: 'error', error: recovered.error },
        )
        return
      }

      if (recovered.value === null && marker?.getItem(markerKey) === 'snapshot') {
        setState({
          status: 'error',
          error: { code: 'storage-unavailable', retryable: true },
        })
        return
      }

      marker?.setItem(markerKey, recovered.value ? 'snapshot' : 'empty')

      const lease = await writer.acquire()
      setState(
        lease.mode === 'writer'
          ? { status: 'ready', snapshot: recovered.value }
          : { status: 'observer', snapshot: recovered.value },
      )
    } catch (error) {
      setState({ status: 'error', error: thrownStorageError(error) })
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize,
    retry: initialize,
    async clearAllData(confirmation): Promise<void> {
      if (confirmation.confirmed !== true) return
      const snapshot = state.status === 'ready' ? state.snapshot : null
      if (state.status !== 'ready') {
        if (state.status !== 'error' || state.error.code !== 'storage-full') return
        const lease = await writer.acquire()
        if (lease.mode !== 'writer') return
      }
      setState({ status: 'clearing', snapshot })
      const cleared = await persistence.clearAllData(confirmation)
      if (cleared.ok) marker?.setItem(markerKey, 'empty')
      setState(cleared.ok ? { status: 'cleared' } : { status: 'error', error: cleared.error })
    },
  }
}

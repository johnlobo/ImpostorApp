import type { OfflineLifecycleState, PublicPlatformError } from '../../../domain/entities/platform'

export type OfflineLifecycleEvent =
  | { type: 'PREPARATION_REQUIRED'; online: boolean }
  | { type: 'OFFLINE_READY' }
  | { type: 'PREPARATION_FAILED'; error: PublicPlatformError }
  | { type: 'CONNECTIVITY_CHANGED'; online: boolean }
  | { type: 'RETRY_REQUESTED' }

export function transitionOfflineLifecycle(
  state: OfflineLifecycleState,
  event: OfflineLifecycleEvent,
): OfflineLifecycleState {
  switch (event.type) {
    case 'PREPARATION_REQUIRED':
      return { status: 'online-not-ready' }
    case 'OFFLINE_READY':
      return { status: 'offline-ready' }
    case 'PREPARATION_FAILED':
      return { status: event.error.retryable ? 'degraded' : 'fatal-safe', error: event.error }
    case 'CONNECTIVITY_CHANGED':
      return state
    case 'RETRY_REQUESTED':
      if (
        state.status === 'online-not-ready' ||
        (state.status === 'degraded' && state.error.retryable)
      ) {
        return { status: 'initializing' }
      }
      return state
  }
}

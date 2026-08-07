import type { PublicPlatformError } from '../../../domain/entities/platform'

export type UpdateBlockReason = 'active-game' | 'unconfirmed-state'

export type UpdateCoordinatorState =
  | { status: 'idle' }
  | {
      status: 'available'
      version: string
      canApply: boolean
      blockedBy: UpdateBlockReason | null
    }
  | { status: 'applying'; version: string }
  | { status: 'failed'; version: string; error: PublicPlatformError }

export interface UpdateCoordinatorDependencies {
  isGameActive: () => boolean
  isDurableStateConfirmed: () => Promise<boolean>
  activateUpdate: () => Promise<void>
}

export interface UpdateCoordinator {
  getState: () => UpdateCoordinatorState
  subscribe: (listener: (state: UpdateCoordinatorState) => void) => () => void
  updateAvailable: (version: string) => void
  postpone: () => void
  applyUpdate: () => Promise<boolean>
}

export function createUpdateCoordinator({
  isGameActive,
  isDurableStateConfirmed,
  activateUpdate,
}: UpdateCoordinatorDependencies): UpdateCoordinator {
  let state: UpdateCoordinatorState = { status: 'idle' }
  let applyInFlight = false
  const listeners = new Set<(state: UpdateCoordinatorState) => void>()

  const setState = (nextState: UpdateCoordinatorState) => {
    state = nextState
    listeners.forEach((listener) => listener(state))
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    updateAvailable: (version) => {
      const gameActive = isGameActive()
      setState({
        status: 'available',
        version,
        canApply: !gameActive,
        blockedBy: gameActive ? 'active-game' : null,
      })
    },
    postpone: () => setState({ status: 'idle' }),
    applyUpdate: async () => {
      if (applyInFlight || (state.status !== 'available' && state.status !== 'failed')) return false

      applyInFlight = true
      const version = state.version

      try {
        if (isGameActive()) {
          setState({ status: 'available', version, canApply: false, blockedBy: 'active-game' })
          return false
        }

        if (!(await isDurableStateConfirmed())) {
          setState({
            status: 'available',
            version,
            canApply: false,
            blockedBy: 'unconfirmed-state',
          })
          return false
        }

        setState({ status: 'applying', version })
        await activateUpdate()
        return true
      } catch {
        setState({
          status: 'failed',
          version,
          error: { code: 'update-failed', retryable: true },
        })
        return false
      } finally {
        applyInFlight = false
      }
    },
  }
}

import { activateRegisteredUpdate } from '../../../infrastructure/pwa/registerServiceWorker'
import { recoveryService } from './recoveryRuntime'
import { createUpdateCoordinator } from './updateCoordinator'

let gameActive = false
let gameStateDurable = true
let pendingVersion: string | undefined

export const appUpdateCoordinator = createUpdateCoordinator({
  isGameActive: () => gameActive,
  isDurableStateConfirmed: () =>
    Promise.resolve(
      gameStateDurable &&
        ['ready', 'observer', 'cleared'].includes(recoveryService.getState().status),
    ),
  activateUpdate: activateRegisteredUpdate,
})

export function notifyAppUpdateAvailable(version: string) {
  pendingVersion = version
  appUpdateCoordinator.updateAvailable(version)
}

if (typeof window !== 'undefined') {
  window.addEventListener('impostor:game-state-changed', (event) => {
    const detail = (event as CustomEvent<{ active: boolean; durableStateConfirmed: boolean }>)
      .detail
    gameActive = detail.active
    gameStateDurable = detail.durableStateConfirmed
    if (!gameActive && pendingVersion && appUpdateCoordinator.getState().status === 'idle') {
      appUpdateCoordinator.updateAvailable(pendingVersion)
    }
  })
}

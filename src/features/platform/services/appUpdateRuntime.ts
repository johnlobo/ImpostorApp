import { activateRegisteredUpdate } from '../../../infrastructure/pwa/registerServiceWorker'
import { createUpdateCoordinator } from './updateCoordinator'

let gameActive = false
let durableStateConfirmed = false
let pendingVersion: string | undefined

export const appUpdateCoordinator = createUpdateCoordinator({
  isGameActive: () => gameActive,
  isDurableStateConfirmed: () => Promise.resolve(durableStateConfirmed),
  activateUpdate: activateRegisteredUpdate,
})

export function notifyAppUpdateAvailable(version: string) {
  pendingVersion = version
  appUpdateCoordinator.updateAvailable(version)
}

export function setAppDurability(confirmed: boolean) {
  durableStateConfirmed = confirmed
}

if (typeof window !== 'undefined') {
  window.addEventListener('impostor:game-state-changed', (event) => {
    const detail = (event as CustomEvent<{ active: boolean; durableStateConfirmed: boolean }>)
      .detail
    gameActive = detail.active
    durableStateConfirmed = detail.durableStateConfirmed
    if (!gameActive && pendingVersion && appUpdateCoordinator.getState().status === 'idle') {
      appUpdateCoordinator.updateAvailable(pendingVersion)
    }
  })
}

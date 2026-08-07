import { registerSW } from 'virtual:pwa-register'

export interface ServiceWorkerLifecycleCallbacks {
  onOfflineReady: () => void
  onUpdateAvailable: () => void
  onRegistrationError: (error: unknown) => void
}

let activateUpdate: (() => Promise<void>) | undefined
let reloadRequested = false

export async function activateRegisteredUpdate(): Promise<void> {
  if (!activateUpdate) throw new Error('Service worker is not registered')
  if (reloadRequested) return
  reloadRequested = true
  try {
    const controllerChanged = new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
    })
    await activateUpdate()
    await controllerChanged
    window.location.reload()
  } catch (error) {
    reloadRequested = false
    throw error
  }
}

export interface ServiceWorkerRegistrationHandle {
  applyUpdate: () => Promise<void>
  checkForUpdate: () => Promise<void>
}

export function registerAppServiceWorker(
  callbacks: ServiceWorkerLifecycleCallbacks,
): ServiceWorkerRegistrationHandle {
  let registration: ServiceWorkerRegistration | undefined
  const updateServiceWorker = registerSW({
    immediate: true,
    onOfflineReady: callbacks.onOfflineReady,
    onNeedRefresh: callbacks.onUpdateAvailable,
    onNeedReload: () => undefined,
    onRegisterError: callbacks.onRegistrationError,
    onRegisteredSW: (_url, swRegistration) => {
      registration = swRegistration
    },
  })

  activateUpdate = () => updateServiceWorker(true)

  return {
    applyUpdate: activateUpdate,
    checkForUpdate: async () => {
      await registration?.update()
    },
  }
}

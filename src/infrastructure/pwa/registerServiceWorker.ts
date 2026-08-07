import { registerSW } from 'virtual:pwa-register'

export interface ServiceWorkerLifecycleCallbacks {
  onOfflineReady: () => void
  onUpdateAvailable: () => void
  onRegistrationError: (error: unknown) => void
}

let activateUpdate: (() => Promise<void>) | undefined

export async function activateRegisteredUpdate(): Promise<void> {
  if (!activateUpdate) throw new Error('Service worker is not registered')
  await activateUpdate()
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

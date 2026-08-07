import { registerSW } from 'virtual:pwa-register'

export interface ServiceWorkerLifecycleCallbacks {
  onOfflineReady: () => void
  onUpdateAvailable: () => void
  onRegistrationError: (error: unknown) => void
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

  return {
    applyUpdate: () => updateServiceWorker(true),
    checkForUpdate: async () => {
      await registration?.update()
    },
  }
}

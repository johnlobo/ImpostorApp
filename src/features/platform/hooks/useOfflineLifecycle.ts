import { useCallback, useEffect, useReducer, useState } from 'react'
import { BrowserConnectivity } from '../../../infrastructure/pwa/browserConnectivity'
import { registerAppServiceWorker } from '../../../infrastructure/pwa/registerServiceWorker'
import { transitionOfflineLifecycle } from '../services/offlineLifecycle'

async function hasPreparedCache(): Promise<boolean> {
  if (!('caches' in window)) return false
  const names = await caches.keys()
  return names.length > 0
}

async function waitForServiceWorkerControl(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  await navigator.serviceWorker.ready
  if (navigator.serviceWorker.controller) return
  await new Promise<void>((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
  })
}

export function useOfflineLifecycle() {
  const [state, dispatch] = useReducer(transitionOfflineLifecycle, { status: 'initializing' })
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const connectivity = new BrowserConnectivity()
    const markOfflineReady = () => {
      void waitForServiceWorkerControl().then(() => dispatch({ type: 'OFFLINE_READY' }))
    }
    const serviceWorker = registerAppServiceWorker({
      onOfflineReady: markOfflineReady,
      onUpdateAvailable: () => undefined,
      onRegistrationError: () =>
        dispatch({ type: 'PREPARATION_REQUIRED', online: navigator.onLine }),
    })

    void hasPreparedCache().then((ready) => {
      if (ready) markOfflineReady()
    })

    return connectivity.subscribe((nextOnline) => {
      setOnline(nextOnline)
      dispatch({ type: 'CONNECTIVITY_CHANGED', online: nextOnline })
      void hasPreparedCache().then((ready) => {
        if (!ready) dispatch({ type: 'PREPARATION_REQUIRED', online: nextOnline })
        else if (nextOnline) void serviceWorker.checkForUpdate()
      })
    })
  }, [])

  const retryPreparation = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return
    dispatch({ type: 'RETRY_REQUESTED' })
    const registrations = await navigator.serviceWorker?.getRegistrations()
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()))
    window.location.reload()
  }, [])

  return { state, online, retryPreparation }
}

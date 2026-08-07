import { useCallback, useEffect, useReducer, useState } from 'react'
import { BrowserConnectivity } from '../../../infrastructure/pwa/browserConnectivity'
import { registerAppServiceWorker } from '../../../infrastructure/pwa/registerServiceWorker'
import { transitionOfflineLifecycle } from '../services/offlineLifecycle'

async function hasPreparedCache(): Promise<boolean> {
  if (!('caches' in window)) return false
  const names = await caches.keys()
  return names.length > 0
}

export function useOfflineLifecycle() {
  const [state, dispatch] = useReducer(transitionOfflineLifecycle, { status: 'initializing' })
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const connectivity = new BrowserConnectivity()
    const serviceWorker = registerAppServiceWorker({
      onOfflineReady: () => dispatch({ type: 'OFFLINE_READY' }),
      onUpdateAvailable: () => undefined,
      onRegistrationError: () =>
        dispatch({ type: 'PREPARATION_REQUIRED', online: navigator.onLine }),
    })

    void hasPreparedCache().then((ready) => {
      if (ready) dispatch({ type: 'OFFLINE_READY' })
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

  const retryPreparation = useCallback((): Promise<void> => {
    if (navigator.onLine) {
      dispatch({ type: 'RETRY_REQUESTED' })
      window.location.reload()
    }
    return Promise.resolve()
  }, [])

  return { state, online, retryPreparation }
}

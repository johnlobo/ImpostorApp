import { useEffect, useSyncExternalStore } from 'react'
import type { RecoveryService } from '../services/recoveryService'

const initializedServices = new WeakSet<object>()

export function useRecovery(service: RecoveryService) {
  const state = useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getState(),
  )

  useEffect(() => {
    if (initializedServices.has(service)) return
    initializedServices.add(service)
    void service.initialize()
  }, [service])

  return {
    state,
    retry: () => service.retry(),
    clearAllData: (confirmation: { confirmed: true }) => service.clearAllData(confirmation),
  }
}

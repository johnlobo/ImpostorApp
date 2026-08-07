import { useCallback, useSyncExternalStore } from 'react'
import type { UpdateCoordinator } from '../services/updateCoordinator'

export function useAppUpdate(coordinator: UpdateCoordinator) {
  const state = useSyncExternalStore(coordinator.subscribe, coordinator.getState)
  const postpone = useCallback(() => coordinator.postpone(), [coordinator])
  const apply = useCallback(() => coordinator.applyUpdate(), [coordinator])

  return { state, postpone, apply }
}

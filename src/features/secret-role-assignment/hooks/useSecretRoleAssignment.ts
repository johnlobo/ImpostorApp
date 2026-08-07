import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { PreparedContentSelection } from '../../../domain/entities/contentCatalog'
import type { SecretRoundRepository } from '../../../domain/ports/secretRoleAssignment'
import type { StorageResult } from '../../../domain/ports/platform'
import { createSecretRoleAssignmentService } from '../services/secretRoleAssignmentService'

const initializedServices = new WeakSet<object>()

export function useSecretRoleAssignment(
  content: PreparedContentSelection,
  repository: SecretRoundRepository,
  readOnly: boolean,
  resetHistory: () => Promise<StorageResult<void>>,
) {
  const service = useMemo(
    () =>
      createSecretRoleAssignmentService({
        content,
        repository,
        random: Math.random,
        resetHistory,
        readOnly,
      }),
    [content, readOnly, repository, resetHistory],
  )
  const state = useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getState(),
  )

  useEffect(() => {
    if (initializedServices.has(service)) return
    initializedServices.add(service)
    void service.initialize()
  }, [service])

  useEffect(() => {
    const conceal = () => service.conceal()
    const concealWhenHidden = () => {
      if (document.visibilityState === 'hidden') conceal()
    }
    window.addEventListener('pagehide', conceal)
    document.addEventListener('visibilitychange', concealWhenHidden)
    return () => {
      window.removeEventListener('pagehide', conceal)
      document.removeEventListener('visibilitychange', concealWhenHidden)
    }
  }, [service])

  return {
    state,
    selectPlayer: (playerId: string) => service.selectPlayer(playerId),
    reveal: () => service.reveal(),
    conceal: () => service.conceal(),
    startRound: () => service.startRound(),
    resetHistory: () => service.resetHistory(),
    retry: () => service.retry(),
  }
}

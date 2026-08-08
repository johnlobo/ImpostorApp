import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { NextCluePhaseRequest } from '../../../domain/entities/roundSession'
import type { RoundHandoff } from '../../../domain/entities/secretRoleAssignment'
import type { RoundSessionRepository } from '../../../domain/ports/roundSession'
import { createRoundSessionService } from '../services/roundSessionService'

const initializedServices = new WeakSet<object>()

export function useRoundSession(
  repository: RoundSessionRepository,
  readOnly: boolean,
  handoff?: RoundHandoff,
  next?: NextCluePhaseRequest,
) {
  const service = useMemo(
    () => createRoundSessionService({ repository, readOnly }),
    [readOnly, repository],
  )
  const state = useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getState(),
  )

  useEffect(() => {
    if (initializedServices.has(service)) return
    initializedServices.add(service)
    void service.initialize(handoff, next)
  }, [handoff, next, service])

  useEffect(() => {
    if (state.status !== 'clues' && state.status !== 'discussion') return
    const tick = () => service.refreshClock()
    const interval = window.setInterval(tick, 1_000)
    window.addEventListener('pageshow', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pageshow', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [service, state.status])

  return {
    state,
    begin: () => service.begin(),
    advance: () => service.advance(),
    pause: () => service.pause(),
    resume: () => service.resume(),
    requestClose: () => service.requestClose(),
    cancelClose: () => service.cancelClose(),
    confirmClose: () => service.confirmClose(),
    retry: () => service.retry(),
  }
}

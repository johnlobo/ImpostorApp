import { useEffect, useMemo, useState } from 'react'
import type { DraftCommand } from '../../../domain/entities/playerGroup'
import type { PlayerGroupsRepository } from '../../../domain/ports/playerGroups'
import { createPlayerGroupsService, type PlayerGroupsState } from '../services/playerGroupsService'

export function usePlayerGroups(repository: PlayerGroupsRepository) {
  const service = useMemo(
    () =>
      createPlayerGroupsService({
        repository,
        createId: () => crypto.randomUUID(),
        nowIso: () => new Date().toISOString(),
      }),
    [repository],
  )
  const [state, setState] = useState<PlayerGroupsState>(service.getState())

  useEffect(() => {
    const unsubscribe = service.subscribe(setState)
    void service.initialize()
    return unsubscribe
  }, [service])

  return {
    state,
    apply: (command: DraftCommand) => service.apply(command),
    saveGroup: (name: string) => service.saveGroup(name),
    loadGroup: (groupId: string) => service.loadGroup(groupId),
    deleteGroup: (groupId: string) => service.deleteGroup(groupId),
    prepare: () => service.prepare(),
    retry: () => service.retry(),
    clearFeedback: () => service.clearFeedback(),
  }
}

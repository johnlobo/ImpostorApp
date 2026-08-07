import { useEffect, useMemo, useState } from 'react'
import type { ConfigurationCommand } from '../../../domain/entities/gameConfiguration'
import type { PreparedRoster } from '../../../domain/entities/playerGroup'
import type { PreparedGameRepository } from '../../../domain/ports/gameConfiguration'
import {
  createGameConfigurationService,
  type GameConfigurationState,
} from '../services/gameConfigurationService'

export function useGameConfiguration(roster: PreparedRoster, repository: PreparedGameRepository) {
  const service = useMemo(
    () =>
      createGameConfigurationService({
        roster,
        repository,
        createId: () => crypto.randomUUID(),
        nowIso: () => new Date().toISOString(),
      }),
    [repository, roster],
  )
  const [state, setState] = useState<GameConfigurationState>(service.getState())

  useEffect(() => {
    const unsubscribe = service.subscribe(setState)
    void service.initialize()
    return unsubscribe
  }, [service])

  return {
    state,
    apply: (command: ConfigurationCommand) => service.apply(command),
    review: () => service.review(),
    edit: () => service.edit(),
    confirm: () => service.confirm(),
    retry: () => service.retry(),
  }
}

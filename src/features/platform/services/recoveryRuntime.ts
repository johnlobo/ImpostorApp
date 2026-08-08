import { createWriterLeaseCoordinator } from '../../../infrastructure/coordination/writerLease'
import { BrowserWriterLeaseStore } from '../../../infrastructure/coordination/browserWriterLeaseStore'
import { createPersistenceDatabase } from '../../../infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../../infrastructure/persistence/dexiePersistenceGateway'
import { createPlayerGroupsRepository } from '../../../infrastructure/persistence/playerGroupsRepository'
import { createCustomCategoriesRepository } from '../../../infrastructure/persistence/customCategoriesRepository'
import { createContentPreferencesRepository } from '../../../infrastructure/persistence/contentPreferencesRepository'
import { createContentSelectionRepository } from '../../../infrastructure/persistence/contentSelectionRepository'
import { createConceptDrawRepository } from '../../../infrastructure/persistence/conceptDrawRepository'
import { createGameConfigurationRepository } from '../../../infrastructure/persistence/gameConfigurationRepository'
import { createSecretRoundRepository } from '../../../infrastructure/persistence/secretRoundRepository'
import { createRoundSessionRepository } from '../../../infrastructure/persistence/roundSessionRepository'
import { createRecoveryService } from './recoveryService'

const clock = {
  now: () => Date.now(),
  nowIso: () => new Date().toISOString(),
}
const instanceKey = 'impostorapp:writer-instance'
const instanceId = sessionStorage.getItem(instanceKey) ?? crypto.randomUUID()
sessionStorage.setItem(instanceKey, instanceId)
const writerStore = new BrowserWriterLeaseStore()
const writer = createWriterLeaseCoordinator({
  instanceId,
  store: writerStore,
  clock,
  leaseTimeoutMs: 15_000,
})
const database = createPersistenceDatabase({
  name: 'impostorapp-platform',
  indexedDB,
  IDBKeyRange,
})
const persistence = new DexiePersistenceGateway(database, {
  hasWriterLease: () => writer.current().mode === 'writer',
})

export const recoveryService = createRecoveryService({ persistence, writer })
export const playerGroupsRepository = createPlayerGroupsRepository(persistence)
export const gameConfigurationRepository = createGameConfigurationRepository(
  persistence,
  clock.nowIso,
)
export const customCategoriesRepository = createCustomCategoriesRepository(persistence)
export const contentPreferencesRepository = createContentPreferencesRepository(
  persistence,
  clock.nowIso,
)
export const contentSelectionRepository = createContentSelectionRepository(
  persistence,
  clock.nowIso,
)
export const conceptDrawRepository = createConceptDrawRepository(
  database,
  () => writer.current().mode === 'writer',
  clock.nowIso,
)

export const secretRoundRepository = createSecretRoundRepository(
  database,
  { hasWriterLease: () => writer.current().mode === 'writer' },
  clock.nowIso,
)

export const roundSessionRepository = createRoundSessionRepository(
  database,
  { hasWriterLease: () => writer.current().mode === 'writer' },
  clock.nowIso,
)

if (typeof window !== 'undefined') {
  window.setInterval(() => {
    if (writer.current().mode === 'writer') {
      void writer.heartbeat().then((renewed) => {
        if (!renewed) void recoveryService.retry()
      })
    } else if (recoveryService.getState().status === 'observer') {
      void recoveryService.retry()
    }
  }, 5_000)
  window.addEventListener('pagehide', () => writerStore.releaseImmediately(instanceId))
}

import { createWriterLeaseCoordinator } from '../../../infrastructure/coordination/writerLease'
import { BrowserWriterLeaseStore } from '../../../infrastructure/coordination/browserWriterLeaseStore'
import { createPersistenceDatabase } from '../../../infrastructure/persistence/database'
import { DexiePersistenceGateway } from '../../../infrastructure/persistence/dexiePersistenceGateway'
import { createRecoveryService } from './recoveryService'

const clock = {
  now: () => Date.now(),
  nowIso: () => new Date().toISOString(),
}
const writer = createWriterLeaseCoordinator({
  instanceId: crypto.randomUUID(),
  store: new BrowserWriterLeaseStore(),
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
  window.addEventListener('pagehide', () => void writer.release())
}

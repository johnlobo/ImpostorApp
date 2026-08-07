import type {
  PersistenceNamespace,
  PublicPlatformError,
  RecoverySnapshot,
} from '../../domain/entities/platform'
import type {
  CollectionChange,
  PersistenceGateway,
  StorageResult,
} from '../../domain/ports/platform'
import type { PersistenceDatabase } from './database'

interface WriterLeaseProvider {
  hasWriterLease(): boolean
}

interface CollectionEnvelope {
  key: string
  value: unknown
}

function failure<T>(error: PublicPlatformError): StorageResult<T> {
  return { ok: false, error }
}

function mapStorageError(error: unknown): PublicPlatformError {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return { code: 'storage-full', retryable: true }
    }
    if (error.name === 'InvalidStateError' || error.name === 'NotFoundError') {
      return { code: 'storage-unavailable', retryable: true }
    }
  }
  return { code: 'unknown-storage-error', retryable: true }
}

export class DexiePersistenceGateway implements PersistenceGateway {
  constructor(
    private readonly database: PersistenceDatabase,
    private readonly writerLease: WriterLeaseProvider,
  ) {}

  initialize(): Promise<StorageResult<'ready'>> {
    return this.database.initialize()
  }

  async loadRecoverySnapshot(): Promise<StorageResult<RecoverySnapshot | null>> {
    try {
      const snapshot = await this.database
        .table<RecoverySnapshot>('recoverySnapshots')
        .get('active-game')
      return { ok: true, value: snapshot ?? null }
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }

  async commitRecoverySnapshot(
    expectedRevision: number,
    nextSnapshot: RecoverySnapshot,
  ): Promise<StorageResult<RecoverySnapshot>> {
    if (!this.writerLease.hasWriterLease()) {
      return failure({ code: 'writer-unavailable', retryable: true })
    }

    try {
      return await this.database.transaction(
        ['metadata', 'recoverySnapshots'],
        async (): Promise<StorageResult<RecoverySnapshot>> => {
          const table = this.database.table<RecoverySnapshot>('recoverySnapshots')
          const current = await table.get('active-game')
          if ((current?.revision ?? 0) !== expectedRevision) {
            return failure({ code: 'revision-conflict', retryable: true })
          }
          if (
            nextSnapshot.revision !== expectedRevision + 1 ||
            nextSnapshot.integrity !== 'confirmed'
          ) {
            return failure({ code: 'revision-conflict', retryable: true })
          }

          await table.put(nextSnapshot)
          await this.database.table('metadata').put({
            id: 'app',
            schemaVersion: nextSnapshot.schemaVersion,
            updatedAt: nextSnapshot.savedAt,
            recoveryRevision: nextSnapshot.revision,
          })
          return { ok: true, value: nextSnapshot }
        },
      )
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }

  async readCollection(
    namespace: PersistenceNamespace,
  ): Promise<StorageResult<readonly unknown[]>> {
    try {
      const records = await this.database.table<CollectionEnvelope>(namespace).toArray()
      return { ok: true, value: records.map(({ value }) => value) }
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }

  async commitCollectionChange(
    namespace: PersistenceNamespace,
    change: CollectionChange,
  ): Promise<StorageResult<void>> {
    if (!this.writerLease.hasWriterLease()) {
      return failure({ code: 'writer-unavailable', retryable: true })
    }

    try {
      await this.database.transaction([namespace], async () => {
        const table = this.database.table<CollectionEnvelope>(namespace)
        if (change.operation === 'delete') {
          await table.delete(change.key)
          return
        }
        await table.put({ key: change.key, value: change.value })
      })
      return { ok: true, value: undefined }
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }

  async clearAllData(confirmation: { confirmed: true }): Promise<StorageResult<void>> {
    if (confirmation.confirmed !== true) {
      return failure({ code: 'unknown-storage-error', retryable: false })
    }
    if (!this.writerLease.hasWriterLease()) {
      return failure({ code: 'writer-unavailable', retryable: true })
    }

    const tables = [
      'metadata',
      'recoverySnapshots',
      'player-groups',
      'custom-categories',
      'used-concepts',
      'preferences',
    ] as const
    try {
      await this.database.transaction(tables, async () => {
        await Promise.all(tables.map((name) => this.database.table(name).clear()))
      })
      return { ok: true, value: undefined }
    } catch (error) {
      return failure(mapStorageError(error))
    }
  }
}

import type {
  OfflineLifecycleState,
  PersistenceNamespace,
  PublicPlatformError,
  RecoverySnapshot,
  WriterLease,
} from '../entities/platform'

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: PublicPlatformError }

export interface CollectionChange<TPayload = unknown> {
  operation: 'put' | 'delete'
  key: string
  value?: TPayload
}

export interface PersistenceGateway {
  initialize(): Promise<StorageResult<'ready'>>
  loadRecoverySnapshot(): Promise<StorageResult<RecoverySnapshot | null>>
  commitRecoverySnapshot(
    expectedRevision: number,
    nextSnapshot: RecoverySnapshot,
  ): Promise<StorageResult<RecoverySnapshot>>
  readCollection(namespace: PersistenceNamespace): Promise<StorageResult<readonly unknown[]>>
  commitCollectionChange(
    namespace: PersistenceNamespace,
    change: CollectionChange,
  ): Promise<StorageResult<void>>
  clearAllData(confirmation: { confirmed: true }): Promise<StorageResult<void>>
}

export interface OfflineLifecycleGateway {
  getState(): OfflineLifecycleState
  subscribe(listener: (state: OfflineLifecycleState) => void): () => void
  retryPreparation(): Promise<void>
  applyUpdate(): Promise<void>
}

export interface ConnectivityGateway {
  isOnline(): boolean
  subscribe(listener: (online: boolean) => void): () => void
}

export interface Clock {
  now(): number
  nowIso(): string
}

export interface WriterCoordinator {
  acquire(): Promise<WriterLease>
  current(): WriterLease
  release(): Promise<void>
}

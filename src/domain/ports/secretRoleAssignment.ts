import type { PreparedContentSelection } from '../entities/contentCatalog'
import type {
  ImpostorAllocationHistory,
  SecretRoundSnapshot,
} from '../entities/secretRoleAssignment'
import type { StorageResult } from './platform'

export interface StoredSecretRound {
  readonly snapshot: SecretRoundSnapshot | null
  readonly revision: number
}

export interface SecretRoundRepository {
  load(): Promise<StorageResult<StoredSecretRound | null>>
  prepare(
    content: PreparedContentSelection,
    expectedRevision: number,
    random: () => number,
  ): Promise<StorageResult<StoredSecretRound>>
  completeReveal(
    playerId: string,
    expectedRevision: number,
  ): Promise<StorageResult<StoredSecretRound>>
}

export interface ImpostorAllocationHistoryRepository {
  load(gameId: string): Promise<StorageResult<ImpostorAllocationHistory | null>>
}

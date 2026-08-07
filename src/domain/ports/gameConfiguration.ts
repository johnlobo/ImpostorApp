import type { PreparedGame } from '../entities/gameConfiguration'
import type { PersistenceGateway, StorageResult } from './platform'

export interface StoredPreparedGame {
  game: PreparedGame
  revision: number
}

export interface PreparedGameRepository {
  load(): Promise<StorageResult<StoredPreparedGame | null>>
  save(game: PreparedGame, expectedRevision: number): Promise<StorageResult<StoredPreparedGame>>
}

export type PreparedGamePersistence = Pick<
  PersistenceGateway,
  'loadRecoverySnapshot' | 'commitRecoverySnapshot'
>

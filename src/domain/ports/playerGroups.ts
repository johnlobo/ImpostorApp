import type { SavedPlayerGroup } from '../entities/playerGroup'
import type { StorageResult } from './platform'

export interface PlayerGroupsRepository {
  list(): Promise<StorageResult<readonly SavedPlayerGroup[]>>
  save(group: SavedPlayerGroup): Promise<StorageResult<SavedPlayerGroup>>
  delete(groupId: string): Promise<StorageResult<void>>
}

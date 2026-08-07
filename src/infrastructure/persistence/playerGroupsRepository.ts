import {
  MAX_GROUP_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  PLAYER_GROUP_SCHEMA_VERSION,
  nameComparisonKey,
  normalizeName,
  type SavedPlayerGroup,
} from '../../domain/entities/playerGroup'
import type { PlayerGroupsRepository } from '../../domain/ports/playerGroups'
import type { PersistenceGateway, StorageResult } from '../../domain/ports/platform'

function incompatible<T>(): StorageResult<T> {
  return { ok: false, error: { code: 'incompatible-data', retryable: false } }
}

function isGroup(value: unknown): value is SavedPlayerGroup {
  if (!value || typeof value !== 'object') return false
  const group = value as Partial<SavedPlayerGroup>
  if (
    typeof group.id !== 'string' ||
    group.id.length === 0 ||
    group.schemaVersion !== PLAYER_GROUP_SCHEMA_VERSION ||
    typeof group.name !== 'string' ||
    group.name.length === 0 ||
    normalizeName(group.name) !== group.name ||
    Array.from(group.name).length > MAX_GROUP_NAME_LENGTH ||
    typeof group.createdAt !== 'string' ||
    typeof group.updatedAt !== 'string' ||
    !Array.isArray(group.players) ||
    group.players.length < 3 ||
    group.players.length > 20
  ) {
    return false
  }

  const names: string[] = []
  const validPlayers = group.players.every((player, position) => {
    if (!player || typeof player !== 'object') return false
    const candidate = player as { name?: unknown; position?: unknown }
    if (
      typeof candidate.name !== 'string' ||
      !candidate.name ||
      normalizeName(candidate.name) !== candidate.name ||
      Array.from(candidate.name).length > MAX_PLAYER_NAME_LENGTH ||
      candidate.position !== position
    ) {
      return false
    }
    names.push(candidate.name)
    return true
  })
  return validPlayers && new Set(names.map(nameComparisonKey)).size === names.length
}

export function createPlayerGroupsRepository(
  persistence: PersistenceGateway,
): PlayerGroupsRepository {
  return {
    async list() {
      const result = await persistence.readCollection('player-groups')
      if (!result.ok) return result
      if (!result.value.every(isGroup)) return incompatible()
      return {
        ok: true,
        value: [...result.value].sort((left, right) =>
          left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
        ),
      }
    },
    async save(group) {
      if (!isGroup(group)) return incompatible()
      const result = await persistence.commitCollectionChange('player-groups', {
        operation: 'put',
        key: group.id,
        value: group,
      })
      return result.ok ? { ok: true, value: group } : result
    },
    delete(groupId) {
      return persistence.commitCollectionChange('player-groups', {
        operation: 'delete',
        key: groupId,
      })
    },
  }
}

import {
  GAME_CONFIGURATION_SCHEMA_VERSION,
  isPreparedGame,
  type PreparedGame,
} from '../../domain/entities/gameConfiguration'
import type {
  PreparedGamePersistence,
  PreparedGameRepository,
  StoredPreparedGame,
} from '../../domain/ports/gameConfiguration'
import type { StorageResult } from '../../domain/ports/platform'

function incompatible<T>(): StorageResult<T> {
  return { ok: false, error: { code: 'incompatible-data', retryable: false } }
}

function readConfiguredSnapshot(value: unknown): StorageResult<StoredPreparedGame> {
  if (!value || typeof value !== 'object') return incompatible()
  const snapshot = value as {
    id?: unknown
    schemaVersion?: unknown
    revision?: unknown
    savedAt?: unknown
    phase?: unknown
    payload?: unknown
    integrity?: unknown
  }
  if (
    snapshot.id !== 'active-game' ||
    snapshot.schemaVersion !== GAME_CONFIGURATION_SCHEMA_VERSION ||
    !Number.isInteger(snapshot.revision) ||
    (snapshot.revision as number) < 1 ||
    typeof snapshot.savedAt !== 'string' ||
    snapshot.phase !== 'configured' ||
    snapshot.integrity !== 'confirmed' ||
    !isPreparedGame(snapshot.payload)
  ) {
    return incompatible()
  }
  return {
    ok: true,
    value: { game: snapshot.payload, revision: snapshot.revision as number },
  }
}

export function createGameConfigurationRepository(
  persistence: PreparedGamePersistence,
  nowIso: () => string = () => new Date().toISOString(),
): PreparedGameRepository {
  return {
    async load() {
      const result = await persistence.loadRecoverySnapshot()
      if (!result.ok) return result
      if (result.value === null) return { ok: true, value: null }
      return readConfiguredSnapshot(result.value)
    },
    async save(game: PreparedGame, expectedRevision: number) {
      if (!isPreparedGame(game) || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
        return incompatible()
      }
      const result = await persistence.commitRecoverySnapshot(expectedRevision, {
        id: 'active-game',
        schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
        revision: expectedRevision + 1,
        savedAt: nowIso(),
        phase: 'configured',
        payload: game,
        integrity: 'confirmed',
      })
      if (!result.ok) return result
      return readConfiguredSnapshot(result.value)
    },
  }
}

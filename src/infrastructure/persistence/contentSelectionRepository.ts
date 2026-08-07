import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  isPreparedContentSelection,
} from '../../domain/entities/contentCatalog'
import { isPreparedGame } from '../../domain/entities/gameConfiguration'
import type {
  ContentCatalogPersistence,
  PreparedContentSelectionRepository,
  StoredContentSelection,
} from '../../domain/ports/contentCatalog'
import type { StorageResult } from '../../domain/ports/platform'

function incompatible<T>(): StorageResult<T> {
  return { ok: false, error: { code: 'incompatible-data', retryable: false } }
}

function readSelection(value: unknown): StorageResult<StoredContentSelection> {
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
    snapshot.schemaVersion !== CONTENT_CATALOG_SCHEMA_VERSION ||
    !Number.isInteger(snapshot.revision) ||
    (snapshot.revision as number) < 1 ||
    typeof snapshot.savedAt !== 'string' ||
    snapshot.phase !== 'content-selected' ||
    snapshot.integrity !== 'confirmed' ||
    !isPreparedContentSelection(snapshot.payload)
  ) {
    return incompatible()
  }
  return {
    ok: true,
    value: {
      content: snapshot.payload,
      revision: snapshot.revision as number,
    },
  }
}

export function createContentSelectionRepository(
  persistence: ContentCatalogPersistence,
  nowIso: () => string = () => new Date().toISOString(),
): PreparedContentSelectionRepository {
  return {
    async load() {
      const result = await persistence.loadRecoverySnapshot()
      if (!result.ok) return result
      if (result.value === null) return { ok: true, value: null }
      if (result.value.phase === 'configured') {
        if (
          result.value.id !== 'active-game' ||
          result.value.schemaVersion !== CONTENT_CATALOG_SCHEMA_VERSION ||
          !Number.isInteger(result.value.revision) ||
          result.value.revision < 1 ||
          typeof result.value.savedAt !== 'string' ||
          result.value.integrity !== 'confirmed' ||
          !isPreparedGame(result.value.payload)
        ) {
          return incompatible()
        }
        return {
          ok: true,
          value: { content: null, revision: result.value.revision },
        }
      }
      return readSelection(result.value)
    },
    async save(content, expectedRevision) {
      if (
        !isPreparedContentSelection(content) ||
        !Number.isInteger(expectedRevision) ||
        expectedRevision < 0
      ) {
        return incompatible()
      }
      const result = await persistence.commitRecoverySnapshot(expectedRevision, {
        id: 'active-game',
        schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
        revision: expectedRevision + 1,
        savedAt: nowIso(),
        phase: 'content-selected',
        payload: content,
        integrity: 'confirmed',
      })
      if (!result.ok) return result
      return readSelection(result.value)
    },
  }
}

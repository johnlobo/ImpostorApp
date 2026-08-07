import { CONTENT_CATALOG_SCHEMA_VERSION } from '../../domain/entities/contentCatalog'
import type { UserPreferences } from '../../domain/entities/platform'
import type {
  ContentCatalogPersistence,
  ContentPreferencesRepository,
} from '../../domain/ports/contentCatalog'
import type { StorageResult } from '../../domain/ports/platform'

const PREFERENCE_KEY = 'preferences'

interface StoredContentPreferences extends UserPreferences {
  id: 'preferences'
  schemaVersion: typeof CONTENT_CATALOG_SCHEMA_VERSION
}

function incompatible<T>(): StorageResult<T> {
  return { ok: false, error: { code: 'incompatible-data', retryable: false } }
}

function isPreferences(value: unknown): value is StoredContentPreferences {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredContentPreferences>
  return (
    record.schemaVersion === CONTENT_CATALOG_SCHEMA_VERSION &&
    record.id === 'preferences' &&
    typeof record.locale === 'string' &&
    record.locale.length > 0 &&
    typeof record.soundEnabled === 'boolean' &&
    typeof record.vibrationEnabled === 'boolean' &&
    typeof record.adultContentEnabled === 'boolean' &&
    typeof record.updatedAt === 'string' &&
    record.updatedAt.length > 0
  )
}

export function createContentPreferencesRepository(
  persistence: ContentCatalogPersistence,
  nowIso: () => string = () => new Date().toISOString(),
): ContentPreferencesRepository {
  return {
    async loadAdultEnabled() {
      const result = await persistence.readCollection('preferences')
      if (!result.ok) return result
      if (result.value.length === 0) return { ok: true, value: false }
      if (result.value.length !== 1 || !isPreferences(result.value[0])) return incompatible()
      return { ok: true, value: result.value[0].adultContentEnabled }
    },
    async saveAdultEnabled(enabled) {
      if (typeof enabled !== 'boolean') return incompatible()
      const existing = await persistence.readCollection('preferences')
      if (!existing.ok) return existing
      if (existing.value.length > 1) return incompatible()
      const previous = existing.value[0]
      if (previous !== undefined && !isPreferences(previous)) return incompatible()
      return persistence.commitCollectionChange('preferences', {
        operation: 'put',
        key: PREFERENCE_KEY,
        value: {
          id: 'preferences',
          schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
          locale: previous?.locale ?? 'es',
          soundEnabled: previous?.soundEnabled ?? false,
          vibrationEnabled: previous?.vibrationEnabled ?? false,
          adultContentEnabled: enabled,
          updatedAt: nowIso(),
        } satisfies StoredContentPreferences,
      })
    },
  }
}

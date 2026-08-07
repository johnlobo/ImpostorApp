import {
  catalogComparisonKey,
  isContentCategory,
  validateCustomCategory,
  type ContentCategory,
} from '../../domain/entities/contentCatalog'
import type {
  ContentCatalogPersistence,
  CustomCategoriesRepository,
} from '../../domain/ports/contentCatalog'
import type { StorageResult } from '../../domain/ports/platform'

function incompatible<T>(): StorageResult<T> {
  return { ok: false, error: { code: 'incompatible-data', retryable: false } }
}

function isCustomCategory(value: unknown): value is ContentCategory {
  return isContentCategory(value) && value.source === 'custom'
}

export function createCustomCategoriesRepository(
  persistence: ContentCatalogPersistence,
): CustomCategoriesRepository {
  async function list(): Promise<StorageResult<readonly ContentCategory[]>> {
    const result = await persistence.readCollection('custom-categories')
    if (!result.ok) return result
    if (!result.value.every(isCustomCategory)) return incompatible()
    return {
      ok: true,
      value: [...result.value].sort((left, right) =>
        catalogComparisonKey(left.name).localeCompare(catalogComparisonKey(right.name), 'es'),
      ),
    }
  }

  return {
    list,
    async save(category) {
      if (!isCustomCategory(category)) return incompatible()
      const existing = await list()
      if (!existing.ok) return existing
      if (validateCustomCategory(category, existing.value).length) return incompatible()
      const result = await persistence.commitCollectionChange('custom-categories', {
        operation: 'put',
        key: category.id,
        value: category,
      })
      return result.ok ? { ok: true, value: category } : result
    },
    delete(categoryId) {
      if (!categoryId) return Promise.resolve(incompatible())
      return persistence.commitCollectionChange('custom-categories', {
        operation: 'delete',
        key: categoryId,
      })
    },
  }
}

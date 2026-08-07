import { describe, expect, it, vi } from 'vitest'

import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  type ContentCategory,
} from '../../src/domain/entities/contentCatalog'
import type { ContentCatalogPersistence } from '../../src/domain/ports/contentCatalog'
import { createConceptDrawRepository } from '../../src/infrastructure/persistence/conceptDrawRepository'
import { createContentPreferencesRepository } from '../../src/infrastructure/persistence/contentPreferencesRepository'

const now = '2026-08-07T13:00:00.000Z'

function persistence(values: readonly unknown[]): ContentCatalogPersistence {
  return {
    readCollection: vi.fn().mockResolvedValue({ ok: true, value: values }),
    commitCollectionChange: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    loadRecoverySnapshot: vi.fn(),
    commitRecoverySnapshot: vi.fn(),
  }
}

describe('content repository platform contracts', () => {
  it('preserves the shared preference fields when enabling adult content', async () => {
    const previous = {
      id: 'preferences',
      schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
      locale: 'es',
      soundEnabled: true,
      vibrationEnabled: true,
      adultContentEnabled: false,
      updatedAt: '2026-08-07T12:00:00.000Z',
    }
    const gateway = persistence([previous])

    await expect(
      createContentPreferencesRepository(gateway, () => now).saveAdultEnabled(true),
    ).resolves.toEqual({ ok: true, value: undefined })
    expect(gateway.commitCollectionChange).toHaveBeenCalledWith('preferences', {
      operation: 'put',
      key: 'preferences',
      value: { ...previous, adultContentEnabled: true, updatedAt: now },
    })
  })

  it('maps a safe-read-only transaction to incompatible-data without exposing text', async () => {
    const database = {
      table: vi.fn(),
      transaction: vi.fn().mockRejectedValue({ code: 'incompatible-data', retryable: false }),
    } as unknown as Parameters<typeof createConceptDrawRepository>[0]
    const category: ContentCategory = {
      id: 'custom',
      schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
      source: 'custom',
      name: 'Ideas',
      adult: false,
      concepts: [{ id: 'concept-1', text: 'Texto secreto' }],
      createdAt: now,
      updatedAt: now,
    }
    const repository = createConceptDrawRepository(
      database,
      () => true,
      () => now,
    )

    await expect(
      repository.drawAndMarkUsed(
        {
          gameId: 'game-1',
          selection: { mode: 'all' },
          eligibleCategoryIds: ['custom'],
        },
        [category],
        () => 0,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
    expect(database.table).not.toHaveBeenCalled()
  })
})

import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  validateCatalog,
  type Concept,
  type ContentCategory,
  type DrawnConcept,
} from '../../domain/entities/contentCatalog'
import type { ConceptDrawRepository, ConceptDrawRequest } from '../../domain/ports/contentCatalog'
import type { PublicPlatformError } from '../../domain/entities/platform'
import type { StorageResult } from '../../domain/ports/platform'
import type { PersistenceDatabase } from './database'

interface CollectionEnvelope {
  key: string
  value: unknown
}

interface ConceptHistory {
  scopeId: string
  schemaVersion: typeof CONTENT_CATALOG_SCHEMA_VERSION
  usedConceptIds: readonly string[]
  updatedAt: string
}

type AtomicDatabase = Pick<PersistenceDatabase, 'table' | 'transaction'>

function failure<T>(error: PublicPlatformError): StorageResult<T> {
  return { ok: false, error }
}

function incompatible<T>(): StorageResult<T> {
  return failure({ code: 'incompatible-data', retryable: false })
}

function mapStorageError(error: unknown): PublicPlatformError {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'incompatible-data') {
    return { code: 'incompatible-data', retryable: false }
  }
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return { code: 'storage-full', retryable: true }
    }
    if (error.name === 'InvalidStateError' || error.name === 'NotFoundError') {
      return { code: 'storage-unavailable', retryable: true }
    }
  }
  return { code: 'unknown-storage-error', retryable: true }
}

function isHistory(value: unknown, gameId: string): value is ConceptHistory {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ConceptHistory>
  return (
    record.scopeId === gameId &&
    record.schemaVersion === CONTENT_CATALOG_SCHEMA_VERSION &&
    typeof record.updatedAt === 'string' &&
    record.updatedAt.length > 0 &&
    Array.isArray(record.usedConceptIds) &&
    record.usedConceptIds.every((id) => typeof id === 'string' && id.length > 0) &&
    new Set(record.usedConceptIds).size === record.usedConceptIds.length
  )
}

function randomIndex(length: number, random: () => number): number | null {
  const value = random()
  return Number.isFinite(value) && value >= 0 && value < 1 ? Math.floor(value * length) : null
}

function selectedCategories(
  request: ConceptDrawRequest,
  catalog: readonly ContentCategory[],
): readonly ContentCategory[] | null {
  if (
    !request.gameId ||
    request.eligibleCategoryIds.length === 0 ||
    new Set(request.eligibleCategoryIds).size !== request.eligibleCategoryIds.length ||
    validateCatalog(catalog).length > 0
  ) {
    return null
  }
  const byId = new Map(catalog.map((category) => [category.id, category]))
  const categories = request.eligibleCategoryIds.map((id) => byId.get(id))
  if (categories.some((category) => !category)) return null
  if (
    request.selection.mode === 'selected' &&
    (request.selection.categoryIds.length !== request.eligibleCategoryIds.length ||
      request.selection.categoryIds.some((id, index) => id !== request.eligibleCategoryIds[index]))
  ) {
    return null
  }
  return categories as readonly ContentCategory[]
}

function chooseConcept(
  request: ConceptDrawRequest,
  categories: readonly ContentCategory[],
  usedConceptIds: ReadonlySet<string>,
  random: () => number,
): { category: ContentCategory; concept: Concept } | 'content-exhausted' | null {
  const available = categories
    .map((category) => ({
      category,
      concepts: category.concepts.filter((concept) => !usedConceptIds.has(concept.id)),
    }))
    .filter(({ concepts }) => concepts.length > 0)
  if (available.length === 0) return 'content-exhausted'

  if (request.selection.mode === 'random-category') {
    const categoryIndex = randomIndex(available.length, random)
    if (categoryIndex === null) return null
    const selected = available[categoryIndex]!
    const conceptIndex = randomIndex(selected.concepts.length, random)
    if (conceptIndex === null) return null
    return { category: selected.category, concept: selected.concepts[conceptIndex]! }
  }

  const concepts = available.flatMap(({ category, concepts: categoryConcepts }) =>
    categoryConcepts.map((concept) => ({ category, concept })),
  )
  const index = randomIndex(concepts.length, random)
  return index === null ? null : concepts[index]!
}

export function createConceptDrawRepository(
  database: AtomicDatabase,
  hasWriterLease: () => boolean,
  nowIso: () => string = () => new Date().toISOString(),
): ConceptDrawRepository {
  const tails = new Map<string, Promise<unknown>>()

  function serialized<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const previous = tails.get(gameId) ?? Promise.resolve()
    const current = previous.catch(() => undefined).then(operation)
    tails.set(gameId, current)
    return current.finally(() => {
      if (tails.get(gameId) === current) tails.delete(gameId)
    })
  }

  return {
    drawAndMarkUsed(request, catalog, random) {
      return serialized(request.gameId, async () => {
        const categories = selectedCategories(request, catalog)
        if (!categories || typeof random !== 'function') return incompatible()
        if (!hasWriterLease()) {
          return failure({ code: 'writer-unavailable', retryable: true })
        }

        try {
          return await database.transaction(
            ['used-concepts'],
            async (): Promise<StorageResult<DrawnConcept | 'content-exhausted'>> => {
              const table = database.table<CollectionEnvelope>('used-concepts')
              const envelope = await table.get(request.gameId)
              if (
                envelope &&
                (envelope.key !== request.gameId || !isHistory(envelope.value, request.gameId))
              ) {
                return incompatible()
              }
              const history = envelope?.value as ConceptHistory | undefined
              const chosen = chooseConcept(
                request,
                categories,
                new Set(history?.usedConceptIds ?? []),
                random,
              )
              if (chosen === 'content-exhausted') return { ok: true, value: chosen }
              if (!chosen) return incompatible()

              const next: ConceptHistory = {
                scopeId: request.gameId,
                schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
                usedConceptIds: [...(history?.usedConceptIds ?? []), chosen.concept.id],
                updatedAt: nowIso(),
              }
              await table.put({ key: request.gameId, value: next })
              return {
                ok: true,
                value: {
                  gameId: request.gameId,
                  categoryId: chosen.category.id,
                  conceptId: chosen.concept.id,
                  text: chosen.concept.text,
                },
              }
            },
          )
        } catch (error) {
          return failure(mapStorageError(error))
        }
      })
    },
    reset(gameId, confirmation) {
      return serialized(gameId, async () => {
        if (!gameId || confirmation.confirmed !== true) return incompatible()
        if (!hasWriterLease()) {
          return failure({ code: 'writer-unavailable', retryable: true })
        }
        try {
          await database.transaction(['used-concepts'], async () => {
            await database.table<CollectionEnvelope>('used-concepts').delete(gameId)
          })
          return { ok: true, value: undefined }
        } catch (error) {
          return failure(mapStorageError(error))
        }
      })
    },
  }
}

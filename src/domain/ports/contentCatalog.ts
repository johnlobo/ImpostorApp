import type {
  CategorySelection,
  ContentCategory,
  DrawnConcept,
  PreparedContentSelection,
} from '../entities/contentCatalog'
import type { PersistenceGateway, StorageResult } from './platform'

export interface CustomCategoriesRepository {
  list(): Promise<StorageResult<readonly ContentCategory[]>>
  save(category: ContentCategory): Promise<StorageResult<ContentCategory>>
  delete(categoryId: string): Promise<StorageResult<void>>
}

export interface ContentPreferencesRepository {
  loadAdultEnabled(): Promise<StorageResult<boolean>>
  saveAdultEnabled(enabled: boolean): Promise<StorageResult<void>>
}

export interface ConceptDrawRequest {
  gameId: string
  selection: CategorySelection
  eligibleCategoryIds: readonly string[]
}

export interface ConceptDrawRepository {
  drawAndMarkUsed(
    request: ConceptDrawRequest,
    catalog: readonly ContentCategory[],
    random: () => number,
  ): Promise<StorageResult<DrawnConcept | 'content-exhausted'>>
  reset(gameId: string, confirmation: { confirmed: true }): Promise<StorageResult<void>>
}

export interface StoredContentSelection {
  content: PreparedContentSelection | null
  revision: number
}

export interface PreparedContentSelectionRepository {
  load(): Promise<StorageResult<StoredContentSelection | null>>
  save(
    content: PreparedContentSelection,
    expectedRevision: number,
  ): Promise<StorageResult<StoredContentSelection>>
}

export type ContentCatalogPersistence = Pick<
  PersistenceGateway,
  'readCollection' | 'commitCollectionChange' | 'loadRecoverySnapshot' | 'commitRecoverySnapshot'
>

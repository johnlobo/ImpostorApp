# Contract: Content catalog

## Domain contracts

```ts
interface Concept {
  readonly id: string
  readonly text: string
}

interface ContentCategory {
  readonly id: string
  readonly schemaVersion: 1
  readonly source: 'built-in' | 'custom'
  readonly name: string
  readonly adult: boolean
  readonly concepts: readonly Concept[]
  readonly createdAt: string | null
  readonly updatedAt: string | null
}

type CategorySelection =
  | { mode: 'selected'; categoryIds: readonly string[] }
  | { mode: 'all' }
  | { mode: 'random-category' }

interface PreparedContentSelection {
  readonly schemaVersion: 1
  readonly game: PreparedGame
  readonly selection: CategorySelection
  readonly eligibleCategoryIds: readonly string[]
  readonly adultContentEnabled: boolean
  readonly createdAt: string
}
```

```ts
validateCatalog(categories): readonly CatalogIssue[]
validateCustomCategory(category, existing): readonly CatalogIssue[]
resolveEligibleCategories(categories, selection, adultEnabled): CatalogResult<readonly ContentCategory[]>
confirmContentSelection(game, selection, catalog, adultEnabled, clock): CatalogResult<PreparedContentSelection>
```

All built-in categories contain at least 10 valid concepts. Built-in and custom IDs share one
collision domain. Failed commands preserve the previous valid value.

## Custom categories repository

```ts
interface CustomCategoriesRepository {
  list(): Promise<StorageResult<readonly ContentCategory[]>>
  save(category: ContentCategory): Promise<StorageResult<ContentCategory>>
  delete(categoryId: string): Promise<StorageResult<void>>
}
```

- Uses `custom-categories` and stable category keys.
- Accepts only `source: 'custom'` records with the current schema version.
- A malformed or future record rejects the complete read with `incompatible-data`.
- Writes and deletes inherit writer-lease enforcement.
- Errors never contain category names or concept text.

## Preferences repository

```ts
interface ContentPreferencesRepository {
  loadAdultEnabled(): Promise<StorageResult<boolean>>
  saveAdultEnabled(enabled: boolean): Promise<StorageResult<void>>
}
```

An absent preference resolves to `false`. Both general and adult catalog modules are packaged
locally; changing the value causes no network operation.

## Atomic concept draw

```ts
interface ConceptDrawRequest {
  gameId: string
  selection: CategorySelection
  eligibleCategoryIds: readonly string[]
}

interface DrawnConcept {
  gameId: string
  categoryId: string
  conceptId: string
  text: string
}

interface ConceptDrawRepository {
  drawAndMarkUsed(
    request: ConceptDrawRequest,
    catalog: readonly ContentCategory[],
    random: () => number,
  ): Promise<StorageResult<DrawnConcept | 'content-exhausted'>>
  reset(gameId: string, confirmation: { confirmed: true }): Promise<StorageResult<void>>
}
```

`gameId` is the only history scope. The implementation performs read, candidate selection and
history replacement in one writer-authorized transaction. It persists the opaque concept ID before
returning text. Concurrent or repeated draw requests are serialized. On quota, writer loss,
revision conflict or any other failure, no concept is exposed.

For `random-category`, every draw first selects uniformly among eligible categories with unused
concepts, then uniformly among the chosen category's unused concepts. Other modes select uniformly
from the combined unused concepts of their effective categories.

When no unused concept remains, the repository returns `content-exhausted`; it never clears history
automatically. `reset` requires explicit confirmation and atomically empties the game history.

## Recovery snapshot

```ts
interface PreparedContentSelectionRepository {
  load(): Promise<StorageResult<{ content: PreparedContentSelection; revision: number } | null>>
  save(
    content: PreparedContentSelection,
    expectedRevision: number,
  ): Promise<StorageResult<{ content: PreparedContentSelection; revision: number }>>
}
```

- Maps to the existing recovery record with phase `content-selected`.
- Preserves the `PreparedGame` value and increments the expected revision exactly once.
- Adds no table or migration.
- Rejects malformed, future or mismatched game payloads before replacing active state.
- Contains no drawn concept.

## Feature handoffs

```ts
onConfigurationConfirmed(game: PreparedGame): void
onContentSelectionConfirmed(content: PreparedContentSelection): void
onConceptDrawn(concept: DrawnConcept): void
```

Handoffs are independent of React, Dexie, URLs and navigation reducer payloads. The final callback
is private in-memory game flow and must not be logged.

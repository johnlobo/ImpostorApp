# Data Model: Catalogo de categorias y conceptos

## Concept

| Field | Type | Rules |
|---|---|---|
| id | string | Stable, non-empty and globally unique within its category |
| text | string | Normalized display value; never used as identity or technical key |

## ContentCategory

| Field | Type | Rules |
|---|---|---|
| id | string | Stable local or packaged identifier |
| schemaVersion | integer | Current supported record version |
| source | built-in or custom | Determines whether mutation is allowed |
| name | string | Normalized and unique among custom categories |
| adult | boolean | Adult categories are ineligible while the preference is off |
| concepts | ordered Concept[] | Unique IDs and normalized text; built-ins contain at least 10 |
| createdAt | ISO timestamp or null | Required for custom records |
| updatedAt | ISO timestamp or null | Required for custom records |

Built-in categories are packaged, immutable and split between general and adult source modules.
Custom categories are stored in `custom-categories`; renaming preserves category and concept IDs.

## CategorySelection

```ts
type CategorySelection =
  | { mode: 'selected'; categoryIds: readonly string[] }
  | { mode: 'all' }
  | { mode: 'random-category' }
```

### Invariants

- `selected` contains at least one unique eligible category ID.
- `all` resolves all currently eligible general and enabled-adult categories.
- `random-category` chooses a category independently on each round from eligible categories that
  still have unused concepts.
- Disabling adult content invalidates any effective selection containing only adult categories.
- Selection contains IDs only; no concept text enters navigation or public errors.

## ContentPreferences

| Field | Type | Rules |
|---|---|---|
| schemaVersion | integer | Current supported version |
| adultContentEnabled | boolean | False when absent and false by default |
| updatedAt | ISO timestamp | Updated after a durable preference write |

The preference uses the existing `preferences` namespace and is available offline. Toggling it
never downloads content.

## PreparedContentSelection

| Field | Type | Rules |
|---|---|---|
| schemaVersion | integer | Initially 1 |
| game | PreparedGame | Valid immutable IMP-3 handoff |
| selection | CategorySelection | Confirmed requested mode |
| eligibleCategoryIds | ordered string[] | Effective IDs at confirmation |
| adultContentEnabled | boolean | Effective preference at confirmation |
| createdAt | ISO timestamp | Injected confirmation clock |

It is persisted in `RecoverySnapshot` with phase `content-selected`. A valid prior `configured` snapshot supplies the base revision with nullable content until this selection is confirmed. It contains no selected concept,
role assignment, vote or round result.

## ConceptHistory

| Field | Type | Rules |
|---|---|---|
| scopeId | string | Exactly `PreparedGame.id` |
| schemaVersion | integer | Current supported version |
| usedConceptIds | string[] | Unique opaque IDs; never concept text |
| updatedAt | ISO timestamp | Last durable draw or reset |

History is one logical record per game, allowing an atomic replacement or reset. A draw is complete
only after its concept ID is durably appended. Deleting source content never mutates an active
confirmed pool or its history; orphan IDs disappear when that game history is reset or discarded.

## DrawResult

| Field | Type | Rules |
|---|---|---|
| gameId | string | Matches history scope |
| categoryId | string | Eligible category chosen for this round |
| conceptId | string | Newly persisted and previously unused |
| text | string | Secret display value exposed only after persistence |

Exhaustion returns a typed `content-exhausted` issue and leaves history unchanged. No automatic
cycle or reset exists.

## State transitions

```text
PreparedGame -> catalog loading -> selecting -> review -> content-selected snapshot
                                     \-> invalid selection -> unchanged selection + issue

content-selected -> draw pending -> history committed -> concept exposed
                              \-> failure -> no concept exposed -> retry
                              \-> exhausted -> blocked -> explicit reset -> drawable

custom draft -> validate -> saving -> available
                         \-> storage failure -> draft preserved
```

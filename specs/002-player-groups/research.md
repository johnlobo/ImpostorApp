# Research: Gestion de jugadores y grupos habituales

## Existing platform fit

**Decision**: Reuse `PersistenceGateway.readCollection` and
`commitCollectionChange('player-groups', ...)`.

**Rationale**: IMP-1 already provides transactional IndexedDB storage, error mapping and writer
lease enforcement. A typed repository is enough to isolate the feature from the generic envelope.

**Alternatives rejected**:

- Direct Dexie access from the feature: couples business rules to infrastructure.
- localStorage: lacks the existing transaction, migration and safe-mode guarantees.
- Global state library: unnecessary for one screen and one active draft.

## Name normalization

**Decision**: Trim exterior whitespace, collapse internal whitespace and compare with a stable
Spanish lower-case key. Preserve accents and displayed spelling.

**Rationale**: It handles common accidental duplicates without merging distinct names such as
accented and unaccented spellings when the accent is intentionally different.

## Reordering

**Decision**: Accessible move-up and move-down commands.

**Rationale**: Deterministic, keyboard friendly, understandable on a shared phone and sufficient for
20 rows. Drag and drop would add gesture, accessibility and testing complexity.

## Replacement and deletion

**Decision**: Confirm replacement only for a non-empty dirty draft; always confirm group deletion.

**Rationale**: Protects unsaved work while keeping the empty-state quick path short.

## Record compatibility

**Decision**: Parse every stored record, reject malformed or newer schema versions, and never
silently repair user names or group contents.

**Rationale**: A failed parse must not corrupt the current draft or pretend data was loaded.

## Dependencies

**Decision**: Add no runtime dependency.

**Rationale**: Existing React, Dexie, Vitest, Testing Library and Playwright cover the feature.

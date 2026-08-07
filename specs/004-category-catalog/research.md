# Research: Catalogo de categorias y conceptos

## Catalog ownership

**Decision**: Keep the Spanish built-in catalog in versioned local source modules and merge it with
validated custom categories at the application boundary.

**Rationale**: Built-in content is immutable application data while custom content belongs to the
user. Separating ownership prevents accidental writes or deletion of packaged categories.

Each built-in category contains at least 10 concepts. Category and concept IDs are stable across
releases and independent of display text or array position.

## Adult content

**Decision**: Keep adult content in a separate source module, disabled by default, but package it in
the local application bundle.

**Rationale**: Separation makes filtering auditable while local packaging preserves first-load and
offline guarantees. Enabling adult content never performs a network request. Domain filtering is
authoritative even though the module is locally available.

## Selection modes

**Decision**: Support selected categories, all eligible categories and a random eligible category
per round.

**Rationale**: Random-category mode is evaluated for every draw rather than once per game. Category
selection is uniform among eligible categories that still contain unused concepts, avoiding an
implicit bias toward larger categories.

## History scope and exhaustion

**Decision**: Scope used concepts by `PreparedGame.id`. Exhaustion blocks further draws until the
host explicitly resets that game's history.

**Rationale**: A game has one understandable repetition boundary. Manual reset avoids silently
breaking the no-repeat promise and gives the host control over when a new cycle begins.

Changing category selection does not erase history: concepts already used in the same game remain
used if their category becomes eligible again.

## Durable draw

**Decision**: Select a candidate with injected randomness, persist its opaque concept ID, and expose
the concept text only after the write succeeds.

**Rationale**: A storage or writer failure cannot reveal a concept that the history does not record.
The service serializes draw requests, and the infrastructure operation owns the read-select-write
transaction required for an atomic reservation.

## Custom content persistence

**Decision**: Reuse `custom-categories`; use stable IDs for categories and concepts and reject
malformed or future records rather than repairing them silently.

**Rationale**: Stable identity preserves history through renames and edits. The existing gateway
provides writer-lease and public error handling.

## Recovery handoff

**Decision**: Confirm category selection as a versioned snapshot with phase `content-selected`,
containing the existing `PreparedGame` and effective selection but not a drawn concept.

**Rationale**: IMP-4 extends setup without assigning roles or leaking the next secret. Per-round
draws remain separate durable operations.

## Dependencies and schema

**Decision**: Add no runtime dependency, persistence table or Dexie migration.

**Rationale**: `custom-categories`, `used-concepts`, `preferences` and recovery snapshots already
exist. TypeScript, React and the current test stack cover validation, selection and UI.

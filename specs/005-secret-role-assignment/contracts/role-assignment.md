# Contract: Role assignment and private reveal

## Domain contracts

```ts
// Reused, not redefined:
import type { PreparedContentSelection, DrawnConcept } from 'src/domain/entities/contentCatalog'
import type { PreparedRoster } from 'src/domain/entities/playerGroup'
import type { AllocationRule, ImpostorAwareness } from 'src/domain/entities/gameConfiguration'

type Role = 'citizen' | 'impostor'

interface RoleAssignment {
  readonly playerId: string
  readonly role: Role
}

interface ImpostorAllocationHistory {
  readonly scopeId: string
  readonly schemaVersion: 1
  readonly impostorCounts: Readonly<Record<string, number>>
  readonly roundsPlayed: number
  readonly updatedAt: string
}

interface RevealStateEntry {
  readonly playerId: string
  readonly status: 'pending' | 'completed'
}

interface SecretRoundSnapshot {
  readonly schemaVersion: 1
  readonly content: PreparedContentSelection
  readonly roundNumber: number
  readonly assignments: readonly RoleAssignment[]
  readonly concept: DrawnConcept
  readonly impostorAwareness: ImpostorAwareness
  readonly reveals: readonly RevealStateEntry[]
  readonly createdAt: string
}

interface PublicRoundProgress {
  readonly total: number
  readonly completed: number
  readonly players: readonly {
    readonly id: string
    readonly name: string
    readonly position: number
    readonly status: 'pending' | 'completed'
  }[]
}

type PrivateRoleView =
  | { readonly kind: 'citizen'; readonly category: string; readonly concept: string }
  | { readonly kind: 'impostor'; readonly category: string; readonly companions: readonly string[] }

interface RoundHandoff {
  readonly gameId: string
  readonly roundNumber: number
  readonly preparedAt: string
}

type RoleAssignmentIssue =
  | 'invalid-content'
  | 'invalid-history'
  | 'invalid-random'
  | 'invalid-player'
  | 'already-completed'
  | 'round-not-ready'
  | 'invalid-confirmation'

type RoleAssignmentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RoleAssignmentIssue[] }
```

```ts
assignRoles(
  roster: PreparedRoster,
  impostorCount: number,
  allocation: AllocationRule,
  history: ImpostorAllocationHistory | null,
  random: () => number,
): RoleAssignmentResult<readonly RoleAssignment[]>

derivePublicProgress(snapshot: SecretRoundSnapshot): PublicRoundProgress

resolvePrivateRoleView(
  snapshot: SecretRoundSnapshot,
  playerId: string,
): RoleAssignmentResult<PrivateRoleView>

completeRevealState(
  snapshot: SecretRoundSnapshot,
  playerId: string,
): RoleAssignmentResult<SecretRoundSnapshot>

confirmHandoff(snapshot: SecretRoundSnapshot): RoundHandoff | null
```

- `assignRoles` never repeats a `playerId` and always produces exactly `impostorCount` impostors; a
  single configured impostor normalizes any `impostorAwareness` policy to an empty companion list
  downstream in `resolvePrivateRoleView`.
- `resolvePrivateRoleView` is the only function permitted to read `concept.text` or other impostors'
  names; it never accepts or returns data for a `playerId` whose `RevealStateEntry.status` is not
  already `completed` in the given snapshot — callers MUST persist the completed status before
  calling it, per FR-010.
- `derivePublicProgress` never reads `assignments`, `concept`, or `impostorAwareness`; its return
  type structurally excludes them.
- `confirmHandoff` returns `null` unless every `reveals` entry is `completed`; it performs no I/O and
  is safe to call repeatedly (FR-014).

## Secret round repository

```ts
interface StoredSecretRound {
  readonly snapshot: SecretRoundSnapshot | null
  readonly revision: number
}

interface SecretRoundRepository {
  load(): Promise<StorageResult<StoredSecretRound | null>>

  prepare(
    content: PreparedContentSelection,
    expectedRevision: number,
    random: () => number,
  ): Promise<StorageResult<StoredSecretRound>>

  completeReveal(
    playerId: string,
    expectedRevision: number,
  ): Promise<StorageResult<StoredSecretRound>>
}
```

- `load()` reads the `recoverySnapshots` row exactly like `PreparedContentSelectionRepository.load`;
  a prior `content-selected` snapshot resolves to `{ snapshot: null, revision }` so `prepare` can
  advance its revision, mirroring how IMP-4 handles a prior `configured` snapshot.
- `prepare` runs a single Dexie transaction across `used-concepts`, `role-assignment-history` and
  `recoverySnapshots`/`metadata`. It reads `ImpostorAllocationHistory` and `used-concepts` history for
  `content.game.id`, calls `assignRoles` and the existing domain `drawNextConcept`, and only commits
  if both succeed. On `content-exhausted` from `drawNextConcept`, no table is written and the result
  carries that issue; the caller decides whether to surface it as blocked (matching IMP-4's
  exhaustion contract) rather than a generic failure.
- `prepare` requires the writer lease exactly like `ConceptDrawRepository` and
  `DexiePersistenceGateway.commitRecoverySnapshot`; without it, it returns `writer-unavailable`.
- `completeReveal` writes only to `recoverySnapshots`/`metadata`. If the player is already
  `completed` in the currently stored snapshot, it returns the current stored value without writing
  (idempotent no-op, no revision increment). Otherwise it requires `expectedRevision` to match the
  stored revision or returns `revision-conflict`, exactly like `PreparedContentSelectionRepository.save`.
- Errors never contain concept text, category names, role labels or companion names — only the
  existing `PublicPlatformError` codes.

## Impostor allocation history repository

```ts
interface ImpostorAllocationHistoryRepository {
  load(gameId: string): Promise<StorageResult<ImpostorAllocationHistory | null>>
}
```

- Read-only from the feature's perspective; the only writer is `SecretRoundRepository.prepare`,
  inside its single transaction. No reset operation is exposed — unlike concept history, the spec
  defines no user-facing reset for role balance, so none is added (constitution: remove complexity
  not required by an approved specification).

## Feature handoffs

```ts
onRoundPrepared(snapshot: SecretRoundSnapshot): void
onRevealCompleted(playerId: string): void
onRoundHandoff(handoff: RoundHandoff): void
```

Handoffs are independent of React, Dexie, URLs and the navigation reducer payload. `onRoundHandoff`
is the only callback IMP-6 needs; its argument never carries roles, concept text or companion names,
consistent with `RoundHandoff`'s shape. `onRoundPrepared` and `onRevealCompleted` are internal
feature-to-app signals for observability during development and MUST NOT be logged with their
snapshot content — only used to trigger re-renders.

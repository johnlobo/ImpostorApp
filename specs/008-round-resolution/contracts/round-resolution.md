# Contract: Round resolution

## Reused input

```ts
interface VoteResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly outcome: 'eliminated' | 'persistent-tie'
  readonly eliminatedPlayerIds: readonly string[]
  readonly reason: 'verbal-selection' | 'first-count' | 'tiebreak-count' | 'second-tie'
  readonly confirmedAt: string
}
```

IMP-8 accepts no legacy alias. It derives active IDs; IMP-7 never supplies them.

## Outputs and projections

```ts
interface NextCluePhaseRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly eligiblePlayerIds: readonly string[]
  readonly issuedAt: string
}

interface FinalAttemptOutcome {
  readonly playerId: string
  readonly outcome: 'correct' | 'incorrect' | 'declined'
}

interface RoundResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly participantIds: readonly string[]
  readonly originalRoles: readonly {
    readonly playerId: string
    readonly role: 'citizen' | 'impostor'
  }[]
  readonly winner: 'citizens' | 'impostors'
  readonly reason:
    | 'all-impostors-found'
    | 'impostors-escaped'
    | 'impostor-parity'
    | 'persistent-tie'
  readonly eliminatedPlayerIds: readonly string[]
  readonly activePlayerIds: readonly string[]
  readonly attemptOutcomes: readonly FinalAttemptOutcome[]
  readonly resolvedAt: string
}
```

`RoundResolutionHandoff` is an internal repository-to-repository channel, never navigation state,
observer data or a public UI projection. It is the exact IMP-9 allowlist and excludes concept, category, guess text,
votes, tallies, companions, points and game-level continue/final.

## Pure domain rules

```ts
type RoundResolutionIssue =
  | 'invalid-vote-handoff'
  | 'duplicate-vote-result'
  | 'invalid-participants'
  | 'invalid-eliminated'
  | 'invalid-phase'
  | 'invalid-matrix'
  | 'invalid-attempt'
  | 'invalid-transition'
  | 'confirmation-required'
  | 'incompatible-state'

type RoundResolutionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RoundResolutionIssue[] }

prepareResolution(
  handoff: VoteResolutionHandoff,
  preparedGame: PreparedGame,
  secretRound: SecretRoundSnapshot,
  previousLedger: ResolutionLedger | null,
  now: string,
): RoundResolutionResult<RoundResolutionSnapshot>

normalizeGuess(value: string): string

confirmGuess(
  snapshot: RoundResolutionSnapshot,
  playerId: string,
  answerText: string,
  concept: string,
  now: string,
): RoundResolutionResult<RoundResolutionSnapshot>

declineGuess(
  snapshot: RoundResolutionSnapshot,
  playerId: string,
  now: string,
): RoundResolutionResult<RoundResolutionSnapshot>

confirmContinuation(
  snapshot: RoundResolutionSnapshot,
  now: string,
  confirmation: { readonly confirmed: true },
): RoundResolutionResult<{
  readonly snapshot: RoundResolutionSnapshot
  readonly request: NextCluePhaseRequest
}>

confirmTerminal(
  snapshot: RoundResolutionSnapshot,
  resultId: string,
  now: string,
  confirmation: { readonly confirmed: true },
): RoundResolutionResult<{
  readonly snapshot: RoundResolutionSnapshot
  readonly handoff: RoundResolutionHandoff
}>
```

- prepare validates exact fields/outcome invariants, participant continuity and matrix.
- Guesses are compared after identical normalization. A result is stored before advancing.
- Both output commands require every attempt completed, append minimal outcomes to the ledger and
  replace attempts with an empty list in the returned closed snapshot.
- confirmContinuation is valid only for continue; confirmTerminal only for terminal.
- Repeated output returns the persisted request/handoff without new timestamps or IDs.
- Invalid/stale commands return typed issues without payload details.

## Repository contract

```ts
interface StoredPublicResolution {
  readonly session: PublicResolutionSession
  readonly revision: number
}

interface RoundResolutionRepository {
  load(): Promise<StorageResult<StoredPublicResolution | null>>

  prepare(
    handoff: VoteResolutionHandoff,
    expectedRevision: number,
  ): Promise<StorageResult<StoredPublicResolution>>

  loadPrivateAttempt(
    playerId: string,
  ): Promise<StorageResult<PrivateFinalAttemptView>>

  confirmGuess(
    playerId: string,
    answerText: string,
    expectedRevision: number,
  ): Promise<StorageResult<StoredPublicResolution>>

  declineGuess(
    playerId: string,
    expectedRevision: number,
  ): Promise<StorageResult<StoredPublicResolution>>

  confirmContinuation(
    expectedRevision: number,
    confirmation: { readonly confirmed: true },
  ): Promise<
    StorageResult<{
      readonly stored: StoredPublicResolution
      readonly request: NextCluePhaseRequest
    }>
  >

  confirmTerminal(
    expectedRevision: number,
    confirmation: { readonly confirmed: true },
  ): Promise<
    StorageResult<{
      readonly stored: StoredPublicResolution
      readonly terminal: PublicTerminalResolution
      readonly handoff: RoundResolutionHandoff
    }>
  >
}
```

### Persistence

- prepare accepts only coherent `voting-active`, consumes its confirmed handoff and writes
  `resolution-active` over recoverySnapshots+metadata.
- Each mutation requires writer lease, expectedRevision and local serialization.
- An actual commit increments revision once; semantic no-op does not write.
- resultId duplicate with same input returns current state; reused with different input is
  incompatible.
- Storage failure preserves the previous envelope and emits no request/handoff.
- revision-conflict triggers load without replay.
- load validates and projects; no public method returns secretRound, ledger blob or answerText.

### Attempt privacy

- loadPrivateAttempt is writer-only and valid only for the next pending impostor.
- It returns identity, player, covered state and input constraints, never concept or prior text.
- confirmGuess loads concept internally, normalizes and persists private text+outcome atomically.
- Shared state exposes only progress. Another player never receives answer/outcome.
- Output commit redacts all text before returning or invoking callbacks.
- Recovery starts at shared private-handoff; observer cannot load an attempt.

### Cross-feature recovery

- Continue persists `NextCluePhaseRequest` in resolution-active before callback.
- IMP-6 prepareNext consumes that exact request and preserves ResolutionLedger opaquely while
  creating clues-active.
- IMP-7 likewise preserves the ledger while creating voting-active.
- Terminal remains resolution-active until IMP-9 applies the handoff.
- Features reject unknown ledger versions without deleting data.

### Output invariants

- Next request uses same game/round, phase+1 and canonical active IDs.
- Round handoff participantIds/originalRoles cover original roster in canonical order.
- Eliminated and active are disjoint and partition participantIds.
- Attempt outcomes contain only original impostors eliminated in the round, max one each.
- Winner/reason obey matrix. No output contains raw text or concept.
- Terminal resultId is generated by an injected factory only for terminal commit and persisted once.

## Feature service states

```ts
type ResolutionViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly session: PublicResolutionSession }
  | {
      readonly status: 'private'
      readonly session: PublicResolutionSession
      readonly attempt: PrivateFinalAttemptView
      readonly phase: 'covered' | 'entry' | 'saving' | 'concealing'
    }
  | { readonly status: 'writing'; readonly session: PublicResolutionSession }
  | { readonly status: 'terminal'; readonly result: PublicTerminalResolution }
  | { readonly status: 'observer'; readonly session: PublicResolutionSession }
  | { readonly status: 'error'; readonly session: PublicResolutionSession | null; readonly error: PublicPlatformError }
  | { readonly status: 'safe-mode'; readonly error: PublicPlatformError }
```

Service exposes subscribe/getState/prepare/openAttempt/concealAttempt/confirmGuess/decline/
confirmContinuation/confirmTerminal/retry. Observer command surface is empty.

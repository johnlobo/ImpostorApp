# Contract: Voting and elimination

## Public domain contracts

```ts
interface VotingIdentity {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
}

type VotingOutcome = 'eliminated' | 'persistent-tie'
type VotingReason = 'verbal-selection' | 'first-count' | 'tiebreak-count' | 'second-tie'

interface VoteResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly outcome: VotingOutcome
  readonly eliminatedPlayerIds: readonly string[]
  readonly reason: VotingReason
  readonly confirmedAt: string
}

interface PublicVoterProgress {
  readonly playerId: string
  readonly status: 'pending' | 'completed'
}

interface PublicAggregateCount {
  readonly playerId: string
  readonly approvals: number
}

type PublicVotingState =
  | 'verbal-open'
  | 'secret-open'
  | 'ready-to-count'
  | 'tiebreak-open'
  | 'result'

interface PublicVotingSession {
  readonly schemaVersion: 1
  readonly identity: VotingIdentity
  readonly method: 'verbal' | 'secret'
  readonly elimination: 'single' | 'successive'
  readonly participantIds: readonly string[]
  readonly maxEliminations: number
  readonly state: PublicVotingState
  readonly ballotNumber: 1 | 2 | null
  readonly candidateIds: readonly string[]
  readonly progress: readonly PublicVoterProgress[]
  readonly confirmedTallies: readonly (readonly PublicAggregateCount[])[]
  readonly result: VoteResolutionHandoff | null
  readonly revision: number
}

interface PrivateBallotView {
  readonly identity: VotingIdentity
  readonly ballotNumber: 1 | 2
  readonly voterId: string
  readonly candidateIds: readonly string[]
  readonly minimumSelections: number
  readonly maximumSelections: number
}
```

Public types structurally exclude individual selections, roles, category, concept and companions.

## Pure rules

```ts
type VotingIssue =
  | 'invalid-handoff'
  | 'invalid-participants'
  | 'invalid-voter'
  | 'invalid-candidate'
  | 'invalid-cardinality'
  | 'duplicate-vote'
  | 'invalid-transition'
  | 'confirmation-required'
  | 'incompatible-state'

type VotingRuleResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly VotingIssue[] }

createVoting(
  handoff: CluePhaseHandoff,
  preparedGame: PreparedGame,
  now: string,
): VotingRuleResult<VotingSnapshot>

derivePublicVoting(snapshot: VotingSnapshot, revision: number): PublicVotingSession

derivePrivateBallot(snapshot: VotingSnapshot, voterId: string): VotingRuleResult<PrivateBallotView>

submitVote(
  snapshot: VotingSnapshot,
  voterId: string,
  candidateIds: readonly string[],
  now: string,
): VotingRuleResult<VotingSnapshot>

confirmVerbalSelection(
  snapshot: VotingSnapshot,
  eliminatedPlayerIds: readonly string[],
  resultId: string,
  now: string,
  confirmation: { readonly confirmed: true },
): VotingRuleResult<{ snapshot: VotingSnapshot; handoff: VoteResolutionHandoff }>

countBallot(
  snapshot: VotingSnapshot,
  resultId: string,
  now: string,
  confirmation: { readonly confirmed: true },
): VotingRuleResult<
  | { readonly kind: 'tiebreak'; readonly snapshot: VotingSnapshot }
  | {
      readonly kind: 'result'
      readonly snapshot: VotingSnapshot
      readonly handoff: VoteResolutionHandoff
    }
>
```

- createVoting validates identity, canonical participants and effective configuration.
- submitVote canonicalizes candidate IDs by participant order before persisting.
- countBallot uses approvals, positive candidates and cutoff groups; participant order only
  stabilizes display and serialization. The supplied resultId is consumed only when a terminal
  result is created; preparing a tiebreak does not persist or reserve it.
- A second cutoff tie returns persistent-tie and discards provisional IDs.
- Repeating a completed submit/count/confirm with the same confirmed intent is a no-op.
- An incompatible command returns a typed issue without payload details.

## Repository contract

```ts
interface StoredPublicVoting {
  readonly session: PublicVotingSession
  readonly revision: number
}

interface VotingEliminationRepository {
  load(): Promise<StorageResult<StoredPublicVoting | null>>

  prepare(
    handoff: CluePhaseHandoff,
    expectedRevision: number,
  ): Promise<StorageResult<StoredPublicVoting>>

  loadPrivateBallot(
    voterId: string,
  ): Promise<StorageResult<PrivateBallotView>>

  submitSecretVote(
    voterId: string,
    candidateIds: readonly string[],
    expectedRevision: number,
  ): Promise<StorageResult<StoredPublicVoting>>

  confirmVerbal(
    eliminatedPlayerIds: readonly string[],
    expectedRevision: number,
    confirmation: { readonly confirmed: true },
  ): Promise<
    StorageResult<{
      readonly stored: StoredPublicVoting
      readonly handoff: VoteResolutionHandoff
    }>
  >

  confirmCount(
    expectedRevision: number,
    confirmation: { readonly confirmed: true },
  ): Promise<
    StorageResult<
      | { readonly kind: 'tiebreak'; readonly stored: StoredPublicVoting }
      | {
          readonly kind: 'result'
          readonly stored: StoredPublicVoting
          readonly handoff: VoteResolutionHandoff
        }
    >
  >
}
```

### Persistence and recovery

- prepare validates `clues-active`, the last closed handoff, its secret round and the optional opaque
  ResolutionLedger header, then writes
  `voting-active` in one transaction over `recoverySnapshots` and `metadata`.
- Every real mutation requires writer lease, checks expectedRevision, updates envelope+metadata and
  increments revision once.
- Local calls serialize by voting identity. A semantic no-op does not write.
- revision-conflict causes service load; it never replays the stale command.
- Storage failure returns the previous confirmed projection and emits no handoff.
- load accepts only coherent `voting-active`; future/partial payload returns incompatible-data.
- The repository projects before returning. No public method returns `ActiveVotingRecovery` or
  `SecretVote`.
- The ResolutionLedger payload is owned by IMP-8, preserved byte-for-byte and never returned through
  voting ports, handoffs, observer, errors or logs.

### Privacy and private views

- loadPrivateBallot is available only to writer and pending voter. It returns candidates and
  cardinality, never confirmed selections.
- After submit commit, private candidate/selection state is removed before shared rendering.
- Recovery and observer always enter the shared projection.
- Public errors contain only `code` and `retryable`.
- URL, navigation state, console and callbacks contain no individual vote or unrevealed secret.

### Handoff invariants

- resultId comes from an injected ID factory, is validated non-empty and is persisted once in the
  terminal result commit.
- eliminated requires 1..K unique participant IDs and a non-second-tie reason.
- successive eliminated requires exactly one ID.
- persistent-tie requires reason second-tie and an empty eliminated list.
- participantIds remains canonical and active IDs are derived by IMP-8.
- The callback fires only after durable commit; repeated result returns the same handoff.

## Feature service

```ts
type VotingViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly session: PublicVotingSession }
  | {
      readonly status: 'private'
      readonly session: PublicVotingSession
      readonly ballot: PrivateBallotView
      readonly phase: 'covered' | 'selecting' | 'saving'
    }
  | { readonly status: 'writing'; readonly session: PublicVotingSession }
  | { readonly status: 'observer'; readonly session: PublicVotingSession }
  | { readonly status: 'error'; readonly session: PublicVotingSession | null; readonly error: PublicPlatformError }
  | { readonly status: 'safe-mode'; readonly error: PublicPlatformError }
```

The service exposes subscribe/getState/prepare/openBallot/concealBallot/submitVote/
confirmVerbal/confirmCount/retry. Observer omits mutation methods in the hook-facing command set.

## Continuity adapter for IMP-10

```ts
interface PublicVotingContinuityAdapter extends PublicContinuityAdapter {
  readonly feature: 'voting'
}
```

Summary and route are public-only; any private recovery returns the shared voting list. `pauseForHome`
checkpoints the confirmed envelope without submitting a ballot/count/result. Observer is blocked,
stale reloads without replay, and the adapter never owns abandon or renders Game Menu.

# Tasks: Resolucion de rondas y condiciones de victoria

**Input**: Design documents from `/specs/008-round-resolution/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/round-resolution.md`, `quickstart.md`
**Epic**: `IMP-8`

## Format

`- [ ] T### [P?] [US?] Description with file path`

- **[P]**: Can run in parallel because it changes independent files.
- **[IMP-50]..[IMP-54]**: User story ownership from `spec.md`.
- **[IMP-55]**: Cross-story verification and delivery work.
- Tests are listed before implementation in every user-story phase.

## Phase 1: Setup and traceability

- [ ] T001 Verify the `008-round-resolution` feature context and required design artifacts in `specs/008-round-resolution/plan.md`.
- [ ] T002 [P] Reconcile the normative IMP-8 screens and states with `specs/screen-inventory.md` without importing behavior from `ProposedUI/`.
- [ ] T003 Trace FR-001..FR-029 and SC-001..SC-009 to task and test coverage in `specs/008-round-resolution/checklists/implementation.md`.
- [ ] T004 [P] Initialize implementation evidence and verification ownership in `specs/008-round-resolution/checklists/implementation.md`.
- [ ] T005 Verify the exact IMP-7 input, IMP-6 continuation, and IMP-9 terminal schemas against `specs/008-round-resolution/contracts/round-resolution.md`.

## Phase 2: Foundational domain and persistence

**Purpose**: Establish the shared types, recovery envelope, repository boundary, and observable
service required by every story.

- [ ] T006 [P] Add failing domain contract, invariant, normalization, and matrix test scaffolding in `src/domain/entities/roundResolution.test.ts`.
- [ ] T007 [P] Add failing atomicity, idempotency, conflict, recovery, and projection test scaffolding in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T008 Implement versioned resolution entities, issues, guards, and pure helpers in `src/domain/entities/roundResolution.ts`.
- [ ] T009 Define prepare, attempt, continuation, terminal, reload, observer, and safe-mode capabilities in `src/domain/ports/roundResolution.ts`.
- [ ] T010 Extend the active-game recovery types with `resolution-active` and opaque `ResolutionLedger` preservation in `src/features/platform/services/recoveryRuntime.ts`.
- [ ] T011 Implement the Dexie-backed resolution envelope, revision checks, writer lease, and public allowlist projections in `src/infrastructure/persistence/roundResolutionRepository.ts`.
- [ ] T012 Implement serial command execution and typed public errors in `src/features/round-resolution/services/roundResolutionService.ts`.
- [ ] T013 Expose only state-appropriate shared and private capabilities from `src/features/round-resolution/hooks/useRoundResolution.ts`.

## Phase 3: User Story 1 - Resolve a closed vote (P1)

**Goal**: Consume one exact `VoteResolutionHandoff` and persist one deterministic matrix decision.

**Independent test**: Every row in the resolution matrix produces one durable decision with the
specified winner, reason, active roster, or continuation, without recounting votes.

- [ ] T014 [P] [IMP-50] Add failing schema and canonical-roster tests for exact `VoteResolutionHandoff` consumption in `src/domain/entities/roundResolution.test.ts`.
- [ ] T015 [P] [IMP-50] Add failing table-driven tests for persistent tie, simultaneous `single`, successive zero-impostor, parity, and continuation outcomes in `src/domain/entities/roundResolution.test.ts`.
- [ ] T016 [IMP-50] Add failing integration tests for atomic preparation, duplicate `resultId`, mismatched payloads, and zero partial writes in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T017 [IMP-50] Implement strict handoff validation against prepared game, secret snapshot, phase, and ledger in `src/domain/entities/roundResolution.ts`.
- [ ] T018 [IMP-50] Implement simultaneous elimination and canonical active-roster derivation for `single` in `src/domain/entities/roundResolution.ts`.
- [ ] T019 [IMP-50] Implement ordered successive evaluation for zero impostors, parity, and continuation in `src/domain/entities/roundResolution.ts`.
- [ ] T020 [IMP-50] Persist the decision, consumed result ID, and cumulative eliminated roster atomically in `src/infrastructure/persistence/roundResolutionRepository.ts`.
- [ ] T021 [IMP-50] Project resolving, public error, and safe-mode states without votes or secrets in `src/features/round-resolution/services/roundResolutionService.ts`.

## Phase 4: User Story 2 - Complete private final attempts (P1)

**Goal**: Give each newly eliminated impostor at most one durable private attempt while confining
answer text and redacting it before either output.

**Independent test**: Enabled eligible attempts resume covered, save once in roster order, never
change the matrix decision, and expose only redacted outcomes after exit.

- [ ] T022 [P] [IMP-51] Add failing covered-entry, decline, duplicate-submit, ordered-queue, and accessibility tests in `src/features/round-resolution/components/PrivateFinalAttempt.test.tsx`.
- [ ] T023 [P] [IMP-51] Add failing normalization, eligibility, decision-independence, and public-redaction tests in `src/features/round-resolution/services/roundResolutionService.test.ts`.
- [ ] T024 [IMP-51] Add failing repository tests proving raw answer text remains private, survives pending recovery, and is removed before output in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T025 [IMP-51] Implement Spanish NFKC, trim, collapsed-space, and case-insensitive guess comparison in `src/domain/entities/roundResolution.ts`.
- [ ] T026 [IMP-51] Implement the roster-ordered queue for newly eliminated impostors and the no-attempt cases in `src/domain/entities/roundResolution.ts`.
- [ ] T027 [IMP-51] Implement atomic guess and decline commands with revision, lease, and idempotency enforcement in `src/infrastructure/persistence/roundResolutionRepository.ts`.
- [ ] T028 [IMP-51] Implement covered handoff, private entry, saving, completion, and concealment UI in `src/features/round-resolution/components/PrivateFinalAttempt.tsx`.
- [ ] T029 [IMP-51] Wire private attempt capabilities without placing answer text in shared state, routes, or errors in `src/features/round-resolution/hooks/useRoundResolution.ts`.
- [ ] T030 [IMP-51] Move only `correct | incorrect | declined` outcomes to the ledger and clear attempts before output in `src/infrastructure/persistence/roundResolutionRepository.ts`.

## Phase 5: User Story 3 - Continue successive elimination (P1)

**Goal**: Emit one exact, durable `NextCluePhaseRequest` only for a non-terminal successive cycle.

**Independent test**: A valid continuation returns the same next-phase request on retries and IMP-6
receives active players in canonical order while the private ledger crosses IMP-6/7 opaquely.

- [ ] T031 [P] [IMP-52] Add failing contract and guard tests for next phase, active IDs, pending-attempt rejection, and terminal rejection in `src/domain/entities/roundResolution.test.ts`.
- [ ] T032 [IMP-52] Add failing cross-feature recovery tests for opaque ledger preservation through clue and voting envelopes in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T033 [IMP-52] Implement exact `NextCluePhaseRequest` construction and continuation guards in `src/domain/entities/roundResolution.ts`.
- [ ] T034 [IMP-52] Commit the request atomically, redact attempts first, and return the stored request on retry in `src/infrastructure/persistence/roundResolutionRepository.ts`.
- [ ] T035 [IMP-52] Preserve the opaque resolution ledger when IMP-6 creates and recovers a clue phase in `src/infrastructure/persistence/roundSessionRepository.ts`.
- [ ] T036 [IMP-52] Preserve the opaque resolution ledger when IMP-7 creates and recovers a voting phase in `src/infrastructure/persistence/votingEliminationRepository.ts`.
- [ ] T037 [IMP-52] Route the confirmed request back to IMP-6 without deciding speaker, order, timer, or voting in `src/app/App.tsx`.

## Phase 6: User Story 4 - Explain a terminal result (P1)

**Goal**: Reveal the durable terminal result publicly and hand IMP-9 an exact secret-free allowlist.

**Independent test**: No secret appears before the terminal commit; afterward the shared screen can
show the authorized reveal and repeated Continue returns one exact `RoundResolutionHandoff`.

- [ ] T038 [P] [IMP-53] Add failing exact-shape and negative allowlist tests for `RoundResolutionHandoff` in `src/domain/entities/roundResolution.test.ts`.
- [ ] T039 [P] [IMP-53] Add failing pre-terminal privacy, terminal reveal, reason, repeated Continue, and screen-state tests in `src/features/round-resolution/components/RoundResolutionScreen.test.tsx`.
- [ ] T040 [IMP-53] Implement terminal handoff construction with cumulative eliminations, original roles, active IDs, and redacted outcomes in `src/domain/entities/roundResolution.ts`.
- [ ] T041 [IMP-53] Persist one resolution ID, resolved timestamp, redaction, and terminal handoff as one atomic commit in `src/infrastructure/persistence/roundResolutionRepository.ts`.
- [ ] T042 [IMP-53] Implement the authorized terminal projection with winner, reason, concept, roles, and outcomes in `src/features/round-resolution/services/roundResolutionService.ts`.
- [ ] T043 [IMP-53] Implement resolving, continuation-ready, terminal-reveal, error, observer, and safe-mode shared states in `src/features/round-resolution/components/RoundResolutionScreen.tsx`.
- [ ] T044 [IMP-53] Deliver the persisted handoff and RoundPreparationSource through the internal
  `ResolutionScoringCoordinator`; App receives only the resulting public scoreboard projection.

## Phase 7: User Story 5 - Recover offline without double resolution (P2)

**Goal**: Restore each durable state safely, keep observers read-only, and never replay stale intent.

**Independent test**: Pending, continuation, and terminal sessions reopen offline with stable IDs and
revisions; conflicts reload, observers cannot mutate, and invalid data exposes no secrets.

- [ ] T045 [P] [IMP-54] Add failing reload tests for covered pending attempts, stored continuation, stored terminal, and no reevaluation in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T046 [P] [IMP-54] Add failing two-writer lease and optimistic-conflict tests that forbid stale intent replay in `tests/integration/roundResolutionRepository.spec.ts`.
- [ ] T047 [IMP-54] Add failing observer, direct-private-navigation, malformed-envelope, safe-mode, and secret-leak regression tests in `src/features/round-resolution/services/roundResolutionService.test.ts`.
- [ ] T048 [IMP-54] Restore `resolution-active` into covered, shared, observer, conflict, or safe mode without recomputation in `src/features/platform/services/recoveryRuntime.ts`.
- [ ] T049 [IMP-54] Wire startup recovery and read-only observer routing to the resolution screen in `src/app/App.tsx`.

## Phase 8: Delivery and cross-story verification

- [ ] T050 [P] [IMP-55] Add full matrix, multi-attempt, continuation, terminal, reload, conflict, and offline browser journeys in `tests/e2e/round-resolution.spec.ts`.
- [ ] T051 [P] [IMP-55] Add 320 px, keyboard, focus, announcement, touch-target, and axe checks for shared and private states in `tests/accessibility/round-resolution.spec.ts`.
- [ ] T052 [IMP-55] Externalize Spanish copy in `src/i18n/es.ts`, finish responsive styles in `src/styles/global.css`, run the gates in `specs/008-round-resolution/quickstart.md`, and record evidence in `specs/008-round-resolution/checklists/implementation.md`.

## Dependencies

- Phase 1 precedes implementation and keeps every requirement traceable.
- Phase 2 blocks all user stories.
- US1 blocks US2, US3, and US4 because attempts and outputs depend on a persisted decision.
- US2 blocks US3 and US4 because all raw answers must be redacted before either output.
- US3 and US4 are mutually exclusive outputs and can be implemented in parallel after US1/US2.
- US5 depends on the durable states from US1-US4.
- Delivery follows all stories.

## Parallel execution

- T002 and T004 can run in parallel after T001.
- T006 and T007 establish independent domain and repository test harnesses.
- Within each story, tasks marked `[P]` are independent test files; implementation starts only
  after that story's failing tests exist.
- T035 and T036 affect independent IMP-6 and IMP-7 repositories after T034 defines the envelope.
- T050 and T051 can run in parallel once the integrated UI and recovery flows are stable.

## Completion rule

No task is complete from documentation alone. Mark a task `[x]` only after its implementation or
verification exists at the named path, the relevant focused test passes, and the evidence is
recorded in `checklists/implementation.md`.

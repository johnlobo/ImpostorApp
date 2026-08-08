# Implementation Checklist: Resolucion de rondas y condiciones de victoria

**Epic**: `IMP-8`
**Tasks**: [tasks.md](../tasks.md)
**Status**: Initial; no implementation evidence verified

## Traceability and contracts

- [ ] Every FR-001..FR-029 and SC-001..SC-009 maps to an implementation task and executable test.
- [ ] `VoteResolutionHandoff` is consumed with the exact IMP-7 schema and no votes, tallies, or inferred fields.
- [ ] `NextCluePhaseRequest` exactly reuses the IMP-6 contract and advances only the phase number.
- [ ] `RoundResolutionHandoff` exactly matches the IMP-9 allowlist and excludes concept, category, guesses, votes, tallies, points, and rematch state.
- [ ] Cross-feature ledger preservation changes remain internal to recovery envelopes and do not widen public IMP-6/7 contracts.

| Requirements | Tasks | Executable evidence |
|---|---|---|
| FR-001..007 / SC-001..002 | T014-T021 | Domain matrix and repository integration tests |
| FR-008..013 / SC-003..004, SC-006 | T022-T030 | Private attempt component/service/repository tests |
| FR-014..016 / SC-005..006 | T031-T037 | Continuation guards and cross-feature ledger tests |
| FR-017..020 / SC-001, SC-004, SC-006 | T038-T044 | Exact handoff, terminal privacy and internal coordinator tests |
| FR-021..026 / SC-007..008 | T045-T049 | Recovery, writer, observer and safe-mode tests |
| FR-027..029 / SC-009 | T050-T052 | Browser, accessibility, i18n and delivery gates |

## Matrix and domain

- [ ] Table-driven tests cover every `single`, `successive`, and `persistent-tie` row for one, two, and three impostors.
- [ ] `single` applies all selected eliminations simultaneously and always produces a terminal result.
- [ ] `successive` applies exactly one elimination and evaluates zero impostors before parity and continuation.
- [ ] Persistent tie takes precedence, eliminates nobody, creates no attempt, and produces impostor victory.
- [ ] Invalid phase, roster, role, result ID, elimination mode, or eliminated IDs fail before any write.
- [ ] Active and eliminated IDs are unique, canonical, disjoint, and partition the original roster.
- [ ] Reusing a result ID with equal content is idempotent and conflicting content enters a typed safe path.

## Private attempts and redaction

- [ ] Only newly eliminated impostors receive an attempt when `finalAttempt` is enabled.
- [ ] Multiple attempts run individually in canonical roster order with a covered handoff before and after each entry.
- [ ] Guess comparison uses NFKC, trim, collapsed internal spaces, and Spanish case-insensitive normalization.
- [ ] Guess or decline persists before advancing and cannot be repeated after reload, back navigation, or double submit.
- [ ] Attempt success never changes winner, reason, active players, or continuation.
- [ ] Raw answer text remains confined to the repository/recovery envelope while pending.
- [ ] Shared state, observer, URLs, navigation, logs, errors, and outputs never contain pending answer text or unrevealed secrets.
- [ ] Before continuation or terminal output, raw attempts are removed and only `correct | incorrect | declined` remains.

## Continuation and terminal outputs

- [ ] Continuation is available only for a non-terminal `successive` decision with no pending attempt.
- [ ] The stored continuation preserves canonical active IDs and returns the identical request on retry and recovery.
- [ ] IMP-6 and IMP-7 preserve the resolution ledger opaquely across successive clue/vote cycles.
- [ ] Terminal output contains cumulative eliminations, active IDs, original roles, winner, reason, and redacted outcomes.
- [ ] A terminal resolution creates one stable resolution ID and handoff in the same atomic commit.
- [ ] The shared reveal appears only after the terminal commit and includes the authorized concept and role reveal.
- [ ] Continue delivers the persisted handoff to IMP-9 without scoring, next-round, final-game, or rematch logic.

## Persistence, recovery, and privacy

- [ ] Prepare, attempt confirmation, continuation, and terminal commands are atomic and durable offline.
- [ ] Optimistic revision and writer lease allow one writer; conflicts reload without replaying stale intent.
- [ ] Recovery restores decisions and normalized outcomes without revalidating votes, recomparing guesses, or regenerating IDs.
- [ ] Reopening pending private work always starts on a covered shared surface.
- [ ] Observer projection is read-only and exposes only confirmed public state.
- [ ] Malformed or incompatible recovery data is preserved and enters safe mode without leaking secrets.
- [ ] Persistence integration tests prove no partial request, handoff, or redaction on failed commits.

## UI, E2E, and accessibility

- [ ] UI covers loading, resolving, private handoff, private entry, saving, continuation-ready, terminal reveal, storage error, conflict reload, observer, and safe mode.
- [ ] Spanish strings are externalized and no domain decision depends on presentation copy.
- [ ] Layout works at 320 px and supported larger viewports without overlap or clipped controls.
- [ ] Keyboard order, visible focus, live announcements, touch targets, and non-color cues are verified.
- [ ] E2E covers the full matrix, multiple attempts, continuation cycles, terminal delivery, reload, conflict, and offline behavior.
- [ ] Accessibility tests pass for every shared and private screen state.

## Delivery evidence

- [ ] Focused domain, component, service, integration, E2E, and accessibility suites pass.
- [ ] Typecheck, lint, formatting, full tests, production build, and bundle budget pass.
- [ ] Quickstart scenarios are executed against the implementation and their results are recorded.
- [ ] Each completed task links to concrete code/test evidence; no checkbox is closed from assertion alone.

## Evidence log

All items remain pending until implementation and CI evidence is available. Record commands, test
results, commit or PR references, and any approved exception here before marking a checkbox.

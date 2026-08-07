# Research: Configuracion de partida

## Domain boundary

**Decision**: Consume the immutable `PreparedRoster` produced by IMP-2 and copy it into an
independent configuration draft. IMP-3 never edits players or saved groups.

**Rationale**: Player management remains owned by IMP-2 while the configuration domain stays pure,
deterministic and independent of React and IndexedDB.

## Configuration ranges and defaults

**Decision**: Use 1 to 10 rounds, defaulting to 3. Allow 1 to
`min(3, floor(playerCount / 3))` impostors, defaulting to 1.

**Rationale**: These boundaries keep the first release understandable across the supported roster
size of 3 to 20 while preventing a configuration without enough non-impostor players.

## Conversation rhythm

**Decision**: Conversation is free by default. Timed conversation accepts 30 to 600 seconds in
30-second increments and exposes 60, 90 and 120 seconds as presets.

**Rationale**: Free conversation preserves a quick path. The bounded timer supports short and long
groups without introducing per-phase timers in this increment.

## Turn order and voting

**Decision**: Turn order is `roster`, `random` or `free`, defaulting to `roster`. Voting is `verbal`
or `secret`, defaulting to `verbal`.

**Rationale**: Explicit discriminated values avoid ambiguous booleans and can be consumed directly
by later game-flow epics.

## Final attempt

**Decision**: The final attempt is disabled by default. When enabled it grants the eliminated
player one final accusation; it does not create another voting round.

**Rationale**: This gives the option a testable meaning and prevents later phases from interpreting
it as extra time, an extra vote or automatic survival.

## Multiple-impostor behavior

**Decision**: Defaults are random allocation, impostors unknown to one another and single
elimination. Allocation, awareness and elimination are separate rules.

**Rationale**: Orthogonal fields keep the compatibility matrix explicit and allow later game logic
to implement each policy without parsing presentation labels.

## Persistence

**Decision**: Confirm one versioned `PreparedGame` through the existing `RecoverySnapshot` with
phase `configured`; add no table and no Dexie migration.

**Rationale**: IMP-1 already provides atomic revision checks, writer-lease enforcement, recovery
and safe read-only behavior. Intermediate form edits remain ephemeral.

## Dependencies

**Decision**: Add no runtime dependency.

**Rationale**: Pure TypeScript, the existing service/hook pattern and the platform persistence
gateway cover the complete feature.

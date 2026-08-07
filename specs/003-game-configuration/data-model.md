# Data Model: Configuracion de partida

## PreparedRoster input

| Field | Type | Rules |
|---|---|---|
| players | ordered Player[] | Copied from IMP-2; 3 to 20 valid players |

The roster is an input value. IMP-3 preserves player IDs, names and positions but exposes no player
mutation command.

## GameConfigurationDraft

| Field | Type | Rules |
|---|---|---|
| roster | PreparedRoster | Defensive copy; never empty or replaceable by a command |
| rounds | integer | 1 to 10; default 3 |
| impostorCount | integer | 1 to `min(3, floor(players / 3))`; default 1 |
| conversation | free or timed | Free by default; timed uses 30 to 600 seconds in steps of 30 |
| turnOrder | roster, random or free | Default roster |
| voting | verbal or secret | Default verbal |
| finalAttempt | boolean | Default false; eliminated player gets one final accusation when true |
| allocation | random or balanced | Default random |
| impostorAwareness | unknown or known | Default unknown |
| elimination | single or successive | Default single |

### Invariants

- Every command returns a complete valid draft or the unchanged previous draft with typed issues.
- Timer presets 60, 90 and 120 are UI shortcuts, not separate domain values.
- `finalAttempt` never changes the number of votes or eliminations.
- The maximum impostor count is derived from the roster, never stored as an independent setting.
- Configuration commands cannot alter roster identity, names or order.

## PreparedGame

| Field | Type | Rules |
|---|---|---|
| schemaVersion | integer | Literal current version, initially 1 |
| id | string | Generated locally at confirmation |
| roster | PreparedRoster | Immutable defensive copy |
| rules | confirmed rules object | Valid configuration with no draft-only state |
| createdAt | ISO timestamp | Injected clock at confirmation |

`PreparedGame` is the stable handoff to later epics. It contains no selected category, concept,
role assignment or other future secret state.

## ConfigurationIssue

Discriminated values: `invalid-roster`, `invalid-round-count`, `invalid-impostor-count`,
`invalid-timer` and `incompatible-options`.

Issues contain no player names, configuration payloads or technical storage details.

## RecoverySnapshot mapping

| RecoverySnapshot field | Value |
|---|---|
| id | `active-game` |
| schemaVersion | Existing platform envelope version |
| revision | Previous revision plus exactly one |
| phase | `configured` |
| payload | Versioned `PreparedGame` |
| integrity | `confirmed` |

Draft edits are not persisted. Confirmation is atomic and an unsuccessful write preserves both the
draft in memory and the prior recovery revision.

## State transitions

```text
PreparedRoster -> default draft -> editing -> valid review -> confirming -> configured
                               \-> invalid command -> unchanged draft + issue
confirming -> storage failure -> preserved draft -> retry or return
configured -> recovery load -> validated PreparedGame
```

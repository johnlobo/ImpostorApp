# Data Model: Gestion de jugadores y grupos habituales

## Player

| Field | Type | Rules |
|---|---|---|
| id | string | Stable and non-empty within one draft |
| name | string | Normalized display value, 1-30 visible characters |
| position | integer | Zero-based, contiguous and unique |

## PlayerDraft

| Field | Type | Rules |
|---|---|---|
| players | ordered Player[] | Zero to 20 while editing; 3-20 to continue or save |
| dirty | boolean | True after a local change not represented by the loaded/saved source |
| sourceGroupId | string or null | Group last loaded or saved, never required |

### Invariants

- IDs and positions are unique.
- Positions always equal array order.
- Comparison keys for names are unique.
- Invalid commands return typed errors and preserve the previous draft.

## SavedPlayerGroup

| Field | Type | Rules |
|---|---|---|
| id | string | Stable local identifier |
| schemaVersion | number | Current supported version |
| name | string | Normalized, 1-40 characters, unique by comparison key |
| players | ordered GroupMember[] | 3-20 valid unique names |
| createdAt | ISO timestamp | Immutable |
| updatedAt | ISO timestamp | Monotonic per successful change |

A group member stores only a normalized name and order. Loading creates new active player IDs.

## ValidationIssue

Discriminated values: `empty-name`, `name-too-long`, `duplicate-name`,
`minimum-players`, `maximum-players`, `duplicate-group-name`, `group-name-too-long`,
`invalid-group` and mapped public storage errors.

Validation values never include the rejected name.

## State transitions

```text
empty draft -> editing -> valid draft -> prepared
                    \-> saved group
saved group -> loaded clean draft -> editing
saved group -> renamed/updated
saved group -> deletion confirmation -> deleted
storage failure -> draft preserved -> retry or continue without save
writer lost -> observer/read-only -> reacquire outside IMP-2 lifecycle
```

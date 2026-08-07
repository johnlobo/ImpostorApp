# Contract: Player groups

## Domain commands

```ts
type DraftCommand =
  | { type: 'add'; name: string }
  | { type: 'rename'; playerId: string; name: string }
  | { type: 'remove'; playerId: string }
  | { type: 'move'; playerId: string; direction: 'up' | 'down' }

applyDraftCommand(draft, command, idFactory): DomainResult<PlayerDraft>
validateDraft(draft): readonly ValidationIssue[]
```

Every failed command returns the original draft reference and one or more public validation codes.

## Repository

```ts
interface PlayerGroupsRepository {
  list(): Promise<StorageResult<readonly SavedPlayerGroup[]>>
  save(group: SavedPlayerGroup): Promise<StorageResult<SavedPlayerGroup>>
  delete(groupId: string): Promise<StorageResult<void>>
}
```

- Results are sorted by normalized group name.
- `list` rejects the complete read if any record is malformed.
- `save` and `delete` inherit writer-lease enforcement.
- No error includes player names, group names or raw records.

## Prepared roster handoff

```ts
interface PreparedRoster {
  players: readonly { id: string; name: string; position: number }[]
}
```

The handoff is immutable, valid and independent of React, Dexie and future game configuration.

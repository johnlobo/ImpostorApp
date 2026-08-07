# Contract: Game configuration

## Domain values

```ts
type ConversationRule =
  | { mode: 'free' }
  | { mode: 'timer'; seconds: number }

interface GameConfigurationDraft {
  roster: PreparedRoster
  rounds: number
  impostorCount: number
  conversation: ConversationRule
  turnOrder: 'roster' | 'random' | 'free'
  voting: 'verbal' | 'secret'
  finalAttempt: boolean
  allocation: 'random' | 'balanced'
  impostorAwareness: 'unknown' | 'known'
  elimination: 'single' | 'successive'
}

interface PreparedGame {
  schemaVersion: 1
  id: string
  roster: PreparedRoster
  rules: Omit<GameConfigurationDraft, 'roster'>
  createdAt: string
}
```

## Commands and validation

```ts
type ConfigurationCommand =
  | { type: 'set-rounds'; value: number }
  | { type: 'set-impostors'; value: number }
  | { type: 'set-conversation'; value: ConversationRule }
  | { type: 'set-turn-order'; value: 'roster' | 'random' | 'free' }
  | { type: 'set-voting'; value: 'verbal' | 'secret' }
  | { type: 'set-final-attempt'; value: boolean }
  | { type: 'set-allocation'; value: 'random' | 'balanced' }
  | { type: 'set-awareness'; value: 'unknown' | 'known' }
  | { type: 'set-elimination'; value: 'single' | 'successive' }

createConfigurationDraft(roster: PreparedRoster): DomainResult<GameConfigurationDraft>
applyConfigurationCommand(draft, command): DomainResult<GameConfigurationDraft>
validateConfiguration(draft): readonly ConfigurationIssue[]
confirmConfiguration(draft, idFactory, clock): DomainResult<PreparedGame>
```

Constants are 1 to 10 rounds, 1 to `min(3, floor(roster.players.length / 3))` impostors and,
for timed conversation, 30 to 600 seconds divisible by 30. Presets are 60, 90 and 120 seconds.

Failed commands preserve the previous draft. Confirmation makes defensive copies of roster and
rules. The final-attempt flag means exactly one final accusation by the eliminated player.

## Recovery persistence

```ts
interface PreparedGameRepository {
  load(): Promise<StorageResult<{
    game: PreparedGame
    revision: number
  } | null>>
  save(
    game: PreparedGame,
    expectedRevision: number,
  ): Promise<StorageResult<{
    game: PreparedGame
    revision: number
  }>>
}
```

- The adapter uses `PersistenceGateway.loadRecoverySnapshot` and `commitRecoverySnapshot`.
- A saved record has phase `configured` and a versioned `PreparedGame` payload.
- No collection, table or migration is added.
- Reads validate envelope version, payload version, roster invariants and every rule.
- A malformed or future payload returns `incompatible-data` and never replaces active state.
- Writes inherit optimistic revision checks and writer-lease enforcement.
- Errors and logs never contain player names or the snapshot payload.

## Feature handoffs

```ts
onPrepared(roster: PreparedRoster): void       // IMP-2 -> IMP-3
onConfigurationConfirmed(game: PreparedGame): void // IMP-3 -> later game flow
```

Neither handoff uses URL parameters, browser history state, React component state shapes or Dexie
records.

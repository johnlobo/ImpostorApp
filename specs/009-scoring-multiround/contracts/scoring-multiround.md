# Contract: Puntuacion y continuidad multirronda

## Exact internal input

```ts
interface RoundResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly participantIds: readonly string[]
  readonly originalRoles: readonly { readonly playerId: string; readonly role: 'citizen' | 'impostor' }[]
  readonly winner: 'citizens' | 'impostors'
  readonly reason:
    | 'all-impostors-found'
    | 'impostors-escaped'
    | 'impostor-parity'
    | 'persistent-tie'
  readonly eliminatedPlayerIds: readonly string[]
  readonly activePlayerIds: readonly string[]
  readonly attemptOutcomes: readonly {
    readonly playerId: string
    readonly outcome: 'correct' | 'incorrect' | 'declined'
  }[]
  readonly resolvedAt: string
}
```

El guard rechaza claves faltantes o adicionales. Roles e intentos permanecen internos.

## Domain

```ts
type ScoringIssue =
  | 'invalid-handoff'
  | 'unexpected-round'
  | 'result-conflict'
  | 'game-final'
  | 'invalid-next-action'

applyRoundResult(
  game: PreparedGame,
  current: InternalGameScoreboard | null,
  handoff: RoundResolutionHandoff,
  appliedAt: string,
): ScoringResult<InternalGameScoreboard>

projectScoreboard(value: InternalGameScoreboard): PublicGameScoreboard
createNextRoundRequest(value: PublicGameScoreboard): ScoringResult<NextRoundRequest>
```

## Repository port

```ts
interface StoredPublicScoreboard {
  scoreboard: PublicGameScoreboard
  recoveryRevision: number
}

interface RematchSeed {
  sourceGameId: string
  newGameId: string
  rosterDraft: PreparedRosterDraft
  configurationDraft: GameConfigurationDraft
  contentSelectionDraft: ContentSelectionDraft
}

interface ScoringMultiroundRepository {
  load(gameId: string): Promise<StorageResult<StoredPublicScoreboard | null>>
  applyResult(
    source: RoundPreparationSource,
    handoff: RoundResolutionHandoff,
    expectedRecoveryRevision: number,
  ): Promise<StorageResult<StoredPublicScoreboard>>
  confirmFinal(
    gameId: string,
    expectedRecoveryRevision: number,
  ): Promise<StorageResult<StoredPublicScoreboard>>
  confirmRematch(
    gameId: string,
    newGameId: string,
    expectedRecoveryRevision: number,
  ): Promise<StorageResult<RematchSeed>>
}
```

Ningun metodo devuelve el agregado interno ni el handoff.

## Next-round coordinator

```ts
interface RoundPreparationCoordinator {
  prepareNextFromScoreboard(
    request: NextRoundRequest,
    expectedRecoveryRevision: number,
    random: () => number,
  ): Promise<StorageResult<PublicRoundProgress>>
}
```

1. Valida request/marcador y carga internamente `RoundPreparationSource` por gameId; el caller
   publico no aporta PreparedGame ni contenido.
2. Parte de recovery `scoreboard-active`; no crea staging `content-selected`.
3. Abre una transaccion sobre game-scoreboards, used-concepts, role-assignment-history,
   recoverySnapshots y metadata; ejecuta draw IMP-4 antes de roles IMP-5.
4. Confirma marcador, concepto usado, balanced history, secret recovery y metadata juntos.
5. Proyecta `PublicRoundProgress`, nunca el snapshot secreto.

No llama `SecretRoundRepository.prepare` ni `ConceptDrawRepository.drawAndMarkUsed` por separado.
Cualquier fallo conserva marcador y no hace replay automatico.

## Internal resolution-to-scoring coordinator

```ts
interface ResolutionScoringCoordinator {
  acceptResolution(
    handoff: RoundResolutionHandoff,
    source: RoundPreparationSource,
  ): Promise<StorageResult<PublicGameScoreboard>>
}
```

IMP-8 invoca este puerto dentro de infraestructura con un source derivado de su envelope secreto.
El coordinador valida identidades y persiste handoff/source confinados al agregado IMP-9. Ningun
servicio, hook, App, navigation, observer o logger recibe ninguno de los dos.

## Persistence

`applyResult` usa una transaccion:

```text
game-scoreboards + recoverySnapshots + metadata
```

- Mismo `resultId` y handoff: devuelve proyeccion, sin puts ni revision.
- Mismo ID y handoff distinto: conflicto, sin escrituras.
- Resultado nuevo: agrega movimientos, valida totales/ranking, guarda aggregate y recovery reference.
- Error o stale revision: rollback completo y reload sin replay.

## Feature service

```ts
interface ScoringMultiroundService {
  getState(): ScoringViewState
  subscribe(listener: () => void): () => void
  load(gameId: string): Promise<void>
  refreshAfterResolution(): Promise<void>
  continueToNextRound(): Promise<void>
  showFinalRanking(): Promise<void>
  startRematch(): Promise<void>
  startNewGame(): Promise<void>
}
```

El servicio posee locks/callbacks, no reglas. Observer no expone comandos. Callback solo despues de
commit y una vez por revision.

## Continuity adapter for IMP-10

```ts
interface PublicScoreboardContinuityAdapter extends PublicContinuityAdapter {
  readonly feature: 'scoring'
}
```

Devuelve solo summary y ruta scoreboard/final-ranking. `pauseForHome` confirma el checkpoint actual
como no-op semantico; no aplica score, no avanza ronda y no inicia rematch. Observer queda bloqueado,
stale recarga sin replay y solo IMP-10 renderiza Game Menu.

## Privacy allowlist

Solo `PublicGameScoreboard`, `NextRoundRequest`, `RematchSeed` y errores publicos pueden serializarse
fuera del repositorio. URL, navigation, logs y callbacks excluyen roles, intentos, eliminados,
concepto, movimientos y aggregate interno.
